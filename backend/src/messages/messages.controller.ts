import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { QueryMessagesDto } from './dto/query-messages.dto.js';
import { MessagesService } from './messages.service.js';

/**
 * Real message queue/logs resource backed by whatsapp_messages.
 */
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('stats')
  stats() {
    return this.messages.stats();
  }

  @Get()
  index(@Req() req: Request, @Query() query: QueryMessagesDto) {
    return this.messages.list(req, query);
  }

  @Post(':id/retry')
  @HttpCode(200)
  retry(@Param('id') id: string) {
    return this.messages.retry(id);
  }

  @Delete(':id')
  @HttpCode(200)
  cancel(@Param('id') id: string) {
    return this.messages.cancel(id);
  }
}