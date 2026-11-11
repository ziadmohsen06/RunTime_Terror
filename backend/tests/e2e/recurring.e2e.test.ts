import { authedAgent } from '../helpers/auth';
import { createApp } from '../../src/app';
import { FakeClock } from '../helpers/FakeClock';
import { createRecurringModule } from '../../src/services/recurring/recurringModule';

function createTestApp(enableDemoRoutes = false) {
  const clock = new FakeClock(new Date('2026-11-02T10:00:00.000Z'));
  const recurring = createRecurringModule({
    clock,
    enableDemoRoutes,
    intervalMs: 60_000,
    logger: { error: jest.fn() },
  });
  return createApp({ clock, recurring });
}

// The app plus an agent that is already logged in as a fresh user.
function createTestApi(enableDemoRoutes = false) {
  return authedAgent(createTestApp(enableDemoRoutes));
}

describe('Recurring tasks API (E2E)', () => {
  it('creates a weekly task and lists its task and current-week occurrence', async () => {
    const api = await createTestApi();

    const created = await api
      .post('/recurring-tasks')
      .send({ title: 'Laundry day', dayOfWeek: 'SATURDAY' });
    expect(created.status).toBe(201);

    const tasks = await api.get('/recurring-tasks');
    expect(tasks.status).toBe(200);
    expect(tasks.body).toHaveLength(1);
    expect(tasks.body[0].title).toBe('Laundry day');

    const occurrences = await api.get('/occurrences');
    expect(occurrences.status).toBe(200);
    expect(occurrences.body).toHaveLength(1);
    expect(occurrences.body[0]).toMatchObject({
      title: 'Laundry day',
      periodKey: '2026-W45',
      dueDate: '2026-11-07',
    });
  });

  it('returns a consistent validation error for an invalid body', async () => {
    const api = await createTestApi();
    const response = await api
      .post('/recurring-tasks')
      .send({ title: '', dayOfWeek: 'SATURDAY' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { message: 'Task title is required' } });
  });

  it('run-check creates a next-week occurrence once when demo routes are enabled', async () => {
    const api = await createTestApi(true);
    await api
      .post('/recurring-tasks')
      .send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });

    const first = await api
      .post('/recurring-tasks/run-check')
      .send({ asOf: '2026-11-09' });
    const second = await api
      .post('/recurring-tasks/run-check')
      .send({ asOf: '2026-11-09' });
    const occurrences = await api.get('/occurrences').query({ period: '2026-W46' });

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ periodKey: '2026-W46', created: 1 });
    expect(second.body).toMatchObject({ periodKey: '2026-W46', created: 0 });
    expect(occurrences.body).toHaveLength(1);
  });

  it('completes occurrences and lists and reads reminders', async () => {
    const api = await createTestApi();
    await api
      .post('/recurring-tasks')
      .send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });
    const occurrences = await api.get('/occurrences');
    const completed = await api
      .post(`/occurrences/${occurrences.body[0].id}/complete`)
      .send();

    const reminders = await api.get('/reminders');
    const read = await api.post(`/reminders/${reminders.body[0].id}/read`).send();

    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('DONE');
    expect(reminders.status).toBe(200);
    expect(reminders.body[0].read).toBe(false);
    expect(read.status).toBe(200);
    expect(read.body.read).toBe(true);
  });

  it('deactivates tasks and returns 400 or 404 for invalid task identifiers', async () => {
    const api = await createTestApi();
    const created = await api
      .post('/recurring-tasks')
      .send({ title: 'Laundry', dayOfWeek: 'SATURDAY' });

    expect((await api.delete('/recurring-tasks/not-a-number')).status).toBe(400);
    expect((await api.delete('/recurring-tasks/999')).status).toBe(404);
    expect((await api.delete(`/recurring-tasks/${created.body.id}`)).status).toBe(204);
    expect((await api.get('/recurring-tasks')).body).toHaveLength(0);
  });

  it('returns 404 for run-check unless demo routes are enabled', async () => {
    const api = await createTestApi();
    const response = await api
      .post('/recurring-tasks/run-check')
      .send({});

    expect(response.status).toBe(404);
  });

  it('returns 400 for non-numeric occurrence and reminder identifiers', async () => {
    const api = await createTestApi();

    const occurrence = await api.post('/occurrences/not-a-number/complete').send();
    const reminder = await api.post('/reminders/not-a-number/read').send();

    expect(occurrence.status).toBe(400);
    expect(reminder.status).toBe(400);
  });

  it('returns 404 for missing occurrence and reminder identifiers', async () => {
    const api = await createTestApi();

    const occurrence = await api.post('/occurrences/999/complete').send();
    const reminder = await api.post('/reminders/999/read').send();

    expect(occurrence.status).toBe(404);
    expect(reminder.status).toBe(404);
  });

  it('rejects invalid run-check dates with the standard error shape', async () => {
    const api = await createTestApi(true);
    const response = await api
      .post('/recurring-tasks/run-check')
      .send({ asOf: '2026-02-30' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBeDefined();
  });
});
