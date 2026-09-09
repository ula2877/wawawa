import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  sanitizeUser(user: {
    id: number;
    name: string;
    email: string;
    role: string;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException(
        'These credentials do not match our records.',
      );
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login successful.',
      token,
      token_type: 'Bearer',
      user: this.sanitizeUser(user),
    };
  }

  async logout() {
    return { message: 'Logged out successfully.' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid token.');
    }

    const emailTaken = await this.prisma.user.findFirst({
      where: { email: dto.email, id: { not: userId } },
    });

    if (emailTaken) {
      throw new UnprocessableEntityException({
        message: 'The email has already been taken.',
        errors: {
          email: ['The email has already been taken.'],
        },
      });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, email: dto.email },
      select: { id: true, name: true, email: true, role: true },
    });

    return {
      message: 'Profile updated successfully.',
      user: this.sanitizeUser(user),
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }

    if (dto.new_password !== dto.new_password_confirmation) {
      throw new UnprocessableEntityException({
        message: 'The new password confirmation does not match.',
        errors: {
          new_password_confirmation: [
            'The new password confirmation does not match.',
          ],
        },
      });
    }

    const passwordValid = await bcrypt.compare(
      dto.current_password,
      user.password,
    );

    if (!passwordValid) {
      throw new UnprocessableEntityException({
        message: 'The current password is incorrect.',
        errors: {
          current_password: ['The current password is incorrect.'],
        },
      });
    }

    const hashed = await bcrypt.hash(dto.new_password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully.' };
  }
}