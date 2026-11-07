import { Router } from 'express';
import { WearLogController } from '../controllers/WearLogController';

export function wearLogRoutes(controller: WearLogController): Router {
  const router = Router();
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/stats', controller.stats);
  return router;
}