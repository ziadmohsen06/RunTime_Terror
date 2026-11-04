import { NewOutfit, Outfit } from '../../domain/entities/Outfit';
import { IOutfitRepository } from '../interfaces/IOutfitRepository';

export class InMemoryOutfitRepository implements IOutfitRepository {
  private outfits: Outfit[] = [];
  private nextId = 1;

  async create(newOutfit: NewOutfit): Promise<Outfit> {
    const outfit: Outfit = { ...newOutfit, id: this.nextId++, createdAt: new Date() };
    this.outfits.push(outfit);
    return outfit;
  }

  async findAll(userId: number): Promise<Outfit[]> {
    return this.outfits
      .filter((outfit) => outfit.userId === userId)
      .sort((a, b) => b.id - a.id);
  }
}
