import express from 'express';
import { errorHandler } from './api/middleware/errorHandler';
import { ItemController } from './api/controllers/ItemController';
import { itemRoutes } from './api/routes/itemRoutes';
import { InMemoryItemRepository } from './repositories/implementations/InMemoryItemRepository';
import { ItemService } from './services/items/ItemService';
import { Clock } from './domain/Clock';
import { SystemClock } from './domain/Clock';
import {
  createRecurringModule,
  RecurringModule,
} from './services/recurring/recurringModule';

export interface CreateAppOptions {
  clock?: Clock;
  recurring?: RecurringModule;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.use(express.json());

  // Wiring (composition root): each module adds its repo -> service -> controller here.
  const itemRepo = new InMemoryItemRepository();
  const itemService = new ItemService(itemRepo);
  app.use('/items', itemRoutes(new ItemController(itemService)));

  const recurring =
    options.recurring ??
    createRecurringModule({
      clock: options.clock ?? new SystemClock(),
      enableDemoRoutes: false,
      intervalMs: 60 * 60 * 1000,
      logger: { error: (message, error) => console.error(message, error) },
    });
  app.use('/recurring-tasks', recurring.taskRouter);
  app.use('/occurrences', recurring.occurrenceRouter);
  app.use('/reminders', recurring.reminderRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(errorHandler);
  return app;
}
