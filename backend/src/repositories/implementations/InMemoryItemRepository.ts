import { Item, NewItem } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { IItemRepository, ItemFilter } from '../interfaces/IItemRepository';

// TEMPORARY: replace with a database-backed repository (e.g. PostgresItemRepository).
export class InMemoryItemRepository implements IItemRepository {
  private items: Item[] = [];
  private nextId = 1;

  async create(newItem: NewItem): Promise<Item> {
    const item: Item = {
      ...newItem,
      id: this.nextId++,
      status: ItemStatus.CLEAN,
      createdAt: new Date(),
    };
    this.items.push(item);
    return item;
  }

  async findAll(userId: number, filter: ItemFilter = {}): Promise<Item[]> {
    return this.items.filter(
      (i) =>
        i.userId === userId &&
        (!filter.category || i.category === filter.category) &&
        (!filter.color || i.color === filter.color) &&
        (!filter.season || i.season === filter.season)
    );
  }

  async findById(id: number): Promise<Item | null> {
    return this.items.find((i) => i.id === id) ?? null;
  }
}
