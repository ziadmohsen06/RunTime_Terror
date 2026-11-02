import { InMemoryOccurrenceRepository } from '../../../src/repositories/implementations/InMemoryOccurrenceRepository';
import { InMemoryRecurringTaskRepository } from '../../../src/repositories/implementations/InMemoryRecurringTaskRepository';
import { InMemoryReminderRepository } from '../../../src/repositories/implementations/InMemoryReminderRepository';
import {
  occurrenceRepositoryContract,
  recurringTaskRepositoryContract,
  reminderRepositoryContract,
} from './recurringRepositoryContracts';

recurringTaskRepositoryContract('In-memory', () => ({
  repository: new InMemoryRecurringTaskRepository(),
  cleanup: () => undefined,
}));

occurrenceRepositoryContract('In-memory', () => ({
  repository: new InMemoryOccurrenceRepository(),
  cleanup: () => undefined,
}));

reminderRepositoryContract('In-memory', () => ({
  repository: new InMemoryReminderRepository(),
  cleanup: () => undefined,
}));
