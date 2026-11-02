import { ItemService } from '../../src/services/items/ItemService';
import { InMemoryItemRepository } from '../../src/repositories/implementations/InMemoryItemRepository';
import { ValidationError } from '../../src/domain/errors/AppError';
import { ItemStatus } from '../../src/domain/enums/ItemStatus';

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

  
  it('filters items by color', async () => {//passed
    await service.addItem({ ...base, name: 'Blue T-shirt', category: 'top', color: 'blue' });
    await service.addItem({ ...base, name: 'Red T-shirt', category: 'top', color: 'red' });

    const result = await service.listItems(1, { color: 'red' });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Red T-shirt');
  });

  it('rejects an item without a category', async () => {//passed
  await expect(
    service.addItem({ ...base, name: 'T-shirt', category: '  ' })
  ).rejects.toThrow(ValidationError);
  });

  it('filters items by season', async () => {//passed
  await service.addItem({
    ...base,
    name: 'Summer T-shirt',
    category: 'top',
    season: 'summer',
  });

  await service.addItem({
    ...base,
    name: 'Winter Coat',
    category: 'outerwear',
    season: 'winter',
  });

  const result = await service.listItems(1, { season: 'winter' });

  expect(result).toHaveLength(1);
  expect(result[0].name).toBe('Winter Coat');
  });

  it('returns only items belonging to the specified user', async () => {
  await service.addItem({
    ...base,
    name: 'Joudy T-shirt',
    category: 'top',
    userId: 1,
  });

  await service.addItem({
    ...base,
    name: 'Other User T-shirt',
    category: 'top',
    userId: 2,
  });

  const result = await service.listItems(1);

  expect(result).toHaveLength(1);
  expect(result[0].name).toBe('Joudy T-shirt');
  });

  it('filters items by multiple criteria', async () => {
  await service.addItem({
    ...base,
    name: 'Blue Summer T-shirt',
    category: 'top',
    color: 'blue',
    season: 'summer',
  });

  await service.addItem({
    ...base,
    name: 'Red Summer T-shirt',
    category: 'top',
    color: 'red',
    season: 'summer',
  });

  await service.addItem({
    ...base,
    name: 'Blue Winter Coat',
    category: 'outerwear',
    color: 'blue',
    season: 'winter',
  });

  const result = await service.listItems(1, {
    category: 'top',
    color: 'blue',
    season: 'summer',
  });

  expect(result).toHaveLength(1);
  expect(result[0].name).toBe('Blue Summer T-shirt');
  });

  it('filters items by status', async () => {
  await service.addItem({
    ...base,
    name: 'T-shirt',
    category: 'top',
  });

  const result = await service.listItems(1, {
    status: ItemStatus.DIRTY,
  });

  expect(result).toHaveLength(0);
  });
});
