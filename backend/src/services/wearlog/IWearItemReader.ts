import { Item } from '../../domain/entities/Item';

// The only part of the Items module the Wear Log may use. ItemService already has
// these two methods. There is no updateStatus here, so logging a wear can never
// change an item's status.
export interface IWearItemReader {
  listItems(userId: number): Promise<Item[]>;
  getById(id: number): Promise<Item | null>;
}