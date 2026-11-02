import { NextFunction, Request, Response } from 'express';
import { DayOfWeek } from '../../domain/enums/DayOfWeek';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { RecurringTaskService } from '../../services/recurring/RecurringTaskService';
import { isRequestRecord, parseAsOfDate, parseResourceId } from './recurringRequest';

export class RecurringTaskController {
  constructor(private readonly service: RecurringTaskService) {}

  // TODO: use req.userId when the shared authentication middleware is added.
  private userId(_req: Request): number {
    return 1;
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.listTasks(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: unknown = req.body;
      if (!isRequestRecord(body)) {
        throw new ValidationError('Task title and dayOfWeek are required');
      }
      if (typeof body.title !== 'string') {
        throw new ValidationError('Task title is required');
      }
      if (typeof body.dayOfWeek !== 'string') {
        throw new ValidationError('A valid day of the week is required');
      }

      const task = await this.service.createWeekly(
        this.userId(req),
        body.title,
        body.dayOfWeek as DayOfWeek
      );
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deactivate(this.userId(req), parseResourceId(req.params.id));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  runWeeklyCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: unknown = req.body;
      if (body === undefined) {
        res.json(await this.service.runWeeklyCheck());
        return;
      }
      if (!isRequestRecord(body)) {
        throw new ValidationError('Run-check body must be an object');
      }
      const asOf = body.asOf === undefined ? undefined : parseAsOfDate(body.asOf);
      res.json(await this.service.runWeeklyCheck(asOf));
    } catch (err) {
      next(err);
    }
  };

  notFound = (_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError('Not found'));
  };
}
