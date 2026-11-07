import { NewWearLog, WearLog } from '../../domain/entities/WearLog';
import { IWearLogRepository } from '../interfaces/IWearLogRepository';

export class InMemoryWearLogRepository implements IWearLogRepository {
  private logs: WearLog[] = [];
  private nextId = 1;

  async create(newLog: NewWearLog): Promise<WearLog> {
    const log: WearLog = { ...newLog, itemIds: [...newLog.itemIds], id: this.nextId++ };
    this.logs.push(log);
    return log;
  }

  // Newest date first; for the same date, the most recently logged first.
  async findAll(userId: number): Promise<WearLog[]> {
    return this.logs
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.wornOn.localeCompare(a.wornOn) || b.id - a.id);
  }
}