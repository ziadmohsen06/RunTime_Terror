import Database from 'better-sqlite3';
import { Router } from 'express';
import { OutfitController } from '../../api/controllers/OutfitController';
import { outfitRoutes } from '../../api/routes/outfitRoutes';
import { InMemoryOutfitRepository } from '../../repositories/implementations/InMemoryOutfitRepository';
import { SqliteOutfitRepository } from '../../repositories/implementations/SqliteOutfitRepository';
import { initOutfitSchema } from '../../repositories/implementations/sqlite/outfitSchema';
import { IOutfitRepository } from '../../repositories/interfaces/IOutfitRepository';
import { IItemReader } from './IItemReader';
import { createDefaultRules } from './matching/defaultRules';
import { MatchingEngine } from './matching/MatchingEngine';
import { OutfitService } from './OutfitService';

export interface OutfitModuleOptions {
  items: IItemReader;
  db?: Database.Database;
}

function createRepository(db?: Database.Database): IOutfitRepository {
  if (!db) {
    return new InMemoryOutfitRepository();
  }
  initOutfitSchema(db);
  return new SqliteOutfitRepository(db);
}

export interface OutfitModule {
  router: Router;
  service: OutfitService;
}

export function createOutfitModule({ items, db }: OutfitModuleOptions): OutfitModule {
  const engine = new MatchingEngine(createDefaultRules());
  const service = new OutfitService(items, createRepository(db), engine);
  return { router: outfitRoutes(new OutfitController(service)), service };
}

export function createOutfitRouter(options: OutfitModuleOptions): Router {
  return createOutfitModule(options).router;
}
