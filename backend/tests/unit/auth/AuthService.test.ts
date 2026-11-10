import { AuthService } from '../../../src/services/auth/AuthService';
import { PasswordHasher } from '../../../src/services/auth/PasswordHasher';
import { TokenService } from '../../../src/services/auth/TokenService';
import { InMemoryUserRepository } from '../../../src/repositories/implementations/InMemoryUserRepository';
import { ConflictError } from '../../../src/domain/errors/ConflictError';
import { UnauthorizedError, ValidationError } from '../../../src/domain/errors/AppError';

describe('AuthService', () => {
  let users: InMemoryUserRepository;
  let hasher: PasswordHasher;
  let tokens: TokenService;
  let auth: AuthService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    hasher = new PasswordHasher(4); // low cost keeps tests fast
    tokens = new TokenService('test-secret', 3600);
    auth = new AuthService(users, hasher, tokens);
  });

  describe('register', () => {
    it('stores the password hashed, and the hash still verifies', async () => {
      await auth.register('sara@example.com', 'secret123');

      const stored = await users.findByEmail('sara@example.com');
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toBe('secret123');
      expect(await hasher.verify('secret123', stored!.passwordHash)).toBe(true);
    });

    it('returns the new user without the password hash', async () => {
      const user = await auth.register('sara@example.com', 'secret123');

      expect(user).toEqual({ id: expect.any(Number), email: 'sara@example.com' });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('trims and lowercases the email', async () => {
      const user = await auth.register('  Sara@Example.COM ', 'secret123');

      expect(user.email).toBe('sara@example.com');
    });

    it('rejects an email that is already registered, in any letter case', async () => {
      await auth.register('sara@example.com', 'secret123');

      await expect(auth.register('SARA@example.com', 'another-pass')).rejects.toThrow(ConflictError);
    });

    it('rejects an invalid email', async () => {
      await expect(auth.register('not-an-email', 'secret123')).rejects.toThrow(ValidationError);
    });

    it('rejects a password shorter than 8 characters', async () => {
      await expect(auth.register('sara@example.com', 'short')).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await auth.register('sara@example.com', 'secret123');
    });

    it('returns a token for that user when the password is right', async () => {
      const { token, user } = await auth.login('sara@example.com', 'secret123');

      expect(tokens.verify(token)).toBe(user.id);
      expect(user.email).toBe('sara@example.com');
    });

    it('rejects a wrong password', async () => {
      await expect(auth.login('sara@example.com', 'wrong-pass')).rejects.toThrow(UnauthorizedError);
    });

    it('rejects an unknown email with the same message as a wrong password', async () => {
      const wrongPassword = await auth.login('sara@example.com', 'wrong-pass').catch((e) => e);
      const unknownEmail = await auth.login('nobody@example.com', 'secret123').catch((e) => e);

      expect(unknownEmail).toBeInstanceOf(UnauthorizedError);
      expect(unknownEmail.message).toBe(wrongPassword.message);
    });

    it('accepts the email in any letter case', async () => {
      const { user } = await auth.login('  SARA@example.com ', 'secret123');

      expect(user.email).toBe('sara@example.com');
    });
  });
});