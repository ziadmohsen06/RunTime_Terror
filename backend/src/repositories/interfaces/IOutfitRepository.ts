import { NewOutfit, Outfit } from '../../domain/entities/Outfit';

export interface IOutfitRepository {
  create(outfit: NewOutfit): Promise<Outfit>;
  findAll(userId: number): Promise<Outfit[]>;
}
