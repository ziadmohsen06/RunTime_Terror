import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { InvalidTransitionError } from '../../../src/domain/errors/InvalidTransitionError';
import { ItemStatusMachine } from '../../../src/services/laundry/status/ItemStatusMachine';

// NFR1 (Data consistency): invalid state transitions are rejected, 100% of them.
// This table is the M1 state diagram written as data. Every pair NOT listed must be rejected.
const VALID: [ItemStatus, ItemStatus][] = [
  [ItemStatus.CLEAN, ItemStatus.DIRTY],
  [ItemStatus.DIRTY, ItemStatus.IN_LAUNDRY],
  [ItemStatus.IN_LAUNDRY, ItemStatus.WASHING],
  [ItemStatus.IN_LAUNDRY, ItemStatus.DIRTY], // removed from a load
  [ItemStatus.WASHING, ItemStatus.DRYING],
  [ItemStatus.DRYING, ItemStatus.IRONING],
  [ItemStatus.DRYING, ItemStatus.CLEAN],
  [ItemStatus.IRONING, ItemStatus.CLEAN],
];

const ALL = Object.values(ItemStatus);
const INVALID: [ItemStatus, ItemStatus][] = ALL.flatMap((from) =>
  ALL.map((to): [ItemStatus, ItemStatus] => [from, to])
).filter(([from, to]) => !VALID.some(([f, t]) => f === from && t === to));

describe('ItemStatusMachine', () => {
  const machine = new ItemStatusMachine();

  it('covers every from->to pair exactly once (6 x 6 = 36)', () => {
    expect(VALID.length + INVALID.length).toBe(ALL.length * ALL.length);
    expect(VALID).toHaveLength(8);
    expect(INVALID).toHaveLength(28);
  });

  it.each(VALID)('allows %s -> %s', (from, to) => {
    expect(machine.canTransition(from, to)).toBe(true);
    expect(() => machine.assertTransition(from, to)).not.toThrow();
  });

  it.each(INVALID)('rejects %s -> %s', (from, to) => {
    expect(machine.canTransition(from, to)).toBe(false);
    expect(() => machine.assertTransition(from, to)).toThrow(InvalidTransitionError);
  });

  it('puts both statuses in the error message', () => {
    expect(() => machine.assertTransition(ItemStatus.DIRTY, ItemStatus.DRYING)).toThrow(
      'Invalid status change: dirty -> drying'
    );
  });

  it('error carries HTTP status 409', () => {
    try {
      machine.assertTransition(ItemStatus.CLEAN, ItemStatus.WASHING);
      fail('should have thrown');
    } catch (e) {
      expect((e as InvalidTransitionError).statusCode).toBe(409);
    }
  });
});
