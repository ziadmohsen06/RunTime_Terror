import { Router } from 'express';
import { LaundryController } from '../controllers/LaundryController';

export function laundryRoutes(controller: LaundryController): Router {
  const router = Router();
  router.post('/items/:itemId/dirty', controller.markDirty);
  router.get('/dirty-items', controller.listDirtyItems);
  router.get('/loads', controller.listLoads);
  router.post('/loads', controller.createLoad);
  router.post('/loads/:loadId/advance', controller.advanceLoad);
  router.delete('/loads/:loadId/items/:itemId', controller.removeItem);
  return router;
}
