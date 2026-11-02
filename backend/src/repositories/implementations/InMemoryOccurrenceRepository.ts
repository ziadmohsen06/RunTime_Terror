import { TaskOccurrence } from '../../domain/entities/TaskOccurrence';
import { IOccurrenceRepository } from '../interfaces/IOccurrenceRepository';

function copy(occurrence: TaskOccurrence): TaskOccurrence {
  return { ...occurrence, createdAt: new Date(occurrence.createdAt.getTime()) };
}

export class InMemoryOccurrenceRepository implements IOccurrenceRepository {
  private readonly occurrences: TaskOccurrence[] = [];
  private nextId = 1;

  async createIfNotExists(
    data: Omit<TaskOccurrence, 'id'>
  ): Promise<{ occurrence: TaskOccurrence; created: boolean }> {
    const existing = this.occurrences.find(
      (occurrence) =>
        occurrence.recurringTaskId === data.recurringTaskId &&
        occurrence.periodKey === data.periodKey
    );
    if (existing) {
      return { occurrence: copy(existing), created: false };
    }

    const occurrence: TaskOccurrence = { ...data, id: this.nextId++ };
    this.occurrences.push(occurrence);
    return { occurrence: copy(occurrence), created: true };
  }

  async findById(id: number): Promise<TaskOccurrence | null> {
    const occurrence = this.occurrences.find((candidate) => candidate.id === id);
    return occurrence ? copy(occurrence) : null;
  }

  async findByUserAndPeriod(userId: number, periodKey: string): Promise<TaskOccurrence[]> {
    return this.occurrences
      .filter((occurrence) => occurrence.userId === userId && occurrence.periodKey === periodKey)
      .map(copy);
  }

  async update(occurrence: TaskOccurrence): Promise<void> {
    const index = this.occurrences.findIndex((candidate) => candidate.id === occurrence.id);
    if (index >= 0) {
      this.occurrences[index] = copy(occurrence);
    }
  }
}
