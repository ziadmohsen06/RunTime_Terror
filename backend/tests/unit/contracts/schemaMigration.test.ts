import Database from 'better-sqlite3';
import { initOutfitSchema } from '../../../src/repositories/implementations/sqlite/outfitSchema';
import { initUserSchema } from '../../../src/repositories/implementations/sqlite/userSchema';

const columns = (db: Database.Database, table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);

describe('schema upgrade of an existing database file', () => {
  it('adds users.name without losing existing users', () => {
    const db = new Database(':memory:');
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL)");
    db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('old@example.com', 'h');

    initUserSchema(db);
    initUserSchema(db); // running twice is safe

    expect(columns(db, 'users')).toContain('name');
    expect(db.prepare('SELECT email, name FROM users').get()).toEqual({ email: 'old@example.com', name: '' });
  });

  it('adds outfits.occasion and outfits.season', () => {
    const db = new Database(':memory:');
    db.exec("CREATE TABLE outfits (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)");

    initOutfitSchema(db);

    expect(columns(db, 'outfits')).toEqual(expect.arrayContaining(['occasion', 'season']));
  });
});
