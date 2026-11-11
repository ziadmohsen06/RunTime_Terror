import { IUserRepository } from '../../../src/repositories/interfaces/IUserRepository';

// Every user repository must pass these same tests, so either can be used (LSP).
export function describeUserRepositoryContract(
  name: string,
  createRepository: () => IUserRepository
) {
  describe(`${name} contract`, () => {
    let repository: IUserRepository;

    beforeEach(() => {
      repository = createRepository();
    });

    it('stores a user and gives it an id', async () => {
      const user = await repository.create({ name: 'Sara', email: 'sara@example.com', passwordHash: 'hash-1' });

      expect(user.id).toBeGreaterThan(0);
      expect(user).toEqual({ id: user.id, name: 'Sara', email: 'sara@example.com', passwordHash: 'hash-1' });
    });

    it('gives different users different ids', async () => {
      const a = await repository.create({ name: 'Sara', email: 'a@example.com', passwordHash: 'h' });
      const b = await repository.create({ name: 'Sara', email: 'b@example.com', passwordHash: 'h' });

      expect(a.id).not.toBe(b.id);
    });

    it('finds a user by email', async () => {
      const saved = await repository.create({ name: 'Sara', email: 'sara@example.com', passwordHash: 'hash-1' });

      expect(await repository.findByEmail('sara@example.com')).toEqual(saved);
    });

    it('finds a user by id', async () => {
      const saved = await repository.create({ name: 'Sara', email: 'sara@example.com', passwordHash: 'hash-1' });

      expect(await repository.findById(saved.id)).toEqual(saved);
    });

    it('returns null for an unknown email or id', async () => {
      expect(await repository.findByEmail('nobody@example.com')).toBeNull();
      expect(await repository.findById(999)).toBeNull();
    });
  });
}