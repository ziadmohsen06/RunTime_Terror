export interface IroningEntry {
  itemId: number;
  userId: number;
  queuedAt: Date;
}

export type NewIroningEntry = Omit<IroningEntry, 'queuedAt'>;
