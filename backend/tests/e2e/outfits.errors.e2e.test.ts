import Database from 'better-sqlite3';
import request from 'supertest';
import { createApp } from '../../src/app';
import { authedAgent } from '../helpers/auth';
import { ItemStatus } from '../../src/domain/enums/ItemStatus';
import { SqliteItemRepository } from '../../src/repositories/implementations/SqliteItemRepository';
import { initRecurringSchema } from '../../src/repositories/implementations/sqlite/recurringSchema';

// Error cases and user-story cases for the outfits / suggestions API, written against the
// M3 brief for the Outfits module: a dirty item is rejected, empty suggestions are reported
// clearly, an invalid occasion or season is rejected, and every route requires login.
// The happy paths are in outfits.e2e.test.ts. See docs/traceability-outfits.md.

describe('Outfits API: validation and error cases', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  const addItem = async (api: Awaited<ReturnType<typeof authedAgent>>, category: string, color = 'White', season = 'All Season') => {
    const response = await api.post('/items').send({ name: `${color} ${category}`, category, color, season, fabric: 'cotton' });
    expect(response.status).toBe(201);
    return response.body.id as number;
  };

  const setStatus = (id: number, status: ItemStatus) => new SqliteItemRepository(db).updateStatus(id, status);

  beforeEach(() => {
    db = new Database(':memory:');
    initRecurringSchema(db);
    app = createApp({ db });
  });

  afterEach(() => {
    db.close();
  });

  // US-O5: As a user, I want a clear error when I try to use a dirty or ironing item,
  // so that I know why my outfit was not saved.
  it('rejects building an outfit with a dirty item, naming the item', async () => {
    const api = await authedAgent(app);
    const shirt = await addItem(api, 'Shirts');
    await setStatus(shirt, ItemStatus.DIRTY);

    const response = await api.post('/outfits').send({ name: 'Weekend', itemIds: [shirt] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { message: 'White Shirts is not clean' } });
  });

  it('rejects building an outfit with an item still at the ironing stage', async () => {
    const api = await authedAgent(app);
    const scarf = await addItem(api, 'Accessory', 'Linen');
    await setStatus(scarf, ItemStatus.IRONING);

    const response = await api.post('/outfits').send({ name: 'Weekend', itemIds: [scarf] });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Linen Accessory is not clean');
  });

  // US-O6: As a user, I want a clear message when no outfit can be built yet,
  // so that I know to add more clean items rather than assume something broke.
  it('returns an empty list, not an error, when no outfit can be built', async () => {
    const api = await authedAgent(app);
    await addItem(api, 'Shirts');
    const dirtyBottom = await addItem(api, 'Jeans');
    await setStatus(dirtyBottom, ItemStatus.DIRTY);

    const response = await api.get('/outfits/suggestions').query({ occasion: 'casual', season: 'summer' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  // US-O7: As a user, I want a clear error when I ask for an occasion or season that does
  // not exist, so that I can correct my request instead of getting a silent empty result.
  it.each([
    [{ season: 'summer' }, 'Occasion must be one of: casual, work, formal, sport'],
    [{ occasion: 'casual' }, 'Season must be one of: spring, summer, autumn, winter'],
    [{ occasion: 'wedding', season: 'summer' }, 'Occasion must be one of: casual, work, formal, sport'],
    [{ occasion: 'casual', season: 'monsoon' }, 'Season must be one of: spring, summer, autumn, winter'],
  ])('rejects an invalid suggestions query %j', async (query, message) => {
    const api = await authedAgent(app);

    const response = await api.get('/outfits/suggestions').query(query);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(message);
  });

  it('rejects an unknown occasion or season when creating an outfit', async () => {
    const api = await authedAgent(app);
    const shirt = await addItem(api, 'Shirts');

    const badOccasion = await api.post('/outfits').send({ name: 'X', itemIds: [shirt], occasion: 'party-in-space' });
    expect(badOccasion.status).toBe(400);

    const badSeason = await api.post('/outfits').send({ name: 'X', itemIds: [shirt], season: 'monsoon' });
    expect(badSeason.status).toBe(400);
  });

  // US-O8: As a user, I want to be asked to log in before I can see or change my outfits,
  // so that nobody else can use my account.
  it.each([
    ['GET', '/outfits'],
    ['POST', '/outfits'],
    ['GET', '/outfits/suggestions'],
  ])('requires login for %s %s', async (method, url) => {
    const response = await (request(app) as any)[method.toLowerCase()](url);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBeTruthy();
  });

  it('rejects a request with a garbage bearer token the same way as a missing one', async () => {
    const response = await request(app).get('/outfits').set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
  });
});
