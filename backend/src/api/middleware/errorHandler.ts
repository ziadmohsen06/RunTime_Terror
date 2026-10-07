import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../domain/errors/AppError';

// One consistent error format for the whole API: { error: { message } }
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}
