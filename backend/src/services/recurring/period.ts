import { DayOfWeek } from '../../domain/enums/DayOfWeek';

const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
const weekdays: Record<DayOfWeek, number> = {
  [DayOfWeek.MONDAY]: 0,
  [DayOfWeek.TUESDAY]: 1,
  [DayOfWeek.WEDNESDAY]: 2,
  [DayOfWeek.THURSDAY]: 3,
  [DayOfWeek.FRIDAY]: 4,
  [DayOfWeek.SATURDAY]: 5,
  [DayOfWeek.SUNDAY]: 6,
};

function getMonday(date: Date): Date {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - dayOfWeek + 1);
  return monday;
}

export function getPeriodKey(date: Date): string {
  const thursday = new Date(getMonday(date));
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();

  const firstMonday = getMonday(new Date(Date.UTC(isoYear, 0, 4)));
  const week = Math.floor((getMonday(date).getTime() - firstMonday.getTime()) / millisecondsPerWeek) + 1;

  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export function getDueDate(date: Date, day: DayOfWeek): string {
  const dueDate = getMonday(date);
  dueDate.setUTCDate(dueDate.getUTCDate() + weekdays[day]);
  return dueDate.toISOString().slice(0, 10);
}

export function isValidPeriodKey(key: string): boolean {
  return /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(key);
}
