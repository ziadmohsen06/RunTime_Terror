import Database from 'better-sqlite3';
import request from 'supertest';
import { createApp } from '../../src/app';
import { ItemStatus } from '../../src/domain/enums/ItemStatus';
import { SqliteItemRepository } from '../../src/repositories/implementations/SqliteItemRepository';
import { initRecurringSchema } from '../../src/repositories/implementations/sqlite/recurringSchema';

describe('Outfits API (E2E)', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  const addItem = async (category: string, color: string, season = 'All Season') => {
    const response = await request(app)
      .post('/items')
      .send({ name: `${color} ${category}`, category, color, season, fabric: 'cotton' });
    expect(response.status).toBe(201);
    return response.body.id as number;
  };

  // The Laundry module has no API yet, so the test changes status through the repository.
  const setStatus = (id: number, status: ItemStatus) =>
    new SqliteItemRepository(db).updateStatus(id, status);

  beforeEach(() => {
    db = new Database(':memory:');
    initRecurringSchema(db);
    app = createApp({ db });
  });

  afterEach(() => {
    db.close();
  });

  // User story: As a user, I want to build an outfit from my own clean items
  // so that I can save a look and wear it later.
  it('saves an outfit and lists it with its items', async () => {
    const shirt = await addItem('Shirts', 'White');
    const jeans = await addItem('Jeans', 'Blue');

    const created = await request(app)
      .post('/outfits')
      .send({ name: 'Weekend', itemIds: [shirt, jeans] });

    expect(created.status).toBe(201);
    expect(created.body.items).toHaveLength(2);

    const list = await request(app).get('/outfits');

    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Weekend');
    expect(list.body[0].items.map((item: { id: number }) => item.id)).toEqual([shirt, jeans]);
  });

  it.each([ItemStatus.DIRTY, ItemStatus.IRONING])(
    'refuses to build an outfit with a %s item',
    async (status) => {
      const shirt = await addItem('Shirts', 'White');
      await setStatus(shirt, status);

      const response = await request(app)
        .post('/outfits')
        .send({ name: 'Weekend', itemIds: [shirt] });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('White Shirts is not clean');
    }
  );

  it('returns a consistent error for a malformed body', async () => {
    const response = await request(app).post('/outfits').send(['not', 'an', 'object']);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Outfit name is required');
  });

  it('returns 404 for an item that does not exist', async () => {
    const response = await request(app).post('/outfits').send({ name: 'Look', itemIds: [999] });

    expect(response.status).toBe(404);
  });

  // User story: As a user, I want ranked outfit suggestions for an occasion and season
  // so that I can decide what to wear from what is actually clean.
  it('suggests ranked outfits and leaves out DIRTY and IRONING items', async () => {
    const dirty = await addItem('Shirts', 'White');
    const ironing = await addItem('Blouses', 'White');
    const clean = await addItem('Sweaters', 'Black', 'Winter');
    const hoodie = await addItem('Hoodies', 'Red', 'Summer');
    const trousers = await addItem('Trousers', 'Navy');
    await setStatus(dirty, ItemStatus.DIRTY);
    await setStatus(ironing, ItemStatus.IRONING);

    const response = await request(app)
      .get('/outfits/suggestions')
      .query({ occasion: 'work', season: 'winter' });

    expect(response.status).toBe(200);
    const ids = response.body.map((outfit: { items: { id: number }[] }) =>
      outfit.items.map((item) => item.id)
    );
    expect(ids[0]).toEqual([clean, trousers]);
    expect(ids).toContainEqual([hoodie, trousers]);
    expect(ids.flat()).not.toContain(dirty);
    expect(ids.flat()).not.toContain(ironing);
    expect(response.body[0].totalScore).toBeGreaterThan(response.body[1].totalScore);
  });

  it('honors the limit query', async () => {
    await addItem('Shirts', 'White');
    await addItem('Sweaters', 'Black');
    await addItem('Trousers', 'Navy');

    const response = await request(app)
      .get('/outfits/suggestions')
      .query({ occasion: 'work', season: 'winter', limit: '1' });

    expect(response.body).toHaveLength(1);
  });

  it.each([
    [{ season: 'winter' }, 'Occasion must be one of: casual, work, formal, sport'],
    [{ occasion: 'work' }, 'Season must be one of: spring, summer, autumn, winter'],
    [{ occasion: 'work', season: 'winter', limit: 'many' }, 'Limit must be a whole number from 1 to 20'],
  ])('rejects the query %j', async (query, message) => {
    const response = await request(app).get('/outfits/suggestions').query(query);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(message);
  });

  it('keeps outfits in memory when no database is supplied', async () => {
    const memoryApp = createApp();
    const item = await request(memoryApp)
      .post('/items')
      .send({ name: 'Dress', category: 'dress', color: 'red', season: 'Summer', fabric: 'silk' });

    const created = await request(memoryApp)
      .post('/outfits')
      .send({ name: 'Solo', itemIds: [item.body.id] });

    expect(created.status).toBe(201);
    expect((await request(memoryApp).get('/outfits')).body).toHaveLength(1);
  });

  it.each(['/outfit-builder.html', '/outfit-suggestions.html'])('serves %s', async (page) => {
    const response = await request(app).get(page);

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
  });
});
