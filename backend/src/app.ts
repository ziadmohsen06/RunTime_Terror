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
import {
    TemporaryCareRules,
    TemporaryIroningQueue,
    TemporaryItemStatusUpdater,
} from './services/laundry/temporary';


export function createApp() {
  const app = express();
  app.use(express.json());

  // Wiring (composition root): each module adds its repo -> service -> controller here.
  const itemRepo = new InMemoryItemRepository();
  const itemService = new ItemService(itemRepo);
  app.use('/items', itemRoutes(new ItemController(itemService)));

    const laundryService = new LaundryService(
        itemRepo,
        new InMemoryLoadRepository(),
        new TemporaryItemStatusUpdater(itemRepo),
        new TemporaryCareRules(),
        new TemporaryIroningQueue()
    );
    app.use('/laundry', laundryRoutes(new LaundryController(laundryService)));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(errorHandler);
  return app;
}
