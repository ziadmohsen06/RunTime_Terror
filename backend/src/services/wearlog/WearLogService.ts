import { Clock } from '../../domain/Clock';
import { WearLog } from '../../domain/entities/WearLog';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { IWearLogRepository } from '../../repositories/interfaces/IWearLogRepository';
import { addDays, isValidDateKey, mondayOf, toDateKey } from './dates';
import { IWearItemReader } from './IWearItemReader';

export interface LogWearInput {
  itemIds: number[];
  wornOn?: string;
}

export interface ItemUsage {
  itemId: number;
  name: string;
  category: string;
  count: number;
  lastWornOn: string | null;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  logCount: number;
  totalWears: number;
  distinctItems: number;
}

export interface WearStats {
  mostWorn: ItemUsage[];
  leastWorn: ItemUsage[];
  notWornIn90Days: ItemUsage[];
  weeklySummary: WeeklySummary;
}

interface Usage {
  count: number;
  lastWornOn: string | null;
}

export const STALE_AFTER_DAYS = 90;
const TOP_LIMIT = 5;

export class WearLogService {
  constructor(
    private readonly items: IWearItemReader,
    private readonly logs: IWearLogRepository,
    private readonly clock: Clock
  ) {}

  async logWear(userId: number, input: LogWearInput): Promise<WearLog> {
    const itemIds = this.validItemIds(input.itemIds);
    const wornOn = this.validWornOn(input.wornOn);
    await this.requireOwnItems(userId, itemIds);
    // Only a log is saved. Item status belongs to the Laundry module and is not touched.
    return this.logs.create({ userId, itemIds, wornOn });
  }

  async listLogs(userId: number): Promise<WearLog[]> {
    return this.logs.findAll(userId);
  }

  async getStats(userId: number): Promise<WearStats> {
    const [items, logs] = await Promise.all([this.items.listItems(userId), this.logs.findAll(userId)]);
    const today = this.today();
    const usage = this.countUsage(logs);

    const usages: ItemUsage[] = items.map((item) => ({
      itemId: item.id,
      name: item.name,
      category: item.category,
      count: usage.get(item.id)?.count ?? 0,
      lastWornOn: usage.get(item.id)?.lastWornOn ?? null,
    }));

    const cutoff = addDays(today, -STALE_AFTER_DAYS);

    return {
      mostWorn: usages
        .filter((u) => u.count > 0)
        .sort((a, b) => b.count - a.count || a.itemId - b.itemId)
        .slice(0, TOP_LIMIT),
      leastWorn: [...usages].sort((a, b) => a.count - b.count || a.itemId - b.itemId).slice(0, TOP_LIMIT),
      notWornIn90Days: usages.filter((u) => u.lastWornOn === null || u.lastWornOn < cutoff),
      weeklySummary: this.weeklySummary(logs, today),
    };
  }

  // Declarative, one pass over every (item, date) pair: no nested loops over items and logs.
  private countUsage(logs: WearLog[]): Map<number, Usage> {
    return logs
      .flatMap((log) => log.itemIds.map((itemId) => ({ itemId, wornOn: log.wornOn })))
      .reduce((usage, { itemId, wornOn }) => {
        const current = usage.get(itemId) ?? { count: 0, lastWornOn: null };
        usage.set(itemId, {
          count: current.count + 1,
          lastWornOn: current.lastWornOn === null || wornOn > current.lastWornOn ? wornOn : current.lastWornOn,
        });
        return usage;
      }, new Map<number, Usage>());
  }

  private weeklySummary(logs: WearLog[], today: string): WeeklySummary {
    const weekStart = mondayOf(today);
    const weekEnd = addDays(weekStart, 6);
    const thisWeek = logs.filter((log) => log.wornOn >= weekStart && log.wornOn <= weekEnd);
    const itemIds = thisWeek.flatMap((log) => log.itemIds);

    return {
      weekStart,
      weekEnd,
      logCount: thisWeek.length,
      totalWears: itemIds.length,
      distinctItems: new Set(itemIds).size,
    };
  }

  private today(): string {
    return toDateKey(this.clock.now());
  }

  private validItemIds(itemIds: unknown): number[] {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new ValidationError('Choose at least one item');
    }
    if (!itemIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
      throw new ValidationError('Item ids must be positive numbers');
    }
    if (new Set(itemIds).size !== itemIds.length) {
      throw new ValidationError('An item can appear only once in a wear log');
    }
    return itemIds as number[];
  }

  private validWornOn(wornOn: string | undefined): string {
    const today = this.today();
    if (wornOn === undefined || wornOn === '') {
      return today;
    }
    if (!isValidDateKey(wornOn)) {
      throw new ValidationError('Date must be a real date written as YYYY-MM-DD');
    }
    if (wornOn > today) {
      throw new ValidationError('You cannot log a wear in the future');
    }
    return wornOn;
  }

  // Imperative: check each item in turn and stop at the first problem.
  private async requireOwnItems(userId: number, itemIds: number[]): Promise<void> {
    for (const id of itemIds) {
      const item = await this.items.getById(id);
      if (!item) {
        throw new NotFoundError(`Item ${id} not found`);
      }
      if (item.userId !== userId) {
        throw new ForbiddenError('You cannot log another user’s item');
      }
    }
  }
}