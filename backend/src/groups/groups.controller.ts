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
import { AssignContactsDto } from './dto/assign-contacts.dto.js';
import { StoreGroupDto } from './dto/store-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { GroupsService } from './groups.service.js';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  index(@Req() req: Request, @Query() query: Record<string, unknown>) {
    return this.groups.list(req, query);
  }

  @Post()
  @HttpCode(201)
  store(@Body() dto: StoreGroupDto) {
    return this.groups.store(dto);
  }

  @Get(':id')
  show(@Param('id') id: string) {
    return this.groups.show(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groups.update(id, dto);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groups.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async destroy(@Param('id') id: string) {
    return this.groups.destroy(id);
  }

  @Post(':id/contacts')
  assign(@Param('id') id: string, @Body() dto: AssignContactsDto) {
    return this.groups.assignContacts(id, dto);
  }

  @Delete(':id/contacts')
  remove(@Param('id') id: string, @Body() dto: AssignContactsDto) {
    return this.groups.removeContacts(id, dto);
  }
}