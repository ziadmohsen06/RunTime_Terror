import { Item } from '../../domain/entities/Item';
import { ItemFilter } from '../../repositories/interfaces/IItemRepository';

// The only part of the Items module that Outfits may use. ItemService implements it,
// so this module reads items through that service and can never change an item.
export interface IItemReader {
  listItems(userId: number, filter?: ItemFilter): Promise<Item[]>;
  getById(id: number): Promise<Item | null>;
}
