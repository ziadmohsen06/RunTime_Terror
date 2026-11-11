import { CareDecorator } from './CareDecorator';

const LOW_HEAT_LIMIT = 110;

/** Caps the temperature for delicate fabrics (never raises a lower one) and adds a note. */
export class LowHeatDecorator extends CareDecorator {
  getTemperature(): number {
    return Math.min(super.getTemperature(), LOW_HEAT_LIMIT);
  }

  getNotes(): string[] {
    return [...super.getNotes(), 'Use the low heat setting'];
  }
}