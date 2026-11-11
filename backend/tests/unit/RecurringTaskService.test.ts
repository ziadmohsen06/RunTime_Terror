import { FakeClock } from '../helpers/FakeClock';
import { DayOfWeek } from '../../src/domain/enums/DayOfWeek';
import { OccurrenceStatus } from '../../src/domain/enums/OccurrenceStatus';
import { ValidationError } from '../../src/domain/errors/AppError';
import { ConflictError } from '../../src/domain/errors/ConflictError';
import { InMemoryOccurrenceRepository } from '../../src/repositories/implementations/InMemoryOccurrenceRepository';
import { InMemoryRecurringTaskRepository } from '../../src/repositories/implementations/InMemoryRecurringTaskRepository';
import { InMemoryReminderRepository } from '../../src/repositories/implementations/InMemoryReminderRepository';
import { RecurringTaskService } from '../../src/services/recurring/RecurringTaskService';

describe('RecurringTaskService', () => {
  let taskRepo: InMemoryRecurringTaskRepository;
  let occurrenceRepo: InMemoryOccurrenceRepository;
  let reminderRepo: InMemoryReminderRepository;
  let clock: FakeClock;
  let service: RecurringTaskService;

  beforeEach(() => {
    taskRepo = new InMemoryRecurringTaskRepository();
    occurrenceRepo = new InMemoryOccurrenceRepository();
    reminderRepo = new InMemoryReminderRepository();
    clock = new FakeClock(new Date('2026-11-02T10:00:00.000Z'));
    service = new RecurringTaskService(taskRepo, occurrenceRepo, reminderRepo, clock);
  });

  it('rejects the same task on the same day twice, but allows it for another user or day', async () => {
    await service.createWeekly(1, 'Laundry day', DayOfWeek.SATURDAY);

    await expect(service.createWeekly(1, ' laundry DAY ', DayOfWeek.SATURDAY)).rejects.toBeInstanceOf(ConflictError);
    await expect(service.createWeekly(1, 'Laundry day', DayOfWeek.SUNDAY)).resolves.toBeDefined();
    await expect(service.createWeekly(2, 'Laundry day', DayOfWeek.SATURDAY)).resolves.toBeDefined();
  });

  it('allows the task again after the old one was deactivated', async () => {
    const task = await service.createWeekly(1, 'Laundry day', DayOfWeek.SATURDAY);
    await service.deactivate(1, task.id);

    await expect(service.createWeekly(1, 'Laundry day', DayOfWeek.SATURDAY)).resolves.toBeDefined();
  });

  it('rejects an empty title', async () => {
    await expect(service.createWeekly(1, '   ', DayOfWeek.SATURDAY)).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it('rejects a title longer than 100 characters', async () => {
    await expect(
      service.createWeekly(1, 'x'.repeat(101), DayOfWeek.SATURDAY)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an invalid day', async () => {
    await expect(service.createWeekly(1, 'Laundry', 'FUNDAY' as DayOfWeek)).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it('trims task titles', async () => {
    const task = await service.createWeekly(1, '  Laundry day  ', DayOfWeek.SATURDAY);
    expect(task.title).toBe('Laundry day');
  });

  it('immediately creates this week’s occurrence and reminder', async () => {
    await service.createWeekly(1, 'Laundry day', DayOfWeek.SATURDAY);

    const occurrences = await occurrenceRepo.findByUserAndPeriod(1, '2026-W45');
    const reminders = await reminderRepo.findByUser(1);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].dueDate).toBe('2026-11-07');
    expect(reminders).toHaveLength(1);
    expect(reminders[0].occurrenceId).toBe(occurrences[0].id);
  });

  it('generates one occurrence and reminder per active task in the current week', async () => {
    await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });
    await taskRepo.create({
      userId: 2,
      title: 'Ironing',
      dayOfWeek: DayOfWeek.MONDAY,
    });

    const summary = await service.runWeeklyCheck();

    expect(summary).toEqual({ periodKey: '2026-W45', created: 2, skipped: 0 });
    expect(await occurrenceRepo.findByUserAndPeriod(1, '2026-W45')).toHaveLength(1);
    expect(await occurrenceRepo.findByUserAndPeriod(2, '2026-W45')).toHaveLength(1);
    expect(await reminderRepo.findByUser(1)).toHaveLength(1);
    expect(await reminderRepo.findByUser(2)).toHaveLength(1);
  });

  it('NFR5: repeated checks create no duplicate occurrence or reminder', async () => {
    await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });

    await service.runWeeklyCheck();
    const secondSummary = await service.runWeeklyCheck();

    expect(secondSummary.created).toBe(0);
    expect(secondSummary.skipped).toBe(1);
    expect(await occurrenceRepo.findByUserAndPeriod(1, '2026-W45')).toHaveLength(1);
    expect(await reminderRepo.findByUser(1)).toHaveLength(1);
  });

  it('NFR5: a new service over the same repositories does not duplicate rows after restart', async () => {
    await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });
    await service.runWeeklyCheck();
    const restartedService = new RecurringTaskService(taskRepo, occurrenceRepo, reminderRepo, clock);

    const summary = await restartedService.runWeeklyCheck();

    expect(summary.created).toBe(0);
    expect(await occurrenceRepo.findByUserAndPeriod(1, '2026-W45')).toHaveLength(1);
    expect(await reminderRepo.findByUser(1)).toHaveLength(1);
  });

  it('creates a new occurrence after advancing one week', async () => {
    await service.createWeekly(1, 'Laundry', DayOfWeek.SATURDAY);
    clock.advanceDays(7);

    const summary = await service.runWeeklyCheck();

    expect(summary.periodKey).toBe('2026-W46');
    expect(summary.created).toBe(1);
    expect(await occurrenceRepo.findByUserAndPeriod(1, '2026-W46')).toHaveLength(1);
  });

  it('skips deactivated tasks', async () => {
    const task = await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });
    await service.deactivate(1, task.id);

    const summary = await service.runWeeklyCheck();

    expect(summary.created).toBe(0);
    expect(await occurrenceRepo.findByUserAndPeriod(1, '2026-W45')).toHaveLength(0);
  });

  it('lists only the caller’s occurrences', async () => {
    await service.createWeekly(1, 'Laundry', DayOfWeek.SATURDAY);
    await service.createWeekly(2, 'Ironing', DayOfWeek.MONDAY);

    const occurrences = await service.listOccurrences(1);

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].title).toBe('Laundry');
  });

  it('uses the supplied date instead of the clock', async () => {
    await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });

    const summary = await service.runWeeklyCheck(new Date('2026-11-09T12:00:00.000Z'));

    expect(summary.periodKey).toBe('2026-W46');
    expect(summary.created).toBe(1);
  });

  it('self-heals a missing reminder without creating another occurrence', async () => {
    const task = await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });
    await occurrenceRepo.createIfNotExists({
      recurringTaskId: task.id,
      userId: 1,
      periodKey: '2026-W45',
      dueDate: '2026-11-07',
      status: OccurrenceStatus.PENDING,
      createdAt: clock.now(),
    });

    const summary = await service.runWeeklyCheck();

    expect(summary.created).toBe(0);
    expect(await occurrenceRepo.findByUserAndPeriod(1, '2026-W45')).toHaveLength(1);
    expect(await reminderRepo.findByUser(1)).toHaveLength(1);
  });

  it('creates an occurrence even when the task weekday has already passed', async () => {
    await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.MONDAY,
    });

    await service.runWeeklyCheck(new Date('2026-11-06T10:00:00.000Z'));

    expect((await occurrenceRepo.findByUserAndPeriod(1, '2026-W45'))[0].dueDate).toBe(
      '2026-11-02'
    );
  });

  it('completes an occurrence for its owner', async () => {
    await service.createWeekly(1, 'Laundry', DayOfWeek.SATURDAY);
    const occurrence = (await occurrenceRepo.findByUserAndPeriod(1, '2026-W45'))[0];

    const completed = await service.completeOccurrence(1, occurrence.id);

    expect(completed.status).toBe(OccurrenceStatus.DONE);
  });

  it('rejects completing an occurrence for another user', async () => {
    await service.createWeekly(1, 'Laundry', DayOfWeek.SATURDAY);
    const occurrence = (await occurrenceRepo.findByUserAndPeriod(1, '2026-W45'))[0];

    await expect(service.completeOccurrence(2, occurrence.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('returns not found when completing a missing occurrence', async () => {
    await expect(service.completeOccurrence(1, 999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deactivates a task for its owner', async () => {
    const task = await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });

    await service.deactivate(1, task.id);

    expect(await taskRepo.findActiveByUser(1)).toHaveLength(0);
  });

  it('rejects deactivating another user’s task', async () => {
    const task = await taskRepo.create({
      userId: 1,
      title: 'Laundry',
      dayOfWeek: DayOfWeek.SATURDAY,
    });

    await expect(service.deactivate(2, task.id)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns not found when deactivating a missing task', async () => {
    await expect(service.deactivate(1, 999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an invalid period key', async () => {
    await expect(service.listOccurrences(1, '2026-W00')).rejects.toBeInstanceOf(ValidationError);
  });

  it('formats the reminder message exactly', async () => {
    await service.createWeekly(1, 'Laundry day', DayOfWeek.SATURDAY);

    expect((await reminderRepo.findByUser(1))[0].message).toBe(
      'Laundry day is due on Saturday 2026-11-07'
    );
  });
});
