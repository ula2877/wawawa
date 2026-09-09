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
import { ContactsService } from './contacts.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { QueryContactsDto } from './dto/query-contacts.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  index(@Req() req: Request, @Query() query: QueryContactsDto) {
    return this.contacts.list(req, query);
  }

  @Post()
  @HttpCode(201)
  store(@Body() dto: CreateContactDto) {
    return this.contacts.create(dto);
  }

  @Get(':id')
  show(@Param('id') id: string) {
    return this.contacts.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contacts.update(id, dto);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contacts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async destroy(@Param('id') id: string) {
    await this.contacts.remove(id);
  }
}