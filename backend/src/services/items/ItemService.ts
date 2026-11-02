import { Item, NewItem } from '../../domain/entities/Item';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { IItemRepository, ItemFilter } from '../../repositories/interfaces/IItemRepository';
import { ItemStatus } from '../../domain/enums/ItemStatus';//added

export class ItemService {
  constructor(private readonly repo: IItemRepository) {}

  async addItem(data: NewItem): Promise<Item> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Item name is required');
    }
    if (!data.category || !data.category.trim()) {
      throw new ValidationError('Item category is required');
    }
    if (!data.color || !data.color.trim()) {
  throw new ValidationError('Item color is required');
}

if (!data.season || !data.season.trim()) {
  throw new ValidationError('Item season is required');
}

if (!data.fabric || !data.fabric.trim()) {
  throw new ValidationError('Item fabric is required');
}
    return this.repo.create({ ...data, name: data.name.trim() });
  }

  async listItems(userId: number, filter?: ItemFilter): Promise<Item[]> {
    return this.repo.findAll(userId, filter);
  }
  async getById(id: number): Promise<Item | null> {//added
  return this.repo.findById(id);
  }
    async updateStatus( //finds item and updates status
    id: number,
    status: ItemStatus
  ): Promise<Item> {
    const item = await this.repo.updateStatus(id, status);

    if (!item) {
      throw new NotFoundError(`Item with ID ${id} not found`);
    }

    return item;
  }
}
