import { Item } from '../../../src/domain/entities/Item';
import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { ForbiddenError, NotFoundError } from '../../../src/domain/errors/AppError';
import { ConflictError } from '../../../src/domain/errors/ConflictError';
import { InMemoryIroningQueueRepository } from '../../../src/repositories/implementations/InMemoryIroningQueueRepository';
import { FabricCareRules } from '../../../src/services/ironing/FabricCareRules';
import { IroningItemAccess, IroningService } from '../../../src/services/ironing/IroningService';

class FakeItems implements IroningItemAccess {
  items = new Map<number, Item>();
  calls: Array<[number, ItemStatus]> = [];
  failNextUpdateTo: ItemStatus | null = null;

  add(id: number, userId: number, fabric: string, status: ItemStatus = ItemStatus.IRONING): Item {
    const item: Item = {
      id, userId, name: `item ${id}`, category: 'top', color: 'white', season: 'summer', fabric, status,
      createdAt: new Date(),
    };
    this.items.set(id, item);
    return item;
  }

  async getById(id: number): Promise<Item | null> {
    return this.items.get(id) ?? null;
  }

  async updateStatus(id: number, status: ItemStatus): Promise<Item> {
    const item = this.items.get(id);
    if (!item) throw new NotFoundError('missing');
    item.status = status;
    this.calls.push([id, status]);
    return item;
  }
}

describe('IroningService', () => {
  let items: FakeItems;
  let queue: InMemoryIroningQueueRepository;
  let service: IroningService;

  beforeEach(() => {
    items = new FakeItems();
    queue = new InMemoryIroningQueueRepository();
    service = new IroningService(queue, items, new FabricCareRules());
  });

  describe('enqueue (called by Laundry)', () => {
    it('adds the item to the owner’s queue', async () => {
      items.add(1, 7, 'linen');
      await service.enqueue(7, 1);
      expect((await queue.findByUser(7)).map((e) => e.itemId)).toEqual([1]);
    });

    it('is safe to call twice for the same item', async () => {
      await service.enqueue(7, 1);
      await service.enqueue(7, 1);
      expect(await queue.findByUser(7)).toHaveLength(1);
    });
  });

  describe('listQueue', () => {
    it('shows each queued item with its care instructions', async () => {
      items.add(1, 7, 'silk');
      items.add(2, 7, 'linen');
      await service.enqueue(7, 1);
      await service.enqueue(7, 2);

      const list = await service.listQueue(7);

      expect(list.map((q) => q.itemId)).toEqual([1, 2]);
      expect(list[0]).toMatchObject({ name: 'item 1', fabric: 'silk' });
      expect(list[0].care).toMatchObject({ ironTemperatureC: 110, setting: 'low', steam: false });
      expect(list[1].care.ironTemperatureC).toBe(200);
    });

    it('shows only the caller’s own queue', async () => {
      items.add(1, 7, 'silk');
      items.add(2, 8, 'linen');
      await service.enqueue(7, 1);
      await service.enqueue(8, 2);
      expect((await service.listQueue(7)).map((q) => q.itemId)).toEqual([1]);
    });

    it('skips an entry whose item no longer exists', async () => {
      items.add(1, 7, 'silk');
      await service.enqueue(7, 1);
      await service.enqueue(7, 99);
      expect((await service.listQueue(7)).map((q) => q.itemId)).toEqual([1]);
    });

    it('is empty when nothing is queued', async () => {
      expect(await service.listQueue(7)).toEqual([]);
    });
  });

  describe('markIroned', () => {
    it('moves the item from the queue to clean', async () => {
      items.add(1, 7, 'linen');
      await service.enqueue(7, 1);

      const result = await service.markIroned(7, 1);

      expect(result.status).toBe(ItemStatus.CLEAN);
      expect(await queue.findByItemId(1)).toBeNull();
      expect(items.calls).toEqual([[1, ItemStatus.CLEAN]]);
    });

    it('rejects an item that does not exist', async () => {
      await expect(service.markIroned(7, 99)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects another user’s item with 403 and changes nothing', async () => {
      items.add(1, 8, 'linen');
      await service.enqueue(8, 1);

      const error = await service.markIroned(7, 1).catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(items.items.get(1)?.status).toBe(ItemStatus.IRONING);
      expect(await queue.findByItemId(1)).not.toBeNull();
    });

    it('rejects an item that is not in the queue', async () => {
      items.add(1, 7, 'linen');
      await expect(service.markIroned(7, 1)).rejects.toBeInstanceOf(ConflictError);
    });

    it('rejects a queued item whose status is not ironing', async () => {
      items.add(1, 7, 'linen', ItemStatus.CLEAN);
      await service.enqueue(7, 1);
      await expect(service.markIroned(7, 1)).rejects.toBeInstanceOf(ConflictError);
      expect(items.calls).toEqual([]);
    });

    it('cannot be done twice', async () => {
      items.add(1, 7, 'linen');
      await service.enqueue(7, 1);
      await service.markIroned(7, 1);
      await expect(service.markIroned(7, 1)).rejects.toBeInstanceOf(ConflictError);
    });

    it('puts the status back if the queue cannot be updated', async () => {
      items.add(1, 7, 'linen');
      await service.enqueue(7, 1);
      jest.spyOn(queue, 'remove').mockRejectedValueOnce(new Error('disk full'));

      await expect(service.markIroned(7, 1)).rejects.toThrow('disk full');

      expect(items.items.get(1)?.status).toBe(ItemStatus.IRONING);
      expect(await queue.findByItemId(1)).not.toBeNull();
    });
  });
});
