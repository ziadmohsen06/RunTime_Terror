import { NextFunction, Request, Response } from 'express';
import { ItemService } from '../../services/items/ItemService';
import { ItemStatus } from '../../domain/enums/ItemStatus';

export class ItemController {
  constructor(private readonly service: ItemService) {}

  // TEMPORARY: userId is hardcoded until auth middleware (Member 4) is added.
  private userId(_req: Request): number {
    return 1;
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
}
