import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type {
  ConnectedEventPayload,
  DisconnectedEventPayload,
  MessageCampaignTerminalPayload,
  MessageDeliveredEventPayload,
  MessageFailedEventPayload,
  MessageQueuedEventPayload,
  MessageReadEventPayload,
  MessageSentEventPayload,
  QrEventPayload,
  StatusEventPayload,
} from './interfaces/whatsapp-session.interface.js';

/**
 * In-process event bus decoupling the WhatsApp manager (business logic) from
 * the Socket.IO gateway (transport). This removes the circular dependency
 * between WhatsAppManager and WhatsAppGateway entirely, which is important
 * under ESM + emitDecoratorMetadata where `design:paramtypes` would otherwise
 * eagerly evaluate the partner class at module load.
 *
 * Nest registers this as a module-scoped singleton, so the manager and the
 * gateway share the same emitter instance.
 */
@Injectable()
export class WhatsAppEventBus extends EventEmitter {
  emitQr(payload: QrEventPayload): void {
    this.emit('qr', payload);
  }

  emitStatus(payload: StatusEventPayload): void {
    this.emit('status', payload);
  }

  emitConnected(payload: ConnectedEventPayload): void {
    this.emit('connected', payload);
  }

  emitDisconnected(payload: DisconnectedEventPayload): void {
    this.emit('disconnected', payload);
  }

  emitMessageQueued(payload: MessageQueuedEventPayload): void {
    this.emit('message:queued', payload);
  }

  emitMessageSent(payload: MessageSentEventPayload): void {
    this.emit('message:sent', payload);
  }

  emitMessageFailed(payload: MessageFailedEventPayload): void {
    this.emit('message:failed', payload);
  }

  emitMessageDelivered(payload: MessageDeliveredEventPayload): void {
    this.emit('message:delivered', payload);
  }

  emitMessageRead(payload: MessageReadEventPayload): void {
    this.emit('message:read', payload);
  }

  emitMessageCampaignTerminal(payload: MessageCampaignTerminalPayload): void {
    this.emit('message:campaign-terminal', payload);
  }

  onQr(listener: (payload: QrEventPayload) => void): this {
    return this.on('qr', listener);
  }

  onStatus(listener: (payload: StatusEventPayload) => void): this {
    return this.on('status', listener);
  }

  onConnected(listener: (payload: ConnectedEventPayload) => void): this {
    return this.on('connected', listener);
  }

  onDisconnected(listener: (payload: DisconnectedEventPayload) => void): this {
    return this.on('disconnected', listener);
  }

  onMessageQueued(listener: (payload: MessageQueuedEventPayload) => void): this {
    return this.on('message:queued', listener);
  }

  onMessageSent(listener: (payload: MessageSentEventPayload) => void): this {
    return this.on('message:sent', listener);
  }

  onMessageFailed(listener: (payload: MessageFailedEventPayload) => void): this {
    return this.on('message:failed', listener);
  }

  onMessageDelivered(listener: (payload: MessageDeliveredEventPayload) => void): this {
    return this.on('message:delivered', listener);
  }

  onMessageRead(listener: (payload: MessageReadEventPayload) => void): this {
    return this.on('message:read', listener);
  }

  onMessageCampaignTerminal(
    listener: (payload: MessageCampaignTerminalPayload) => void,
  ): this {
    return this.on('message:campaign-terminal', listener);
  }
}