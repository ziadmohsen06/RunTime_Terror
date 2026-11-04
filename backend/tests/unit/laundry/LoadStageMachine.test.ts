import { LoadStage } from '../../../src/domain/enums/LoadStage';
import { InvalidTransitionError } from '../../../src/domain/errors/InvalidTransitionError';
import { LoadStageMachine } from '../../../src/services/laundry/LoadStageMachine';

// FR1: each load advances PENDING -> WASHING -> DRYING -> DONE, nothing else.
const VALID: [LoadStage, LoadStage][] = [
  [LoadStage.PENDING, LoadStage.WASHING],
  [LoadStage.WASHING, LoadStage.DRYING],
  [LoadStage.DRYING, LoadStage.DONE],
];
const ALL = Object.values(LoadStage);
const INVALID: [LoadStage, LoadStage][] = ALL.flatMap((from) =>
  ALL.map((to): [LoadStage, LoadStage] => [from, to])
).filter(([from, to]) => !VALID.some(([f, t]) => f === from && t === to));

describe('LoadStageMachine', () => {
  const machine = new LoadStageMachine();

  it('covers all 16 pairs', () => {
    expect(VALID.length + INVALID.length).toBe(16);
  });

  it.each(VALID)('allows %s -> %s', (from, to) => {
    expect(() => machine.assertTransition(from, to)).not.toThrow();
    expect(machine.next(from)).toBe(to);
  });

  it.each(INVALID)('rejects %s -> %s', (from, to) => {
    expect(() => machine.assertTransition(from, to)).toThrow(InvalidTransitionError);
  });

  it('a DONE load cannot advance', () => {
    expect(() => machine.next(LoadStage.DONE)).toThrow(InvalidTransitionError);
  });

  it('isActive is true for every stage except DONE', () => {
    expect(ALL.filter((s) => machine.isActive(s))).toEqual([
      LoadStage.PENDING,
      LoadStage.WASHING,
      LoadStage.DRYING,
    ]);
  });
});
