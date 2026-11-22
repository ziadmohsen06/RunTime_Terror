import request from 'supertest';
import { createApp } from '../../src/app';
import { authedAgent } from '../helpers/auth';
import { FakeClock } from '../helpers/FakeClock';
import { createRecurringModule } from '../../src/services/recurring/recurringModule';

// Error cases and user-story cases for the recurring tasks / occurrences / reminders API.
// The happy paths are in recurring.e2e.test.ts. See docs/traceability-recurring.md.

function createTestApp() {
  const clock = new FakeClock(new Date('2026-11-02T10:00:00.000Z'));
  const recurring = createRecurringModule({
    clock,
    enableDemoRoutes: false,
    intervalMs: 60_000,
    logger: { error: jest.fn() },
  });
  return createApp({ clock, recurring });
}

async function twoUsers() {
  const app = createTestApp();
  const alice = await authedAgent(app);
  const bob = await authedAgent(app);
  return { app, alice, bob };
}

describe('Recurring tasks API: validation (400)', () => {
  it('rejects a day that is not a weekday name', async () => {
    const { alice } = await twoUsers();
    const res = await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 'FUNDAY' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: 'A valid day of the week is required' } });
  });

  it('rejects a title longer than 100 characters', async () => {
    const { alice } = await twoUsers();
    const res = await alice.post('/recurring-tasks').send({ title: 'x'.repeat(101), dayOfWeek: 'MONDAY' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/100 characters/);
  });

  it('rejects a whitespace-only title', async () => {
    const { alice } = await twoUsers();
    const res = await alice.post('/recurring-tasks').send({ title: '   ', dayOfWeek: 'MONDAY' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing title, a non-string day and an empty body', async () => {
    const { alice } = await twoUsers();

    expect((await alice.post('/recurring-tasks').send({ dayOfWeek: 'MONDAY' })).status).toBe(400);
    expect((await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 3 })).status).toBe(400);
    expect((await alice.post('/recurring-tasks').send({})).status).toBe(400);
  });

  it('rejects a body that is not valid JSON', async () => {
    const { alice } = await twoUsers();
    const res = await alice
      .post('/recurring-tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Request body is not valid JSON');
  });

  it('rejects an invalid or repeated period query on GET /occurrences', async () => {
    const { alice } = await twoUsers();

    expect((await alice.get('/occurrences').query({ period: '2026-45' })).status).toBe(400);
    expect((await alice.get('/occurrences').query({ period: '2026-W99' })).status).toBe(400);
    expect((await alice.get('/occurrences?period=2026-W45&period=2026-W46')).status).toBe(400);
  });
});

describe('Recurring tasks API: duplicates (409)', () => {
  it('rejects the same title on the same day, ignoring case', async () => {
    const { alice } = await twoUsers();
    await alice.post('/recurring-tasks').send({ title: 'Laundry day', dayOfWeek: 'SATURDAY' });

    const res = await alice.post('/recurring-tasks').send({ title: 'LAUNDRY DAY ', dayOfWeek: 'SATURDAY' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already have/);
    expect((await alice.get('/recurring-tasks')).body).toHaveLength(1);
  });

  it('allows the same title on another day, for another user, or after deactivation', async () => {
    const { alice, bob } = await twoUsers();
    const first = await alice.post('/recurring-tasks').send({ title: 'Laundry day', dayOfWeek: 'SATURDAY' });

    expect((await alice.post('/recurring-tasks').send({ title: 'Laundry day', dayOfWeek: 'SUNDAY' })).status).toBe(201);
    expect((await bob.post('/recurring-tasks').send({ title: 'Laundry day', dayOfWeek: 'SATURDAY' })).status).toBe(201);

    await alice.delete(`/recurring-tasks/${first.body.id}`);
    expect((await alice.post('/recurring-tasks').send({ title: 'Laundry day', dayOfWeek: 'SATURDAY' })).status).toBe(201);
  });
});

describe('Recurring tasks API: other users’ data (403) and missing data (404)', () => {
  it('forbids deactivating, completing or reading another user’s data', async () => {
    const { alice, bob } = await twoUsers();
    const task = await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });
    const occurrenceId = (await alice.get('/occurrences')).body[0].id;
    const reminderId = (await alice.get('/reminders')).body[0].id;

    const deleted = await bob.delete(`/recurring-tasks/${task.body.id}`);
    const completed = await bob.post(`/occurrences/${occurrenceId}/complete`).send();
    const read = await bob.post(`/reminders/${reminderId}/read`).send();

    expect(deleted.status).toBe(403);
    expect(completed.status).toBe(403);
    expect(read.status).toBe(403);
    expect(deleted.body.error.message).toBeDefined();

    // Nothing of Alice's changed.
    expect((await alice.get('/recurring-tasks')).body).toHaveLength(1);
    expect((await alice.get('/occurrences')).body[0].status).toBe('PENDING');
    expect((await alice.get('/reminders')).body[0].read).toBe(false);
  });

  it('never lists another user’s tasks, occurrences or reminders', async () => {
    const { alice, bob } = await twoUsers();
    await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });

    expect((await bob.get('/recurring-tasks')).body).toEqual([]);
    expect((await bob.get('/occurrences')).body).toEqual([]);
    expect((await bob.get('/reminders')).body).toEqual([]);
  });

  it('returns 404 for identifiers that do not exist', async () => {
    const { alice } = await twoUsers();

    expect((await alice.delete('/recurring-tasks/424242')).status).toBe(404);
    expect((await alice.post('/occurrences/424242/complete').send()).status).toBe(404);
    expect((await alice.post('/reminders/424242/read').send()).status).toBe(404);
  });
});

describe('Recurring tasks API: login required (401)', () => {
  it.each([
    ['POST', '/recurring-tasks'],
    ['DELETE', '/recurring-tasks/1'],
    ['POST', '/occurrences/1/complete'],
    ['POST', '/reminders/1/read'],
  ])('%s %s without a token returns 401', async (method, route) => {
    const app = createTestApp();
    const res = await request(app)[method.toLowerCase() as 'post' | 'delete'](route).send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: 'Authentication required' } });
  });
});

describe('Recurring tasks API: user stories', () => {
  // FR5: As a user, I want weekly laundry and ironing reminders so that chores don't pile up.
  it('creating a weekly task gives an unread reminder for this week right away', async () => {
    const { alice } = await twoUsers();
    await alice.post('/recurring-tasks').send({ title: 'Ironing day', dayOfWeek: 'WEDNESDAY' });

    const reminders = await alice.get('/reminders');

    expect(reminders.body).toHaveLength(1);
    expect(reminders.body[0]).toMatchObject({ read: false, message: 'Ironing day is due on Wednesday 2026-11-04' });
  });

  it('lists unread reminders first and marks one read without touching the others', async () => {
    const { alice } = await twoUsers();
    await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });
    await alice.post('/recurring-tasks').send({ title: 'Closet check', dayOfWeek: 'SUNDAY' });
    const before = (await alice.get('/reminders')).body;
    expect(before).toHaveLength(2);

    await alice.post(`/reminders/${before[0].id}/read`).send();
    const after = (await alice.get('/reminders')).body;

    expect(after.filter((reminder: { read: boolean }) => reminder.read)).toHaveLength(1);
    expect(after[0].read).toBe(false);
    expect(after[1].read).toBe(true);
    expect(after[1].id).toBe(before[0].id);
  });

  it('completing an occurrence is repeatable: a second complete still returns 200 and DONE', async () => {
    const { alice } = await twoUsers();
    await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });
    const occurrenceId = (await alice.get('/occurrences')).body[0].id;

    const first = await alice.post(`/occurrences/${occurrenceId}/complete`).send();
    const second = await alice.post(`/occurrences/${occurrenceId}/complete`).send();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('DONE');
    expect((await alice.get('/occurrences')).body[0].status).toBe('DONE');
  });

  it('a deactivated task disappears from the task list', async () => {
    const { alice } = await twoUsers();
    const task = await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });

    expect((await alice.delete(`/recurring-tasks/${task.body.id}`)).status).toBe(204);
    expect((await alice.get('/recurring-tasks')).body).toEqual([]);
  });

  it('shows the occurrences of the week asked for, and none for a week with no tasks', async () => {
    const { alice } = await twoUsers();
    await alice.post('/recurring-tasks').send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });

    expect((await alice.get('/occurrences').query({ period: '2026-W45' })).body).toHaveLength(1);
    expect((await alice.get('/occurrences').query({ period: '2026-W46' })).body).toEqual([]);
  });
});
