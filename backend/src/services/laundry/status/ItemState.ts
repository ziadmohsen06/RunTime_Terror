import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { InvalidTransitionError } from '../../../domain/errors/InvalidTransitionError';

/** What a state needs to know about an item. */
export interface StateItem {
  id: number;
  userId: number;
  fabric: string;
}

// State pattern. Each status is one class that decides three things about itself:
//   1. where an item may go             (allowedTargets)
//   2. where it goes when its load advances (nextStatus)
//   3. what happens when an item enters it  (onEnter)
// Nothing outside these classes looks at the status to decide what to do.
export abstract class ItemState {
  abstract readonly status: ItemStatus;
  abstract readonly allowedTargets: readonly ItemStatus[];

  canMoveTo(target: ItemStatus): boolean {
    return this.allowedTargets.includes(target);
  }

  assertCanMoveTo(target: ItemStatus): void {
    if (!this.canMoveTo(target)) {
      throw new InvalidTransitionError(this.status, target);
    }
  }

  /** The status this state moves to when its load advances. Only states inside a load have one. */
  nextStatus(_item: StateItem): ItemStatus {
    throw new InvalidTransitionError(this.status, 'next status');
  }

  /** Side effect when an item enters this state. Runs after the new status is saved. */
  async onEnter(_item: StateItem): Promise<void> {}
}
