import { Router } from 'express';
import { IroningController } from '../controllers/IroningController';

export function ironingRoutes(controller: IroningController): Router {
  const router = Router();
  router.get('/queue', controller.getQueue);
  router.post('/items/:itemId/ironed', controller.markIroned);
  return router;
}
