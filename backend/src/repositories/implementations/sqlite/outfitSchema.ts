import Database from 'better-sqlite3';
import { addColumnIfMissing } from './addColumnIfMissing';

// outfit_items.item_id has no foreign key on purpose: items belong to the Items
// module and are read through ItemService, so this module does not depend on that table.
export function initOutfitSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      occasion TEXT,
      season TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outfit_items (
      outfit_id INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      PRIMARY KEY (outfit_id, position)
    );
  `);
  addColumnIfMissing(db, 'outfits', 'occasion', 'TEXT');
  addColumnIfMissing(db, 'outfits', 'season', 'TEXT');
}
