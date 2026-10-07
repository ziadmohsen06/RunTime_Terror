import { Item, NewItem } from '../../domain/entities/Item';
import { ValidationError } from '../../domain/errors/AppError';
import { IItemRepository, ItemFilter } from '../../repositories/interfaces/IItemRepository';

export class ItemService {
  constructor(private readonly repo: IItemRepository) {}

  async addItem(data: NewItem): Promise<Item> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Item name is required');
    }
    if (!data.category || !data.category.trim()) {
      throw new ValidationError('Item category is required');
    }
    return this.repo.create({ ...data, name: data.name.trim() });
  }

  async listItems(userId: number, filter?: ItemFilter): Promise<Item[]> {
    return this.repo.findAll(userId, filter);
  }
}
