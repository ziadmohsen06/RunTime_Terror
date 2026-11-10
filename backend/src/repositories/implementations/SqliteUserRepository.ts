import Database from 'better-sqlite3';
import { NewUser, User } from '../../domain/entities/User';
import { IUserRepository } from '../interfaces/IUserRepository';

export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  async create(user: NewUser): Promise<User> {
    throw new Error('not implemented');
  }

  async findByEmail(email: string): Promise<User | null> {
    throw new Error('not implemented');
  }

  async findById(id: number): Promise<User | null> {
    throw new Error('not implemented');
  }
}