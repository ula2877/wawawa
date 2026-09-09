import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { WhatsAppController } from './whatsapp.controller.js';
import { WhatsAppEventBus } from './whatsapp.events.js';
import { WhatsAppGateway } from './whatsapp.gateway.js';
import { WhatsAppManager } from './whatsapp.manager.js';
import { WhatsAppMessageService } from './whatsapp.message.service.js';
import { WhatsAppMessageWorker } from './whatsapp.message.worker.js';
import { WhatsAppService } from './whatsapp.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'super-secret-change-me-in-production',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '12h') as StringValue,
        },
      }),
    }),
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppEventBus,
    WhatsAppManager,
    WhatsAppGateway,
    WhatsAppMessageService,
    WhatsAppMessageWorker,
  ],
  exports: [WhatsAppMessageService, WhatsAppEventBus, WhatsAppManager],
})
export class WhatsAppModule {}