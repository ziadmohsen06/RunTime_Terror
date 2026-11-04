import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { ItemState } from './ItemState';

export class DirtyState extends ItemState {
  readonly status = ItemStatus.DIRTY;
  readonly allowedTargets = [ItemStatus.IN_LAUNDRY] as const;
}
