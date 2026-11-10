import { NextFunction, Request, Response } from 'express';
import { TokenService } from '../../services/auth/TokenService';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function authenticate(tokens: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    throw new Error('not implemented');
  };
}

export function currentUserId(req: Request): number {
  throw new Error('not implemented');
}