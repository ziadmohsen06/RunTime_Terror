import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../src/domain/errors/AppError';
import { InMemoryItemRepository } from '../../../src/repositories/implementations/InMemoryItemRepository';
import { InMemoryWearLogRepository } from '../../../src/repositories/implementations/InMemoryWearLogRepository';
import { ItemService } from '../../../src/services/items/ItemService';
import { WearLogService } from '../../../src/services/wearlog/WearLogService';
import { FakeClock } from '../../helpers/FakeClock';

// User story: As a user, I want to log what I wear and see my wear stats,
// so that I know which clothes I wear the most and which ones I never wear.
// FR: log worn outfits; show most worn, least worn, not worn in 90 days, weekly summary.
// NFR3: reports in under 3 seconds for 1,000 wear logs.

// Friday 6 November 2026. Its week runs Monday 2 to Sunday 8 November.
const TODAY = '2026-11-06';

describe('WearLogService', () => {
  let clock: FakeClock;
  let items: ItemService;
  let service: WearLogService;

  const addItem = async (name: string, userId = 1) => {
    const item = await items.addItem({
      userId,
      name,
      category: 'top',
      color: 'black',
      season: 'All Season',
      fabric: 'cotton',
    });
    return item.id;
  };

  beforeEach(() => {
    clock = new FakeClock(new Date(`${TODAY}T12:00:00.000Z`));
    items = new ItemService(new InMemoryItemRepository());
    service = new WearLogService(items, new InMemoryWearLogRepository(), clock);
  });

  describe('logWear', () => {
    it('saves a log of the user\'s own items on the given date', async () => {
      const shirt = await addItem('Shirt');
      const jeans = await addItem('Jeans');

      const log = await service.logWear(1, { itemIds: [shirt, jeans], wornOn: '2026-11-05' });

      expect(log).toEqual({ id: log.id, userId: 1, itemIds: [shirt, jeans], wornOn: '2026-11-05' });
      expect(await service.listLogs(1)).toEqual([log]);
    });

    it('uses today from the clock when no date is given', async () => {
      const shirt = await addItem('Shirt');

      const log = await service.logWear(1, { itemIds: [shirt] });

      expect(log.wornOn).toBe(TODAY);
    });

    it('rejects an item that belongs to another user', async () => {
      const theirs = await addItem('Their shirt', 2);

      await expect(service.logWear(1, { itemIds: [theirs] })).rejects.toThrow(ForbiddenError);
      expect(await service.listLogs(1)).toEqual([]);
    });

    it('rejects an item that does not exist', async () => {
      await expect(service.logWear(1, { itemIds: [999] })).rejects.toThrow(NotFoundError);
    });

    it.each([
      ['no items', { itemIds: [] }],
      ['a repeated item', { itemIds: [1, 1] }],
      ['an id that is not a positive number', { itemIds: [0] }],
      ['a badly written date', { itemIds: [1], wornOn: '06/11/2026' }],
      ['a date that does not exist', { itemIds: [1], wornOn: '2026-02-30' }],
      ['a date in the future', { itemIds: [1], wornOn: '2026-11-07' }],
    ])('rejects %s', async (_case, input) => {
      await addItem('Shirt');

      await expect(service.logWear(1, input)).rejects.toThrow(ValidationError);
    });

    it('does not change the status of the worn items', async () => {
      const shirt = await addItem('Shirt');
      await items.updateStatus(shirt, ItemStatus.DIRTY);

      await service.logWear(1, { itemIds: [shirt] });

      expect((await items.getById(shirt))?.status).toBe(ItemStatus.DIRTY);
    });
  });

  describe('getStats: counts', () => {
    it('finds the most worn and least worn items', async () => {
      const shirt = await addItem('Shirt');
      const jeans = await addItem('Jeans');
      const scarf = await addItem('Scarf');
      await service.logWear(1, { itemIds: [shirt, jeans], wornOn: '2026-11-01' });
      await service.logWear(1, { itemIds: [shirt], wornOn: '2026-11-03' });
      await service.logWear(1, { itemIds: [shirt], wornOn: '2026-11-05' });

      const stats = await service.getStats(1);

      expect(stats.mostWorn.map((u) => [u.name, u.count])).toEqual([
        ['Shirt', 3],
        ['Jeans', 1],
      ]);
      expect(stats.leastWorn.map((u) => [u.name, u.count])).toEqual([
        ['Scarf', 0],
        ['Jeans', 1],
        ['Shirt', 3],
      ]);
      expect(stats.mostWorn[0].lastWornOn).toBe('2026-11-05');
      expect(stats.leastWorn[0].itemId).toBe(scarf);
    });

    it('breaks ties by item id so the order never changes', async () => {
      const first = await addItem('First');
      const second = await addItem('Second');
      await service.logWear(1, { itemIds: [second, first], wornOn: '2026-11-01' });

      const stats = await service.getStats(1);

      expect(stats.mostWorn.map((u) => u.itemId)).toEqual([first, second]);
    });

    it('shows at most 5 items in each top list', async () => {
      for (let i = 1; i <= 7; i++) {
        const id = await addItem(`Item ${i}`);
        await service.logWear(1, { itemIds: [id], wornOn: '2026-11-01' });
      }

      const stats = await service.getStats(1);

      expect(stats.mostWorn).toHaveLength(5);
      expect(stats.leastWorn).toHaveLength(5);
    });

    it('counts only the user\'s own logs', async () => {
      await addItem('Shirt');
      const theirs = await addItem('Their shirt', 2);
      await service.logWear(2, { itemIds: [theirs], wornOn: '2026-11-01' });

      const stats = await service.getStats(1);

      expect(stats.mostWorn).toEqual([]);
      expect(stats.leastWorn.map((u) => u.name)).toEqual(['Shirt']);
    });

    it('returns empty lists when the user has no items', async () => {
      const stats = await service.getStats(1);

      expect(stats.mostWorn).toEqual([]);
      expect(stats.leastWorn).toEqual([]);
      expect(stats.notWornIn90Days).toEqual([]);
    });
  });

  describe('getStats: not worn in the last 90 days', () => {
    // An item counts once its last wear is more than 90 days before today.
    const notWornNames = async () => (await service.getStats(1)).notWornIn90Days.map((u) => u.name);

    it('includes an item that was never worn', async () => {
      await addItem('Never worn');

      expect(await notWornNames()).toEqual(['Never worn']);
    });

    it('leaves out an item worn 89 days ago', async () => {
      const id = await addItem('Coat');
      await service.logWear(1, { itemIds: [id] });
      clock.advanceDays(89);

      expect(await notWornNames()).toEqual([]);
    });

    it('leaves out an item worn exactly 90 days ago', async () => {
      const id = await addItem('Coat');
      await service.logWear(1, { itemIds: [id] });
      clock.advanceDays(90);

      expect(await notWornNames()).toEqual([]);
    });

    it('includes an item worn 91 days ago', async () => {
      const id = await addItem('Coat');
      await service.logWear(1, { itemIds: [id] });
      clock.advanceDays(91);

      expect(await notWornNames()).toEqual(['Coat']);
    });

    it('uses the most recent wear, not the first one', async () => {
      const id = await addItem('Coat');
      await service.logWear(1, { itemIds: [id], wornOn: '2026-06-01' });
      await service.logWear(1, { itemIds: [id], wornOn: '2026-10-30' });

      expect(await notWornNames()).toEqual([]);
    });
  });

  describe('getStats: weekly summary', () => {
    it('counts only this week\'s logs, Monday to Sunday', async () => {
      const shirt = await addItem('Shirt');
      const jeans = await addItem('Jeans');
      await service.logWear(1, { itemIds: [shirt], wornOn: '2026-11-01' }); // last Sunday
      await service.logWear(1, { itemIds: [shirt, jeans], wornOn: '2026-11-02' }); // Monday
      await service.logWear(1, { itemIds: [shirt], wornOn: TODAY });

      const { weeklySummary } = await service.getStats(1);

      expect(weeklySummary).toEqual({
        weekStart: '2026-11-02',
        weekEnd: '2026-11-08',
        logCount: 2,
        totalWears: 3,
        distinctItems: 2,
      });
    });

    it('is all zeros for a week with no logs', async () => {
      const { weeklySummary } = await service.getStats(1);

      expect(weeklySummary).toMatchObject({ logCount: 0, totalWears: 0, distinctItems: 0 });
    });
  });

  describe('NFR3: performance', () => {
    it('builds the report for 1,000 wear logs in under 3 seconds', async () => {
      const itemIds: number[] = [];
      for (let i = 1; i <= 20; i++) {
        itemIds.push(await addItem(`Item ${i}`));
      }
      for (let i = 0; i < 1000; i++) {
        clock.set(new Date(Date.UTC(2026, 0, 1) + (i % 300) * 24 * 60 * 60 * 1000));
        await service.logWear(1, { itemIds: [itemIds[i % 20], itemIds[(i + 7) % 20]] });
      }

      const start = performance.now();
      const stats = await service.getStats(1);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(3000);
      expect(stats.mostWorn[0].count).toBe(100);
    });
  });
});