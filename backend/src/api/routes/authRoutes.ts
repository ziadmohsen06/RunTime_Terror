import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

export function authRoutes(controller: AuthController): Router {
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  return router;
}