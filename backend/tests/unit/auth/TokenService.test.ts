import { TokenService } from '../../../src/services/auth/TokenService';
import { UnauthorizedError } from '../../../src/domain/errors/AppError';

describe('TokenService', () => {
  const tokens = new TokenService('test-secret', 3600);

  it('signs a token that verifies back to the same user id', () => {
    expect(tokens.verify(tokens.sign(42))).toBe(42);
  });

  it('rejects a tampered token (payload changed, signature kept)', () => {
    const [header, , signature] = tokens.sign(42).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '1' })).toString('base64url');
    const forged = `${header}.${forgedPayload}.${signature}`;
    expect(() => tokens.verify(forged)).toThrow(UnauthorizedError);
  });

  it('rejects an expired token', () => {
    const expired = new TokenService('test-secret', -10).sign(42); // already expired
    expect(() => tokens.verify(expired)).toThrow(UnauthorizedError);
  });

  it('rejects a token signed with a different secret', () => {
    const other = new TokenService('other-secret', 3600).sign(42);
    expect(() => tokens.verify(other)).toThrow(UnauthorizedError);
  });

  it('rejects garbage', () => {
    expect(() => tokens.verify('not-a-token')).toThrow(UnauthorizedError);
  });
});