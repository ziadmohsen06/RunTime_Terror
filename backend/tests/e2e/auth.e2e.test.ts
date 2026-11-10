import request from 'supertest';
import { createApp } from '../../src/app';

describe('Auth API (E2E)', () => {
  const credentials = { email: 'sara@example.com', password: 'secret123' };

  describe('POST /auth/register', () => {
    it('creates an account and returns the user without the password hash', async () => {
      const res = await request(createApp()).post('/auth/register').send(credentials);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(Number), email: 'sara@example.com' });
    });

    it('rejects an email that is already registered with 409', async () => {
      const app = createApp();
      await request(app).post('/auth/register').send(credentials);

      const res = await request(app).post('/auth/register').send(credentials);

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('Email is already registered');
    });

    it.each([
      ['an empty body', {}],
      ['a missing password', { email: 'sara@example.com' }],
      ['a password that is not text', { email: 'sara@example.com', password: 12345678 }],
      ['an invalid email', { email: 'nope', password: 'secret123' }],
      ['a password that is too short', { email: 'sara@example.com', password: 'short' }],
    ])('rejects %s with 400', async (_name, body) => {
      const res = await request(createApp()).post('/auth/register').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toEqual(expect.any(String));
    });
  });

  describe('POST /auth/login', () => {
    async function appWithAccount() {
      const app = createApp();
      await request(app).post('/auth/register').send(credentials);
      return app;
    }

    it('returns a token and the user when the password is right', async () => {
      const app = await appWithAccount();

      const res = await request(app).post('/auth/login').send(credentials);

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toEqual({ id: expect.any(Number), email: 'sara@example.com' });
    });

    it('rejects a wrong password with 401', async () => {
      const app = await appWithAccount();

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'sara@example.com', password: 'wrong-pass' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects an unknown email with the same 401 message', async () => {
      const app = await appWithAccount();

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'secret123' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it.each([
      ['an empty body', {}],
      ['a missing password', { email: 'sara@example.com' }],
    ])('rejects %s with 400', async (_name, body) => {
      const res = await request(await appWithAccount()).post('/auth/login').send(body);

      expect(res.status).toBe(400);
    });
  });

  describe('configuration', () => {
    it('refuses to start without a JWT secret', () => {
      const saved = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        expect(() => createApp()).toThrow('JWT_SECRET');
      } finally {
        process.env.JWT_SECRET = saved;
      }
    });
  });
});