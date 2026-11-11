import { Item } from '../../../src/domain/entities/Item';
import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { ConflictError } from '../../../src/domain/errors/ConflictError';
import { ForbiddenError, NotFoundError } from '../../../src/domain/errors/AppError';
import { InMemoryItemRepository } from '../../../src/repositories/implementations/InMemoryItemRepository';
import { FabricCareRules } from '../../../src/services/ironing/FabricCareRules';
import { IroningService } from '../../../src/services/ironing/IroningService';
import { ItemService } from '../../../src/services/items/ItemService';

// As a user, I want to see which of my washed clothes need ironing and at what temperature,
// so that I can iron them without damaging them. (NFR: each user only sees and edits their own.)
describe('IroningService', () => {
  const SARA = 1;
  const OMAR = 2;

  let items: ItemService;
  let ironing: IroningService;

  beforeEach(() => {
    items = new ItemService(new InMemoryItemRepository());
    ironing = new IroningService(items, items, new FabricCareRules());
  });

  async function addItem(userId: number, fabric: string, status: ItemStatus): Promise<Item> {
    const item = await items.addItem({
      userId,
      name: `${fabric} item`,
      category: 'top',
      color: 'white',
      season: 'summer',
      fabric,
    });
    return status === ItemStatus.CLEAN ? item : items.updateStatus(item.id, status);
  }

  describe('getQueue', () => {
    it('lists only my items that are waiting to be ironed', async () => {
      const linen = await addItem(SARA, 'linen', ItemStatus.IRONING);
      await addItem(SARA, 'cotton', ItemStatus.CLEAN);
      const silk = await addItem(SARA, 'silk', ItemStatus.IRONING);
      await addItem(OMAR, 'linen', ItemStatus.IRONING);

      const queue = await ironing.getQueue(SARA);

      expect(queue.map((task) => task.item.id)).toEqual([linen.id, silk.id]);
    });

    it('shows each task with the care instructions for its fabric', async () => {
      await addItem(SARA, 'linen', ItemStatus.IRONING);
      await addItem(SARA, 'silk', ItemStatus.IRONING);

      const [linen, silk] = await ironing.getQueue(SARA);

      expect([linen.temperature, linen.notes]).toEqual([230, ['Use steam']]);
      expect([silk.temperature, silk.notes]).toEqual([110, ['Use the low heat setting']]);
    });

    it('is empty when nothing needs ironing', async () => {
      await addItem(SARA, 'cotton', ItemStatus.CLEAN);

      expect(await ironing.getQueue(SARA)).toEqual([]);
    });
  });

  describe('markIroned', () => {
    it('moves the item from the queue to clean', async () => {
      const linen = await addItem(SARA, 'linen', ItemStatus.IRONING);

      const ironed = await ironing.markIroned(SARA, linen.id);

      expect(ironed.status).toBe(ItemStatus.CLEAN);
      expect((await items.getById(linen.id))!.status).toBe(ItemStatus.CLEAN);
      expect(await ironing.getQueue(SARA)).toEqual([]);
    });

    it("refuses another user's item with 403 and leaves it in the queue (NFR4)", async () => {
      const saras = await addItem(SARA, 'linen', ItemStatus.IRONING);

      await expect(ironing.markIroned(OMAR, saras.id)).rejects.toThrow(ForbiddenError);

      expect((await items.getById(saras.id))!.status).toBe(ItemStatus.IRONING);
      expect(await ironing.getQueue(SARA)).toHaveLength(1);
    });

    it('rejects an item that does not exist with 404', async () => {
      await expect(ironing.markIroned(SARA, 999)).rejects.toThrow(NotFoundError);
    });

    it('rejects an item that is not waiting to be ironed with 409', async () => {
      const clean = await addItem(SARA, 'cotton', ItemStatus.CLEAN);

      await expect(ironing.markIroned(SARA, clean.id)).rejects.toThrow(ConflictError);
    });
  });

  describe('enqueue (called by Laundry after it moves an item to ironing)', () => {
    it('accepts an item that Laundry has just sent to ironing', async () => {
      const linen = await addItem(SARA, 'linen', ItemStatus.IRONING);

      await expect(ironing.enqueue(SARA, linen.id)).resolves.toBeUndefined();
    });

    it("refuses another user's item with 403", async () => {
      const saras = await addItem(SARA, 'linen', ItemStatus.IRONING);

      await expect(ironing.enqueue(OMAR, saras.id)).rejects.toThrow(ForbiddenError);
    });

    it('refuses an item that is not in the ironing status with 409', async () => {
      const clean = await addItem(SARA, 'linen', ItemStatus.CLEAN);

      await expect(ironing.enqueue(SARA, clean.id)).rejects.toThrow(ConflictError);
    });

    it('never puts the same item in the queue twice', async () => {
      const linen = await addItem(SARA, 'linen', ItemStatus.IRONING);

      await ironing.enqueue(SARA, linen.id);
      await ironing.enqueue(SARA, linen.id);

      expect(await ironing.getQueue(SARA)).toHaveLength(1);
    });
  });
});