import { NewRecurringTask, RecurringTask } from '../../domain/entities/RecurringTask';

export interface IRecurringTaskRepository {
  create(data: NewRecurringTask): Promise<RecurringTask>;
  findById(id: number): Promise<RecurringTask | null>;
  findActiveByUser(userId: number): Promise<RecurringTask[]>;
  findAllActive(): Promise<RecurringTask[]>;
  update(task: RecurringTask): Promise<void>;
}
