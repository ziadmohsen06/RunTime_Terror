import { CareRules } from '../laundry/ports';
import { CareInstruction } from './CareInstruction';

export class FabricCareRules implements CareRules {
  needsIroning(fabric: string): boolean {
    throw new Error('not implemented');
  }

  instructionsFor(fabric: string): CareInstruction {
    throw new Error('not implemented');
  }
}