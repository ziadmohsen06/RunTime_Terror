import express from 'express';
import { errorHandler } from './api/middleware/errorHandler';
import { ItemController } from './api/controllers/ItemController';
import { itemRoutes } from './api/routes/itemRoutes';
import { InMemoryItemRepository } from './repositories/implementations/InMemoryItemRepository';
import { ItemService } from './services/items/ItemService';
import { LaundryController } from './api/controllers/LaundryController';
import { laundryRoutes } from './api/routes/laundryRoutes';
import { InMemoryLoadRepository } from './repositories/implementations/InMemoryLoadRepository';
import { SqliteLoadRepository } from './repositories/implementations/SqliteLoadRepository';
import { initLoadSchema } from './repositories/implementations/sqlite/loadSchema';
import { ILoadRepository } from './repositories/interfaces/ILoadRepository';
import { LaundryService } from './services/laundry/LaundryService';
import { createIroningModule } from './services/ironing/ironingModule';
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
import { createWearLogRouter } from './services/wearlog/wearLogModule';
import { createAuthModule } from './services/auth/authModule';

export interface CreateAppOptions {
  clock?: Clock;
  recurring?: RecurringModule;
  db?: Database.Database;
}

function createLoadRepository(db?: Database.Database): ILoadRepository {
  if (!db) return new InMemoryLoadRepository();
  initLoadSchema(db);
  return new SqliteLoadRepository(db);
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, '../../frontend')));

  // Auth: /auth and /health are public. Everything registered after this block needs a valid token.
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set it.');
  }
  const auth = createAuthModule({
    secret: jwtSecret,
    db: options.db,
    hashRounds: Number(process.env.BCRYPT_ROUNDS) || undefined,
  });
  app.use('/auth', auth.router);

  // Everything below needs a valid token. /health and /auth stay public.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(auth.authenticate);

  // Wiring (composition root): each module adds its repo -> service -> controller here.
  const itemRepo = options.db
  ? new SqliteItemRepository(options.db)
  : new InMemoryItemRepository();
  const itemService = new ItemService(itemRepo);
  app.use('/items', itemRoutes(new ItemController(itemService)));
  // Ironing (Mohamed): its care rules and queue are what Laundry uses to decide and hand over.
  const ironing = createIroningModule({ items: itemService });
  // Laundry: Joudy's ItemService.updateStatus is the only way item status changes.
  const laundryService = new LaundryService(
    itemRepo,
    createLoadRepository(options.db),
    itemService,
    ironing.careRules,
    ironing.queue
  );
  app.use('/laundry', laundryRoutes(new LaundryController(laundryService)));
  app.use('/ironing', ironing.router);
  app.use('/outfits', createOutfitRouter({ items: itemService, db: options.db }));
    app.use(
    '/wearlog',
    createWearLogRouter({ items: itemService, clock: options.clock ?? new SystemClock(), db: options.db })
  );

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

  app.use(errorHandler);
  return app;
}
