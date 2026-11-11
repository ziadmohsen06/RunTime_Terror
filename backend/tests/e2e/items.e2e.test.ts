import { authedAgent } from '../helpers/auth';
import { createApp } from '../../src/app';

describe('Items API (E2E)', () => {
  it('creates and lists items', async () => {
    const app = createApp();
    const api = await authedAgent(app);
    const body = { name: 'Shirt', category: 'top', color: 'white', season: 'summer', fabric: 'linen' };

    const created = await api.post('/items').send(body);
    expect(created.status).toBe(201);

    const list = await api.get('/items').query({ category: 'top' });
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('returns a consistent error for invalid input', async () => {
    const api = await authedAgent(createApp());
    const res = await api.post('/items').send({ category: 'top' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Item name is required');
  });

  it('filters items by status through the API', async () => {
    const app = createApp();
    const api = await authedAgent(app);

    await api.post('/items').send({
      name: 'Clean Shirt',
      category: 'top',
      color: 'white',
      season: 'summer',
      fabric: 'cotton',
    });

    const response = await api
      .get('/items')
      .query({ status: 'dirty' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });


  describe('single item and status', () => {
    const body = { name: 'Shirt', category: 'top', color: 'white', season: 'summer', fabric: 'cotton' };

    it('gets one item by id', async () => {
      const app = createApp();
      const api = await authedAgent(app);
      const { body: created } = await api.post('/items').send(body);

      const res = await api.get(`/items/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Shirt');
    });

    it('returns 404 for a missing item and 400 for a bad id', async () => {
      const app = createApp();
      const api = await authedAgent(app);
      expect((await api.get('/items/99')).status).toBe(404);
      expect((await api.get('/items/abc')).status).toBe(400);
    });
  });
});