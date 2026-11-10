import { Express } from 'express';
import request from 'supertest';

let counter = 0;

export interface TestUser {
  id: number;
  email: string;
  token: string;
}

// Registers a new user through the real /auth endpoints, logs in, and returns the token.
export async function registerAndLogin(
  app: Express,
  email = `user${++counter}@example.com`
): Promise<TestUser> {
  const password = 'password123';

  const registered = await request(app).post('/auth/register').send({ email, password });
  if (registered.status !== 201) {
    throw new Error(`Test helper could not register ${email}: HTTP ${registered.status}`);
  }

  const login = await request(app).post('/auth/login').send({ email, password });
  if (login.status !== 200) {
    throw new Error(`Test helper could not log in ${email}: HTTP ${login.status}`);
  }
  return { id: login.body.user.id, email, token: login.body.token };
}

// A supertest agent that sends a fresh user's token on every request.
// Use it where a test used to call request(app).
export async function authedAgent(app: Express, email?: string) {
  const user = await registerAndLogin(app, email);
  return request.agent(app).set('Authorization', `Bearer ${user.token}`);
}