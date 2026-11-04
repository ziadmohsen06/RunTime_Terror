import Database from 'better-sqlite3';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeClock } from '../helpers/FakeClock';
import { DayOfWeek } from '../../src/domain/enums/DayOfWeek';
import { OccurrenceStatus } from '../../src/domain/enums/OccurrenceStatus';
import { SqliteOccurrenceRepository } from '../../src/repositories/implementations/SqliteOccurrenceRepository';
import { SqliteRecurringTaskRepository } from '../../src/repositories/implementations/SqliteRecurringTaskRepository';
import { SqliteReminderRepository } from '../../src/repositories/implementations/SqliteReminderRepository';
import { initRecurringSchema } from '../../src/repositories/implementations/sqlite/recurringSchema';
import { RecurringTaskService } from '../../src/services/recurring/RecurringTaskService';

describe('SQLite recurring persistence', () => {
  it('NFR5: preserves occurrences and reminders across a database restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'recurring-restart-'));
    const filePath = join(directory, 'recurring.sqlite');
    const clock = new FakeClock(new Date('2026-11-02T10:00:00.000Z'));

    try {
      const firstDb = new Database(filePath);
      initRecurringSchema(firstDb);
      const firstService = new RecurringTaskService(
        new SqliteRecurringTaskRepository(firstDb),
        new SqliteOccurrenceRepository(firstDb),
        new SqliteReminderRepository(firstDb),
        clock
      );
      await firstService.createWeekly(1, 'Laundry', DayOfWeek.SATURDAY);
      firstDb.close();

      const secondDb = new Database(filePath);
      initRecurringSchema(secondDb);
      const taskRepository = new SqliteRecurringTaskRepository(secondDb);
      const occurrenceRepository = new SqliteOccurrenceRepository(secondDb);
      const reminderRepository = new SqliteReminderRepository(secondDb);
      const restartedService = new RecurringTaskService(
        taskRepository,
        occurrenceRepository,
        reminderRepository,
        clock
      );

      const summary = await restartedService.runWeeklyCheck();

      expect(summary.created).toBe(0);
      expect(await occurrenceRepository.findByUserAndPeriod(1, '2026-W45')).toHaveLength(1);
      expect(await reminderRepository.findByUser(1)).toHaveLength(1);
      secondDb.close();
    } finally {
      unlinkSync(filePath);
      rmdirSync(directory);
    }
  });

  it('direct duplicate occurrence insertion does not throw or add another row', async () => {
    const db = new Database(':memory:');
    initRecurringSchema(db);
    const tasks = new SqliteRecurringTaskRepository(db);
    const occurrences = new SqliteOccurrenceRepository(db);
    const task = await tasks.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });
    const data = {
      recurringTaskId: task.id,
      userId: 1,
      periodKey: '2026-W45',
      dueDate: '2026-11-07',
      status: OccurrenceStatus.PENDING,
      createdAt: new Date('2026-11-02T10:00:00.000Z'),
    };

    try {
      const first = await occurrences.createIfNotExists(data);
      const duplicate = await occurrences.createIfNotExists(data);

      expect(first.created).toBe(true);
      expect(duplicate.created).toBe(false);
      expect(await occurrences.findByUserAndPeriod(1, '2026-W45')).toHaveLength(1);
    } finally {
      db.close();
    }
  });
});
