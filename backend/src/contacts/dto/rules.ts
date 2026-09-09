import {
  ValidateBy,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Laravel-compatible validation helpers.
 *
 * Laravel trims every string and converts empty strings to null before
 * validation (TrimStrings + ConvertEmptyStringsToNull). Each rule below
 * produces the exact single message Laravel would return for a field.
 */

export function isEmptyStringToNull(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  return value;
}

export function toNullableNumber(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : Number(trimmed);
  }

  return value;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function humanize(attribute: string): string {
  return `The ${attribute}`;
}

export interface LaravelStringRuleOptions {
  attribute: string;
  required?: boolean;
  max?: number;
  regex?: RegExp;
  regexMessage?: string;
}

export function IsLaravelStringRule(
  options: LaravelStringRuleOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'IsLaravelStringRule',
      constraints: [options],
      validator: {
        validate(value: unknown): boolean {
          if (isBlank(value)) {
            return !options.required;
          }

          if (typeof value !== 'string') {
            return false;
          }

          const length = Array.from(value).length;

          if (options.max !== undefined && length > options.max) {
            return false;
          }

          if (options.regex && !options.regex.test(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          const value = args.value;

          if (isBlank(value)) {
            return `${humanize(options.attribute)} field is required.`;
          }

          if (typeof value !== 'string') {
            return `${humanize(options.attribute)} must be a string.`;
          }

          const length = Array.from(value).length;

          if (options.max !== undefined && length > options.max) {
            return `${humanize(options.attribute)} must not be greater than ${options.max} characters.`;
          }

          if (options.regex && !options.regex.test(value)) {
            return options.regexMessage ?? `${humanize(options.attribute)} format is invalid.`;
          }

          return `${humanize(options.attribute)} field is required.`;
        },
      },
    },
    validationOptions,
  );
}

export function IsLaravelNullableInteger(
  options: { attribute: string },
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'IsLaravelNullableInteger',
      constraints: [options],
      validator: {
        validate(value: unknown): boolean {
          if (isBlank(value)) {
            return true;
          }

          if (typeof value !== 'number' || Number.isNaN(value)) {
            return false;
          }

          return Number.isInteger(value) && value >= 0;
        },
        defaultMessage(args: ValidationArguments): string {
          const value = args.value;

          if (isBlank(value)) {
            return '';
          }

          const number = Number(value);

          if (!Number.isInteger(number)) {
            return `${humanize(options.attribute)} must be an integer.`;
          }

          if (number < 0) {
            return `${humanize(options.attribute)} must be at least 0.`;
          }

          return `${humanize(options.attribute)} must be an integer.`;
        },
      },
    },
    validationOptions,
  );
}

export function IsLaravelEmail(
  options: { attribute: string },
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  const EMAIL_PATTERN =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return ValidateBy(
    {
      name: 'IsLaravelEmail',
      constraints: [options],
      validator: {
        validate(value: unknown): boolean {
          if (isBlank(value)) {
            return true;
          }

          if (typeof value !== 'string') {
            return false;
          }

          if (Array.from(value).length > 150) {
            return false;
          }

          return EMAIL_PATTERN.test(value);
        },
        defaultMessage(args: ValidationArguments): string {
          const value = args.value;

          if (typeof value === 'string' && Array.from(value).length > 150) {
            return `${humanize(options.attribute)} must not be greater than 150 characters.`;
          }

          return `${humanize(options.attribute)} must be a valid email address.`;
        },
      },
    },
    validationOptions,
  );
}

export function IsLaravelDate(
  options: { attribute: string },
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'IsLaravelDate',
      constraints: [options],
      validator: {
        validate(value: unknown): boolean {
          if (isBlank(value)) {
            return true;
          }

          if (typeof value === 'number') {
            return Number.isFinite(value);
          }

          if (typeof value !== 'string') {
            return false;
          }

          return !Number.isNaN(Date.parse(value));
        },
        defaultMessage(): string {
          return `${humanize(options.attribute)} must be a valid date.`;
        },
      },
    },
    validationOptions,
  );
}

export interface LaravelArrayOptions {
  attribute: string;
  required?: boolean;
}

/**
 * Accepts an array of positive integers (e.g. `contact_ids`, `group_ids`).
 * Blank/undefined passes through when not required; otherwise the value must be
 * an array where every element is an integer >= 1. Null/empty-string entries
 * are rejected rather than silently dropped.
 */
export function IsLaravelArrayOfIds(
  options: LaravelArrayOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'IsLaravelArrayOfIds',
      constraints: [options],
      validator: {
        validate(value: unknown): boolean {
          if (isBlank(value)) {
            return !options.required;
          }

          if (!Array.isArray(value)) {
            return false;
          }

          return value.every(
            (item) =>
              typeof item === 'number' &&
              Number.isInteger(item) &&
              item >= 1,
          );
        },
        defaultMessage(args: ValidationArguments): string {
          const value = args.value;

          if (isBlank(value)) {
            return `${humanize(options.attribute)} field is required.`;
          }

          if (!Array.isArray(value)) {
            return `${humanize(options.attribute)} must be an array.`;
          }

          return `${humanize(options.attribute)} must contain only positive integers.`;
        },
      },
    },
    validationOptions,
  );
}