import { NextFunction, Request, Response } from 'express';
import { LaundryService } from '../../services/laundry/LaundryService';
import { parseId, parseItemIds } from '../validators/laundryValidators';

// Only parses the request and calls the service. No business rules here.
export class LaundryController {
  constructor(private readonly service: LaundryService) {}

  // TEMPORARY: userId is hardcoded until auth middleware (Member 4) is added.
  private userId(_req: Request): number {
    return 1;
  }

  markDirty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.service.markDirty(this.userId(req), parseId(req.params.itemId, 'itemId'));
      res.json(item);
    } catch (err) {
      next(err);
    }
  };

  listDirtyItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.listDirtyItems(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };

  listLoads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.listLoads(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };

  createLoad = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const load = await this.service.createLoad(this.userId(req), parseItemIds(req.body));
      res.status(201).json(load);
    } catch (err) {
      next(err);
    }
  };

  advanceLoad = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const load = await this.service.advanceLoad(this.userId(req), parseId(req.params.loadId, 'loadId'));
      res.json(load);
    } catch (err) {
      next(err);
    }
  };

  removeItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const load = await this.service.removeItemFromLoad(
        this.userId(req),
        parseId(req.params.loadId, 'loadId'),
        parseId(req.params.itemId, 'itemId')
      );
      res.json({ load }); // load is null when the last item was removed and the load deleted
    } catch (err) {
      next(err);
    }
  };
}
