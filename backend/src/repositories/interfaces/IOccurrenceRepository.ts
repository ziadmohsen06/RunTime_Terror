import { TaskOccurrence } from '../../domain/entities/TaskOccurrence';

export interface IOccurrenceRepository {
  createIfNotExists(
    data: Omit<TaskOccurrence, 'id'>
  ): Promise<{ occurrence: TaskOccurrence; created: boolean }>;
  findById(id: number): Promise<TaskOccurrence | null>;
  findByUserAndPeriod(userId: number, periodKey: string): Promise<TaskOccurrence[]>;
  update(occurrence: TaskOccurrence): Promise<void>;
}
