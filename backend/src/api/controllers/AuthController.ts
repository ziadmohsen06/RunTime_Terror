import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../domain/errors/AppError';
import { AuthService } from '../../services/auth/AuthService';

// Reads email and password from a request body and rejects anything that is not text.
function credentialsFrom(body: unknown): { email: string; password: string } {
  const { email, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new ValidationError('Email and password are required');
  }
  return { email, password };
}

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = credentialsFrom(req.body);
      const name = (req.body as Record<string, unknown>).name;
      if (name !== undefined && typeof name !== 'string') {
        throw new ValidationError('Name must be text');
      }
      res.status(201).json(await this.service.register(email, password, name));
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = credentialsFrom(req.body);
      res.json(await this.service.login(email, password));
    } catch (err) {
      next(err);
    }
  };
}