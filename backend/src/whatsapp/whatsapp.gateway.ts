import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { WhatsAppEventBus } from './whatsapp.events.js';
import { WhatsAppManager } from './whatsapp.manager.js';

/**
 * Socket.IO gateway on the /whatsapp namespace. Modern clients connect with
 * `auth: { token }` (or `?token=`); the JWT is verified during handshake so
 * the QR stream is never exposed unauthenticated.
 *
 * The gateway is the ONLY consumer of the manager's snapshots and the ONLY
 * broadcaster; the manager never imports the gateway. Manager -> gateway
 * traffic flows through the in-process WhatsAppEventBus, which removes the
 * circular dependency that broke ESM module evaluation.
 */
@WebSocketGateway({
  namespace: '/whatsapp',
  cors: { origin: true, credentials: true },
})
@Injectable()
export class WhatsAppGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer() server?: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly manager: WhatsAppManager,
    private readonly events: WhatsAppEventBus,
  ) {}

  onModuleInit(): void {
    this.events.onQr(({ accountId, qr, image }) => {
      this.server?.emit('whatsapp:qr', { accountId, qr, image });
    });
    this.events.onStatus(({ accountId, status }) => {
      this.server?.emit('whatsapp:status', { accountId, status });
    });
    this.events.onConnected(({ accountId, phone }) => {
      this.server?.emit('whatsapp:connected', {
        accountId,
        phone,
        status: 'CONNECTED',
      });
    });
    this.events.onDisconnected(({ accountId, reason }) => {
      this.server?.emit('whatsapp:disconnected', {
        accountId,
        reason,
        status: 'DISCONNECTED',
      });
    });
    this.events.onMessageQueued(({ accountId }) => {
      this.server?.emit('whatsapp:message:queued', { accountId });
    });
    this.events.onMessageSent(({ id, accountId, sentAt }) => {
      this.server?.emit('whatsapp:message:sent', {
        id,
        accountId,
        status: 'SENT',
        sent_at: sentAt,
      });
    });
    this.events.onMessageFailed(({ id, accountId, failedAt, lastError }) => {
      this.server?.emit('whatsapp:message:failed', {
        id,
        accountId,
        status: 'FAILED',
        failed_at: failedAt,
        last_error: lastError,
      });
    });
    this.events.onMessageDelivered(({ id, accountId, deliveredAt }) => {
      this.server?.emit('whatsapp:message:delivered', {
        id,
        accountId,
        status: 'DELIVERED',
        delivered_at: deliveredAt,
      });
    });
    this.events.onMessageRead(({ id, accountId, readAt }) => {
      this.server?.emit('whatsapp:message:read', {
        id,
        accountId,
        status: 'READ',
        read_at: readAt,
      });
    });
  }

  onModuleDestroy(): void {
    this.events.removeAllListeners();
  }

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const token =
        socket.handshake.auth?.token ?? socket.handshake.query?.token;

      if (typeof token !== 'string' || token === '') {
        next(new Error('Unauthorized'));
        return;
      }

      try {
        const payload = this.jwt.verify(token) as { sub?: number };
        socket.data.userId = payload.sub ?? null;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  /**
   * Replay the current in-memory state (status + still-valid QR) so a
   * frontend page that opens after a QR was generated catches up without
   * polling.
   */
  handleConnection(client: Socket): void {
    for (const snapshot of this.manager.getSnapshots()) {
      if (snapshot.status === 'CONNECTING' && snapshot.qr) {
        client.emit('whatsapp:qr', {
          accountId: snapshot.accountId,
          qr: snapshot.qr,
        });
      }
      client.emit('whatsapp:status', {
        accountId: snapshot.accountId,
        status: snapshot.status,
      });
    }
  }
}