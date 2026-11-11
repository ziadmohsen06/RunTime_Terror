import { Item } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { ConflictError } from '../../domain/errors/ConflictError';
import { ForbiddenError, NotFoundError } from '../../domain/errors/AppError';
import { IroningQueue, ItemStatusUpdater } from '../laundry/ports';
import { IroningTask } from './IroningTask';
import { CareInstructionProvider, IroningItemReader } from './ports';

/**
 * The ironing queue is simply the user's items whose status is "ironing": Laundry puts them
 * there, and only this service moves them to clean. Nothing else is stored.
 */
export class IroningService implements IroningQueue {
  constructor(
    private readonly items: IroningItemReader,
    private readonly statusUpdater: ItemStatusUpdater,
    private readonly care: CareInstructionProvider
  ) {}

  async getQueue(userId: number): Promise<IroningTask[]> {
    const waiting = await this.items.listItems(userId, { status: ItemStatus.IRONING });
    return waiting.map((item) => {
      const care = this.care.instructionsFor(item.fabric);
      return { item, temperature: care.getTemperature(), notes: care.getNotes() };
    });
  }

  async markIroned(userId: number, itemId: number): Promise<Item> {
    await this.waitingItem(userId, itemId);
    return this.statusUpdater.updateStatus(itemId, ItemStatus.CLEAN);
  }

  /**
   * Called by Laundry right after it sets an item to ironing. The status is the queue, so
   * this only checks the handover: the item is the user's and really is waiting to be ironed.
   */
  async enqueue(userId: number, itemId: number): Promise<void> {
    await this.waitingItem(userId, itemId);
  }

  private async waitingItem(userId: number, itemId: number): Promise<Item> {
    const item = await this.items.getById(itemId);
    if (!item) {
      throw new NotFoundError(`Item ${itemId} not found`);
    }
    if (item.userId !== userId) {
      throw new ForbiddenError(`Item ${itemId} belongs to another user`);
    }
    if (item.status !== ItemStatus.IRONING) {
      throw new ConflictError(`Item ${itemId} is not waiting to be ironed`);
    }
    return item;
  }
}
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
