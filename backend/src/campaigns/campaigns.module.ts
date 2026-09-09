import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller.js';
import { CampaignsService } from './campaigns.service.js';
import { CampaignProcessor } from './campaigns.processor.js';
import { CampaignScheduler } from './campaigns.scheduler.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';

@Module({
  imports: [WhatsAppModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignProcessor, CampaignScheduler],
})
export class CampaignsModule {}
