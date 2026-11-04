import { NewRecurringTask, RecurringTask } from '../../domain/entities/RecurringTask';
import { IRecurringTaskRepository } from '../interfaces/IRecurringTaskRepository';

function copy(task: RecurringTask): RecurringTask {
  return { ...task, createdAt: new Date(task.createdAt.getTime()) };
}

export class InMemoryRecurringTaskRepository implements IRecurringTaskRepository {
  private readonly tasks: RecurringTask[] = [];
  private nextId = 1;

  async create(data: NewRecurringTask): Promise<RecurringTask> {
    const task: RecurringTask = {
      ...data,
      id: this.nextId++,
      active: true,
      createdAt: new Date(),
    };
    this.tasks.push(task);
    return copy(task);
  }

  async findById(id: number): Promise<RecurringTask | null> {
    const task = this.tasks.find((candidate) => candidate.id === id);
    return task ? copy(task) : null;
  }

  async findActiveByUser(userId: number): Promise<RecurringTask[]> {
    return this.tasks
      .filter((task) => task.userId === userId && task.active)
      .map(copy);
  }

  async findAllActive(): Promise<RecurringTask[]> {
    return this.tasks.filter((task) => task.active).map(copy);
  }

  async update(task: RecurringTask): Promise<void> {
    const index = this.tasks.findIndex((candidate) => candidate.id === task.id);
    if (index >= 0) {
      this.tasks[index] = copy(task);
    }
  }
}
