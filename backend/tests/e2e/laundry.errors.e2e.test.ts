import request from 'supertest';
import { createApp } from '../../src/app';
import { AuthedAgent, authedAgent } from '../helpers/auth';

// Error handling for the laundry routes: 401 without a login and 404 for someone else's data.
// (400 and 409 are covered in laundry.e2e.test.ts.)
describe('Laundry API errors (E2E)', () => {
  // US-L9: As a user, I want to be sent to the login page when my session has expired.
  describe('401', () => {
    const routes: [string, string][] = [
      ['post', '/laundry/items/1/dirty'],
      ['get', '/laundry/dirty-items'],
      ['get', '/laundry/loads'],
      ['post', '/laundry/loads'],
      ['post', '/laundry/loads/1/advance'],
      ['delete', '/laundry/loads/1/items/1'],
    ];

    it.each(routes)('%s %s without a token is rejected', async (method, url) => {
      const res = await (request(createApp()) as any)[method](url);
      expect(res.status).toBe(401);
      expect(typeof res.body.error.message).toBe('string');
    });

    it('a tampered token is rejected', async () => {
      const res = await request(createApp()).get('/laundry/loads').set('Authorization', 'Bearer not.a.token');
      expect(res.status).toBe(401);
    });
  });

  // US-L10: As a user, I want to see and change only my own laundry so that nobody else can touch it.
  describe("another user's data", () => {
    let app: ReturnType<typeof createApp>;
    let owner: AuthedAgent;
    let other: AuthedAgent;
    let itemId: number;
    let loadId: number;

    beforeEach(async () => {
      app = createApp();
      owner = await authedAgent(app);
      other = await authedAgent(app);
      itemId = (await owner.post('/items').send({ name: 'Tee', category: 'shirt', color: 'white', season: 'summer', fabric: 'cotton' })).body.id;
      await owner.post(`/laundry/items/${itemId}/dirty`);
      loadId = (await owner.post('/laundry/loads').send({ itemIds: [itemId] })).body.id;
    });

    it('they see none of my loads or dirty items', async () => {
      expect((await other.get('/laundry/loads')).body).toEqual([]);
      expect((await other.get('/laundry/dirty-items')).body).toEqual([]);
      expect((await owner.get('/laundry/loads')).body).toHaveLength(1);
    });

    it('they cannot advance my load', async () => {
      expect((await other.post(`/laundry/loads/${loadId}/advance`)).status).toBe(404);
      expect((await owner.get('/laundry/loads')).body[0].stage).toBe('pending');
    });

    it('they cannot remove an item from my load', async () => {
      expect((await other.delete(`/laundry/loads/${loadId}/items/${itemId}`)).status).toBe(404);
      expect((await owner.get('/laundry/loads')).body[0].itemIds).toEqual([itemId]);
    });

    it('they cannot mark my item dirty or put it in their own load', async () => {
      expect((await other.post(`/laundry/items/${itemId}/dirty`)).status).toBe(404);
      expect((await other.post('/laundry/loads').send({ itemIds: [itemId] })).status).toBe(404);
    });
  });
});
