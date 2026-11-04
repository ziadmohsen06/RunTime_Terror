import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { ItemState } from './ItemState';

export class IroningState extends ItemState {
  readonly status = ItemStatus.IRONING;
  readonly allowedTargets = [ItemStatus.CLEAN] as const;
}
