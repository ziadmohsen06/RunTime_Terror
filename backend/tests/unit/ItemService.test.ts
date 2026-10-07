import { ItemService } from '../../src/services/items/ItemService';
import { InMemoryItemRepository } from '../../src/repositories/implementations/InMemoryItemRepository';
import { ValidationError } from '../../src/domain/errors/AppError';

// User story (FR1): As a user, I want to filter my items by category, color,
// and season so that I can quickly find what to wear.
describe('ItemService', () => {
  let service: ItemService;

  const base = { userId: 1, color: 'blue', season: 'summer', fabric: 'cotton' };

  beforeEach(() => {
    service = new ItemService(new InMemoryItemRepository());
  });

  it('adds an item with status clean', async () => {
    const item = await service.addItem({ ...base, name: 'T-shirt', category: 'top' });
    expect(item.id).toBe(1);
    expect(item.status).toBe('clean');
  });

  it('rejects an item without a name', async () => {
    await expect(service.addItem({ ...base, name: '  ', category: 'top' })).rejects.toThrow(
      ValidationError
    );
  });

  it('filters items by category', async () => {
    await service.addItem({ ...base, name: 'T-shirt', category: 'top' });
    await service.addItem({ ...base, name: 'Jeans', category: 'bottom' });
    const result = await service.listItems(1, { category: 'bottom' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jeans');
  });
});
