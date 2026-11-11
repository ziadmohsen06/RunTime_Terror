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