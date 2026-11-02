import Database from 'better-sqlite3';

export function initRecurringSchema(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurring_task_id INTEGER NOT NULL REFERENCES recurring_tasks(id),
      user_id INTEGER NOT NULL,
      period_key TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      UNIQUE (recurring_task_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      occurrence_id INTEGER NOT NULL UNIQUE REFERENCES task_occurrences(id),
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}
