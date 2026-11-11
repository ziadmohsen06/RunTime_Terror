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
