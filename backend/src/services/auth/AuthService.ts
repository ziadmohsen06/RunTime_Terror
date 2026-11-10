import { PublicUser } from '../../domain/entities/User';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { PasswordHasher } from './PasswordHasher';
import { TokenService } from './TokenService';

export interface LoginResult {
  token: string;
  user: PublicUser;
}

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async register(email: string, password: string): Promise<PublicUser> {
    throw new Error('not implemented');
  }

  async login(email: string, password: string): Promise<LoginResult> {
    throw new Error('not implemented');
  }
}