import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../domain/errors/AppError';

// One consistent error format for the whole API: { error: { message } }
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message } });
  }
  // Errors raised by express.json() itself: bad JSON is the client's mistake, not ours.
  const httpError = err as Error & { type?: string; status?: number };
  if (httpError.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON' } });
  }
  if (httpError.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body is too large' } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}
