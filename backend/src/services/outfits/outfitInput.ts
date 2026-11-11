import { Occasion } from '../../domain/enums/Occasion';
import { ValidationError } from '../../domain/errors/AppError';
import { parseSeason } from './matching/matchingTables';

export function parseOccasion(value: string | undefined): Occasion {
  const occasion = Object.values(Occasion).find((known) => known === value);
  if (!occasion) {
    throw new ValidationError(`Occasion must be one of: ${Object.values(Occasion).join(', ')}`);
  }
  return occasion;
}

export function parseSeasonOrThrow(value: string | undefined) {
  const season = parseSeason(value ?? '');
  if (!season) {
    throw new ValidationError('Season must be one of: spring, summer, autumn, winter');
  }
  return season;
}
