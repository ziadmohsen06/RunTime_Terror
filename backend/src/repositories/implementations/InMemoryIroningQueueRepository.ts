import { IroningEntry, NewIroningEntry } from '../../domain/entities/IroningEntry';
import { IIroningQueueRepository } from '../interfaces/IIroningQueueRepository';

const copy = (e: IroningEntry): IroningEntry => ({ ...e, queuedAt: new Date(e.queuedAt) });

export class InMemoryIroningQueueRepository implements IIroningQueueRepository {
  private entries = new Map<number, IroningEntry>();

  async add(data: NewIroningEntry): Promise<IroningEntry> {
    const existing = this.entries.get(data.itemId);
    if (existing) return copy(existing);
    const entry: IroningEntry = { ...data, queuedAt: new Date() };
    this.entries.set(entry.itemId, entry);
    return copy(entry);
  }

  async findByUser(userId: number): Promise<IroningEntry[]> {
    return [...this.entries.values()].filter((e) => e.userId === userId).map(copy);
  }

  async findByItemId(itemId: number): Promise<IroningEntry | null> {
    const found = this.entries.get(itemId);
    return found ? copy(found) : null;
  }

  async remove(itemId: number): Promise<void> {
    this.entries.delete(itemId);
  }
}
