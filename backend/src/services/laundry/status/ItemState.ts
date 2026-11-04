import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { InvalidTransitionError } from '../../../domain/errors/InvalidTransitionError';

// State pattern (M3 will add side effects here). Each status is one class that
// knows which statuses it may move to. Nothing outside these classes checks the status.
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
}
