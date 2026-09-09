import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivityService } from './activity.service.js';
import { Request } from 'express';

/**
 * Handler -> action verb. Human-readable labels for the mutating handlers
 * registered on the API controllers.
 */
const VERBS: Record<string, string> = {
  store: 'created',
  create: 'created',
  update: 'updated',
  patch: 'updated',
  destroy: 'deleted',
  remove: 'removed contacts from',
  cancel: 'cancelled',
  retry: 'retried',
  sendNow: 'sent',
  schedule: 'scheduled',
  pause: 'paused',
  resume: 'resumed',
  duplicate: 'duplicated',
  connect: 'connected',
  disconnect: 'disconnected',
  logout: 'logged out',
  setDefault: 'set as default',
  sendMessage: 'sent',
  assign: 'assigned contacts to',
  import: 'imported',
  upload: 'uploaded',
};

/**
 * Module (route prefix) -> singular noun used in the log sentence.
 */
const NOUNS: Record<string, string> = {
  Campaign: 'campaign',
  Contact: 'contact',
  Template: 'template',
  Group: 'group',
  Team: 'team member',
  WhatsApp: 'WhatsApp account',
  Message: 'message',
  Media: 'media',
  Dashboard: 'dashboard',
  Analytics: 'analytics',
  Settings: 'settings',
  Auth: 'account',
};

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);

  private static readonly MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (!ActivityLogInterceptor.MUTATING_METHODS.includes(method)) {
      return next.handle();
    }

    const routePath = (request.route?.path ?? request.url ?? '') as string;
    const module = this.resolveModule(routePath, request.url ?? '');

    if (!module) {
      return next.handle();
    }

    const user = this.resolveUser(request);
    const verb = VERBS[context.getHandler().name] ?? this.defaultVerb(method);

    return next.handle().pipe(
      map((response: unknown) => {
        void this.writeLog(user, this.buildAction(verb, module, response, request), module).catch(
          (err) => {
            this.logger.error(
              `Failed to write activity log (${module} / ${verb}): ${(err as Error).message}`,
            );
          },
        );
        return response;
      }),
    );
  }

  private resolveModule(routePath: string, url: string): string | null {
    const segments = (routePath || url).split('/').filter(Boolean);
    if (segments[0]?.toLowerCase() === 'api') {
      segments.shift();
    }
    const first = (segments[0] ?? '').toLowerCase();

    if (!first || first === 'activity-logs' || first === 'auth') {
      return null;
    }

    const map: Record<string, string> = {
      campaigns: 'Campaign',
      contacts: 'Contact',
      groups: 'Group',
      templates: 'Template',
      'whatsapp-accounts': 'WhatsApp',
      team: 'Team',
      media: 'Media',
      messages: 'Message',
      dashboard: 'Dashboard',
      analytics: 'Analytics',
    };

    return map[first] ?? this.capitalize(first);
  }

  /**
   * Build a `<verb> <noun> <label>` sentence, e.g.
   * `created campaign "Promo August"` or `deleted contact #5`.
   */
  private buildAction(
    verb: string,
    module: string,
    response: unknown,
    request: Request,
  ): string {
    let noun = NOUNS[module] ?? module.toLowerCase();
    if (verb === 'imported') {
      noun = 'contacts';
    }

    const suffix = this.resolveSuffix(verb, response, request);
    return suffix ? `${verb} ${noun} ${suffix}` : `${verb} ${noun}`;
  }

  private resolveSuffix(verb: string, response: unknown, request: Request): string | null {
    const body = (response ?? {}) as Record<string, unknown>;
    const data = (body.data ?? {}) as Record<string, unknown>;

    if (verb === 'imported' && typeof body.total_rows === 'number') {
      return `(${body.total_rows} rows)`;
    }

    const nameCandidates = [
      data.name,
      body.name,
      data.media_name ?? data.originalname,
      body.media_name,
      request.body?.name,
    ];

    for (const candidate of nameCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return `"${candidate.trim()}"`;
      }
    }

    const idCandidates = [data.id, body.id, request.params?.id];

    for (const candidate of idCandidates) {
      if (typeof candidate === 'number') {
        return `#${candidate}`;
      }
      if (typeof candidate === 'string' && candidate.trim()) {
        return `#${candidate.trim()}`;
      }
    }

    return null;
  }

  private defaultVerb(method: string): string {
    if (method === 'POST') return 'created';
    if (method === 'PATCH' || method === 'PUT') return 'updated';
    return 'deleted';
  }

  private resolveUser(request: Request): string {
    const user = (request as { user?: { name?: string; email?: string; id?: number } }).user;
    if (user?.name) {
      return user.name;
    }
    if (user?.email) {
      return user.email;
    }
    return user?.id != null ? `User #${user.id}` : 'system';
  }

  private async writeLog(user: string, action: string, module: string): Promise<void> {
    await this.activityService.log(user, action, module);
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}