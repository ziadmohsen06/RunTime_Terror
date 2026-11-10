import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../domain/errors/AppError';
import { TokenService } from '../../services/auth/TokenService';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

// Checks the token on a request and records who is calling. Mounted once in app.ts,
// in front of every protected router.
export function authenticate(tokens: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      req.userId = tokens.verify(header.slice(BEARER_PREFIX.length).trim());
    } catch (err) {
      return next(err);
    }
    next();
  };
}

// What controllers call instead of a hardcoded id. If a route is ever mounted without
// the middleware, this fails with 401 rather than acting as the wrong user.
export function currentUserId(req: Request): number {
  if (req.userId === undefined) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.userId;
}