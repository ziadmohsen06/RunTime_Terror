import Database from 'better-sqlite3';
import { NewWearLog, WearLog } from '../../domain/entities/WearLog';
import { IWearLogRepository } from '../interfaces/IWearLogRepository';

interface WearLogItemRow {
  id: number;
  user_id: number;
  worn_on: string;
  item_id: number;
}

export class SqliteWearLogRepository implements IWearLogRepository {
  constructor(private readonly db: Database.Database) {}

  async create(newLog: NewWearLog): Promise<WearLog> {
    const insertLog = this.db.prepare('INSERT INTO wear_logs (user_id, worn_on) VALUES (?, ?)');
    const insertItem = this.db.prepare(
      'INSERT INTO wear_log_items (wear_log_id, position, item_id) VALUES (?, ?, ?)'
    );

    // Both tables are written together, or not at all.
    const save = this.db.transaction((): number => {
      const { lastInsertRowid } = insertLog.run(newLog.userId, newLog.wornOn);
      const id = Number(lastInsertRowid);
      newLog.itemIds.forEach((itemId, position) => insertItem.run(id, position, itemId));
      return id;
    });

    return { id: save(), userId: newLog.userId, itemIds: [...newLog.itemIds], wornOn: newLog.wornOn };
  }

  // One query with a JOIN, then the rows are grouped back into logs in a single pass.
  async findAll(userId: number): Promise<WearLog[]> {
    const rows = this.db
      .prepare(
        `SELECT l.id, l.user_id, l.worn_on, i.item_id
         FROM wear_logs l
         JOIN wear_log_items i ON i.wear_log_id = l.id
         WHERE l.user_id = ?
         ORDER BY l.worn_on DESC, l.id DESC, i.position`
      )
      .all(userId) as WearLogItemRow[];

    const byId = rows.reduce((logs, row) => {
      const log = logs.get(row.id) ?? { id: row.id, userId: row.user_id, itemIds: [], wornOn: row.worn_on };
      log.itemIds.push(row.item_id);
      return logs.set(row.id, log);
    }, new Map<number, WearLog>());

    return [...byId.values()];
  }
}