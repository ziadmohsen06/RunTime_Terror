import Database from 'better-sqlite3';
import { Router } from 'express';
import { IroningController } from '../../api/controllers/IroningController';
import { ironingRoutes } from '../../api/routes/ironingRoutes';
import { InMemoryIroningQueueRepository } from '../../repositories/implementations/InMemoryIroningQueueRepository';
import { SqliteIroningQueueRepository } from '../../repositories/implementations/SqliteIroningQueueRepository';
import { initIroningSchema } from '../../repositories/implementations/sqlite/ironingSchema';
import { IIroningQueueRepository } from '../../repositories/interfaces/IIroningQueueRepository';
import { CareRules, IroningQueue } from '../laundry/ports';
import { FabricCareRules } from './FabricCareRules';
import { IroningItemAccess, IroningService } from './IroningService';

export interface IroningModuleOptions {
  items: IroningItemAccess;
  db?: Database.Database;
}

export interface IroningModule {
  router: Router;
  /** Handed to Laundry: does this fabric need ironing? */
  careRules: CareRules;
  /** Handed to Laundry: add a finished item to the ironing queue. */
  queue: IroningQueue;
}

// SQLite when the server runs; in memory when a test creates the app without a database.
function createRepository(db?: Database.Database): IIroningQueueRepository {
  if (!db) return new InMemoryIroningQueueRepository();
  initIroningSchema(db);
  return new SqliteIroningQueueRepository(db);
}

// Wires repository -> service -> controller -> routes for the Ironing and Care module.
export function createIroningModule({ items, db }: IroningModuleOptions): IroningModule {
  const careRules = new FabricCareRules();
  const service = new IroningService(createRepository(db), items, careRules);
  return { router: ironingRoutes(new IroningController(service)), careRules, queue: service };
}
