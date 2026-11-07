import { NewWearLog, WearLog } from '../../domain/entities/WearLog';

// The Wear Log service depends on this interface, never on a concrete class (DIP).
export interface IWearLogRepository {
  create(log: NewWearLog): Promise<WearLog>;
  findAll(userId: number): Promise<WearLog[]>;
}