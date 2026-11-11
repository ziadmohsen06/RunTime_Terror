import { Router } from 'express';
import { IroningController } from '../../api/controllers/IroningController';
import { ironingRoutes } from '../../api/routes/ironingRoutes';
import { ItemService } from '../items/ItemService';
import { CareRules, IroningQueue } from '../laundry/ports';
import { FabricCareRules } from './FabricCareRules';
import { IroningService } from './IroningService';

export interface IroningModule {
  router: Router; // GET /ironing and POST /ironing/items/:itemId/ironed
  careRules: CareRules; // what Laundry asks: does this fabric need ironing?
  queue: IroningQueue; // what Laundry calls to hand an item over
}

// Wires care rules -> service -> controller -> routes for the Ironing module.
export function createIroningModule({ items }: { items: ItemService }): IroningModule {
  const careRules = new FabricCareRules();
  const service = new IroningService(items, items, careRules);
  return {
    router: ironingRoutes(new IroningController(service)),
    careRules,
    queue: service,
  };
}