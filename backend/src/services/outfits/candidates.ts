import { Item } from '../../domain/entities/Item';
import { OutfitSlot, slotOf } from './matching/matchingTables';

export type ItemsBySlot = Record<OutfitSlot, Item[]>;

export function groupBySlot(items: Item[]): ItemsBySlot {
  const slots: ItemsBySlot = { top: [], bottom: [], full: [], outerwear: [], shoes: [] };
  for (const item of items) {
    const slot = slotOf(item.category);
    if (slot) {
      slots[slot].push(item);
    }
  }
  return slots;
}

// An outfit needs a top with a bottom, or one full-body piece.
// Shoes and outerwear are optional: each base appears with and without them.
export function buildCandidates(slots: ItemsBySlot): Item[][] {
  const separates = slots.top.flatMap((top) => slots.bottom.map((bottom) => [top, bottom]));
  const bases = [...separates, ...slots.full.map((piece) => [piece])];

  const candidates: Item[][] = [];
  for (const base of bases) {
    for (const shoes of [null, ...slots.shoes]) {
      for (const outerwear of [null, ...slots.outerwear]) {
        const extras = [shoes, outerwear].filter((item): item is Item => item !== null);
        candidates.push([...base, ...extras]);
      }
    }
  }
  return candidates;
}
