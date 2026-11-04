import Database from 'better-sqlite3';

// load_items.item_id has no foreign key on purpose: items belong to the Items module
// and are read through its service, so Laundry does not depend on that table.
export function initLoadSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS laundry_loads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      color_group TEXT NOT NULL,
      fabric_group TEXT NOT NULL,
      stage TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS laundry_load_items (
      load_id INTEGER NOT NULL REFERENCES laundry_loads(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      PRIMARY KEY (load_id, position)
    );
  `);
}
