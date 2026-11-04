import Database from 'better-sqlite3';
import { InMemoryLoadRepository } from '../../../src/repositories/implementations/InMemoryLoadRepository';
import { SqliteLoadRepository } from '../../../src/repositories/implementations/SqliteLoadRepository';
import { initLoadSchema } from '../../../src/repositories/implementations/sqlite/loadSchema';
import { ColorGroup } from '../../../src/domain/enums/ColorGroup';
import { FabricGroup } from '../../../src/domain/enums/FabricGroup';
import { LoadStage } from '../../../src/domain/enums/LoadStage';
import { describeLoadRepositoryContract } from './loadRepositoryContract';

describeLoadRepositoryContract('InMemoryLoadRepository', () => new InMemoryLoadRepository());

describeLoadRepositoryContract('SqliteLoadRepository', () => {
  const db = new Database(':memory:');
  initLoadSchema(db);
  return new SqliteLoadRepository(db);
});

describe('SqliteLoadRepository persistence', () => {
  it('keeps loads when a new repository opens the same database', async () => {
    const db = new Database(':memory:');
    initLoadSchema(db);
    const saved = await new SqliteLoadRepository(db).create({
      userId: 1,
      itemIds: [4, 2],
      colorGroup: ColorGroup.LIGHT,
      fabricGroup: FabricGroup.REGULAR,
      stage: LoadStage.PENDING,
    });

    initLoadSchema(db);

    expect(await new SqliteLoadRepository(db).findByUser(1)).toEqual([saved]);
  });
});
