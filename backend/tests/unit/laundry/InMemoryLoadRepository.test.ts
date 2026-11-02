import { LoadStage } from '../../../src/domain/enums/LoadStage';
import { NewLaundryLoad } from '../../../src/domain/entities/LaundryLoad';
import { InMemoryLoadRepository } from '../../../src/repositories/implementations/InMemoryLoadRepository';
import { ColorGroup } from '../../../src/domain/enums/ColorGroup';
import { FabricGroup } from '../../../src/domain/enums/FabricGroup';

const newLoad = (over: Partial<NewLaundryLoad> = {}): NewLaundryLoad => ({
  userId: 1,
  itemIds: [1, 2],
  colorGroup: ColorGroup.LIGHT,
  fabricGroup: FabricGroup.REGULAR,
  stage: LoadStage.PENDING,
  ...over,
});

describe('InMemoryLoadRepository', () => {
  let repo: InMemoryLoadRepository;
  beforeEach(() => (repo = new InMemoryLoadRepository()));

  it('assigns increasing ids and a createdAt date', async () => {
    const a = await repo.create(newLoad());
    const b = await repo.create(newLoad());
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(a.createdAt).toBeInstanceOf(Date);
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

  it('update saves a changed stage', async () => {
    const a = await repo.create(newLoad());
    await repo.update({ ...a, stage: LoadStage.WASHING });
    expect((await repo.findById(a.id))?.stage).toBe(LoadStage.WASHING);
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
