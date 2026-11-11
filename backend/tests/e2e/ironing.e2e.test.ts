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

  it('needs a token', async () => {
    expect((await request(app).get('/ironing')).status).toBe(401);
    expect((await request(app).post('/ironing/items/1/ironed')).status).toBe(401);
  });
});