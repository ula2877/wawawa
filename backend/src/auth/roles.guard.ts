import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Restricts a route to a set of roles. Roles are matched case-insensitively
 * against `req.user.role` (lowercased in the DB, e.g. `admin`, `operator`).
 * When no roles are declared the guard lets the request through.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { role?: string } }>();
    const user = request.user;

    if (!user?.role) {
      return false;
    }

    const normalized = user.role.toLowerCase();
    return roles.some((role) => role.toLowerCase() === normalized);
  }
}