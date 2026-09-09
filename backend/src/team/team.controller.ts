import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { TeamService } from './team.service.js';

@Controller('team')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  index() {
    return this.teamService.findAll();
  }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @Roles('admin', 'superadmin')
  store(@Body() dto: CreateMemberDto) {
    return this.teamService.create(dto);
  }

  @Put(':id')
  @Roles('admin', 'superadmin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMemberDto) {
    return this.teamService.update(id, dto);
  }

  @Patch(':id')
  @Roles('admin', 'superadmin')
  patch(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMemberDto) {
    return this.teamService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('admin', 'superadmin')
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.teamService.remove(id);
  }
}
