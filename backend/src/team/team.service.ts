import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { formatDateTime } from '../common/laravel-pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
];

const ROLLS: Record<string, string> = {
  superadmin: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function userId(userId: number): string {
  return `US-${String(userId).padStart(3, '0')}`;
}

function toFrontendRole(role: string): string {
  return ROLLS[role.toLowerCase()] ?? role;
}

function toMember(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: Date | null;
}) {
  return {
    id: userId(user.id),
    name: user.name,
    email: user.email,
    role: toFrontendRole(user.role),
    status: user.status,
    lastLogin: formatDateTime(user.lastLogin),
    avatarColor: AVATAR_COLORS[hashString(user.name) % AVATAR_COLORS.length],
  };
}

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const members = await this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true },
      orderBy: { createdAt: 'desc' },
    });

    return { data: members.map(toMember) };
  }

  async findOne(id: number) {
    const member = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true },
    });

    if (!member) {
      throw new NotFoundException({ message: 'Team member not found.' });
    }

    return { data: toMember(member) };
  }

  async create(dto: CreateMemberDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException({
        message: 'The email has already been taken.',
        errors: { email: ['The email has already been taken.'] },
      });
    }

    const password = await bcrypt.hash(dto.password, 10);

    const member = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password,
        role: dto.role.toLowerCase(),
        status: 'Active',
      },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true },
    });

    return {
      message: 'Member created.',
      data: toMember(member),
    };
  }

  async update(id: number, dto: UpdateMemberDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException({ message: 'Team member not found.' });
    }

    const member = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role.toLowerCase() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true },
    });

    return {
      message: 'Member updated.',
      data: toMember(member),
    };
  }

  async remove(id: number) {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException({ message: 'Team member not found.' });
    }

    if (toFrontendRole(existing.role) === 'Owner') {
      throw new ConflictException({
        message: 'The Owner account cannot be removed.',
        errors: { role: ['The Owner account cannot be removed.'] },
      });
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'Member removed.' };
  }
}