import { CareInstruction } from './CareInstruction';

// Wraps another CareInstruction and passes everything through. A concrete decorator
// overrides only what it changes (Decorator pattern).
export abstract class CareDecorator implements CareInstruction {
  constructor(protected readonly wrapped: CareInstruction) {}

  getTemperature(): number {
    return this.wrapped.getTemperature();
  }

  getNotes(): string[] {
    return this.wrapped.getNotes();
  }
}