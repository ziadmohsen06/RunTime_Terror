import { Router } from 'express';
import { ItemController } from '../controllers/ItemController';

export function itemRoutes(controller: ItemController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  return router;
}
