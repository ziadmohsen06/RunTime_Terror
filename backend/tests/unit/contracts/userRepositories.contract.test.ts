import Database from 'better-sqlite3';
import { InMemoryUserRepository } from '../../../src/repositories/implementations/InMemoryUserRepository';
import { SqliteUserRepository } from '../../../src/repositories/implementations/SqliteUserRepository';
import { initUserSchema } from '../../../src/repositories/implementations/sqlite/userSchema';
import { describeUserRepositoryContract } from './userRepositoryContract';

describeUserRepositoryContract('InMemoryUserRepository', () => new InMemoryUserRepository());

describeUserRepositoryContract('SqliteUserRepository', () => {
  const db = new Database(':memory:');
  initUserSchema(db);
  return new SqliteUserRepository(db);
});

describe('SqliteUserRepository persistence', () => {
  it('keeps users when a new repository opens the same database', async () => {
    const db = new Database(':memory:');
    initUserSchema(db);
    const saved = await new SqliteUserRepository(db).create({
      email: 'sara@example.com',
      passwordHash: 'hash-1',
    });

    initUserSchema(db);

    expect(await new SqliteUserRepository(db).findByEmail('sara@example.com')).toEqual(saved);
  });
});