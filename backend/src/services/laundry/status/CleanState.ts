import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { ItemState } from './ItemState';

export class CleanState extends ItemState {
  readonly status = ItemStatus.CLEAN;
  readonly allowedTargets = [ItemStatus.DIRTY] as const;
}
