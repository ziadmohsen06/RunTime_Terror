import Database from 'better-sqlite3';
import { NewRecurringTask, RecurringTask } from '../../domain/entities/RecurringTask';
import { DayOfWeek } from '../../domain/enums/DayOfWeek';
import { IRecurringTaskRepository } from '../interfaces/IRecurringTaskRepository';

interface RecurringTaskRow {
  id: number;
  user_id: number;
  title: string;
  day_of_week: string;
  active: number;
  created_at: string;
}

function mapTask(row: RecurringTaskRow): RecurringTask {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    dayOfWeek: row.day_of_week as DayOfWeek,
    active: row.active === 1,
    createdAt: new Date(row.created_at),
  };
}

export class SqliteRecurringTaskRepository implements IRecurringTaskRepository {
  constructor(private readonly db: Database.Database) {}

  async create(data: NewRecurringTask): Promise<RecurringTask> {
    const result = this.db
      .prepare(
        `INSERT INTO recurring_tasks (user_id, title, day_of_week, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(data.userId, data.title, data.dayOfWeek, new Date().toISOString());
    const task = await this.findById(Number(result.lastInsertRowid));
    if (!task) {
      throw new Error('Failed to load the created recurring task');
    }
    return task;
  }

  async findById(id: number): Promise<RecurringTask | null> {
    const row = this.db
      .prepare('SELECT * FROM recurring_tasks WHERE id = ?')
      .get(id) as RecurringTaskRow | undefined;
    return row ? mapTask(row) : null;
  }

  async findActiveByUser(userId: number): Promise<RecurringTask[]> {
    const rows = this.db
      .prepare('SELECT * FROM recurring_tasks WHERE user_id = ? AND active = 1 ORDER BY id')
      .all(userId) as RecurringTaskRow[];
    return rows.map(mapTask);
  }

  async findAllActive(): Promise<RecurringTask[]> {
    const rows = this.db
      .prepare('SELECT * FROM recurring_tasks WHERE active = 1 ORDER BY id')
      .all() as RecurringTaskRow[];
    return rows.map(mapTask);
  }

  async update(task: RecurringTask): Promise<void> {
    const result = this.db
      .prepare(
        `UPDATE recurring_tasks
         SET user_id = ?, title = ?, day_of_week = ?, active = ?, created_at = ?
         WHERE id = ?`
      )
      .run(
        task.userId,
        task.title,
        task.dayOfWeek,
        Number(task.active),
        task.createdAt.toISOString(),
        task.id
      );
    if (result.changes === 0) {
      throw new Error(`Recurring task ${task.id} does not exist`);
    }
  }
}
