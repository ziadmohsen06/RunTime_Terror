import { IOutfitRepository } from '../../../src/repositories/interfaces/IOutfitRepository';

// Both implementations must pass the same tests, so either can be injected (LSP).
export function describeOutfitRepositoryContract(
  name: string,
  createRepository: () => IOutfitRepository
) {
  describe(`${name} contract`, () => {
    let repository: IOutfitRepository;

    beforeEach(() => {
      repository = createRepository();
    });

    it('stores an outfit and keeps the order of its items', async () => {
      const outfit = await repository.create({ userId: 1, name: 'Look', itemIds: [3, 1, 2], occasion: null, season: null });

      expect(outfit.id).toBeGreaterThan(0);
      expect(outfit.createdAt).toBeInstanceOf(Date);
      expect(await repository.findAll(1)).toEqual([outfit]);
      expect(outfit.itemIds).toEqual([3, 1, 2]);
    });

    it('returns only the given user\'s outfits, newest first', async () => {
      const first = await repository.create({ userId: 1, name: 'First', itemIds: [1], occasion: null, season: null });
      await repository.create({ userId: 2, name: 'Other', itemIds: [2], occasion: null, season: null });
      const second = await repository.create({ userId: 1, name: 'Second', itemIds: [1], occasion: null, season: null });

      const outfits = await repository.findAll(1);

      expect(outfits.map((outfit) => outfit.id)).toEqual([second.id, first.id]);
    });
  });
}
