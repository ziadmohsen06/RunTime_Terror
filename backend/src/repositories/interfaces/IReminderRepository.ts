import { Reminder } from '../../domain/entities/Reminder';

export interface IReminderRepository {
  createIfNotExists(
    data: Omit<Reminder, 'id'>
  ): Promise<{ reminder: Reminder; created: boolean }>;
  findByUser(userId: number): Promise<Reminder[]>;
  findById(id: number): Promise<Reminder | null>;
  update(reminder: Reminder): Promise<void>;
}
