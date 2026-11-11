import request from 'supertest';
import { createApp } from '../../src/app';
import { AuthedAgent, authedAgent } from '../helpers/auth';

// User story: As a user, I want to see which of my washed clothes need ironing and at what
// temperature, so that I can iron them without damaging them.
// NFR (Security): each user can only see and edit their own items and ironing queue.
describe('Ironing API (E2E)', () => {
  let app: ReturnType<typeof createApp>;
  let sara: AuthedAgent;
  let omar: AuthedAgent;

  const addItem = async (user: AuthedAgent, fabric: string) => {
    const res = await user.post('/items').send({
      name: `${fabric} shirt`,
      category: 'top',
      color: 'white',
      season: 'summer',
      fabric,
    });
    return res.body.id as number;
  };

  // Runs the items through the real laundry flow, so they reach the ironing queue the same
  // way they do in the app: dirty -> load -> washing -> drying -> done.
  const wash = async (user: AuthedAgent, itemIds: number[]) => {
    for (const id of itemIds) await user.post(`/laundry/items/${id}/dirty`);
    const load = await user.post('/laundry/loads').send({ itemIds });
    for (let step = 0; step < 3; step++) await user.post(`/laundry/loads/${load.body.id}/advance`);
  };

  beforeEach(async () => {
    app = createApp();
    sara = await authedAgent(app);
    omar = await authedAgent(app);
  });

  it('lists a washed item that needs ironing with its temperature and notes', async () => {
    const linen = await addItem(sara, 'linen');
    const cotton = await addItem(sara, 'cotton');
    await wash(sara, [linen, cotton]);

    const res = await sara.get('/ironing');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1); // the cotton shirt went straight back to the closet
    expect(res.body[0].item).toMatchObject({ id: linen, status: 'ironing' });
    expect(res.body[0].temperature).toBe(230);
    expect(res.body[0].notes).toEqual(['Use steam']);
  });

  it('advises low heat for a delicate fabric', async () => {
    const silk = await addItem(sara, 'silk');
    await wash(sara, [silk]);

    const res = await sara.get('/ironing');

    expect(res.body[0].temperature).toBe(110);
    expect(res.body[0].notes).toEqual(['Use the low heat setting']);
  });

  it('moves an item from the queue to clean when it is marked as ironed', async () => {
    const linen = await addItem(sara, 'linen');
    await wash(sara, [linen]);

    const ironed = await sara.post(`/ironing/items/${linen}/ironed`);

    expect(ironed.status).toBe(200);
    expect(ironed.body.status).toBe('clean');
    expect((await sara.get('/ironing')).body).toEqual([]);
    expect((await sara.get(`/items/${linen}`)).body.status).toBe('clean');
  });

  it("keeps another user's queue private and refuses to change it with 403 (NFR4)", async () => {
    const linen = await addItem(sara, 'linen');
    await wash(sara, [linen]);

    expect((await omar.get('/ironing')).body).toEqual([]);

    const attempt = await omar.post(`/ironing/items/${linen}/ironed`);

    expect(attempt.status).toBe(403);
    const queue = await sara.get('/ironing');
    expect(queue.body).toHaveLength(1);
    expect(queue.body[0].item.status).toBe('ironing');
  });

  it('rejects an item that does not exist with 404', async () => {
    const res = await sara.post('/ironing/items/999/ironed');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Item 999 not found');
  });

  it('rejects an id that is not a number with 400', async () => {
    expect((await sara.post('/ironing/items/abc/ironed')).status).toBe(400);
  });

  it('rejects an item that is not waiting to be ironed with 409', async () => {
    const cotton = await addItem(sara, 'cotton');

    expect((await sara.post(`/ironing/items/${cotton}/ironed`)).status).toBe(409);
  });

    it('serves the ironing page without a token, so it can send you to log in', async () => {
    const res = await request(app).get('/ironing.html');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Mark as ironed');
  });

  it('needs a token', async () => {
    expect((await request(app).get('/ironing')).status).toBe(401);
    expect((await request(app).post('/ironing/items/1/ironed')).status).toBe(401);
  });
});
import Database from 'better-sqlite3';
import request from 'supertest';
import { createApp } from '../../src/app';
import { initRecurringSchema } from '../../src/repositories/implementations/sqlite/recurringSchema';
import { authedAgent, AuthedAgent, registerAndLogin } from '../helpers/auth';

// User story (FR4): As a user, I want to see which of my washed clothes need ironing and at
// what temperature, so that I can iron them without damaging them.
// NFR4: each user can only see and edit their own items and ironing queue.
describe('Ironing API (E2E)', () => {
  let app: ReturnType<typeof createApp>;
  let api: AuthedAgent;

  const addItem = async (agent: AuthedAgent, fabric: string, color = 'white') =>
    (await agent.post('/items').send({ name: `${fabric} top`, category: 'top', color, season: 'summer', fabric })).body
      .id as number;

  // Washes one item through a whole load, so it ends up wherever Laundry sends it.
  const washCompletely = async (agent: AuthedAgent, itemId: number) => {
    await agent.post(`/laundry/items/${itemId}/dirty`);
    const load = await agent.post('/laundry/loads').send({ itemIds: [itemId] });
    for (let i = 0; i < 3; i++) await agent.post(`/laundry/loads/${load.body.id}/advance`);
  };

  const statusOf = async (agent: AuthedAgent, id: number) =>
    (await agent.get(`/items/${id}`)).body.status as string;

  beforeEach(async () => {
    app = createApp();
    api = await authedAgent(app);
  });

  it('happy path: a washed linen shirt goes to the queue, shows care instructions, and becomes clean when ironed', async () => {
    const shirt = await addItem(api, 'linen');
    await washCompletely(api, shirt);
    expect(await statusOf(api, shirt)).toBe('ironing');

    const queue = await api.get('/ironing/queue');
    expect(queue.status).toBe(200);
    expect(queue.body).toHaveLength(1);
    expect(queue.body[0]).toMatchObject({
      itemId: shirt,
      fabric: 'linen',
      care: { ironTemperatureC: 200, setting: 'high', steam: true },
    });

    const ironed = await api.post(`/ironing/items/${shirt}/ironed`);
    expect(ironed.status).toBe(200);
    expect(ironed.body.status).toBe('clean');
    expect((await api.get('/ironing/queue')).body).toEqual([]);
    expect(await statusOf(api, shirt)).toBe('clean');
  });

  it('does not queue fabrics that do not need ironing', async () => {
    const tee = await addItem(api, 'cotton');
    await washCompletely(api, tee);

    expect(await statusOf(api, tee)).toBe('clean');
    expect((await api.get('/ironing/queue')).body).toEqual([]);
  });

  it('a delicate fabric shows a low temperature and no steam', async () => {
    const blouse = await addItem(api, 'silk');
    await washCompletely(api, blouse);

    const [entry] = (await api.get('/ironing/queue')).body;
    expect(entry.care).toMatchObject({ ironTemperatureC: 110, setting: 'low', steam: false });
  });

  it('an item waiting for the iron is not used in outfits', async () => {
    const shirt = await addItem(api, 'linen');
    await washCompletely(api, shirt);

    const outfit = await api.post('/outfits').send({ name: 'Look', itemIds: [shirt] });
    expect(outfit.status).toBe(400);
  });

  it('refuses an item that is not in the queue', async () => {
    const shirt = await addItem(api, 'linen');
    const res = await api.post(`/ironing/items/${shirt}/ironed`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('not in your ironing queue');
  });

  it('returns 404 for an item that does not exist and 400 for a bad id', async () => {
    expect((await api.post('/ironing/items/999/ironed')).status).toBe(404);
    expect((await api.post('/ironing/items/abc/ironed')).status).toBe(400);
  });

  describe('security (NFR4)', () => {
    it('needs a login for every ironing route', async () => {
      expect((await request(app).get('/ironing/queue')).status).toBe(401);
      expect((await request(app).post('/ironing/items/1/ironed')).status).toBe(401);
    });

    it('each user sees only their own queue', async () => {
      const other = await authedAgent(app);
      const mine = await addItem(api, 'linen');
      const theirs = await addItem(other, 'silk');
      await washCompletely(api, mine);
      await washCompletely(other, theirs);

      expect((await api.get('/ironing/queue')).body.map((q: { itemId: number }) => q.itemId)).toEqual([mine]);
      expect((await other.get('/ironing/queue')).body.map((q: { itemId: number }) => q.itemId)).toEqual([theirs]);
    });

    it('a user cannot mark another user’s item as ironed (403) and nothing changes', async () => {
      const other = await authedAgent(app);
      const theirs = await addItem(other, 'linen');
      await washCompletely(other, theirs);

      const res = await api.post(`/ironing/items/${theirs}/ironed`);

      expect(res.status).toBe(403);
      expect(await statusOf(other, theirs)).toBe('ironing');
      expect((await other.get('/ironing/queue')).body).toHaveLength(1);
    });
  });

  it('keeps the ironing queue after the app is rebuilt on the same database', async () => {
    const db = new Database(':memory:');
    initRecurringSchema(db);
    const first = createApp({ db });
    const user = await registerAndLogin(first);
    const agent = request.agent(first).set('Authorization', `Bearer ${user.token}`);
    const shirt = await addItem(agent, 'linen');
    await washCompletely(agent, shirt);

    const restarted = createApp({ db });
    const queue = await request(restarted).get('/ironing/queue').set('Authorization', `Bearer ${user.token}`);

    expect(queue.status).toBe(200);
    expect(queue.body.map((q: { itemId: number }) => q.itemId)).toEqual([shirt]);
    db.close();
  });
});
