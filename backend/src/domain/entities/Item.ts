import { ItemStatus } from '../enums/ItemStatus';

export interface Item {
  id: number;
  userId: number;
  name: string;
  category: string;
  color: string;
  season: string;
  fabric: string;
  photoUrl?: string;
  status: ItemStatus;
  createdAt: Date;
}

export type NewItem = Omit<Item, 'id' | 'status' | 'createdAt'>;
