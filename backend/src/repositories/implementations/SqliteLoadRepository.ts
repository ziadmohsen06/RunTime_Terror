import Database from 'better-sqlite3';
import { LaundryLoad, NewLaundryLoad } from '../../domain/entities/LaundryLoad';
import { ColorGroup } from '../../domain/enums/ColorGroup';
import { FabricGroup } from '../../domain/enums/FabricGroup';
import { LoadStage } from '../../domain/enums/LoadStage';
import { NotFoundError } from '../../domain/errors/AppError';
import { ILoadRepository } from '../interfaces/ILoadRepository';

interface LoadRow {
  id: number;
  user_id: number;
  color_group: string;
  fabric_group: string;
  stage: string;
  created_at: string;
}

export class SqliteLoadRepository implements ILoadRepository {
  constructor(private readonly db: Database.Database) {}

  async create(data: NewLaundryLoad): Promise<LaundryLoad> {
    const insert = this.db.transaction((load: NewLaundryLoad) => {
      const result = this.db
        .prepare(
          `INSERT INTO laundry_loads (user_id, color_group, fabric_group, stage, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(load.userId, load.colorGroup, load.fabricGroup, load.stage, new Date().toISOString());
      const id = Number(result.lastInsertRowid);
      this.writeItems(id, load.itemIds);
      return id;
    });
    return this.load(insert(data));
  }

  async findById(id: number): Promise<LaundryLoad | null> {
    const row = this.db.prepare('SELECT * FROM laundry_loads WHERE id = ?').get(id) as LoadRow | undefined;
    return row ? this.map(row) : null;
  }

  async findByUser(userId: number): Promise<LaundryLoad[]> {
    const rows = this.db
      .prepare('SELECT * FROM laundry_loads WHERE user_id = ? ORDER BY id')
      .all(userId) as LoadRow[];
    return rows.map((row) => this.map(row));
  }

  async findActiveByItemId(itemId: number): Promise<LaundryLoad | null> {
    const row = this.db
      .prepare(
        `SELECT l.* FROM laundry_loads l
         JOIN laundry_load_items li ON li.load_id = l.id
         WHERE li.item_id = ? AND l.stage != ?
         ORDER BY l.id LIMIT 1`
      )
      .get(itemId, LoadStage.DONE) as LoadRow | undefined;
    return row ? this.map(row) : null;
  }

  async update(load: LaundryLoad): Promise<LaundryLoad> {
    const save = this.db.transaction((value: LaundryLoad) => {
      const result = this.db
        .prepare('UPDATE laundry_loads SET stage = ?, color_group = ?, fabric_group = ? WHERE id = ?')
        .run(value.stage, value.colorGroup, value.fabricGroup, value.id);
      if (result.changes === 0) throw new NotFoundError(`Load ${value.id} not found`);
      this.db.prepare('DELETE FROM laundry_load_items WHERE load_id = ?').run(value.id);
      this.writeItems(value.id, value.itemIds);
    });
    save(load);
    return this.load(load.id);
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM laundry_loads WHERE id = ?').run(id);
  }

  private writeItems(loadId: number, itemIds: number[]): void {
    const insert = this.db.prepare(
      'INSERT INTO laundry_load_items (load_id, position, item_id) VALUES (?, ?, ?)'
    );
    itemIds.forEach((itemId, position) => insert.run(loadId, position, itemId));
  }

  private async load(id: number): Promise<LaundryLoad> {
    const found = await this.findById(id);
    if (!found) throw new Error('Failed to load the saved laundry load');
    return found;
  }

  private map(row: LoadRow): LaundryLoad {
    const itemIds = (
      this.db
        .prepare('SELECT item_id FROM laundry_load_items WHERE load_id = ? ORDER BY position')
        .all(row.id) as { item_id: number }[]
    ).map((r) => r.item_id);
    return {
      id: row.id,
      userId: row.user_id,
      itemIds,
      colorGroup: row.color_group as ColorGroup,
      fabricGroup: row.fabric_group as FabricGroup,
      stage: row.stage as LoadStage,
      createdAt: new Date(row.created_at),
    };
  }
}
