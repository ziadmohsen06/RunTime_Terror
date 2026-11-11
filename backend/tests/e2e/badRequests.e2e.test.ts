import request from 'supertest';
import { createApp } from '../../src/app';
import { authedAgent } from '../helpers/auth';

describe('malformed requests', () => {
  it('answers 400, not 500, for a body that is not valid JSON', async () => {
    const res = await request(createApp())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad json');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Request body is not valid JSON');
  });

  it('answers 400 for an impossible wear date', async () => {
    const api = await authedAgent(createApp());
    const { body: item } = await api
      .post('/items')
      .send({ name: 'Shirt', category: 'top', color: 'white', season: 'summer', fabric: 'cotton' });

    const res = await api.post('/wearlog').send({ itemIds: [item.id], wornOn: '2026-13-45' });

    expect(res.status).toBe(400);
  });
});

describe('unknown routes', () => {
  it('answer with a JSON 404', async () => {
    const api = await authedAgent(createApp());
    const res = await api.get('/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Not found');
  });
});
