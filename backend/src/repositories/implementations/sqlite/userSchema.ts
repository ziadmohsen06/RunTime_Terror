import Database from 'better-sqlite3';
import { addColumnIfMissing } from './addColumnIfMissing';

export function initUserSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );
  `);
  addColumnIfMissing(db, 'users', 'name', "TEXT NOT NULL DEFAULT ''");
}