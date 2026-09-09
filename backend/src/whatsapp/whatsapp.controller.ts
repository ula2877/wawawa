import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateWhatsAppAccountDto } from './dto/create-whatsapp-account.dto.js';
import { QueryWhatsAppAccountsDto } from './dto/query-whatsapp-accounts.dto.js';
import { UpdateWhatsAppAccountDto } from './dto/update-whatsapp-account.dto.js';
import { WhatsAppManager } from './whatsapp.manager.js';
import { WhatsAppMessageService } from './whatsapp.message.service.js';
import { WhatsAppService } from './whatsapp.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

/**
 * Thin REST controller for WhatsApp accounts. Database work lives in
 * WhatsAppService, socket work in WhatsAppManager; no Baileys logic here.
 */
@Controller('whatsapp-accounts')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly manager: WhatsAppManager,
    private readonly messages: WhatsAppMessageService,
  ) {}

  @Post()
  @HttpCode(201)
  store(@Body() dto: CreateWhatsAppAccountDto) {
    return this.whatsapp.create(dto);
  }

  @Get()
  index(@Req() req: Request, @Query() query: QueryWhatsAppAccountsDto) {
    return this.whatsapp.list(req, query);
  }

  @Get(':id')
  show(@Param('id') id: string) {
    return this.whatsapp.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWhatsAppAccountDto) {
    return this.whatsapp.update(id, dto);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: UpdateWhatsAppAccountDto) {
    return this.whatsapp.update(id, dto);
  }

  @Post(':id/connect')
  async connect(@Param('id') id: string) {
    const status = await this.manager.connect(id);
    return { data: { id, status } };
  }

  @Post(':id/disconnect')
  async disconnect(@Param('id') id: string) {
    const status = await this.manager.disconnect(id);
    return { data: { id, status } };
  }

  @Post(':id/logout')
  async logout(@Param('id') id: string) {
    const status = await this.manager.logout(id);
    return { data: { id, status } };
  }

  @Put(':id/default')
  setDefault(@Param('id') id: string) {
    return this.whatsapp.setDefault(id);
  }

  @Post(':id/messages')
  @HttpCode(201)
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.messages.enqueue(id, dto);
  }

  @Get('messages/:messageId')
  showMessage(@Param('messageId') messageId: string) {
    return this.messages.show(messageId);
  }

  @Delete(':id')
  @HttpCode(204)
  async destroy(@Param('id') id: string) {
    await this.manager.purgeAccount(id);
    await this.whatsapp.remove(id);
  }
}