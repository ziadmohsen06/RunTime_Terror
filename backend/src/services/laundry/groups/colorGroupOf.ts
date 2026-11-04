import { ColorGroup } from '../../../domain/enums/ColorGroup';

// Declarative lookup: add a color by adding a word to a list. Unknown colors are
// COLORED, the group that is safest to wash on its own.
const LIGHT = ['white', 'cream', 'beige', 'ivory', 'light grey', 'light gray', 'pastel'];
const DARK = ['black', 'navy', 'charcoal', 'dark blue', 'dark green', 'dark grey', 'dark gray', 'brown'];

export function colorGroupOf(color: string): ColorGroup {
  const c = color.trim().toLowerCase();
  if (LIGHT.includes(c)) return ColorGroup.LIGHT;
  if (DARK.includes(c)) return ColorGroup.DARK;
  return ColorGroup.COLORED;
}
