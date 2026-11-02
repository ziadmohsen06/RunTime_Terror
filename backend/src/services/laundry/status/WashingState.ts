import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { ItemState } from './ItemState';

export class WashingState extends ItemState {
  readonly status = ItemStatus.WASHING;
  readonly allowedTargets = [ItemStatus.DRYING] as const;
}
