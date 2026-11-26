import { ItemStatus } from '../../../domain/enums/ItemStatus';
import { CareRules } from '../ports';
import { ItemState, StateItem } from './ItemState';

export class DryingState extends ItemState {
  readonly status = ItemStatus.DRYING;
  readonly allowedTargets = [ItemStatus.IRONING, ItemStatus.CLEAN] as const;

  constructor(private readonly careRules: CareRules) {
    super();
  }

  // After drying, fabric that needs ironing goes to the ironing queue; the rest is clean.
  nextStatus(item: StateItem): ItemStatus {
    return this.careRules.needsIroning(item.fabric) ? ItemStatus.IRONING : ItemStatus.CLEAN;
  }
}
