// One "I wore these items on this day" entry.
export interface WearLog {
  id: number;
  userId: number;
  itemIds: number[];
  wornOn: string; // calendar date in UTC, 'YYYY-MM-DD'
}

export type NewWearLog = Omit<WearLog, 'id'>;