import Database from 'better-sqlite3';
import { Router } from 'express';
import { OccurrenceController } from '../../api/controllers/OccurrenceController';
import { RecurringTaskController } from '../../api/controllers/RecurringTaskController';
import { ReminderController } from '../../api/controllers/ReminderController';
import { occurrenceRoutes } from '../../api/routes/occurrenceRoutes';
import { recurringTaskRoutes } from '../../api/routes/recurringTaskRoutes';
import { reminderRoutes } from '../../api/routes/reminderRoutes';
import { Clock } from '../../domain/Clock';
import { InMemoryOccurrenceRepository } from '../../repositories/implementations/InMemoryOccurrenceRepository';
import { InMemoryRecurringTaskRepository } from '../../repositories/implementations/InMemoryRecurringTaskRepository';
import { InMemoryReminderRepository } from '../../repositories/implementations/InMemoryReminderRepository';
import { SqliteOccurrenceRepository } from '../../repositories/implementations/SqliteOccurrenceRepository';
import { SqliteRecurringTaskRepository } from '../../repositories/implementations/SqliteRecurringTaskRepository';
import { SqliteReminderRepository } from '../../repositories/implementations/SqliteReminderRepository';
import { initRecurringSchema } from '../../repositories/implementations/sqlite/recurringSchema';
import { IOccurrenceRepository } from '../../repositories/interfaces/IOccurrenceRepository';
import { IRecurringTaskRepository } from '../../repositories/interfaces/IRecurringTaskRepository';
import { IReminderRepository } from '../../repositories/interfaces/IReminderRepository';
import { ReminderService } from './ReminderService';
import { RecurringTaskService } from './RecurringTaskService';
import { SchedulerLogger, WeeklyScheduler } from './WeeklyScheduler';

export interface RecurringModuleOptions {
  clock: Clock;
  db?: Database.Database;
  enableDemoRoutes: boolean;
  intervalMs: number;
  logger: SchedulerLogger;
}

export interface RecurringModule {
  taskRouter: Router;
  occurrenceRouter: Router;
  reminderRouter: Router;
  scheduler: WeeklyScheduler;
  taskService: RecurringTaskService;
  reminderService: ReminderService;
}

export function createRecurringModule(options: RecurringModuleOptions): RecurringModule {
  let taskRepo: IRecurringTaskRepository;
  let occurrenceRepo: IOccurrenceRepository;
  let reminderRepo: IReminderRepository;

  if (options.db) {
    initRecurringSchema(options.db);
    taskRepo = new SqliteRecurringTaskRepository(options.db);
    occurrenceRepo = new SqliteOccurrenceRepository(options.db);
    reminderRepo = new SqliteReminderRepository(options.db);
  } else {
    taskRepo = new InMemoryRecurringTaskRepository();
    occurrenceRepo = new InMemoryOccurrenceRepository();
    reminderRepo = new InMemoryReminderRepository();
  }

  const taskService = new RecurringTaskService(
    taskRepo,
    occurrenceRepo,
    reminderRepo,
    options.clock
  );
  const reminderService = new ReminderService(reminderRepo);
  const taskController = new RecurringTaskController(taskService);
  const occurrenceController = new OccurrenceController(taskService);
  const reminderController = new ReminderController(reminderService);
  const scheduler = new WeeklyScheduler(
    () => taskService.runWeeklyCheck(),
    options.intervalMs,
    options.logger
  );

  return {
    taskRouter: recurringTaskRoutes(taskController, options.enableDemoRoutes),
    occurrenceRouter: occurrenceRoutes(occurrenceController),
    reminderRouter: reminderRoutes(reminderController),
    scheduler,
    taskService,
    reminderService,
  };
}
