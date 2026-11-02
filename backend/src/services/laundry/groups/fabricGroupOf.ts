import { FabricGroup } from '../../../domain/enums/FabricGroup';

// Declarative lookup. Unknown fabrics are REGULAR.
const DELICATE = ['silk', 'wool', 'lace', 'cashmere', 'satin', 'chiffon'];
const HEAVY = ['denim', 'fleece', 'corduroy', 'canvas', 'towel'];

export function fabricGroupOf(fabric: string): FabricGroup {
  const f = fabric.trim().toLowerCase();
  if (DELICATE.includes(f)) return FabricGroup.DELICATE;
  if (HEAVY.includes(f)) return FabricGroup.HEAVY;
  return FabricGroup.REGULAR;
}
