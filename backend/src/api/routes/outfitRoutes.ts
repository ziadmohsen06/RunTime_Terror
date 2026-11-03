import { Router } from 'express';
import { OutfitController } from '../controllers/OutfitController';

export function outfitRoutes(controller: OutfitController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/suggestions', controller.suggest);
  return router;
}
