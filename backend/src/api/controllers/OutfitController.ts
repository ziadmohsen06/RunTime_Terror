import { NextFunction, Request, Response } from 'express';
import { OutfitService } from '../../services/outfits/OutfitService';
import { isRequestRecord } from './recurringRequest';

export class OutfitController {
  constructor(private readonly service: OutfitService) {}

  // TEMPORARY: userId is hardcoded until auth middleware (Member 4) is added.
  private userId(_req: Request): number {
    return 1;
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.listOutfits(this.userId(req)));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: Record<string, unknown> = isRequestRecord(req.body) ? req.body : {};
      const outfit = await this.service.createOutfit(this.userId(req), {
        name: typeof body.name === 'string' ? body.name : '',
        itemIds: Array.isArray(body.itemIds) ? body.itemIds : [],
      });
      res.status(201).json(outfit);
    } catch (err) {
      next(err);
    }
  };

  suggest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { occasion, season, limit } = req.query as Record<string, string | undefined>;
      const suggestions = await this.service.suggest(this.userId(req), {
        occasion: occasion ?? '',
        season: season ?? '',
        limit: limit === undefined ? undefined : Number(limit),
      });
      res.json(suggestions);
    } catch (err) {
      next(err);
    }
  };
}
