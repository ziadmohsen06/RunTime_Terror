import { Item, NewItem } from '../../domain/entities/Item';

export interface ItemFilter {
  category?: string;
  color?: string;
  season?: string;
}

// Services depend on this interface, never on a concrete class (Dependency Inversion).
export interface IItemRepository {
  create(item: NewItem): Promise<Item>;
  findAll(userId: number, filter?: ItemFilter): Promise<Item[]>;
  findById(id: number): Promise<Item | null>;
}
