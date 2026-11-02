import { Item } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';

// The three functions Laundry needs from other members' modules. Laundry depends on
// these small interfaces (Dependency Inversion); tests use fakes until the real ones exist.

/** Joudy (Items): the ONLY way Laundry changes an item's status. */
export interface ItemStatusUpdater {
  updateStatus(itemId: number, status: ItemStatus): Promise<Item>;
}

/** Mohamed (Ironing & Care): does this fabric need ironing? */
export interface CareRules {
  needsIroning(fabric: string): boolean;
}

/** Mohamed (Ironing & Care): add an item to the user's ironing queue. */
export interface IroningQueue {
  enqueue(userId: number, itemId: number): Promise<void>;
}
