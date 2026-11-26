import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { ItemState, StateItem } from './ItemState';

export class WashingState extends ItemState {
  readonly status = ItemStatus.WASHING;
  readonly allowedTargets = [ItemStatus.DRYING] as const;

  nextStatus(_item: StateItem): ItemStatus {
    return ItemStatus.DRYING;
  }
}
