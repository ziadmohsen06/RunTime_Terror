import { addDays, isValidDateKey, mondayOf, toDateKey } from '../../../src/services/wearlog/dates';

// Bug: a date whose month or day is out of range but still matches \d{4}-\d{2}-\d{2}
// (e.g. month 13, day 32) throws instead of returning false, because
// new Date(...).toISOString() throws on an Invalid Date rather than returning one.
// A rollover date like 2026-02-30 is a different case: JS normalizes it to a real
// date (2026-03-02) that just fails the round-trip check, so it already worked.
describe('isValidDateKey', () => {
  it('accepts a real calendar date', () => {
    expect(isValidDateKey('2026-11-11')).toBe(true);
  });

  it('accepts Feb 29 in a leap year', () => {
    expect(isValidDateKey('2024-02-29')).toBe(true);
  });

  it('rejects Feb 29 in a non-leap year, without throwing', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false);
  });

  it('rejects a rollover date like Feb 30, without throwing', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false);
  });

  it.each(['2026-13-01', '2026-00-01', '2026-01-32', '2026-01-00'])(
    'rejects %s without throwing',
    (value) => {
      expect(() => isValidDateKey(value)).not.toThrow();
      expect(isValidDateKey(value)).toBe(false);
    }
  );

  it('rejects a badly formatted string', () => {
    expect(isValidDateKey('11/06/2026')).toBe(false);
  });
});

describe('addDays and mondayOf', () => {
  it('adds and subtracts days across a month boundary', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-01', -1)).toBe('2026-11-30');
  });

  it('finds the Monday of the week for every day of the week', () => {
    expect(mondayOf('2026-11-09')).toBe('2026-11-09'); // Monday itself
    expect(mondayOf('2026-11-11')).toBe('2026-11-09'); // Wednesday
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // Sunday, same week
  });

  it('round-trips through toDateKey', () => {
    expect(toDateKey(new Date('2026-11-11T00:00:00Z'))).toBe('2026-11-11');
  });
});
