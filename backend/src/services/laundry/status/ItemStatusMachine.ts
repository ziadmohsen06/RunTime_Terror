import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { CareRules, IroningQueue } from '../ports';
import { CleanState } from './CleanState';
import { DirtyState } from './DirtyState';
import { DryingState } from './DryingState';
import { InLaundryState } from './InLaundryState';
import { IroningState } from './IroningState';
import { ItemState, StateItem } from './ItemState';
import { WashingState } from './WashingState';

// Used when only the rules are needed (no real care rules or ironing queue).
const NO_CARE_RULES: CareRules = { needsIroning: () => false };
const NO_QUEUE: IroningQueue = { enqueue: async () => {} };

// Looks up the state object for a status and delegates to it.
export class ItemStatusMachine {
  private readonly states: Map<ItemStatus, ItemState>;

  constructor(careRules: CareRules = NO_CARE_RULES, ironingQueue: IroningQueue = NO_QUEUE) {
    this.states = new Map<ItemStatus, ItemState>(
      [
        new CleanState(),
        new DirtyState(),
        new InLaundryState(),
        new WashingState(),
        new DryingState(careRules),
        new IroningState(ironingQueue),
      ].map((s) => [s.status, s])
    );
  }

  canTransition(from: ItemStatus, to: ItemStatus): boolean {
    return this.stateOf(from).canMoveTo(to);
  }

  assertTransition(from: ItemStatus, to: ItemStatus): void {
    this.stateOf(from).assertCanMoveTo(to);
  }

  /** The status an item moves to when its load advances; the item's current state decides. */
  nextStatus(item: StateItem & { status: ItemStatus }): ItemStatus {
    return this.stateOf(item.status).nextStatus(item);
  }

  /** Runs the side effect of entering `status` (call after the new status is saved). */
  enter(item: StateItem, status: ItemStatus): Promise<void> {
    return this.stateOf(status).onEnter(item);
  }

  private stateOf(status: ItemStatus): ItemState {
    const state = this.states.get(status);
    if (!state) throw new Error(`Unknown item status: ${status}`);
    return state;
  }
}
