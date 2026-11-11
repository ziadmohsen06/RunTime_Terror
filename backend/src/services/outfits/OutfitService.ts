import { Item } from '../../domain/entities/Item';
import { Outfit, OutfitWithItems } from '../../domain/entities/Outfit';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { IOutfitRepository } from '../../repositories/interfaces/IOutfitRepository';
import { IItemReader } from './IItemReader';
import { parseOccasion, parseSeasonOrThrow } from './outfitInput';

export interface CreateOutfitInput {
  name: string;
  itemIds: number[];
  /** Optional: tag the outfit with the occasion and season it was built for. */
  occasion?: string;
  season?: string;
}

export class OutfitService {
  constructor(
    private readonly items: IItemReader,
    private readonly outfits: IOutfitRepository
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
    const occasion = input.occasion ? parseOccasion(input.occasion) : null;
    const season = input.season ? parseSeasonOrThrow(input.season) : null;
    const outfit = await this.outfits.create({ userId, name, itemIds, occasion, season });
    return { ...outfit, items };
  }

  async listOutfits(userId: number): Promise<OutfitWithItems[]> {
    const outfits = await this.outfits.findAll(userId);
    return Promise.all(outfits.map((outfit) => this.withItems(outfit)));
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
}
