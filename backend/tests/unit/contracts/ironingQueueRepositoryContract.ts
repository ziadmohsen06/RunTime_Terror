import { IIroningQueueRepository } from '../../../src/repositories/interfaces/IIroningQueueRepository';

// Every IIroningQueueRepository implementation must pass these same tests.
export function describeIroningQueueRepositoryContract(name: string, make: () => IIroningQueueRepository) {
  describe(`${name} (ironing queue repository contract)`, () => {
    let repo: IIroningQueueRepository;
    beforeEach(() => (repo = make()));

    it('adds an item with a queuedAt date', async () => {
      const entry = await repo.add({ userId: 1, itemId: 10 });
      expect(entry).toMatchObject({ userId: 1, itemId: 10 });
      expect(entry.queuedAt).toBeInstanceOf(Date);
    });

    it('adding the same item twice keeps one entry', async () => {
      const first = await repo.add({ userId: 1, itemId: 10 });
      const second = await repo.add({ userId: 1, itemId: 10 });
      expect(second.queuedAt).toEqual(first.queuedAt);
      expect(await repo.findByUser(1)).toHaveLength(1);
    });

    it("lists only the user's own queue, oldest first", async () => {
      await repo.add({ userId: 1, itemId: 10 });
      await repo.add({ userId: 2, itemId: 11 });
      await repo.add({ userId: 1, itemId: 12 });
      expect((await repo.findByUser(1)).map((e) => e.itemId)).toEqual([10, 12]);
      expect((await repo.findByUser(2)).map((e) => e.itemId)).toEqual([11]);
    });

    it('finds an entry by item id, or null', async () => {
      await repo.add({ userId: 1, itemId: 10 });
      expect((await repo.findByItemId(10))?.userId).toBe(1);
      expect(await repo.findByItemId(99)).toBeNull();
    });

    it('removes an entry, and removing a missing one is harmless', async () => {
      await repo.add({ userId: 1, itemId: 10 });
      await repo.remove(10);
      await repo.remove(10);
      expect(await repo.findByItemId(10)).toBeNull();
      expect(await repo.findByUser(1)).toEqual([]);
    });

    it('returns copies, so editing a result does not change stored data', async () => {
      const entry = await repo.add({ userId: 1, itemId: 10 });
      entry.userId = 99;
      expect((await repo.findByItemId(10))?.userId).toBe(1);
    });
  });
}
