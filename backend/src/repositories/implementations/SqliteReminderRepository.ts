import Database from 'better-sqlite3';
import { Reminder } from '../../domain/entities/Reminder';
import { IReminderRepository } from '../interfaces/IReminderRepository';

interface ReminderRow {
  id: number;
  user_id: number;
  occurrence_id: number;
  message: string;
  is_read: number;
  created_at: string;
}

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    userId: row.user_id,
    occurrenceId: row.occurrence_id,
    message: row.message,
    read: row.is_read === 1,
    createdAt: new Date(row.created_at),
  };
}

export class SqliteReminderRepository implements IReminderRepository {
  constructor(private readonly db: Database.Database) {}

  async createIfNotExists(
    data: Omit<Reminder, 'id'>
  ): Promise<{ reminder: Reminder; created: boolean }> {
    const result = this.db
      .prepare(
        `INSERT INTO reminders (user_id, occurrence_id, message, is_read, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (occurrence_id) DO NOTHING`
      )
      .run(
        data.userId,
        data.occurrenceId,
        data.message,
        Number(data.read),
        data.createdAt.toISOString()
      );
    const row = this.db
      .prepare('SELECT * FROM reminders WHERE occurrence_id = ?')
      .get(data.occurrenceId) as ReminderRow | undefined;
    if (!row) {
      throw new Error('Failed to load the created reminder');
    }
    return { reminder: mapReminder(row), created: result.changes > 0 };
  }

  async findByUser(userId: number): Promise<Reminder[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM reminders
         WHERE user_id = ?
         ORDER BY is_read ASC, created_at DESC, id DESC`
      )
      .all(userId) as ReminderRow[];
    return rows.map(mapReminder);
  }

  async findById(id: number): Promise<Reminder | null> {
    const row = this.db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .get(id) as ReminderRow | undefined;
    return row ? mapReminder(row) : null;
  }

  async update(reminder: Reminder): Promise<void> {
    const result = this.db
      .prepare(
        `UPDATE reminders
         SET user_id = ?, occurrence_id = ?, message = ?, is_read = ?, created_at = ?
         WHERE id = ?`
      )
      .run(
        reminder.userId,
        reminder.occurrenceId,
        reminder.message,
        Number(reminder.read),
        reminder.createdAt.toISOString(),
        reminder.id
      );
    if (result.changes === 0) {
      throw new Error(`Reminder ${reminder.id} does not exist`);
    }
  }
}
