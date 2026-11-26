import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { IroningQueue } from '../ports';
import { ItemState, StateItem } from './ItemState';

export class IroningState extends ItemState {
  readonly status = ItemStatus.IRONING;
  readonly allowedTargets = [ItemStatus.CLEAN] as const;

  constructor(private readonly ironingQueue: IroningQueue) {
    super();
  }

  // Entering Ironing hands the item to the ironing module's queue.
  async onEnter(item: StateItem): Promise<void> {
    await this.ironingQueue.enqueue(item.userId, item.id);
  }
}
