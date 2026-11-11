import jwt, { JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError } from '../../domain/errors/AppError';

export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds = 3600
  ) {}

  sign(userId: number): string {
    return jwt.sign({ sub: String(userId) }, this.secret, {
      expiresIn: this.expiresInSeconds,
    });
  }

  verify(token: string): number {
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const userId = typeof payload === 'string' ? NaN : Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedError('Invalid token');
    }
    return userId;
  }
}