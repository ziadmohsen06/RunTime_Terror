import express from 'express';
import { errorHandler } from './api/middleware/errorHandler';
import { ItemController } from './api/controllers/ItemController';
import { itemRoutes } from './api/routes/itemRoutes';
import { InMemoryItemRepository } from './repositories/implementations/InMemoryItemRepository';
import { ItemService } from './services/items/ItemService';

export function createApp() {
  const app = express();
  app.use(express.json());

  // Wiring (composition root): each module adds its repo -> service -> controller here.
  const itemRepo = new InMemoryItemRepository();
  const itemService = new ItemService(itemRepo);
  app.use('/items', itemRoutes(new ItemController(itemService)));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(errorHandler);
  return app;
}
