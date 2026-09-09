import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CampaignsService } from './campaigns.service.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { QueryCampaignRecipientsDto } from './dto/query-campaign-recipients.dto.js';
import { QueryCampaignsDto } from './dto/query-campaigns.dto.js';
import { ScheduleCampaignDto } from './dto/schedule-campaign.dto.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  @HttpCode(201)
  store(@Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto);
  }

  @Get()
  index(@Req() req: Request, @Query() query: QueryCampaignsDto) {
    return this.campaigns.list(req, query);
  }

  @Get(':id')
  show(@Param('id') id: string) {
    return this.campaigns.findOne(id);
  }

  @Get(':id/sent-over-time')
  sentOverTime(@Param('id') id: string) {
    return this.campaigns.getSentOverTime(id);
  }

  @Get(':id/recipients')
  recipients(@Req() req: Request, @Param('id') id: string, @Query() query: QueryCampaignRecipientsDto) {
    return this.campaigns.listRecipients(req, id, query);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(id, dto);
  }

  @Post(':id/send')
  @HttpCode(200)
  sendNow(@Param('id') id: string) {
    return this.campaigns.startNow(id);
  }

  @Post(':id/schedule')
  @HttpCode(200)
  schedule(@Param('id') id: string, @Body() dto: ScheduleCampaignDto) {
    return this.campaigns.schedule(id, new Date(dto.scheduled_at));
  }

  @Post(':id/pause')
  @HttpCode(200)
  pause(@Param('id') id: string) {
    return this.campaigns.pause(id);
  }

  @Post(':id/resume')
  @HttpCode(200)
  resume(@Param('id') id: string) {
    return this.campaigns.resume(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string) {
    return this.campaigns.cancel(id);
  }

  @Post(':id/duplicate')
  @HttpCode(201)
  duplicate(@Param('id') id: string) {
    return this.campaigns.duplicate(id);
  }

  @Delete(':id')
  destroy(@Param('id') id: string) {
    return this.campaigns.destroy(id);
  }
}
