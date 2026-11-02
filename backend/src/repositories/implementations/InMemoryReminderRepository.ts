import { Reminder } from '../../domain/entities/Reminder';
import { IReminderRepository } from '../interfaces/IReminderRepository';

function copy(reminder: Reminder): Reminder {
  return { ...reminder, createdAt: new Date(reminder.createdAt.getTime()) };
}

export class InMemoryReminderRepository implements IReminderRepository {
  private readonly reminders: Reminder[] = [];
  private nextId = 1;

  async createIfNotExists(
    data: Omit<Reminder, 'id'>
  ): Promise<{ reminder: Reminder; created: boolean }> {
    const existing = this.reminders.find((reminder) => reminder.occurrenceId === data.occurrenceId);
    if (existing) {
      return { reminder: copy(existing), created: false };
    }

    const reminder: Reminder = { ...data, id: this.nextId++ };
    this.reminders.push(reminder);
    return { reminder: copy(reminder), created: true };
  }

  async findByUser(userId: number): Promise<Reminder[]> {
    return this.reminders.filter((reminder) => reminder.userId === userId).map(copy);
  }

  async findById(id: number): Promise<Reminder | null> {
    const reminder = this.reminders.find((candidate) => candidate.id === id);
    return reminder ? copy(reminder) : null;
  }

  async update(reminder: Reminder): Promise<void> {
    const index = this.reminders.findIndex((candidate) => candidate.id === reminder.id);
    if (index >= 0) {
      this.reminders[index] = copy(reminder);
    }
  }
}
