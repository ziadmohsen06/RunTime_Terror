import { NewUser, User } from '../../domain/entities/User';

// The auth service depends on this interface, never on a concrete class (DIP).
export interface IUserRepository {
  create(user: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
}