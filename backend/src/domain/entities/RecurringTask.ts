import { DayOfWeek } from '../enums/DayOfWeek';

export interface RecurringTask {
  id: number;
  userId: number;
  title: string;
  dayOfWeek: DayOfWeek;
  active: boolean;
  createdAt: Date;
}

export type NewRecurringTask = Pick<RecurringTask, 'userId' | 'title' | 'dayOfWeek'>;
