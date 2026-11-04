import { Item } from '../../src/domain/entities/Item';
import { ItemStatus } from '../../src/domain/enums/ItemStatus';

let nextId = 1;

// Builds a clean item owned by user 1; each test overrides only what it cares about.
export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: nextId++,
    userId: 1,
    name: 'Item',
    category: 'shirt',
    color: 'white',
    season: 'All Season',
    fabric: 'cotton',
    status: ItemStatus.CLEAN,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
