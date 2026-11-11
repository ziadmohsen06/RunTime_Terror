import { NextFunction, Request, Response } from 'express';
import { currentUserId } from '../middleware/authenticate';
import { ReminderService } from '../../services/recurring/ReminderService';
import { parseResourceId } from './recurringRequest';

export class ReminderController {
  constructor(private readonly service: ReminderService) {}

  private userId(req: Request): number {
    return currentUserId(req);
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.listReminders(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.markRead(this.userId(req), parseResourceId(req.params.id)));
    } catch (err) {
      next(err);
    }
  };
}
