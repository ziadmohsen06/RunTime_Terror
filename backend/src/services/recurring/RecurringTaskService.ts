import { RecurringTask } from '../../domain/entities/RecurringTask';
import { TaskOccurrence } from '../../domain/entities/TaskOccurrence';
import { Clock } from '../../domain/Clock';
import { DayOfWeek } from '../../domain/enums/DayOfWeek';
import { OccurrenceStatus } from '../../domain/enums/OccurrenceStatus';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../domain/errors/AppError';
import { IOccurrenceRepository } from '../../repositories/interfaces/IOccurrenceRepository';
import { IRecurringTaskRepository } from '../../repositories/interfaces/IRecurringTaskRepository';
import { IReminderRepository } from '../../repositories/interfaces/IReminderRepository';
import { getDueDate, getPeriodKey, isValidPeriodKey } from './period';

export interface OccurrenceView {
  id: number;
  recurringTaskId: number;
  title: string;
  dayOfWeek: DayOfWeek;
  periodKey: string;
  dueDate: string;
  status: OccurrenceStatus;
}

export class RecurringTaskService {
  constructor(
    private readonly taskRepo: IRecurringTaskRepository,
    private readonly occurrenceRepo: IOccurrenceRepository,
    private readonly reminderRepo: IReminderRepository,
    private readonly clock: Clock
  ) {}

  async createWeekly(
    userId: number,
    title: string,
    dayOfWeek: DayOfWeek
  ): Promise<RecurringTask> {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Task title is required');
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 100) {
      throw new ValidationError('Task title must be 100 characters or fewer');
    }
    if (!Object.values(DayOfWeek).includes(dayOfWeek)) {
      throw new ValidationError('A valid day of the week is required');
    }

    const task = await this.taskRepo.create({ userId, title: trimmedTitle, dayOfWeek });
    await this.ensureOccurrenceAndReminder(task, this.clock.now());
    return task;
  }

  async listTasks(userId: number): Promise<RecurringTask[]> {
    return this.taskRepo.findActiveByUser(userId);
  }

  async deactivate(userId: number, taskId: number): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundError('Recurring task not found');
    }
    if (task.userId !== userId) {
      throw new ForbiddenError('You cannot deactivate another user’s task');
    }

    await this.taskRepo.update({ ...task, active: false });
  }

  async runWeeklyCheck(asOf?: Date): Promise<{ periodKey: string; created: number; skipped: number }> {
    const date = asOf ?? this.clock.now();
    const periodKey = getPeriodKey(date);
    const activeTasks = await this.taskRepo.findAllActive();
    const createdFlags: boolean[] = [];

    for (const task of activeTasks) {
      createdFlags.push(await this.ensureOccurrenceAndReminder(task, date));
    }

    return createdFlags.reduce(
      (summary, created) => ({
        periodKey,
        created: summary.created + Number(created),
        skipped: summary.skipped + Number(!created),
      }),
      { periodKey, created: 0, skipped: 0 }
    );
  }

  async listOccurrences(userId: number, periodKey?: string): Promise<OccurrenceView[]> {
    const selectedPeriod = periodKey ?? getPeriodKey(this.clock.now());
    if (!isValidPeriodKey(selectedPeriod)) {
      throw new ValidationError('Period must use the YYYY-Www format');
    }

    const occurrences = await this.occurrenceRepo.findByUserAndPeriod(userId, selectedPeriod);
    const views = await Promise.all(
      occurrences.map(async (occurrence) => {
        const task = await this.taskRepo.findById(occurrence.recurringTaskId);
        if (!task) {
          throw new Error(`Recurring task ${occurrence.recurringTaskId} for occurrence ${occurrence.id} not found`);
        }
        return {
          id: occurrence.id,
          recurringTaskId: occurrence.recurringTaskId,
          title: task.title,
          dayOfWeek: task.dayOfWeek,
          periodKey: occurrence.periodKey,
          dueDate: occurrence.dueDate,
          status: occurrence.status,
        };
      })
    );

    return views.filter((view) => view.periodKey === selectedPeriod);
  }

  async completeOccurrence(userId: number, occurrenceId: number): Promise<TaskOccurrence> {
    const occurrence = await this.occurrenceRepo.findById(occurrenceId);
    if (!occurrence) {
      throw new NotFoundError('Task occurrence not found');
    }
    if (occurrence.userId !== userId) {
      throw new ForbiddenError('You cannot complete another user’s task');
    }

    const completed = { ...occurrence, status: OccurrenceStatus.DONE };
    await this.occurrenceRepo.update(completed);
    return completed;
  }

  private async ensureOccurrenceAndReminder(
    task: RecurringTask,
    date: Date
  ): Promise<boolean> {
    const periodKey = getPeriodKey(date);
    const dueDate = getDueDate(date, task.dayOfWeek);
    const { occurrence, created } = await this.occurrenceRepo.createIfNotExists({
      recurringTaskId: task.id,
      userId: task.userId,
      periodKey,
      dueDate,
      status: OccurrenceStatus.PENDING,
      createdAt: this.clock.now(),
    });

    await this.reminderRepo.createIfNotExists({
      userId: task.userId,
      occurrenceId: occurrence.id,
      message: `${task.title} is due on ${this.weekdayName(task.dayOfWeek)} ${dueDate}`,
      read: false,
      createdAt: this.clock.now(),
    });
    return created;
  }

  private weekdayName(day: DayOfWeek): string {
    return `${day[0]}${day.slice(1).toLowerCase()}`;
  }
}
