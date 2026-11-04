import { Item } from '../../../src/domain/entities/Item';
import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { LoadStage } from '../../../src/domain/enums/LoadStage';
import { ConflictError } from '../../../src/domain/errors/ConflictError';
import { NotFoundError, ValidationError } from '../../../src/domain/errors/AppError';
import { InvalidTransitionError } from '../../../src/domain/errors/InvalidTransitionError';
import { InMemoryItemRepository } from '../../../src/repositories/implementations/InMemoryItemRepository';
import { InMemoryLoadRepository } from '../../../src/repositories/implementations/InMemoryLoadRepository';
import { LaundryService } from '../../../src/services/laundry/LaundryService';
import { FakeCareRules, FakeIroningQueue, FakeStatusUpdater } from './fakes';

// User story (FR1): As a user, I want to group my dirty clothes into loads by color and
// fabric and track each load until it is clean, so that I know what is ready to wear
// and avoid damaging clothes by mixing them.
describe('LaundryService', () => {
  let itemRepo: InMemoryItemRepository;
  let loadRepo: InMemoryLoadRepository;
  let updater: FakeStatusUpdater;
  let queue: FakeIroningQueue;
  let service: LaundryService;

  const USER = 1;

  async function addItem(color: string, fabric: string, userId = USER): Promise<Item> {
    return itemRepo.create({ userId, name: `${color} ${fabric}`, category: 'top', color, season: 'summer', fabric });
  }
  async function dirtyItem(color: string, fabric: string): Promise<Item> {
    const item = await addItem(color, fabric);
    await service.markDirty(USER, item.id);
    return item;
  }
  const statusOf = async (id: number) => (await itemRepo.findById(id))!.status;

  beforeEach(() => {
    itemRepo = new InMemoryItemRepository();
    loadRepo = new InMemoryLoadRepository();
    updater = new FakeStatusUpdater(itemRepo);
    queue = new FakeIroningQueue();
    service = new LaundryService(itemRepo, loadRepo, updater, new FakeCareRules(), queue);
  });

  describe('markDirty', () => {
    it('moves a clean item to dirty through updateStatus', async () => {
      const item = await addItem('white', 'cotton');
      const result = await service.markDirty(USER, item.id);
      expect(result.status).toBe(ItemStatus.DIRTY);
      expect(updater.calls).toEqual([[item.id, ItemStatus.DIRTY]]);
    });

    it('rejects an item that is already dirty and changes nothing', async () => {
      const item = await dirtyItem('white', 'cotton');
      updater.calls = [];
      await expect(service.markDirty(USER, item.id)).rejects.toThrow(InvalidTransitionError);
      expect(updater.calls).toHaveLength(0);
    });

    it('rejects an unknown item', async () => {
      await expect(service.markDirty(USER, 99)).rejects.toThrow(NotFoundError);
    });

    it("rejects another user's item", async () => {
      const other = await addItem('white', 'cotton', 2);
      await expect(service.markDirty(USER, other.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe('listDirtyItems', () => {
    it("returns only the user's dirty items", async () => {
      const dirty = await dirtyItem('white', 'cotton');
      await addItem('black', 'cotton'); // clean
      const dirtyOfOther = await addItem('white', 'cotton', 2);
      await service.markDirty(2, dirtyOfOther.id);
      const result = await service.listDirtyItems(USER);
      expect(result.map((i) => i.id)).toEqual([dirty.id]);
    });
  });

  describe('createLoad', () => {
    it('creates a PENDING load and puts the items in laundry', async () => {
      const a = await dirtyItem('white', 'cotton');
      const b = await dirtyItem('cream', 'polyester'); // same groups: light + regular
      const load = await service.createLoad(USER, [a.id, b.id]);
      expect(load.stage).toBe(LoadStage.PENDING);
      expect(load.itemIds).toEqual([a.id, b.id]);
      expect(await statusOf(a.id)).toBe(ItemStatus.IN_LAUNDRY);
      expect(await statusOf(b.id)).toBe(ItemStatus.IN_LAUNDRY);
    });

    it('rejects mixed color groups and changes nothing', async () => {
      const white = await dirtyItem('white', 'cotton');
      const black = await dirtyItem('black', 'cotton');
      await expect(service.createLoad(USER, [white.id, black.id])).rejects.toThrow(ValidationError);
      expect(await statusOf(white.id)).toBe(ItemStatus.DIRTY);
      expect(await statusOf(black.id)).toBe(ItemStatus.DIRTY);
      expect(await loadRepo.findByUser(USER)).toHaveLength(0);
    });

    it('rejects mixed fabric groups', async () => {
      const cotton = await dirtyItem('white', 'cotton');
      const silk = await dirtyItem('white', 'silk');
      await expect(service.createLoad(USER, [cotton.id, silk.id])).rejects.toThrow(ValidationError);
    });

    it('rejects an item that is not dirty and changes nothing', async () => {
      const dirty = await dirtyItem('white', 'cotton');
      const clean = await addItem('white', 'cotton');
      await expect(service.createLoad(USER, [dirty.id, clean.id])).rejects.toThrow(InvalidTransitionError);
      expect(await statusOf(dirty.id)).toBe(ItemStatus.DIRTY);
      expect(await loadRepo.findByUser(USER)).toHaveLength(0);
    });

    it('an item cannot be in two active loads', async () => {
      const a = await dirtyItem('white', 'cotton');
      await service.createLoad(USER, [a.id]);
      await expect(service.createLoad(USER, [a.id])).rejects.toThrow(ConflictError);
      expect(await loadRepo.findByUser(USER)).toHaveLength(1);
    });

    it('rejects an empty selection and duplicate ids', async () => {
      const a = await dirtyItem('white', 'cotton');
      await expect(service.createLoad(USER, [])).rejects.toThrow(ValidationError);
      await expect(service.createLoad(USER, [a.id, a.id])).rejects.toThrow(ValidationError);
    });

    it('rejects an unknown item', async () => {
      await expect(service.createLoad(USER, [99])).rejects.toThrow(NotFoundError);
    });
  });

  describe('advanceLoad', () => {
    async function pendingLoad(...items: Item[]) {
      return service.createLoad(USER, items.map((i) => i.id));
    }

    it('PENDING -> WASHING puts the items in WASHING', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await pendingLoad(a);
      const advanced = await service.advanceLoad(USER, load.id);
      expect(advanced.stage).toBe(LoadStage.WASHING);
      expect(await statusOf(a.id)).toBe(ItemStatus.WASHING);
    });

    it('WASHING -> DRYING puts the items in DRYING', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await pendingLoad(a);
      await service.advanceLoad(USER, load.id);
      const advanced = await service.advanceLoad(USER, load.id);
      expect(advanced.stage).toBe(LoadStage.DRYING);
      expect(await statusOf(a.id)).toBe(ItemStatus.DRYING);
    });

    it('DRYING -> DONE sends items that need ironing to IRONING and the queue', async () => {
      const linen = await dirtyItem('white', 'linen');
      const cotton = await dirtyItem('white', 'cotton');
      const load = await pendingLoad(linen, cotton);
      await service.advanceLoad(USER, load.id);
      await service.advanceLoad(USER, load.id);
      const done = await service.advanceLoad(USER, load.id);
      expect(done.stage).toBe(LoadStage.DONE);
      expect(await statusOf(linen.id)).toBe(ItemStatus.IRONING);
      expect(await statusOf(cotton.id)).toBe(ItemStatus.CLEAN);
      expect(queue.enqueued).toEqual([[USER, linen.id]]);
    });

    it('a DONE load cannot advance and changes nothing', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await pendingLoad(a);
      for (let i = 0; i < 3; i++) await service.advanceLoad(USER, load.id);
      updater.calls = [];
      await expect(service.advanceLoad(USER, load.id)).rejects.toThrow(InvalidTransitionError);
      expect(updater.calls).toHaveLength(0);
      expect(await statusOf(a.id)).toBe(ItemStatus.CLEAN);
    });

    it('rejects an unknown load', async () => {
      await expect(service.advanceLoad(USER, 99)).rejects.toThrow(NotFoundError);
    });

    it('restores item statuses and the stage if one update fails', async () => {
      const a = await dirtyItem('white', 'cotton');
      const b = await dirtyItem('white', 'cotton');
      const load = await pendingLoad(a, b);
      updater.failForItemIds.add(b.id);
      await expect(service.advanceLoad(USER, load.id)).rejects.toThrow('updateStatus failed');
      expect(await statusOf(a.id)).toBe(ItemStatus.IN_LAUNDRY);
      expect(await statusOf(b.id)).toBe(ItemStatus.IN_LAUNDRY);
      expect((await loadRepo.findById(load.id))!.stage).toBe(LoadStage.PENDING);
    });

    it('a finished load frees its items for a new load', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await pendingLoad(a);
      for (let i = 0; i < 3; i++) await service.advanceLoad(USER, load.id);
      await service.markDirty(USER, a.id);
      const second = await service.createLoad(USER, [a.id]);
      expect(second.id).not.toBe(load.id);
    });
  });

  describe('removeItemFromLoad', () => {
    it('puts the item back to DIRTY and keeps the rest of the load', async () => {
      const a = await dirtyItem('white', 'cotton');
      const b = await dirtyItem('white', 'cotton');
      const load = await service.createLoad(USER, [a.id, b.id]);
      const result = await service.removeItemFromLoad(USER, load.id, a.id);
      expect(result!.itemIds).toEqual([b.id]);
      expect(await statusOf(a.id)).toBe(ItemStatus.DIRTY);
      expect(await statusOf(b.id)).toBe(ItemStatus.IN_LAUNDRY);
    });

    it('deletes the load when its last item is removed', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await service.createLoad(USER, [a.id]);
      expect(await service.removeItemFromLoad(USER, load.id, a.id)).toBeNull();
      expect(await loadRepo.findById(load.id)).toBeNull();
    });

    it('the removed item can join a new load', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await service.createLoad(USER, [a.id]);
      await service.removeItemFromLoad(USER, load.id, a.id);
      await expect(service.createLoad(USER, [a.id])).resolves.toBeDefined();
    });

    it('is rejected once washing has started, and changes nothing', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await service.createLoad(USER, [a.id]);
      await service.advanceLoad(USER, load.id);
      await expect(service.removeItemFromLoad(USER, load.id, a.id)).rejects.toThrow(InvalidTransitionError);
      expect(await statusOf(a.id)).toBe(ItemStatus.WASHING);
      expect((await loadRepo.findById(load.id))!.itemIds).toEqual([a.id]);
    });

    it('rejects an item that is not in the load', async () => {
      const a = await dirtyItem('white', 'cotton');
      const b = await dirtyItem('white', 'cotton');
      const load = await service.createLoad(USER, [a.id]);
      await expect(service.removeItemFromLoad(USER, load.id, b.id)).rejects.toThrow(NotFoundError);
    });

    it('rejects a finished load, so a clean item is never made dirty', async () => {
      const a = await dirtyItem('white', 'cotton');
      const load = await service.createLoad(USER, [a.id]);
      for (let i = 0; i < 3; i++) await service.advanceLoad(USER, load.id);
      await expect(service.removeItemFromLoad(USER, load.id, a.id)).rejects.toThrow(ConflictError);
      expect(await statusOf(a.id)).toBe(ItemStatus.CLEAN);
    });
  });
});
