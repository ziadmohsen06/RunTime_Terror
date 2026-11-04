import { ValidationError } from '../../domain/errors/AppError';

export function isRequestRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseResourceId(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ValidationError('Id must be a positive number');
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ValidationError('Id must be a positive number');
  }
  return id;
}

export function parseAsOfDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('asOf must use the YYYY-MM-DD format');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError('asOf must be a valid calendar date');
  }
  return date;
}
