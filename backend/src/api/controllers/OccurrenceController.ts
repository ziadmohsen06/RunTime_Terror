import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../domain/errors/AppError';
import { RecurringTaskService } from '../../services/recurring/RecurringTaskService';
import { parseResourceId } from './recurringRequest';

export class OccurrenceController {
  constructor(private readonly service: RecurringTaskService) {}

  // TODO: use req.userId when the shared authentication middleware is added.
  private userId(_req: Request): number {
    return 1;
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = req.query.period;
      if (period !== undefined && typeof period !== 'string') {
        throw new ValidationError('Period must be a single YYYY-Www value');
      }
      res.json(await this.service.listOccurrences(this.userId(req), period));
    } catch (err) {
      next(err);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(
        await this.service.completeOccurrence(this.userId(req), parseResourceId(req.params.id))
      );
    } catch (err) {
      next(err);
    }
  };
}
