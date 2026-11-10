import request from 'supertest';
import { createApp } from '../../src/app';
import { TokenService } from '../../src/services/auth/TokenService';
import { authedAgent, registerAndLogin } from '../helpers/auth';

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

describe('Protected routes (E2E)', () => {
  const protectedRoutes = [
    '/items',
    '/laundry/loads',
    '/outfits',
    '/wearlog',
    '/recurring-tasks',
    '/occurrences',
    '/reminders',
  ];

  it.each(protectedRoutes)('GET %s without a token returns 401', async (route) => {
    const res = await request(createApp()).get(route);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Authentication required');
  });

  it('rejects a token that is not valid with 401', async () => {
    const res = await request(createApp())
      .get('/items')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });

  it('rejects a tampered token with 401', async () => {
    const app = createApp();
    const { token } = await registerAndLogin(app);
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '999' })).toString('base64url');

    const res = await request(app)
      .get('/items')
      .set('Authorization', `Bearer ${header}.${forgedPayload}.${signature}`);

    expect(res.status).toBe(401);
  });

  it('rejects an expired token with 401', async () => {
    const app = createApp();
    const { id } = await registerAndLogin(app);
    const expired = new TokenService(process.env.JWT_SECRET as string, -10).sign(id);

    const res = await request(app).get('/items').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
  });

  it('accepts a valid token', async () => {
    const api = await authedAgent(createApp());

    expect((await api.get('/items')).status).toBe(200);
  });

  it('keeps /health, the /auth routes and the static pages public', async () => {
    const app = createApp();

    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).post('/auth/login').send({})).status).toBe(400);
    expect((await request(app).get('/wear-log.html')).status).toBe(200);
  });

  it('gives each user their own data', async () => {
    const app = createApp();
    const sara = await authedAgent(app);
    const omar = await authedAgent(app);

    const created = await sara
      .post('/items')
      .send({ name: 'Shirt', category: 'top', color: 'white', season: 'summer', fabric: 'cotton' });
    expect(created.status).toBe(201);

    expect((await sara.get('/items')).body).toHaveLength(1);
    expect((await omar.get('/items')).body).toHaveLength(0);
  });
});