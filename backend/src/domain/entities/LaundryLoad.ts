import { LoadStage } from '../enums/LoadStage';
import { ColorGroup } from '../enums/ColorGroup';
import { FabricGroup } from '../enums/FabricGroup';

export interface LaundryLoad {
  id: number;
  userId: number;
  itemIds: number[];
  colorGroup: ColorGroup;
  fabricGroup: FabricGroup;
  stage: LoadStage;
  createdAt: Date;
}

export type NewLaundryLoad = Omit<LaundryLoad, 'id' | 'createdAt'>;
