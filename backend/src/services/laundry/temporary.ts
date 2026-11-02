import { Item } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { NotFoundError } from '../../domain/errors/AppError';
import { IItemRepository } from '../../repositories/interfaces/IItemRepository';
import { CareRules, IroningQueue, ItemStatusUpdater } from './ports';

// TEMPORARY stand-ins so the app runs before the other members' code exists.
// In app.ts, replace each one with the real implementation and delete this file.

/** Replace with Joudy's updateStatus. Works only because the in-memory repo returns the stored object. */
export class TemporaryItemStatusUpdater implements ItemStatusUpdater {
  constructor(private readonly items: IItemRepository) {}
  async updateStatus(itemId: number, status: ItemStatus): Promise<Item> {
    const item = await this.items.findById(itemId);
    if (!item) throw new NotFoundError(`Item ${itemId} not found`);
    item.status = status;
    return item;
  }
}

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
