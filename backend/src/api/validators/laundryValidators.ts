import { ValidationError } from '../../domain/errors/AppError';

export function parseId(value: unknown, name: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError(`${name} must be a positive whole number`);
  return id;
}

export function parseItemIds(body: unknown): number[] {
  const itemIds = (body as { itemIds?: unknown } | undefined)?.itemIds;
  if (!Array.isArray(itemIds)) throw new ValidationError('itemIds must be an array');
  return itemIds.map((id) => parseId(id, 'itemIds entries'));
}
