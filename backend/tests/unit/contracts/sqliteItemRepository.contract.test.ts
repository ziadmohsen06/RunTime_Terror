
import Database from 'better-sqlite3';
import { SqliteItemRepository } from '../../../src/repositories/implementations/SqliteItemRepository';
import { initRecurringSchema } from '../../../src/repositories/implementations/sqlite/recurringSchema';
import { ItemStatus } from '../../../src/domain/enums/ItemStatus';

describe('SqliteItemRepository', () => {
  let db: Database.Database;
  let repository: SqliteItemRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    initRecurringSchema(db);
    repository = new SqliteItemRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates an item with CLEAN status', async () => {
    const item = await repository.create({
      userId: 1,
      name: 'Blue shirt',
      category: 'shirt',
      color: 'blue',
      season: 'summer',
      fabric: 'cotton',
    });

    expect(item.id).toBeGreaterThan(0);
    expect(item.status).toBe('clean');
    expect(item.name).toBe('Blue shirt');
    expect(item.createdAt).toBeInstanceOf(Date);
  });

  it('filters items by category', async () => {
    await repository.create({
      userId: 1,
      name: 'Blue shirt',
      category: 'shirt',
      color: 'blue',
      season: 'summer',
      fabric: 'cotton',
    });

    await repository.create({
      userId: 1,
      name: 'Red trousers',
      category: 'trousers',
      color: 'red',
      season: 'winter',
      fabric: 'wool',
    });

    const items = await repository.findAll(1, { category: 'shirt' });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Blue shirt');
  });

  it('updates an item status', async () => {
    const item = await repository.create({
      userId: 1,
      name: 'Blue shirt',
      category: 'shirt',
      color: 'blue',
      season: 'summer',
      fabric: 'cotton',
    });

    const updated = await repository.updateStatus(item.id, ItemStatus.DIRTY);

    expect(updated?.status).toBe('dirty');
  });

  it('returns null when an item does not exist', async () => {
    const item = await repository.findById(99999);

    expect(item).toBeNull();
  });

    it('filters items by color', async () => {
    await repository.create({
      userId: 1,
      name: 'Blue shirt',
      category: 'shirt',
      color: 'blue',
      season: 'summer',
      fabric: 'cotton',
    });

    await repository.create({
      userId: 1,
      name: 'Red shirt',
      category: 'shirt',
      color: 'red',
      season: 'summer',
      fabric: 'cotton',
    });

    const items = await repository.findAll(1, { color: 'blue' });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Blue shirt');
  });

  it('filters items by season', async () => {
    await repository.create({
      userId: 1,
      name: 'Summer shirt',
      category: 'shirt',
      color: 'blue',
      season: 'summer',
      fabric: 'cotton',
    });

    await repository.create({
      userId: 1,
      name: 'Winter coat',
      category: 'coat',
      color: 'black',
      season: 'winter',
      fabric: 'wool',
    });

    const items = await repository.findAll(1, { season: 'winter' });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Winter coat');
  });

  it('filters items by status', async () => {
    const item = await repository.create({
      userId: 1,
      name: 'Blue shirt',
      category: 'shirt',
      color: 'blue',
      season: 'summer',
      fabric: 'cotton',
    });

    await repository.updateStatus(item.id, ItemStatus.DIRTY);

    const items = await repository.findAll(1, {
      status: ItemStatus.DIRTY,
    });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Blue shirt');
  });

  it('returns only items belonging to the requested user', async () => {
    await repository.create({
      userId: 1,
      name: 'User 1 shirt',
      category: 'shirt',
      color: 'blue',
      season: 'summer',
      fabric: 'cotton',
    });

    await repository.create({
      userId: 2,
      name: 'User 2 shirt',
      category: 'shirt',
      color: 'red',
      season: 'summer',
      fabric: 'cotton',
    });

    const items = await repository.findAll(1);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('User 1 shirt');
    });
});
