import { NextFunction, Request, Response } from 'express';
import { currentUserId } from '../middleware/authenticate';
import { ItemService } from '../../services/items/ItemService';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';

export class ItemController {
  constructor(private readonly service: ItemService) {}

  private userId(req: Request): number {
    return currentUserId(req);
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, color, season, status } = req.query as Record<
        string,
        string | undefined
      >;

      const items = await this.service.listItems(this.userId(req), {
        category,
        color,
        season,
        ...(status && Object.values(ItemStatus).includes(status as ItemStatus)
          ? { status: status as ItemStatus }
          : {}),
      });

      res.json(items);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.service.addItem({
        ...req.body,
        userId: this.userId(req),
      });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.ownedItem(req));
    } catch (err) {
      next(err);
    }
  };

  // Another user's item is reported as not found, so ids cannot be probed.
  private async ownedItem(req: Request) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('Item id must be a positive integer');
    }
    const item = await this.service.getById(id);
    if (!item || item.userId !== this.userId(req)) {
      throw new NotFoundError(`Item with ID ${id} not found`);
    }
    return item;
  }
}
