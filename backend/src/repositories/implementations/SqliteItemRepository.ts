
import Database from 'better-sqlite3';
import { Item, NewItem } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import {
  IItemRepository,
  ItemFilter,
} from '../interfaces/IItemRepository';

interface ItemRow {
  id: number;
  user_id: number;
  name: string;
  category: string;
  color: string;
  season: string;
  fabric: string;
  photo_url: string | null;
  status: string;
  created_at: string;
}

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    color: row.color,
    season: row.season,
    fabric: row.fabric,
    photoUrl: row.photo_url ?? undefined,
    status: row.status as ItemStatus,
    createdAt: new Date(row.created_at),
  };
}

export class SqliteItemRepository implements IItemRepository {
  constructor(private readonly db: Database.Database) {}

  async create(data: NewItem): Promise<Item> {
    const result = this.db
      .prepare(
        `INSERT INTO items
          (user_id, name, category, color, season, fabric, photo_url, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.userId,
        data.name,
        data.category,
        data.color,
        data.season,
        data.fabric,
        data.photoUrl ?? null,
        ItemStatus.CLEAN,
        new Date().toISOString()
      );

    const item = await this.findById(Number(result.lastInsertRowid));

    if (!item) {
      throw new Error('Failed to load the created item');
    }

    return item;
  }

  async findAll(userId: number, filter: ItemFilter = {}): Promise<Item[]> {
    const conditions = ['user_id = ?'];
    const values: (string | number)[] = [userId];

    if (filter.category) {
      conditions.push('category = ?');
      values.push(filter.category);
    }

    if (filter.color) {
      conditions.push('color = ?');
      values.push(filter.color);
    }

    if (filter.season) {
      conditions.push('season = ?');
      values.push(filter.season);
    }

    if (filter.status) {
      conditions.push('status = ?');
      values.push(filter.status);
    }

    const rows = this.db
      .prepare(
        `SELECT * FROM items
         WHERE ${conditions.join(' AND ')}
         ORDER BY id`
      )
      .all(...values) as ItemRow[];

    return rows.map(mapItem);
  }

  async findById(id: number): Promise<Item | null> {
    const row = this.db
      .prepare('SELECT * FROM items WHERE id = ?')
      .get(id) as ItemRow | undefined;

    return row ? mapItem(row) : null;
  }

  async updateStatus(
    id: number,
    status: ItemStatus
  ): Promise<Item | null> {
    const result = this.db
      .prepare('UPDATE items SET status = ? WHERE id = ?')
      .run(status, id);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }
}
