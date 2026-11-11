import { NextFunction, Request, Response } from 'express';
import { IroningService } from '../../services/ironing/IroningService';
import { currentUserId } from '../middleware/authenticate';
import { parseId } from '../validators/laundryValidators';

// Only parses the request and calls the service. No business rules here.
export class IroningController {
  constructor(private readonly service: IroningService) {}

  getQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.getQueue(currentUserId(req)));
    } catch (err) {
      next(err);
    }
  };

  markIroned = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.service.markIroned(currentUserId(req), parseId(req.params.itemId, 'itemId'));
      res.json(item);
    } catch (err) {
      next(err);
    }
  };
}
