import { Request, Response } from 'express';
import { authenticate, currentUserId } from '../../../src/api/middleware/authenticate';
import { TokenService } from '../../../src/services/auth/TokenService';
import { UnauthorizedError } from '../../../src/domain/errors/AppError';

const tokens = new TokenService('test-secret', 3600);
const middleware = authenticate(tokens);

function fakeRequest(authorization?: string): Request {
  const headers = authorization === undefined ? {} : { authorization };
  return { headers } as unknown as Request;
}

function run(req: Request) {
  const next = jest.fn();
  middleware(req, {} as Response, next);
  return next;
}

function expectRejected(req: Request, next: jest.Mock) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  expect(req.userId).toBeUndefined();
}

describe('authenticate middleware', () => {
  it('lets a valid token through and records the user id', () => {
    const req = fakeRequest(`Bearer ${tokens.sign(42)}`);

    const next = run(req);

    expect(next).toHaveBeenCalledWith(); // called with no error
    expect(req.userId).toBe(42);
  });

  it('rejects a request with no Authorization header', () => {
    const req = fakeRequest();

    expectRejected(req, run(req));
  });

  it('rejects an Authorization header that is not a Bearer token', () => {
    const req = fakeRequest(`Basic ${tokens.sign(42)}`);

    expectRejected(req, run(req));
  });

  it('rejects a tampered token', () => {
    const [header, , signature] = tokens.sign(42).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '1' })).toString('base64url');
    const req = fakeRequest(`Bearer ${header}.${forgedPayload}.${signature}`);

    expectRejected(req, run(req));
  });

  it('rejects an expired token', () => {
    const req = fakeRequest(`Bearer ${new TokenService('test-secret', -10).sign(42)}`);

    expectRejected(req, run(req));
  });

  it('rejects a token signed with another secret', () => {
    const req = fakeRequest(`Bearer ${new TokenService('other-secret', 3600).sign(42)}`);

    expectRejected(req, run(req));
  });
});

describe('currentUserId', () => {
  it('returns the id the middleware recorded', () => {
    const req = { userId: 7 } as unknown as Request;

    expect(currentUserId(req)).toBe(7);
  });

  it('fails closed with 401 when no user was recorded', () => {
    const req = {} as unknown as Request;

    expect(() => currentUserId(req)).toThrow(UnauthorizedError);
  });
});