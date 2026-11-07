import Database from 'better-sqlite3';

// wear_log_items.item_id has no foreign key on purpose: items belong to the Items
// module and are read through ItemService, so this module does not depend on that table.
export function initWearLogSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wear_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      worn_on TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wear_log_items (
      wear_log_id INTEGER NOT NULL REFERENCES wear_logs(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      PRIMARY KEY (wear_log_id, position)
    );

    CREATE INDEX IF NOT EXISTS idx_wear_logs_user ON wear_logs (user_id, worn_on);
  `);
}