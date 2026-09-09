import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

@Module({
  imports: [WhatsAppModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}