import Database from 'better-sqlite3';
import { NewOutfit, Outfit } from '../../domain/entities/Outfit';
import { IOutfitRepository } from '../interfaces/IOutfitRepository';

interface OutfitRow {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

interface OutfitItemRow {
  item_id: number;
}

export class SqliteOutfitRepository implements IOutfitRepository {
  constructor(private readonly db: Database.Database) {}

  async create(newOutfit: NewOutfit): Promise<Outfit> {
    const createdAt = new Date();
    const insertOutfit = this.db.prepare(
      'INSERT INTO outfits (user_id, name, created_at) VALUES (?, ?, ?)'
    );
    const insertItem = this.db.prepare(
      'INSERT INTO outfit_items (outfit_id, position, item_id) VALUES (?, ?, ?)'
    );

    const save = this.db.transaction((): number => {
      const { lastInsertRowid } = insertOutfit.run(
        newOutfit.userId,
        newOutfit.name,
        createdAt.toISOString()
      );
      const id = Number(lastInsertRowid);
      newOutfit.itemIds.forEach((itemId, position) => insertItem.run(id, position, itemId));
      return id;
    });

    return { ...newOutfit, id: save(), createdAt };
  }

  async findAll(userId: number): Promise<Outfit[]> {
    const rows = this.db
      .prepare('SELECT * FROM outfits WHERE user_id = ? ORDER BY id DESC')
      .all(userId) as OutfitRow[];
    const selectItems = this.db.prepare(
      'SELECT item_id FROM outfit_items WHERE outfit_id = ? ORDER BY position'
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      itemIds: (selectItems.all(row.id) as OutfitItemRow[]).map(({ item_id }) => item_id),
      createdAt: new Date(row.created_at),
    }));
  }
}
