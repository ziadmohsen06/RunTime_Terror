import Database from 'better-sqlite3';
import { Router } from 'express';
import { WearLogController } from '../../api/controllers/WearLogController';
import { wearLogRoutes } from '../../api/routes/wearLogRoutes';
import { Clock } from '../../domain/Clock';
import { InMemoryWearLogRepository } from '../../repositories/implementations/InMemoryWearLogRepository';
import { SqliteWearLogRepository } from '../../repositories/implementations/SqliteWearLogRepository';
import { initWearLogSchema } from '../../repositories/implementations/sqlite/wearLogSchema';
import { IWearLogRepository } from '../../repositories/interfaces/IWearLogRepository';
import { IWearItemReader } from './IWearItemReader';
import { IWearOutfitReader } from './IWearOutfitReader';
import { WearLogService } from './WearLogService';

export interface WearLogModuleOptions {
  items: IWearItemReader;
  outfits: IWearOutfitReader;
  clock: Clock;
  db?: Database.Database;
}

// SQLite when the server runs; in memory when a test creates the app without a database.
function createRepository(db?: Database.Database): IWearLogRepository {
  if (!db) {
    return new InMemoryWearLogRepository();
  }
  initWearLogSchema(db);
  return new SqliteWearLogRepository(db);
}

// Wires repository -> service -> controller -> routes for the Wear Log module.
export function createWearLogRouter({ items, outfits, clock, db }: WearLogModuleOptions): Router {
  const service = new WearLogService(items, createRepository(db), clock, outfits);
  return wearLogRoutes(new WearLogController(service));
}