import { Item } from '../../domain/entities/Item';
import { Outfit, OutfitWithItems } from '../../domain/entities/Outfit';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { Occasion } from '../../domain/enums/Occasion';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { IOutfitRepository } from '../../repositories/interfaces/IOutfitRepository';
import { buildCandidates, groupBySlot, ItemsBySlot } from './candidates';
import { IItemReader } from './IItemReader';
import { MatchingEngine, RankedOutfit } from './matching/MatchingEngine';
import { MatchContext } from './matching/MatchingRule';
import { parseSeason } from './matching/matchingTables';

export interface CreateOutfitInput {
  name: string;
  itemIds: number[];
}

export interface SuggestInput {
  occasion: string;
  season: string;
  limit?: number;
}

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
// Keeps the number of combinations small however large the closet gets.
const MAX_ITEMS_PER_SLOT = 6;

export class OutfitService {
  constructor(
    private readonly items: IItemReader,
    private readonly outfits: IOutfitRepository,
    private readonly engine: MatchingEngine
  ) {}

  async createOutfit(userId: number, input: CreateOutfitInput): Promise<OutfitWithItems> {
    const name = input.name?.trim();
    if (!name) {
      throw new ValidationError('Outfit name is required');
    }
    const { itemIds } = input;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new ValidationError('Choose at least one item');
    }
    if (!itemIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
      throw new ValidationError('Item ids must be positive numbers');
    }
    if (new Set(itemIds).size !== itemIds.length) {
      throw new ValidationError('An item can appear only once in an outfit');
    }

    const items = await Promise.all(itemIds.map((id) => this.requireWearableItem(userId, id)));
    const outfit = await this.outfits.create({ userId, name, itemIds });
    return { ...outfit, items };
  }

  async listOutfits(userId: number): Promise<OutfitWithItems[]> {
    const outfits = await this.outfits.findAll(userId);
    return Promise.all(outfits.map((outfit) => this.withItems(outfit)));
  }

  async suggest(userId: number, input: SuggestInput): Promise<RankedOutfit[]> {
    const context = this.toContext(input);
    const limit = this.toLimit(input.limit);

    const cleanItems = await this.items.listItems(userId, { status: ItemStatus.CLEAN });
    const slots = this.keepBestPerSlot(groupBySlot(cleanItems), context);
    return this.pickDistinct(this.engine.rank(buildCandidates(slots), context), limit);
  }

  private async requireWearableItem(userId: number, id: number): Promise<Item> {
    const item = await this.items.getById(id);
    if (!item) {
      throw new NotFoundError(`Item ${id} not found`);
    }
    if (item.userId !== userId) {
      throw new ForbiddenError('You cannot use another user’s item');
    }
    if (item.status !== ItemStatus.CLEAN) {
      throw new ValidationError(`${item.name} is not clean`);
    }
    return item;
  }

  private async withItems(outfit: Outfit): Promise<OutfitWithItems> {
    const items = await Promise.all(outfit.itemIds.map((id) => this.items.getById(id)));
    return { ...outfit, items: items.filter((item): item is Item => item !== null) };
  }

  // Without this, the top results are one outfit with and without shoes or a coat.
  private pickDistinct(ranked: RankedOutfit[], limit: number): RankedOutfit[] {
    const picked: RankedOutfit[] = [];
    for (const outfit of ranked) {
      if (picked.length === limit) {
        break;
      }
      if (!picked.some((better) => this.isPartOf(outfit, better))) {
        picked.push(outfit);
      }
    }
    return picked;
  }

  private isPartOf(outfit: RankedOutfit, other: RankedOutfit): boolean {
    return outfit.items.every((item) => other.items.includes(item));
  }

  private keepBestPerSlot(slots: ItemsBySlot, context: MatchContext): ItemsBySlot {
    const best = (items: Item[]): Item[] =>
      this.engine
        .rank(items.map((item) => [item]), context)
        .slice(0, MAX_ITEMS_PER_SLOT)
        .flatMap((ranked) => ranked.items);

    return {
      top: best(slots.top),
      bottom: best(slots.bottom),
      full: best(slots.full),
      outerwear: best(slots.outerwear),
      shoes: best(slots.shoes),
    };
  }

  private toContext({ occasion, season }: SuggestInput): MatchContext {
    const validOccasion = Object.values(Occasion).find((value) => value === occasion);
    if (!validOccasion) {
      throw new ValidationError(`Occasion must be one of: ${Object.values(Occasion).join(', ')}`);
    }
    const validSeason = parseSeason(season ?? '');
    if (!validSeason) {
      throw new ValidationError('Season must be one of: spring, summer, autumn, winter');
    }
    return { occasion: validOccasion, season: validSeason };
  }

  private toLimit(limit: number = DEFAULT_LIMIT): number {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new ValidationError(`Limit must be a whole number from 1 to ${MAX_LIMIT}`);
    }
    return limit;
  }
}
