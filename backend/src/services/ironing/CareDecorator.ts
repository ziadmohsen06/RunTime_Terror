import { CareInstruction } from './CareInstruction';

export abstract class CareDecorator implements CareInstruction {
  constructor(protected readonly wrapped: CareInstruction) {}

  getTemperature(): number {
    throw new Error('not implemented');
  }

  getNotes(): string[] {
    throw new Error('not implemented');
  }
}