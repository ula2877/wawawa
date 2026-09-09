import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AnalyticsService } from './analytics.service.js';

/**
 * Real analytics resource: KPIs, trend series and sender/campaign breakdowns.
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary() {
    return this.analytics.summary();
  }

  @Get('performance')
  performance(@Query('range') range?: string) {
    return this.analytics.performance(range);
  }

  @Get('stats')
  stats() {
    return this.analytics.stats();
  }

  @Get('providers')
  providers() {
    return this.analytics.providers();
  }

  @Get('top-campaigns')
  topCampaigns() {
    return this.analytics.topCampaigns();
  }

  @Get('senders')
  senders() {
    return this.analytics.senders();
  }
}