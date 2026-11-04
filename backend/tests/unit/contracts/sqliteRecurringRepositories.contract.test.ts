import Database from 'better-sqlite3';
import { DayOfWeek } from '../../../src/domain/enums/DayOfWeek';
import { OccurrenceStatus } from '../../../src/domain/enums/OccurrenceStatus';
import { SqliteOccurrenceRepository } from '../../../src/repositories/implementations/SqliteOccurrenceRepository';
import { SqliteRecurringTaskRepository } from '../../../src/repositories/implementations/SqliteRecurringTaskRepository';
import { SqliteReminderRepository } from '../../../src/repositories/implementations/SqliteReminderRepository';
import { initRecurringSchema } from '../../../src/repositories/implementations/sqlite/recurringSchema';
import {
  occurrenceRepositoryContract,
  recurringTaskRepositoryContract,
  reminderRepositoryContract,
} from './recurringRepositoryContracts';

recurringTaskRepositoryContract('SQLite', () => {
  const db = new Database(':memory:');
  initRecurringSchema(db);
  return {
    repository: new SqliteRecurringTaskRepository(db),
    cleanup: () => db.close(),
  };
});

occurrenceRepositoryContract('SQLite', () => {
  const db = new Database(':memory:');
  initRecurringSchema(db);
  const taskRepository = new SqliteRecurringTaskRepository(db);
  const repository = new SqliteOccurrenceRepository(db);
  return {
    repository,
    prepare: async () => {
      await taskRepository.create({
        userId: 1,
        title: 'Contract parent',
        dayOfWeek: DayOfWeek.SATURDAY,
      });
    },
    cleanup: () => db.close(),
  };
});

reminderRepositoryContract('SQLite', () => {
  const db = new Database(':memory:');
  initRecurringSchema(db);
  const taskRepository = new SqliteRecurringTaskRepository(db);
  const occurrenceRepository = new SqliteOccurrenceRepository(db);
  const repository = new SqliteReminderRepository(db);
  return {
    repository,
    prepare: async () => {
      const task = await taskRepository.create({
        userId: 1,
        title: 'Contract parent',
        dayOfWeek: DayOfWeek.SATURDAY,
      });
      await occurrenceRepository.createIfNotExists({
        recurringTaskId: task.id,
        userId: 1,
        periodKey: '2026-W45',
        dueDate: '2026-11-07',
        status: OccurrenceStatus.PENDING,
        createdAt: new Date('2026-11-02T10:00:00.000Z'),
      });
    },
    cleanup: () => db.close(),
  };
});
