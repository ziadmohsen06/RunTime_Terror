import { ILoadRepository } from '../../../src/repositories/interfaces/ILoadRepository';
import { LoadStage } from '../../../src/domain/enums/LoadStage';
import { NewLaundryLoad } from '../../../src/domain/entities/LaundryLoad';
import { ColorGroup } from '../../../src/domain/enums/ColorGroup';
import { FabricGroup } from '../../../src/domain/enums/FabricGroup';
import { NotFoundError } from '../../../src/domain/errors/AppError';

const newLoad = (over: Partial<NewLaundryLoad> = {}): NewLaundryLoad => ({
  userId: 1,
  itemIds: [1, 2],
  colorGroup: ColorGroup.LIGHT,
  fabricGroup: FabricGroup.REGULAR,
  stage: LoadStage.PENDING,
  ...over,
});

// Every ILoadRepository implementation must pass these same tests.
export function describeLoadRepositoryContract(name: string, make: () => ILoadRepository) {
  describe(`${name} (load repository contract)`, () => {
    let repo: ILoadRepository;
    beforeEach(() => (repo = make()));

    it('assigns increasing ids and a createdAt date', async () => {
      const a = await repo.create(newLoad());
      const b = await repo.create(newLoad());
      expect([a.id, b.id]).toEqual([1, 2]);
      expect(a.createdAt).toBeInstanceOf(Date);
    });

    it('keeps the item order and groups it was created with', async () => {
      const a = await repo.create(newLoad({ itemIds: [7, 3, 5], colorGroup: ColorGroup.DARK, fabricGroup: FabricGroup.HEAVY }));
      const found = await repo.findById(a.id);
      expect(found?.itemIds).toEqual([7, 3, 5]);
      expect(found?.colorGroup).toBe(ColorGroup.DARK);
      expect(found?.fabricGroup).toBe(FabricGroup.HEAVY);
    });

    it('finds a load by id, or null', async () => {
      const a = await repo.create(newLoad());
      expect((await repo.findById(a.id))?.itemIds).toEqual([1, 2]);
      expect(await repo.findById(99)).toBeNull();
    });

    it("lists only the user's own loads", async () => {
      await repo.create(newLoad({ userId: 1 }));
      await repo.create(newLoad({ userId: 2 }));
      expect(await repo.findByUser(1)).toHaveLength(1);
    });

    it('finds the ACTIVE load that contains an item', async () => {
      const a = await repo.create(newLoad({ itemIds: [5] }));
      expect((await repo.findActiveByItemId(5))?.id).toBe(a.id);
      expect(await repo.findActiveByItemId(6)).toBeNull();
    });

    it('ignores DONE loads when looking for an active load', async () => {
      await repo.create(newLoad({ itemIds: [5], stage: LoadStage.DONE }));
      expect(await repo.findActiveByItemId(5)).toBeNull();
    });

    it('update saves a changed stage and a changed item list', async () => {
      const a = await repo.create(newLoad());
      await repo.update({ ...a, stage: LoadStage.WASHING, itemIds: [2] });
      const found = await repo.findById(a.id);
      expect(found?.stage).toBe(LoadStage.WASHING);
      expect(found?.itemIds).toEqual([2]);
    });

    it('update rejects a load that does not exist', async () => {
      const a = await repo.create(newLoad());
      await expect(repo.update({ ...a, id: 99 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('delete removes the load', async () => {
      const a = await repo.create(newLoad());
      await repo.delete(a.id);
      expect(await repo.findById(a.id)).toBeNull();
    });

    it('returns copies, so editing a result does not change stored data', async () => {
      const a = await repo.create(newLoad());
      a.itemIds.push(999);
      expect((await repo.findById(a.id))?.itemIds).toEqual([1, 2]);
    });
  });
}
