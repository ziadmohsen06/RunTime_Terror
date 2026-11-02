import { Router } from 'express';
import { ReminderController } from '../controllers/ReminderController';

export function reminderRoutes(controller: ReminderController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/:id/read', controller.markRead);
  return router;
}
