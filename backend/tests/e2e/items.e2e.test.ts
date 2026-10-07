import request from 'supertest';
import { createApp } from '../../src/app';

describe('Items API (E2E)', () => {
  it('creates and lists items', async () => {
    const app = createApp();
    const body = { name: 'Shirt', category: 'top', color: 'white', season: 'summer', fabric: 'linen' };

    const created = await request(app).post('/items').send(body);
    expect(created.status).toBe(201);

    const list = await request(app).get('/items').query({ category: 'top' });
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('returns a consistent error for invalid input', async () => {
    const res = await request(createApp()).post('/items').send({ category: 'top' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Item name is required');
  });
});
