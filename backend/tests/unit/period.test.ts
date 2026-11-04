import { DayOfWeek } from '../../src/domain/enums/DayOfWeek';
import { getDueDate, getPeriodKey, isValidPeriodKey } from '../../src/services/recurring/period';

describe('recurring period helpers', () => {
  it.each([
    ['2025-12-29T00:00:00.000Z', '2026-W01'],
    ['2026-11-02T00:00:00.000Z', '2026-W45'],
    ['2026-11-08T23:59:59.000Z', '2026-W45'],
    ['2026-12-28T00:00:00.000Z', '2026-W53'],
    ['2027-01-03T00:00:00.000Z', '2026-W53'],
    ['2027-01-04T00:00:00.000Z', '2027-W01'],
  ])('gets ISO week %s as %s', (date, periodKey) => {
    expect(getPeriodKey(new Date(date))).toBe(periodKey);
  });

  it.each([
    ['2026-W01', true],
    ['2026-W53', true],
    ['2026-W00', false],
    ['2026-W54', false],
    ['26-W01', false],
    ['2026-w01', false],
  ])('validates period key %s', (key, valid) => {
    expect(isValidPeriodKey(key)).toBe(valid);
  });

  it.each([
    [DayOfWeek.MONDAY, '2026-11-02'],
    [DayOfWeek.TUESDAY, '2026-11-03'],
    [DayOfWeek.WEDNESDAY, '2026-11-04'],
    [DayOfWeek.THURSDAY, '2026-11-05'],
    [DayOfWeek.FRIDAY, '2026-11-06'],
    [DayOfWeek.SATURDAY, '2026-11-07'],
    [DayOfWeek.SUNDAY, '2026-11-08'],
  ])('gets %s due date for the ISO week', (day, dueDate) => {
    expect(getDueDate(new Date('2026-11-04T15:00:00.000Z'), day)).toBe(dueDate);
  });
});
