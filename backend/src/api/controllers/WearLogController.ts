import { NextFunction, Request, Response } from 'express';
import { currentUserId } from '../middleware/authenticate';
import { WearLogService } from '../../services/wearlog/WearLogService';
import { isRequestRecord } from './recurringRequest';

// Only reads the request and calls the service. All rules live in WearLogService.
export class WearLogController {
  constructor(private readonly service: WearLogService) {}

  private userId(req: Request): number {
    return currentUserId(req);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: Record<string, unknown> = isRequestRecord(req.body) ? req.body : {};
      const log = await this.service.logWear(this.userId(req), {
        itemIds: Array.isArray(body.itemIds) ? body.itemIds : [],
        outfitId: body.outfitId === undefined ? undefined : Number(body.outfitId),
        wornOn: typeof body.wornOn === 'string' ? body.wornOn : undefined,
      });
      res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.listLogs(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };

  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.getStats(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };
}