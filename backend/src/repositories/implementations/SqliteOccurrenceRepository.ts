import Database from 'better-sqlite3';
import { TaskOccurrence } from '../../domain/entities/TaskOccurrence';
import { OccurrenceStatus } from '../../domain/enums/OccurrenceStatus';
import { IOccurrenceRepository } from '../interfaces/IOccurrenceRepository';

interface TaskOccurrenceRow {
  id: number;
  recurring_task_id: number;
  user_id: number;
  period_key: string;
  due_date: string;
  status: string;
  created_at: string;
}

function mapOccurrence(row: TaskOccurrenceRow): TaskOccurrence {
  return {
    id: row.id,
    recurringTaskId: row.recurring_task_id,
    userId: row.user_id,
    periodKey: row.period_key,
    dueDate: row.due_date,
    status: row.status as OccurrenceStatus,
    createdAt: new Date(row.created_at),
  };
}

export class SqliteOccurrenceRepository implements IOccurrenceRepository {
  constructor(private readonly db: Database.Database) {}

  async createIfNotExists(
    data: Omit<TaskOccurrence, 'id'>
  ): Promise<{ occurrence: TaskOccurrence; created: boolean }> {
    const result = this.db
      .prepare(
        `INSERT INTO task_occurrences
          (recurring_task_id, user_id, period_key, due_date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (recurring_task_id, period_key) DO NOTHING`
      )
      .run(
        data.recurringTaskId,
        data.userId,
        data.periodKey,
        data.dueDate,
        data.status,
        data.createdAt.toISOString()
      );
    const row = this.db
      .prepare('SELECT * FROM task_occurrences WHERE recurring_task_id = ? AND period_key = ?')
      .get(data.recurringTaskId, data.periodKey) as TaskOccurrenceRow | undefined;
    if (!row) {
      throw new Error('Failed to load the created task occurrence');
    }
    return { occurrence: mapOccurrence(row), created: result.changes > 0 };
  }

  async findById(id: number): Promise<TaskOccurrence | null> {
    const row = this.db
      .prepare('SELECT * FROM task_occurrences WHERE id = ?')
      .get(id) as TaskOccurrenceRow | undefined;
    return row ? mapOccurrence(row) : null;
  }

  async findByUserAndPeriod(userId: number, periodKey: string): Promise<TaskOccurrence[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM task_occurrences
         WHERE user_id = ? AND period_key = ?
         ORDER BY due_date, id`
      )
      .all(userId, periodKey) as TaskOccurrenceRow[];
    return rows.map(mapOccurrence);
  }

  async update(occurrence: TaskOccurrence): Promise<void> {
    const result = this.db
      .prepare(
        `UPDATE task_occurrences
         SET recurring_task_id = ?, user_id = ?, period_key = ?, due_date = ?, status = ?, created_at = ?
         WHERE id = ?`
      )
      .run(
        occurrence.recurringTaskId,
        occurrence.userId,
        occurrence.periodKey,
        occurrence.dueDate,
        occurrence.status,
        occurrence.createdAt.toISOString(),
        occurrence.id
      );
    if (result.changes === 0) {
      throw new Error(`Task occurrence ${occurrence.id} does not exist`);
    }
  }
}
