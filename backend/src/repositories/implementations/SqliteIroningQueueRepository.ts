import Database from 'better-sqlite3';
import { IroningEntry, NewIroningEntry } from '../../domain/entities/IroningEntry';
import { IIroningQueueRepository } from '../interfaces/IIroningQueueRepository';

interface EntryRow {
  item_id: number;
  user_id: number;
  queued_at: string;
}

const mapEntry = (row: EntryRow): IroningEntry => ({
  itemId: row.item_id,
  userId: row.user_id,
  queuedAt: new Date(row.queued_at),
});

export class SqliteIroningQueueRepository implements IIroningQueueRepository {
  constructor(private readonly db: Database.Database) {}

  async add(data: NewIroningEntry): Promise<IroningEntry> {
    this.db
      .prepare('INSERT OR IGNORE INTO ironing_queue (item_id, user_id, queued_at) VALUES (?, ?, ?)')
      .run(data.itemId, data.userId, new Date().toISOString());
    const saved = await this.findByItemId(data.itemId);
    if (!saved) throw new Error('Failed to load the queued item');
    return saved;
  }

  async findByUser(userId: number): Promise<IroningEntry[]> {
    const rows = this.db
      .prepare('SELECT * FROM ironing_queue WHERE user_id = ? ORDER BY queued_at, item_id')
      .all(userId) as EntryRow[];
    return rows.map(mapEntry);
  }

  async findByItemId(itemId: number): Promise<IroningEntry | null> {
    const row = this.db.prepare('SELECT * FROM ironing_queue WHERE item_id = ?').get(itemId) as
      | EntryRow
      | undefined;
    return row ? mapEntry(row) : null;
  }

  async remove(itemId: number): Promise<void> {
    this.db.prepare('DELETE FROM ironing_queue WHERE item_id = ?').run(itemId);
  }
}
