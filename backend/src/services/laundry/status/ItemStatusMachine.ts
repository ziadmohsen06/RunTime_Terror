import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { CleanState } from './CleanState';
import { DirtyState } from './DirtyState';
import { DryingState } from './DryingState';
import { InLaundryState } from './InLaundryState';
import { IroningState } from './IroningState';
import { ItemState } from './ItemState';
import { WashingState } from './WashingState';

// Looks up the state object for a status and delegates the rule to it.
export class ItemStatusMachine {
  private readonly states = new Map<ItemStatus, ItemState>(
    [
      new CleanState(),
      new DirtyState(),
      new InLaundryState(),
      new WashingState(),
      new DryingState(),
      new IroningState(),
    ].map((s) => [s.status, s])
  );

  canTransition(from: ItemStatus, to: ItemStatus): boolean {
    return this.stateOf(from).canMoveTo(to);
  }

  assertTransition(from: ItemStatus, to: ItemStatus): void {
    this.stateOf(from).assertCanMoveTo(to);
  }

  private stateOf(status: ItemStatus): ItemState {
    const state = this.states.get(status);
    if (!state) throw new Error(`Unknown item status: ${status}`);
    return state;
  }
}
