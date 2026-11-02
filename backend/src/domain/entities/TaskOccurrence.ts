import { OccurrenceStatus } from '../enums/OccurrenceStatus';

export interface TaskOccurrence {
  id: number;
  recurringTaskId: number;
  userId: number;
  periodKey: string;
  dueDate: string;
  status: OccurrenceStatus;
  createdAt: Date;
}
