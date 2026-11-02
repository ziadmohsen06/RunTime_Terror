import { Router } from 'express';
import { RecurringTaskController } from '../controllers/RecurringTaskController';

export function recurringTaskRoutes(
  controller: RecurringTaskController,
  enableDemoRoutes: boolean
): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.post(
    '/run-check',
    enableDemoRoutes ? controller.runWeeklyCheck : controller.notFound
  );
  router.delete('/:id', controller.deactivate);
  return router;
}
