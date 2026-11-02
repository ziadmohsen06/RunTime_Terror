import { Item } from '../../../src/domain/entities/Item';
import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { IItemRepository } from '../../../src/repositories/interfaces/IItemRepository';
import { CareRules, IroningQueue, ItemStatusUpdater } from '../../../src/services/laundry/ports';

// Fakes stand in for Joudy's updateStatus and Mohamed's CareRules / IroningQueue
// until the real ones exist.

export class FakeStatusUpdater implements ItemStatusUpdater {
  calls: Array<[number, ItemStatus]> = [];
  failForItemIds = new Set<number>();

  constructor(private readonly repo: IItemRepository) {}

  async updateStatus(itemId: number, status: ItemStatus): Promise<Item> {
    if (this.failForItemIds.has(itemId)) throw new Error(`updateStatus failed for item ${itemId}`);
    const item = await this.repo.findById(itemId);
    if (!item) throw new Error('item missing');
    item.status = status; // works because the in-memory repository returns the stored object
    this.calls.push([itemId, status]);
    return item;
  }
}

export class FakeCareRules implements CareRules {
  constructor(private readonly ironFabrics: string[] = ['linen', 'silk']) {}
  needsIroning(fabric: string): boolean {
    return this.ironFabrics.includes(fabric.toLowerCase());
  }
}

export class FakeIroningQueue implements IroningQueue {
  enqueued: Array<[number, number]> = [];
  async enqueue(userId: number, itemId: number): Promise<void> {
    this.enqueued.push([userId, itemId]);
  }
}
