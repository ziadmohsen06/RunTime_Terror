import { PublicUser, User } from '../../domain/entities/User';
import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError';
import { ConflictError } from '../../domain/errors/ConflictError';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { PasswordHasher } from './PasswordHasher';
import { TokenService } from './TokenService';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginResult {
  token: string;
  user: PublicUser;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser({ id, email }: User): PublicUser {
  return { id, email };
}

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async register(email: string, password: string): Promise<PublicUser> {
    const normalized = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('A valid email is required');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (await this.users.findByEmail(normalized)) {
      throw new ConflictError('Email is already registered');
    }

    const passwordHash = await this.hasher.hash(password);
    const user = await this.users.create({ email: normalized, passwordHash });
    return toPublicUser(user);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    const passwordMatches = user !== null && (await this.hasher.verify(password, user.passwordHash));

    // One message for both cases, so attackers cannot tell which emails have accounts.
    if (!user || !passwordMatches) {
      throw new UnauthorizedError('Invalid email or password');
    }
    return { token: this.tokens.sign(user.id), user: toPublicUser(user) };
  }
}