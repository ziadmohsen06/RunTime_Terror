import { InMemoryReminderRepository } from '../../src/repositories/implementations/InMemoryReminderRepository';
import { ReminderService } from '../../src/services/recurring/ReminderService';

describe('ReminderService', () => {
  let repository: InMemoryReminderRepository;
  let service: ReminderService;

  beforeEach(() => {
    repository = new InMemoryReminderRepository();
    service = new ReminderService(repository);
  });

  it('lists unread reminders first, with newest first within each group', async () => {
    const oldUnread = await repository.createIfNotExists({
      userId: 1,
      occurrenceId: 1,
      message: 'Old unread',
      read: false,
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    });
    const read = await repository.createIfNotExists({
      userId: 1,
      occurrenceId: 2,
      message: 'Read',
      read: true,
      createdAt: new Date('2026-11-03T00:00:00.000Z'),
    });
    const newUnread = await repository.createIfNotExists({
      userId: 1,
      occurrenceId: 3,
      message: 'New unread',
      read: false,
      createdAt: new Date('2026-11-02T00:00:00.000Z'),
    });

    expect(await service.listReminders(1)).toEqual([
      newUnread.reminder,
      oldUnread.reminder,
      read.reminder,
    ]);
  });

  it('marks an owned reminder as read', async () => {
    const created = await repository.createIfNotExists({
      userId: 1,
      occurrenceId: 1,
      message: 'Reminder',
      read: false,
      createdAt: new Date('2026-11-02T00:00:00.000Z'),
    });

    const updated = await service.markRead(1, created.reminder.id);

    expect(updated.read).toBe(true);
    expect(await repository.findById(updated.id)).toEqual(updated);
  });

  it('rejects reading another user’s reminder', async () => {
    const created = await repository.createIfNotExists({
      userId: 1,
      occurrenceId: 1,
      message: 'Reminder',
      read: false,
      createdAt: new Date('2026-11-02T00:00:00.000Z'),
    });

    await expect(service.markRead(2, created.reminder.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('returns not found for a missing reminder', async () => {
    await expect(service.markRead(1, 999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
