import { Item } from '../../domain/entities/Item';
import { CareInstructionProvider, IroningItemReader } from './ports';
import { IroningTask } from './IroningTask';
import { IroningQueue, ItemStatusUpdater } from '../laundry/ports';

export class IroningService implements IroningQueue {
  constructor(
    private readonly items: IroningItemReader,
    private readonly statusUpdater: ItemStatusUpdater,
    private readonly care: CareInstructionProvider
  ) {}

  async getQueue(userId: number): Promise<IroningTask[]> {
    throw new Error('not implemented');
  }

  async markIroned(userId: number, itemId: number): Promise<Item> {
    throw new Error('not implemented');
  }

  async enqueue(userId: number, itemId: number): Promise<void> {
    throw new Error('not implemented');
  }
}