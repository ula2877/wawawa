import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ActivityService } from './activity.service.js';
import { LogActivityDto } from './dto/log-activity.dto.js';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  index(@Query('module') module?: string) {
    return this.activityService.findAll(module);
  }

  @Post()
  @HttpCode(201)
  store(@Body() dto: LogActivityDto) {
    return this.activityService.log(dto.user, dto.action, dto.module);
  }
}
