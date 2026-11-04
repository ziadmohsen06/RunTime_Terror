import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { ItemState } from './ItemState';

export class InLaundryState extends ItemState {
  readonly status = ItemStatus.IN_LAUNDRY;
  readonly allowedTargets = [ItemStatus.WASHING, ItemStatus.DIRTY] as const;
}
