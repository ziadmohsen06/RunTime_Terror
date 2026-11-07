import Database from 'better-sqlite3';
import { InMemoryWearLogRepository } from '../../../src/repositories/implementations/InMemoryWearLogRepository';
import { SqliteWearLogRepository } from '../../../src/repositories/implementations/SqliteWearLogRepository';
import { initWearLogSchema } from '../../../src/repositories/implementations/sqlite/wearLogSchema';
import { describeWearLogRepositoryContract } from './wearLogRepositoryContract';

describeWearLogRepositoryContract('InMemoryWearLogRepository', () => new InMemoryWearLogRepository());

describeWearLogRepositoryContract('SqliteWearLogRepository', () => {
  const db = new Database(':memory:');
  initWearLogSchema(db);
  return new SqliteWearLogRepository(db);
});

describe('SqliteWearLogRepository persistence', () => {
  it('keeps wear logs when a new repository opens the same database', async () => {
    const db = new Database(':memory:');
    initWearLogSchema(db);
    const saved = await new SqliteWearLogRepository(db).create({
      userId: 1,
      itemIds: [2, 1],
      wornOn: '2026-11-06',
    });

    initWearLogSchema(db);

    expect(await new SqliteWearLogRepository(db).findAll(1)).toEqual([saved]);
  });
});