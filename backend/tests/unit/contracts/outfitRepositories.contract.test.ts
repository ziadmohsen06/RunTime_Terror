import Database from 'better-sqlite3';
import { InMemoryOutfitRepository } from '../../../src/repositories/implementations/InMemoryOutfitRepository';
import { SqliteOutfitRepository } from '../../../src/repositories/implementations/SqliteOutfitRepository';
import { initOutfitSchema } from '../../../src/repositories/implementations/sqlite/outfitSchema';
import { describeOutfitRepositoryContract } from './outfitRepositoryContract';

describeOutfitRepositoryContract('InMemoryOutfitRepository', () => new InMemoryOutfitRepository());

describeOutfitRepositoryContract('SqliteOutfitRepository', () => {
  const db = new Database(':memory:');
  initOutfitSchema(db);
  return new SqliteOutfitRepository(db);
});

describe('SqliteOutfitRepository persistence', () => {
  it('keeps outfits when a new repository opens the same database', async () => {
    const db = new Database(':memory:');
    initOutfitSchema(db);
    const saved = await new SqliteOutfitRepository(db).create({
      userId: 1,
      name: 'Look',
      itemIds: [2, 1],
      occasion: null,
      season: null,
    });

    initOutfitSchema(db);

    expect(await new SqliteOutfitRepository(db).findAll(1)).toEqual([saved]);
  });
});
