import { Item } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { ForbiddenError, NotFoundError } from '../../domain/errors/AppError';
import { ConflictError } from '../../domain/errors/ConflictError';
import { IIroningQueueRepository } from '../../repositories/interfaces/IIroningQueueRepository';
import { IroningQueue, ItemStatusUpdater } from '../laundry/ports';
import { ItemStatusMachine } from '../laundry/status/ItemStatusMachine';
import { CareInstructions, FabricCareRules } from './FabricCareRules';

// The only part of the Items module Ironing uses. ItemService implements both methods.
export interface IroningItemAccess extends ItemStatusUpdater {
  getById(id: number): Promise<Item | null>;
}

export interface QueuedItem {
  itemId: number;
  name: string;
  category: string;
  color: string;
  fabric: string;
  queuedAt: Date;
  care: CareInstructions;
}

// Implements the IroningQueue contract Laundry calls, and owns the queue from there on:
// only this service moves an item from "ironing" to "clean".
export class IroningService implements IroningQueue {
  constructor(
    private readonly queue: IIroningQueueRepository,
    private readonly items: IroningItemAccess,
    private readonly careRules: FabricCareRules,
    private readonly itemMachine = new ItemStatusMachine()
  ) {}

  async enqueue(userId: number, itemId: number): Promise<void> {
    await this.queue.add({ userId, itemId });
  }

  async getQueue(userId: number): Promise<QueuedItem[]> {
    const entries = await this.queue.findByUser(userId);
    const found = await Promise.all(
      entries.map(async (entry) => ({ entry, item: await this.items.getById(entry.itemId) }))
    );
    return found
      .filter((f): f is { entry: typeof f.entry; item: Item } => f.item !== null)
      .map(({ entry, item }) => ({
        itemId: item.id,
        name: item.name,
        category: item.category,
        color: item.color,
        fabric: item.fabric,
        queuedAt: entry.queuedAt,
        care: this.careRules.careFor(item.fabric),
      }));
  }

  async markIroned(userId: number, itemId: number): Promise<Item> {
    const item = await this.items.getById(itemId);
    if (!item) throw new NotFoundError(`Item ${itemId} not found`);
    if (item.userId !== userId) throw new ForbiddenError('You cannot change another user’s item');

    const entry = await this.queue.findByItemId(itemId);
    if (!entry || item.status !== ItemStatus.IRONING) {
      throw new ConflictError(`Item ${itemId} is not in your ironing queue`);
    }
    this.itemMachine.assertTransition(item.status, ItemStatus.CLEAN);

    const clean = await this.items.updateStatus(itemId, ItemStatus.CLEAN);
    try {
      await this.queue.remove(itemId);
    } catch (err) {
      await this.items.updateStatus(itemId, ItemStatus.IRONING); // keep status and queue in step
      throw err;
    }
    return clean;
  }
}
