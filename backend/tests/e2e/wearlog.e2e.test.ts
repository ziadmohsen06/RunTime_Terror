import Database from 'better-sqlite3';
import request from 'supertest';
import { createApp } from '../../src/app';
import { initRecurringSchema } from '../../src/repositories/implementations/sqlite/recurringSchema';
import { FakeClock } from '../helpers/FakeClock';

// User story: As a user, I want to log what I wear and see my wear stats,
// so that I know which clothes I wear the most and which ones I never wear.
describe('Wear Log API (E2E)', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  const addItem = async (name: string) => {
    const response = await request(app)
      .post('/items')
      .send({ name, category: 'top', color: 'black', season: 'All Season', fabric: 'cotton' });
    expect(response.status).toBe(201);
    return response.body.id as number;
  };

  beforeEach(() => {
    db = new Database(':memory:');
    initRecurringSchema(db); // creates the shared users and items tables
    app = createApp({ db, clock: new FakeClock(new Date('2026-11-06T12:00:00.000Z')) });
  });

  afterEach(() => {
    db.close();
  });

  it('logs what I wore and shows it in my stats (happy path)', async () => {
    const shirt = await addItem('Shirt');
    const jeans = await addItem('Jeans');
    const scarf = await addItem('Scarf');

    const first = await request(app).post('/wearlog').send({ itemIds: [shirt, jeans], wornOn: '2026-11-02' });
    const second = await request(app).post('/wearlog').send({ itemIds: [shirt] });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.wornOn).toBe('2026-11-06');

    const logs = await request(app).get('/wearlog');
    expect(logs.status).toBe(200);
    expect(logs.body.map((log: { id: number }) => log.id)).toEqual([second.body.id, first.body.id]);

    const stats = await request(app).get('/wearlog/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.mostWorn.map((u: { name: string; count: number }) => [u.name, u.count])).toEqual([
      ['Shirt', 2],
      ['Jeans', 1],
    ]);
    expect(stats.body.leastWorn[0]).toMatchObject({ itemId: scarf, count: 0 });
    expect(stats.body.notWornIn90Days.map((u: { name: string }) => u.name)).toEqual(['Scarf']);
    expect(stats.body.weeklySummary).toEqual({
      weekStart: '2026-11-02',
      weekEnd: '2026-11-08',
      logCount: 2,
      totalWears: 3,
      distinctItems: 2,
    });
  });

  it('does not change item status when a wear is logged', async () => {
    const shirt = await addItem('Shirt');
    await request(app).patch(`/items/${shirt}/status`).send({ status: 'dirty' });

    await request(app).post('/wearlog').send({ itemIds: [shirt] });

    const item = await request(app).get(`/items/${shirt}`);
    expect(item.body.status).toBe('dirty');
  });

  it('returns 404 for an item that does not exist', async () => {
    const response = await request(app).post('/wearlog').send({ itemIds: [999] });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Item 999 not found');
  });

  it('returns 400 for a date in the future', async () => {
    const shirt = await addItem('Shirt');

    const response = await request(app).post('/wearlog').send({ itemIds: [shirt], wornOn: '2026-12-01' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('You cannot log a wear in the future');
  });

  it('returns a consistent error for a malformed body', async () => {
    const response = await request(app).post('/wearlog').send(['not', 'an', 'object']);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Choose at least one item');
  });

  it('keeps wear logs in the database', async () => {
    const shirt = await addItem('Shirt');
    await request(app).post('/wearlog').send({ itemIds: [shirt] });

    const rows = db.prepare('SELECT COUNT(*) AS total FROM wear_logs').get() as { total: number };

    expect(rows.total).toBe(1);
  });
  
  it('serves the wear log page', async () => {
    const response = await request(app).get('/wear-log.html');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
  });
});