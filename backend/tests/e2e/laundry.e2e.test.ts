import request from 'supertest';
import { createApp } from '../../src/app';
import { AuthedAgent, authedAgent, registerAndLogin } from '../helpers/auth';
import Database from 'better-sqlite3';
import { initRecurringSchema } from '../../src/repositories/implementations/sqlite/recurringSchema';

// User story (FR1): As a user, I want to group my dirty clothes into loads by color and
// fabric and track each load until it is clean, so that I know what is ready to wear
// and avoid damaging clothes by mixing them.
describe('Laundry API (E2E)', () => {
  let app: ReturnType<typeof createApp>;
  let api: AuthedAgent;

  const addItem = async (color: string, fabric: string) => {
    const res = await api
      .post('/items')
      .send({ name: `${color} ${fabric}`, category: 'top', color, season: 'summer', fabric });
    return res.body.id as number;
  };
  const markDirty = (id: number) => api.post(`/laundry/items/${id}/dirty`);
  const dirtyItem = async (color: string, fabric: string) => {
    const id = await addItem(color, fabric);
    await markDirty(id);
    return id;
  };
  const statusOf = async (id: number) => {
    const list = await api.get('/items');
    return list.body.find((i: { id: number }) => i.id === id).status;
  };

  beforeEach(async () => {
    app = createApp();
    api = await authedAgent(app);
  });

  it('happy path: dirty items -> load -> washing -> drying -> done, items return to the closet', async () => {
    const shirt = await dirtyItem('white', 'cotton');
    const linen = await dirtyItem('cream', 'linen'); // linen needs ironing (FabricCareRules)
    const dirty = await api.get('/laundry/dirty-items');
    expect(dirty.status).toBe(200);
    expect(dirty.body).toHaveLength(2);

    const created = await api.post('/laundry/loads').send({ itemIds: [shirt, linen] });
    expect(created.status).toBe(201);
    expect(created.body.stage).toBe('pending');
    const loadId = created.body.id;

    const stages: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await api.post(`/laundry/loads/${loadId}/advance`);
      expect(res.status).toBe(200);
      stages.push(res.body.stage);
    }
    expect(stages).toEqual(['washing', 'drying', 'done']);
    expect(await statusOf(shirt)).toBe('clean');
    expect(await statusOf(linen)).toBe('ironing');
    expect((await api.get('/laundry/dirty-items')).body).toHaveLength(0);
  });

  it('lists loads with their stage', async () => {
    const id = await dirtyItem('white', 'cotton');
    await api.post('/laundry/loads').send({ itemIds: [id] });
    const res = await api.get('/laundry/loads');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].stage).toBe('pending');
  });

  it('rejects mixed colors with a 400 and changes nothing', async () => {
    const white = await dirtyItem('white', 'cotton');
    const black = await dirtyItem('black', 'cotton');
    const res = await api.post('/laundry/loads').send({ itemIds: [white, black] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/same color group/);
    expect(await statusOf(white)).toBe('dirty');
    expect((await api.get('/laundry/loads')).body).toHaveLength(0);
  });

  it('rejects putting an item in a second load with a 409', async () => {
    const id = await dirtyItem('white', 'cotton');
    await api.post('/laundry/loads').send({ itemIds: [id] });
    const res = await api.post('/laundry/loads').send({ itemIds: [id] });
    expect(res.status).toBe(409);
    expect((await api.get('/laundry/loads')).body).toHaveLength(1);
  });

  it('rejects an invalid status change with a 409', async () => {
    const id = await dirtyItem('white', 'cotton');
    const res = await markDirty(id); // dirty -> dirty
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Invalid status change: dirty -> dirty');
  });

  it('removes an item from a pending load and it becomes dirty again', async () => {
    const a = await dirtyItem('white', 'cotton');
    const b = await dirtyItem('white', 'cotton');
    const load = (await api.post('/laundry/loads').send({ itemIds: [a, b] })).body;
    const res = await api.delete(`/laundry/loads/${load.id}/items/${a}`);
    expect(res.status).toBe(200);
    expect(res.body.load.itemIds).toEqual([b]);
    expect(await statusOf(a)).toBe('dirty');
  });

  it('refuses to remove an item once washing has started', async () => {
    const id = await dirtyItem('white', 'cotton');
    const load = (await api.post('/laundry/loads').send({ itemIds: [id] })).body;
    await api.post(`/laundry/loads/${load.id}/advance`);
    const res = await api.delete(`/laundry/loads/${load.id}/items/${id}`);
    expect(res.status).toBe(409);
    expect(await statusOf(id)).toBe('washing');
  });

  it('returns 400 for a bad request body or id', async () => {
    expect((await api.post('/laundry/loads').send({})).status).toBe(400);
    expect((await api.post('/laundry/loads').send({ itemIds: 'x' })).status).toBe(400);
    expect((await api.post('/laundry/loads').send({ itemIds: [1.5] })).status).toBe(400);
    expect((await api.post('/laundry/loads/abc/advance')).status).toBe(400);
  });

  it('returns 404 for an unknown load or item', async () => {
    expect((await api.post('/laundry/loads/99/advance')).status).toBe(404);
    expect((await markDirty(99)).status).toBe(404);
  });
});

describe('Laundry loads with a real database (E2E)', () => {
  it('keeps loads after the app is rebuilt on the same database', async () => {
    const db = new Database(':memory:');
    initRecurringSchema(db);
    const first = createApp({ db });
    const user = await registerAndLogin(first);
    const auth = { Authorization: `Bearer ${user.token}` };
    const item = await request(first)
      .post('/items')
      .set(auth)
      .send({ name: 'Tee', category: 'top', color: 'white', season: 'summer', fabric: 'cotton' });
    await request(first).post(`/laundry/items/${item.body.id}/dirty`).set(auth);
    const load = await request(first).post('/laundry/loads').set(auth).send({ itemIds: [item.body.id] });
    expect(load.status).toBe(201);

    // The same token still works on the rebuilt app: it is signed, not stored in memory.
    const restarted = createApp({ db });
    const loads = await request(restarted).get('/laundry/loads').set(auth);

    expect(loads.body).toHaveLength(1);
    expect(loads.body[0].itemIds).toEqual([item.body.id]);
    db.close();
  });
});
