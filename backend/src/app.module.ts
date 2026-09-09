import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ActivityModule } from './activity/activity.module.js';
import { ActivityLogInterceptor } from './activity/activity-log.interceptor.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CampaignsModule } from './campaigns/campaigns.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { ImportModule } from './import/import.module.js';
import { MediaModule } from './media/media.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { TeamModule } from './team/team.module.js';
import { TemplatesModule } from './templates/templates.module.js';
import { WhatsAppModule } from './whatsapp/whatsapp.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ActivityModule,
    AnalyticsModule,
    CampaignsModule,
    ContactsModule,
    DashboardModule,
    GroupsModule,
    ImportModule,
    MediaModule,
    MessagesModule,
    NotificationsModule,
    SettingsModule,
    TeamModule,
    TemplatesModule,
    WhatsAppModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ],
})
export class AppModule {}