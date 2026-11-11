import { NextFunction, Request, Response } from 'express';
import { IroningService } from '../../services/ironing/IroningService';
import { currentUserId } from '../middleware/authenticate';
import { parseId } from '../validators/laundryValidators';

// Only parses the request and calls the service. No business rules here.
export class IroningController {
  constructor(private readonly service: IroningService) {}

  private userId(req: Request): number {
    return currentUserId(req);
  }

  queue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.getQueue(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };

  markIroned = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseId(req.params.itemId, 'itemId');
      res.json(await this.service.markIroned(this.userId(req), itemId));
    } catch (err) {
      next(err);
    }
  };
}