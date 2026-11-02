import { SystemClock } from '../../src/domain/Clock';
import { FakeClock } from '../helpers/FakeClock';

describe('Clock', () => {
  it('SystemClock returns a Date close to the current time', () => {
    const before = Date.now();
    const now = new SystemClock().now();
    const after = Date.now();

    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });

  it('FakeClock can be set and advanced by days', () => {
    const clock = new FakeClock(new Date('2026-11-02T12:00:00.000Z'));

    expect(clock.now()).toEqual(new Date('2026-11-02T12:00:00.000Z'));
    clock.advanceDays(7);
    expect(clock.now()).toEqual(new Date('2026-11-09T12:00:00.000Z'));
    clock.set(new Date('2026-12-01T00:00:00.000Z'));
    expect(clock.now()).toEqual(new Date('2026-12-01T00:00:00.000Z'));
  });
});
