import { LaundryLoad, NewLaundryLoad } from '../../domain/entities/LaundryLoad';
import { LoadStage } from '../../domain/enums/LoadStage';
import { NotFoundError } from '../../domain/errors/AppError';
import { ILoadRepository } from '../interfaces/ILoadRepository';

const copy = (l: LaundryLoad): LaundryLoad => ({ ...l, itemIds: [...l.itemIds] });

// TEMPORARY: replace with a database-backed repository.
export class InMemoryLoadRepository implements ILoadRepository {
  private loads: LaundryLoad[] = [];
  private nextId = 1;

  async create(data: NewLaundryLoad): Promise<LaundryLoad> {
    const load: LaundryLoad = { ...data, itemIds: [...data.itemIds], id: this.nextId++, createdAt: new Date() };
    this.loads.push(load);
    return copy(load);
  }

  async findById(id: number): Promise<LaundryLoad | null> {
    const found = this.loads.find((l) => l.id === id);
    return found ? copy(found) : null;
  }

  async findByUser(userId: number): Promise<LaundryLoad[]> {
    return this.loads.filter((l) => l.userId === userId).map(copy);
  }

  async findActiveByItemId(itemId: number): Promise<LaundryLoad | null> {
    const found = this.loads.find((l) => l.stage !== LoadStage.DONE && l.itemIds.includes(itemId));
    return found ? copy(found) : null;
  }

  async update(load: LaundryLoad): Promise<LaundryLoad> {
    const index = this.loads.findIndex((l) => l.id === load.id);
    if (index === -1) throw new NotFoundError(`Load ${load.id} not found`);
    this.loads[index] = copy(load);
    return copy(load);
  }

  async delete(id: number): Promise<void> {
    this.loads = this.loads.filter((l) => l.id !== id);
  }
}
