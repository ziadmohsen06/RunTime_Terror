import { CareRules, IroningQueue } from './ports';

// TEMPORARY stand-ins so the app runs before the other members' code exists.
// In app.ts, replace each one with Mohamed's real implementation and delete this file.

/** Replace with Mohamed's CareRules. */
export class TemporaryCareRules implements CareRules {
  needsIroning(fabric: string): boolean {
    return ['linen', 'silk'].includes(fabric.trim().toLowerCase());
  }
}

/** Replace with Mohamed's IroningQueue. */
export class TemporaryIroningQueue implements IroningQueue {
  async enqueue(_userId: number, _itemId: number): Promise<void> {}
}
