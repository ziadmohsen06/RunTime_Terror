import { Item } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { ValidationError } from '../../domain/errors/AppError';
import { buildCandidates, groupBySlot, ItemsBySlot } from './candidates';
import { IItemReader } from './IItemReader';
import { MatchingEngine, RankedOutfit } from './matching/MatchingEngine';
import { MatchContext } from './matching/MatchingRule';
import { parseOccasion, parseSeasonOrThrow } from './outfitInput';

export interface SuggestInput {
  occasion: string;
  season: string;
  limit?: number;
}

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
// Keeps the number of combinations small however large the closet gets.
const MAX_ITEMS_PER_SLOT = 6;

// FR2: ranked outfit suggestions for an occasion and season, from clean items only.
// Saving and listing outfits lives in OutfitService (single responsibility).
export class SuggestionService {
  constructor(
    private readonly items: IItemReader,
    private readonly engine: MatchingEngine
  ) {}

  async suggest(userId: number, input: SuggestInput): Promise<RankedOutfit[]> {
    const context = this.toContext(input);
    const limit = this.toLimit(input.limit);

    const cleanItems = await this.items.listItems(userId, { status: ItemStatus.CLEAN });
    const slots = this.keepBestPerSlot(groupBySlot(cleanItems), context);
    return this.pickDistinct(this.engine.rank(buildCandidates(slots), context), limit);
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
    return { occasion: parseOccasion(occasion), season: parseSeasonOrThrow(season) };
  }

  private toLimit(limit: number = DEFAULT_LIMIT): number {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new ValidationError(`Limit must be a whole number from 1 to ${MAX_LIMIT}`);
    }
    return limit;
  }
}
