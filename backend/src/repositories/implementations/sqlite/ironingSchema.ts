import Database from 'better-sqlite3';

// item_id is the primary key, so an item can be in the queue only once. It has no foreign
// key on purpose: items belong to the Items module and are read through its service.
export function initIroningSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ironing_queue (
      item_id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      queued_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ironing_queue_user ON ironing_queue(user_id, queued_at);
  `);
}
