import { NewUser, User } from '../../domain/entities/User';
import { IUserRepository } from '../interfaces/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
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