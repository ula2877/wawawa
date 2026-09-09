import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }

  @Get('performance')
  performance(@Query('range') range?: string) {
    return this.dashboard.performance(range);
  }

  @Get('stats')
  stats() {
    return this.dashboard.stats();
  }

  @Get('activity')
  activity() {
    return this.dashboard.activity();
  }
}