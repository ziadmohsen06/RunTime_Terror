import { NewUser, User } from '../../domain/entities/User';
import { IUserRepository } from '../interfaces/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];
  private nextId = 1;

  async create(newUser: NewUser): Promise<User> {
    const user: User = { ...newUser, id: this.nextId++ };
    this.users.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }
}