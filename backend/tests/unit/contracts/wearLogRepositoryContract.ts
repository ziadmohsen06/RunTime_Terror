import { IWearLogRepository } from '../../../src/repositories/interfaces/IWearLogRepository';

// Every wear log repository must pass these same tests, so either can be used (LSP).
export function describeWearLogRepositoryContract(
  name: string,
  createRepository: () => IWearLogRepository
) {
  describe(`${name} contract`, () => {
    let repository: IWearLogRepository;

    beforeEach(() => {
      repository = createRepository();
    });

    it('stores a wear log and keeps the order of its items', async () => {
      const log = await repository.create({ userId: 1, itemIds: [3, 1, 2], wornOn: '2026-11-06' });

      expect(log.id).toBeGreaterThan(0);
      expect(log).toEqual({ id: log.id, userId: 1, itemIds: [3, 1, 2], wornOn: '2026-11-06' });
      expect(await repository.findAll(1)).toEqual([log]);
    });

    it('returns only the given user\'s logs', async () => {
      const mine = await repository.create({ userId: 1, itemIds: [1], wornOn: '2026-11-01' });
      await repository.create({ userId: 2, itemIds: [2], wornOn: '2026-11-01' });

      expect(await repository.findAll(1)).toEqual([mine]);
    });

    it('returns the newest date first', async () => {
      const older = await repository.create({ userId: 1, itemIds: [1], wornOn: '2026-10-01' });
      const newer = await repository.create({ userId: 1, itemIds: [1], wornOn: '2026-11-01' });

      const logs = await repository.findAll(1);

      expect(logs.map((log) => log.id)).toEqual([newer.id, older.id]);
    });

    it('returns an empty list for a user with no logs', async () => {
      expect(await repository.findAll(99)).toEqual([]);
    });
  });
}