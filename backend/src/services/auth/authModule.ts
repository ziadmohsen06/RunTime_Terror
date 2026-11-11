import Database from 'better-sqlite3';
import { RequestHandler, Router } from 'express';
import { AuthController } from '../../api/controllers/AuthController';
import { authenticate } from '../../api/middleware/authenticate';
import { authRoutes } from '../../api/routes/authRoutes';
import { InMemoryUserRepository } from '../../repositories/implementations/InMemoryUserRepository';
import { SqliteUserRepository } from '../../repositories/implementations/SqliteUserRepository';
import { initUserSchema } from '../../repositories/implementations/sqlite/userSchema';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { AuthService } from './AuthService';
import { PasswordHasher } from './PasswordHasher';
import { TokenService } from './TokenService';

export interface AuthModuleOptions {
  secret: string;
  db?: Database.Database;
  hashRounds?: number;
}

export interface AuthModule {
  router: Router; // the /auth routes, which stay public
  authenticate: RequestHandler; // goes in front of every protected router
}

// SQLite when the server runs; in memory when a test creates the app without a database.
function createUserRepository(db?: Database.Database): IUserRepository {
  if (!db) {
    return new InMemoryUserRepository();
  }
  initUserSchema(db);
  return new SqliteUserRepository(db);
}

// Wires repository -> service -> controller -> routes for the Auth module.
export function createAuthModule({ secret, db, hashRounds }: AuthModuleOptions): AuthModule {
  const tokens = new TokenService(secret);
  const service = new AuthService(createUserRepository(db), new PasswordHasher(hashRounds), tokens);
  return {
    router: authRoutes(new AuthController(service)),
    authenticate: authenticate(tokens),
  };
}