import { Item } from '../../domain/entities/Item';
import { LaundryLoad } from '../../domain/entities/LaundryLoad';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { LoadStage } from '../../domain/enums/LoadStage';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { ConflictError } from '../../domain/errors/ConflictError';
import { IItemRepository } from '../../repositories/interfaces/IItemRepository';
import { ILoadRepository } from '../../repositories/interfaces/ILoadRepository';
import { colorGroupOf } from './groups/colorGroupOf';
import { fabricGroupOf } from './groups/fabricGroupOf';
import { LoadStageMachine } from './LoadStageMachine';
import { CareRules, IroningQueue, ItemStatusUpdater } from './ports';
import { ItemStatusMachine } from './status/ItemStatusMachine';

export class LaundryService {
  constructor(
    private readonly items: IItemRepository,
    private readonly loads: ILoadRepository,
    private readonly statusUpdater: ItemStatusUpdater, // Joudy: the only way status changes
    careRules: CareRules, // Mohamed: used by the Drying state to choose ironing or clean
    ironingQueue: IroningQueue, // Mohamed: used by the Ironing state when an item enters it
    private readonly itemMachine = new ItemStatusMachine(careRules, ironingQueue),
    private readonly stageMachine = new LoadStageMachine()
  ) {}

  async markDirty(userId: number, itemId: number): Promise<Item> {
    const item = await this.ownedItem(userId, itemId);
    this.itemMachine.assertTransition(item.status, ItemStatus.DIRTY);
    const updated = await this.statusUpdater.updateStatus(item.id, ItemStatus.DIRTY);
    await this.itemMachine.enter(item, ItemStatus.DIRTY);
    return updated;
  }

  async listDirtyItems(userId: number): Promise<Item[]> {
    const all = await this.items.findAll(userId);
    return all.filter((item) => item.status === ItemStatus.DIRTY);
  }

  listLoads(userId: number): Promise<LaundryLoad[]> {
    return this.loads.findByUser(userId);
  }

  async createLoad(userId: number, itemIds: number[]): Promise<LaundryLoad> {
    if (itemIds.length === 0) throw new ValidationError('Select at least one item');
    if (new Set(itemIds).size !== itemIds.length) throw new ValidationError('Duplicate items in request');

    const items = await Promise.all(itemIds.map((id) => this.ownedItem(userId, id)));
    for (const item of items) {
      const existing = await this.loads.findActiveByItemId(item.id);
      if (existing) throw new ConflictError(`Item ${item.id} is already in load ${existing.id}`);
    }

    const colorGroups = new Set(items.map((i) => colorGroupOf(i.color)));
    const fabricGroups = new Set(items.map((i) => fabricGroupOf(i.fabric)));
    if (colorGroups.size > 1 || fabricGroups.size > 1) {
      throw new ValidationError('A load can only contain items from the same color group and fabric group');
    }

    let created!: LaundryLoad;
    await this.changeStatuses(items, this.sameTarget(items, ItemStatus.IN_LAUNDRY), async () => {
      created = await this.loads.create({
        userId,
        itemIds,
        colorGroup: [...colorGroups][0],
        fabricGroup: [...fabricGroups][0],
        stage: LoadStage.PENDING,
      });
    });
    return created;
  }

  async advanceLoad(userId: number, loadId: number): Promise<LaundryLoad> {
    const load = await this.ownedLoad(userId, loadId);
    const nextStage = this.stageMachine.next(load.stage); // rejects a DONE load
    const items = await Promise.all(load.itemIds.map((id) => this.ownedItem(userId, id)));
    // Each item's current state decides where it goes next (no status checks in the service).
    const targets = new Map(items.map((i) => [i.id, this.itemMachine.nextStatus(i)]));

    let advanced!: LaundryLoad;
    await this.changeStatuses(items, targets, async () => {
      advanced = await this.loads.update({ ...load, stage: nextStage });
    });
    return advanced;
  }

  /** Returns the updated load, or null when the last item was removed and the load deleted. */
  async removeItemFromLoad(userId: number, loadId: number, itemId: number): Promise<LaundryLoad | null> {
    const load = await this.ownedLoad(userId, loadId);
    if (!this.stageMachine.isActive(load.stage)) throw new ConflictError(`Load ${load.id} is already done`);
    if (!load.itemIds.includes(itemId)) throw new NotFoundError(`Item ${itemId} is not in load ${load.id}`);

    const item = await this.ownedItem(userId, itemId);
    const remaining = load.itemIds.filter((id) => id !== itemId);
    let result: LaundryLoad | null = null;
    await this.changeStatuses([item], this.sameTarget([item], ItemStatus.DIRTY), async () => {
      if (remaining.length === 0) {
        await this.loads.delete(load.id);
      } else {
        result = await this.loads.update({ ...load, itemIds: remaining });
      }
    });
    return result;
  }

  // ---- helpers ----

  private sameTarget(items: Item[], status: ItemStatus): Map<number, ItemStatus> {
    return new Map(items.map((i) => [i.id, status]));
  }

  /**
   * All-or-nothing: (1) check every transition with the state machine, (2) apply them through
   * updateStatus and run each new state's entry side effect, (3) run `afterwards`. If anything fails, already-changed items are restored.
   */
  private async changeStatuses(
    items: Item[],
    targets: Map<number, ItemStatus>,
    afterwards: () => Promise<void>
  ): Promise<void> {
    items.forEach((item) => this.itemMachine.assertTransition(item.status, targets.get(item.id)!));

    const originals = new Map(items.map((i) => [i.id, i.status]));
    const applied: Item[] = [];
    try {
      for (const item of items) {
        await this.statusUpdater.updateStatus(item.id, targets.get(item.id)!);
        applied.push(item);
      }
      // Side effects run only after every status is saved, so a failed update never leaves
      // an item in the ironing queue while its status was rolled back.
      for (const item of items) await this.itemMachine.enter(item, targets.get(item.id)!); // e.g. entering IRONING joins the queue
      await afterwards();
    } catch (err) {
      for (const item of applied) await this.statusUpdater.updateStatus(item.id, originals.get(item.id)!);
      throw err;
    }
  }

  private async ownedItem(userId: number, itemId: number): Promise<Item> {
    const item = await this.items.findById(itemId);
    if (!item || item.userId !== userId) throw new NotFoundError(`Item ${itemId} not found`);
    return item;
  }

  private async ownedLoad(userId: number, loadId: number): Promise<LaundryLoad> {
    const load = await this.loads.findById(loadId);
    if (!load || load.userId !== userId) throw new NotFoundError(`Load ${loadId} not found`);
    return load;
  }
}
