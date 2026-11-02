import { Clock } from '../../src/domain/Clock';

export class FakeClock implements Clock {
  constructor(private currentTime: Date) {}

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  set(date: Date): void {
    this.currentTime = new Date(date.getTime());
  }

  advanceDays(days: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
