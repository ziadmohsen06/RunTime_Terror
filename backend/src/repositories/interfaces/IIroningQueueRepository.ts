import { IroningEntry, NewIroningEntry } from '../../domain/entities/IroningEntry';

// The ironing service depends on this interface, never on a concrete class.
export interface IIroningQueueRepository {
  /** Adds the item to the queue. Adding an item that is already queued changes nothing. */
  add(entry: NewIroningEntry): Promise<IroningEntry>;
  /** The user's queue, oldest first. */
  findByUser(userId: number): Promise<IroningEntry[]>;
  findByItemId(itemId: number): Promise<IroningEntry | null>;
  remove(itemId: number): Promise<void>;
}
