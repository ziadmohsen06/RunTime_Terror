import { Router } from 'express';
import { OccurrenceController } from '../controllers/OccurrenceController';

export function occurrenceRoutes(controller: OccurrenceController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/:id/complete', controller.complete);
  return router;
}
