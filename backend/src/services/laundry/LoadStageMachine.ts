import { LoadStage } from '../../domain/enums/LoadStage';
import { InvalidTransitionError } from '../../domain/errors/InvalidTransitionError';

// The load lifecycle as data: PENDING -> WASHING -> DRYING -> DONE.
const NEXT: Partial<Record<LoadStage, LoadStage>> = {
  [LoadStage.PENDING]: LoadStage.WASHING,
  [LoadStage.WASHING]: LoadStage.DRYING,
  [LoadStage.DRYING]: LoadStage.DONE,
};

export class LoadStageMachine {
  next(stage: LoadStage): LoadStage {
    const target = NEXT[stage];
    if (!target) throw new InvalidTransitionError(stage, 'next stage');
    return target;
  }

  assertTransition(from: LoadStage, to: LoadStage): void {
    if (NEXT[from] !== to) throw new InvalidTransitionError(from, to);
  }

  isActive(stage: LoadStage): boolean {
    return stage !== LoadStage.DONE;
  }
}
