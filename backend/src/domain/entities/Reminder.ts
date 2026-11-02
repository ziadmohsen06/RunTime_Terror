export interface Reminder {
  id: number;
  userId: number;
  occurrenceId: number;
  message: string;
  read: boolean;
  createdAt: Date;
}
