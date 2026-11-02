import { Reminder } from '../../../src/domain/entities/Reminder';
import { RecurringTask } from '../../../src/domain/entities/RecurringTask';
import { TaskOccurrence } from '../../../src/domain/entities/TaskOccurrence';
import { DayOfWeek } from '../../../src/domain/enums/DayOfWeek';
import { OccurrenceStatus } from '../../../src/domain/enums/OccurrenceStatus';
import { IRecurringTaskRepository } from '../../../src/repositories/interfaces/IRecurringTaskRepository';
import { IOccurrenceRepository } from '../../../src/repositories/interfaces/IOccurrenceRepository';
import { IReminderRepository } from '../../../src/repositories/interfaces/IReminderRepository';

interface Fixture<T> {
  repository: T;
  cleanup(): void;
}

type Factory<T> = () => Fixture<T>;

const taskInput = {
  userId: 1,
  title: 'Laundry day',
  dayOfWeek: DayOfWeek.SATURDAY,
};

const occurrenceInput = (periodKey: string, recurringTaskId = 7) => ({
  recurringTaskId,
  userId: 1,
  periodKey,
  dueDate: '2026-11-07',
  status: OccurrenceStatus.PENDING,
  createdAt: new Date('2026-11-02T10:00:00.000Z'),
});

export function recurringTaskRepositoryContract(
  name: string,
  factory: Factory<IRecurringTaskRepository>
): void {
  describe(`${name} recurring task repository contract`, () => {
    let fixture: Fixture<IRecurringTaskRepository>;
    beforeEach(() => {
      fixture = factory();
    });
    afterEach(() => fixture.cleanup());

    it('creates and finds a task', async () => {
      const created = await fixture.repository.create(taskInput);
      expect(await fixture.repository.findById(created.id)).toEqual(created);
    });

    it('findActiveByUser ignores inactive tasks and other users', async () => {
      const own = await fixture.repository.create(taskInput);
      const inactive = await fixture.repository.create({ ...taskInput, title: 'Inactive' });
      await fixture.repository.create({ ...taskInput, userId: 2, title: 'Other user' });
      await fixture.repository.update({ ...inactive, active: false });

      expect(await fixture.repository.findActiveByUser(1)).toEqual([own]);
      expect(await fixture.repository.findAllActive()).toHaveLength(2);
    });

    it('persists task updates', async () => {
      const created = await fixture.repository.create(taskInput);
      const updated: RecurringTask = { ...created, title: 'Updated', active: false };
      await fixture.repository.update(updated);

      expect(await fixture.repository.findById(created.id)).toEqual(updated);
    });
  });
}

export function occurrenceRepositoryContract(
  name: string,
  factory: Factory<IOccurrenceRepository>
): void {
  describe(`${name} occurrence repository contract`, () => {
    let fixture: Fixture<IOccurrenceRepository>;
    beforeEach(() => {
      fixture = factory();
    });
    afterEach(() => fixture.cleanup());

    it('creates and finds an occurrence', async () => {
      const result = await fixture.repository.createIfNotExists(occurrenceInput('2026-W45'));

      expect(result.created).toBe(true);
      expect(await fixture.repository.findById(result.occurrence.id)).toEqual(result.occurrence);
      expect(await fixture.repository.findByUserAndPeriod(1, '2026-W45')).toEqual([
        result.occurrence,
      ]);
    });

    it('returns the same row without throwing for a duplicate task and period', async () => {
      const input = occurrenceInput('2026-W45');
      const first = await fixture.repository.createIfNotExists(input);
      const second = await fixture.repository.createIfNotExists(input);

      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(second.occurrence).toEqual(first.occurrence);
    });

    it('allows a new period for the same task', async () => {
      await fixture.repository.createIfNotExists(occurrenceInput('2026-W45'));
      const nextPeriod = await fixture.repository.createIfNotExists(
        occurrenceInput('2026-W46')
      );

      expect(nextPeriod.created).toBe(true);
    });

    it('persists occurrence updates', async () => {
      const created = await fixture.repository.createIfNotExists(occurrenceInput('2026-W45'));
      const updated: TaskOccurrence = {
        ...created.occurrence,
        status: OccurrenceStatus.DONE,
      };
      await fixture.repository.update(updated);

      expect(await fixture.repository.findById(updated.id)).toEqual(updated);
    });
  });
}

export function reminderRepositoryContract(
  name: string,
  factory: Factory<IReminderRepository>
): void {
  describe(`${name} reminder repository contract`, () => {
    let fixture: Fixture<IReminderRepository>;
    beforeEach(() => {
      fixture = factory();
    });
    afterEach(() => fixture.cleanup());

    it('creates and finds a reminder', async () => {
      const input: Omit<Reminder, 'id'> = {
        userId: 1,
        occurrenceId: 9,
        message: 'Laundry day is due on Saturday 2026-11-07',
        read: false,
        createdAt: new Date('2026-11-02T10:00:00.000Z'),
      };
      const result = await fixture.repository.createIfNotExists(input);

      expect(result.created).toBe(true);
      expect(await fixture.repository.findById(result.reminder.id)).toEqual(result.reminder);
      expect(await fixture.repository.findByUser(1)).toEqual([result.reminder]);
    });

    it('returns the same row without duplicating a reminder for an occurrence', async () => {
      const input: Omit<Reminder, 'id'> = {
        userId: 1,
        occurrenceId: 9,
        message: 'Reminder',
        read: false,
        createdAt: new Date('2026-11-02T10:00:00.000Z'),
      };
      const first = await fixture.repository.createIfNotExists(input);
      const second = await fixture.repository.createIfNotExists(input);

      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(second.reminder).toEqual(first.reminder);
    });

    it('persists reminder updates', async () => {
      const created = await fixture.repository.createIfNotExists({
        userId: 1,
        occurrenceId: 9,
        message: 'Reminder',
        read: false,
        createdAt: new Date('2026-11-02T10:00:00.000Z'),
      });
      const updated: Reminder = { ...created.reminder, read: true };
      await fixture.repository.update(updated);

      expect(await fixture.repository.findById(updated.id)).toEqual(updated);
    });
  });
}
