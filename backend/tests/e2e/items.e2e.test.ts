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

  it('filters items by status through the API', async () => {
    const app = createApp();

    await request(app).post('/items').send({
      name: 'Clean Shirt',
      category: 'top',
      color: 'white',
      season: 'summer',
      fabric: 'cotton',
    });

    const response = await request(app)
      .get('/items')
      .query({ status: 'dirty' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });


  describe('single item and status', () => {
    const body = { name: 'Shirt', category: 'top', color: 'white', season: 'summer', fabric: 'cotton' };

    it('gets one item by id', async () => {
      const app = createApp();
      const { body: created } = await request(app).post('/items').send(body);

      const res = await request(app).get(`/items/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Shirt');
    });

    it('returns 404 for a missing item and 400 for a bad id', async () => {
      const app = createApp();
      expect((await request(app).get('/items/99')).status).toBe(404);
      expect((await request(app).get('/items/abc')).status).toBe(400);
    });

    it('updates the status of an item', async () => {
      const app = createApp();
      const { body: created } = await request(app).post('/items').send(body);

      const res = await request(app).patch(`/items/${created.id}/status`).send({ status: 'dirty' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('dirty');
      expect((await request(app).get(`/items/${created.id}`)).body.status).toBe('dirty');
    });

    it('rejects an unknown status and a missing item', async () => {
      const app = createApp();
      const { body: created } = await request(app).post('/items').send(body);

      const bad = await request(app).patch(`/items/${created.id}/status`).send({ status: 'flying' });
      expect(bad.status).toBe(400);
      expect(bad.body.error.message).toContain('Status must be one of');

      expect((await request(app).patch('/items/99/status').send({ status: 'dirty' })).status).toBe(404);
    });
  });
});
