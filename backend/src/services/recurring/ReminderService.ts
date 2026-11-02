import { Reminder } from '../../domain/entities/Reminder';
import { ForbiddenError, NotFoundError } from '../../domain/errors/AppError';
import { IReminderRepository } from '../../repositories/interfaces/IReminderRepository';

export class ReminderService {
  constructor(private readonly reminderRepo: IReminderRepository) {}

  async listReminders(userId: number): Promise<Reminder[]> {
    const reminders = await this.reminderRepo.findByUser(userId);
    return reminders.sort(
      (left, right) =>
        Number(left.read) - Number(right.read) ||
        right.createdAt.getTime() - left.createdAt.getTime()
    );
  }

  async markRead(userId: number, reminderId: number): Promise<Reminder> {
    const reminder = await this.reminderRepo.findById(reminderId);
    if (!reminder) {
      throw new NotFoundError('Reminder not found');
    }
    if (reminder.userId !== userId) {
      throw new ForbiddenError('You cannot read another user’s reminder');
    }

    const updated = { ...reminder, read: true };
    await this.reminderRepo.update(updated);
    return updated;
  }
}
