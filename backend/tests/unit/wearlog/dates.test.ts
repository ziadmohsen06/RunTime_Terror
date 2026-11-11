import { isValidDateKey } from '../../../src/services/wearlog/dates';

describe('isValidDateKey', () => {
  it.each(['2026-11-11', '2028-02-29'])('accepts the real date %s', (value) => {
    expect(isValidDateKey(value)).toBe(true);
  });

  // These used to throw a RangeError, which the API reported as a 500.
  it.each(['2026-13-45', '2026-00-10', '2026-02-30', '2027-02-29', '2026-1-1', 'tomorrow', ''])(
    'rejects %s without throwing',
    (value) => {
      expect(isValidDateKey(value)).toBe(false);
    }
  );
});
