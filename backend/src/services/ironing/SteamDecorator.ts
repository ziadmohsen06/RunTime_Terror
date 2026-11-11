import { CareDecorator } from './CareDecorator';

/** Same temperature, plus the advice to use steam. */
export class SteamDecorator extends CareDecorator {
  getNotes(): string[] {
    return [...super.getNotes(), 'Use steam'];
  }
}