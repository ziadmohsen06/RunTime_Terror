import { CareInstruction } from './CareInstruction';

export class FabricCare implements CareInstruction {
  constructor(private readonly fabric: string) {}

  getTemperature(): number {
    throw new Error('not implemented');
  }

  getNotes(): string[] {
    throw new Error('not implemented');
  }
}