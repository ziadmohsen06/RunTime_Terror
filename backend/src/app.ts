import express from 'express';
import { errorHandler } from './api/middleware/errorHandler';
import { ItemController } from './api/controllers/ItemController';
import { itemRoutes } from './api/routes/itemRoutes';
import { InMemoryItemRepository } from './repositories/implementations/InMemoryItemRepository';
import { ItemService } from './services/items/ItemService';
import { LaundryController } from './api/controllers/LaundryController';
import { laundryRoutes } from './api/routes/laundryRoutes';
import { InMemoryLoadRepository } from './repositories/implementations/InMemoryLoadRepository';
import { LaundryService } from './services/laundry/LaundryService';
import { TemporaryCareRules, TemporaryIroningQueue } from './services/laundry/temporary';
import { Clock } from './domain/Clock';
import { SystemClock } from './domain/Clock';
import {
  createRecurringModule,
  RecurringModule,
} from './services/recurring/recurringModule';
import Database from 'better-sqlite3';
import { SqliteItemRepository } from './repositories/implementations/SqliteItemRepository';
import path from 'path';
import { createOutfitRouter } from './services/outfits/outfitModule';

export interface CreateAppOptions {
  clock?: Clock;
  recurring?: RecurringModule;
  db?: Database.Database;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, '../../frontend')));

  // Wiring (composition root): each module adds its repo -> service -> controller here.
  const itemRepo = options.db
  ? new SqliteItemRepository(options.db)
  : new InMemoryItemRepository();
  const itemService = new ItemService(itemRepo);
  app.use('/items', itemRoutes(new ItemController(itemService)));
  // Laundry: Joudy's ItemService.updateStatus is the only way item status changes.
  // TEMPORARY: replace the two Temporary* classes with Mohamed's CareRules / IroningQueue.
  const laundryService = new LaundryService(
    itemRepo,
    new InMemoryLoadRepository(),
    itemService,
    new TemporaryCareRules(),
    new TemporaryIroningQueue()
  );
  app.use('/laundry', laundryRoutes(new LaundryController(laundryService)));
  app.use('/outfits', createOutfitRouter({ items: itemService, db: options.db }));

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
