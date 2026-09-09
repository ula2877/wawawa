import {
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

export interface LaravelValidationErrors {
  message: string;
  errors: Record<string, string[]>;
}

export function buildLaravelErrorBody(
  errors: ValidationError[],
): LaravelValidationErrors {
  const mapped: Record<string, string[]> = {};

  const walk = (items: ValidationError[], prefix = '') => {
    for (const item of items) {
      const key = prefix ? `${prefix}.${item.property}` : item.property;

      if (item.constraints) {
        mapped[key] = Object.values(item.constraints);
      }

      if (item.children && item.children.length > 0) {
        walk(item.children, key);
      }
    }
  };

  walk(errors);

  const firstMessage = Object.values(mapped)[0]?.[0];

  return {
    message:
      firstMessage ?? 'The given data was invalid.',
    errors: mapped,
  };
}

export function laravelValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      return new UnprocessableEntityException(buildLaravelErrorBody(errors));
    },
  });
}