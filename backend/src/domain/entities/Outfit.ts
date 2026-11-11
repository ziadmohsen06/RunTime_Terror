import { Item } from './Item';

export interface Outfit {
  id: number;
  userId: number;
  name: string;
  itemIds: number[];
  occasion: string | null;
  season: string | null;
  createdAt: Date;
}

export type NewOutfit = Omit<Outfit, 'id' | 'createdAt'>;

export interface OutfitWithItems extends Outfit {
  items: Item[];
}
