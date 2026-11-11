import Database from 'better-sqlite3';
import { InMemoryIroningQueueRepository } from '../../../src/repositories/implementations/InMemoryIroningQueueRepository';
import { SqliteIroningQueueRepository } from '../../../src/repositories/implementations/SqliteIroningQueueRepository';
import { initIroningSchema } from '../../../src/repositories/implementations/sqlite/ironingSchema';
import { describeIroningQueueRepositoryContract } from './ironingQueueRepositoryContract';

describeIroningQueueRepositoryContract('InMemoryIroningQueueRepository', () => new InMemoryIroningQueueRepository());

describeIroningQueueRepositoryContract('SqliteIroningQueueRepository', () => {
  const db = new Database(':memory:');
  initIroningSchema(db);
  return new SqliteIroningQueueRepository(db);
});

describe('SqliteIroningQueueRepository persistence', () => {
  it('keeps the queue when a new repository opens the same database', async () => {
    const db = new Database(':memory:');
    initIroningSchema(db);
    const saved = await new SqliteIroningQueueRepository(db).add({ userId: 1, itemId: 4 });

    initIroningSchema(db);

    expect(await new SqliteIroningQueueRepository(db).findByUser(1)).toEqual([saved]);
  });
});
