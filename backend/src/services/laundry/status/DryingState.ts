import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { ItemState } from './ItemState';

export class DryingState extends ItemState {
  readonly status = ItemStatus.DRYING;
  readonly allowedTargets = [ItemStatus.IRONING, ItemStatus.CLEAN] as const;
}
