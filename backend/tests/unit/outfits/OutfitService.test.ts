import { Item } from '../../../src/domain/entities/Item';
import { ItemStatus } from '../../../src/domain/enums/ItemStatus';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../src/domain/errors/AppError';
import { InMemoryItemRepository } from '../../../src/repositories/implementations/InMemoryItemRepository';
import { InMemoryOutfitRepository } from '../../../src/repositories/implementations/InMemoryOutfitRepository';
import { ItemService } from '../../../src/services/items/ItemService';
import { MatchingEngine } from '../../../src/services/outfits/matching/MatchingEngine';
import { MatchingRule } from '../../../src/services/outfits/matching/MatchingRule';
import { createDefaultRules } from '../../../src/services/outfits/matching/defaultRules';
import { OutfitService } from '../../../src/services/outfits/OutfitService';

const NOT_CLEAN = Object.values(ItemStatus).filter((status) => status !== ItemStatus.CLEAN);

describe('OutfitService', () => {
  let items: ItemService;
  let service: OutfitService;

  const add = (category: string, color = 'black', season = 'All Season', userId = 1) =>
    items.addItem({ userId, name: `${color} ${category}`, category, color, season, fabric: 'cotton' });

  const request = { occasion: 'casual', season: 'summer' };

  beforeEach(() => {
    items = new ItemService(new InMemoryItemRepository());
    service = new OutfitService(
      items,
      new InMemoryOutfitRepository(),
      new MatchingEngine(createDefaultRules())
    );
  });

  // User story: As a user, I want to build an outfit from my own clean items
  // so that I can save a look and wear it later.
  describe('createOutfit', () => {
    it('saves an outfit made of the user\'s clean items', async () => {
      const shirt = await add('shirt');
      const jeans = await add('jeans');

      const outfit = await service.createOutfit(1, { name: ' Friday ', itemIds: [shirt.id, jeans.id] });

      expect(outfit).toMatchObject({ id: 1, userId: 1, name: 'Friday' });
      expect(outfit.items.map((item) => item.id)).toEqual([shirt.id, jeans.id]);
      expect(await service.listOutfits(1)).toHaveLength(1);
    });

    it.each(NOT_CLEAN)('rejects an item that is %s', async (status) => {
      const shirt = await add('shirt');
      await items.updateStatus(shirt.id, status);

      await expect(service.createOutfit(1, { name: 'Look', itemIds: [shirt.id] })).rejects.toThrow(
        ValidationError
      );
      expect(await service.listOutfits(1)).toEqual([]);
    });

    it('rejects an item owned by someone else', async () => {
      const theirs = await add('shirt', 'black', 'All Season', 2);

      await expect(service.createOutfit(1, { name: 'Look', itemIds: [theirs.id] })).rejects.toThrow(
        ForbiddenError
      );
    });

    it('rejects an item that does not exist', async () => {
      await expect(service.createOutfit(1, { name: 'Look', itemIds: [999] })).rejects.toThrow(
        NotFoundError
      );
    });

    it.each([
      ['a blank name', { name: '  ', itemIds: [1] }],
      ['no items', { name: 'Look', itemIds: [] }],
      ['a repeated item', { name: 'Look', itemIds: [1, 1] }],
    ])('rejects %s', async (_label, input) => {
      await add('shirt');
      await expect(service.createOutfit(1, input)).rejects.toThrow(ValidationError);
    });
  });

  describe('listOutfits', () => {
    it('shows only the caller\'s outfits', async () => {
      const mine = await add('shirt');
      const theirs = await add('shirt', 'white', 'All Season', 2);
      await service.createOutfit(1, { name: 'Mine', itemIds: [mine.id] });
      await service.createOutfit(2, { name: 'Theirs', itemIds: [theirs.id] });

      expect((await service.listOutfits(1)).map((outfit) => outfit.name)).toEqual(['Mine']);
    });

    it('shows the current status of an item that went to the wash after saving', async () => {
      const shirt = await add('shirt');
      await service.createOutfit(1, { name: 'Look', itemIds: [shirt.id] });
      await items.updateStatus(shirt.id, ItemStatus.DIRTY);

      const [outfit] = await service.listOutfits(1);

      expect(outfit.items[0].status).toBe(ItemStatus.DIRTY);
    });
  });

  // User story: As a user, I want ranked outfit suggestions for an occasion and season
  // so that I can decide what to wear from what is actually clean.
  describe('suggest', () => {
    const allIds = (suggestions: { items: Item[] }[]) =>
      suggestions.flatMap((suggestion) => suggestion.items.map((item) => item.id));

    it.each(NOT_CLEAN)('never suggests an item that is %s', async (status) => {
      const dirtyShirt = await add('shirt');
      await add('t shirt', 'white');
      await add('jeans');
      await items.updateStatus(dirtyShirt.id, status);

      const suggestions = await service.suggest(1, request);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(allIds(suggestions)).not.toContain(dirtyShirt.id);
    });

    it('returns nothing when the only top is dirty', async () => {
      const shirt = await add('shirt');
      await add('jeans');
      await items.updateStatus(shirt.id, ItemStatus.DIRTY);

      expect(await service.suggest(1, request)).toEqual([]);
    });

    it('never suggests another user\'s items', async () => {
      await add('shirt');
      await add('jeans');
      const theirs = await add('t shirt', 'black', 'All Season', 2);

      expect(allIds(await service.suggest(1, request))).not.toContain(theirs.id);
    });

    it('ranks the outfit that fits best first', async () => {
      await add('hoodie', 'red', 'Winter');
      const shirt = await add('shirt', 'white', 'Summer');
      const trousers = await add('trousers', 'black', 'All Season');

      const [best] = await service.suggest(1, { occasion: 'work', season: 'summer' });

      expect(best.items.map((item) => item.id).sort()).toEqual([shirt.id, trousers.id].sort());
      expect(best.totalScore).toBe(300);
    });

    it('reports the score of each rule', async () => {
      await add('shirt');
      await add('jeans');

      const [best] = await service.suggest(1, request);

      expect(best.breakdown.map((part) => part.rule)).toEqual(['occasion', 'season', 'color']);
    });

    it('works with items typed in the form\'s own style', async () => {
      await add('Tops', 'White', 'Summer');
      await add('Trousers', 'Navy Blue', 'All Season');

      const [best] = await service.suggest(1, request);

      expect(best.totalScore).toBe(300);
    });

    it('returns at most the requested number', async () => {
      await add('shirt');
      await add('t shirt');
      await add('jeans');
      await add('shorts');

      expect(await service.suggest(1, { ...request, limit: 2 })).toHaveLength(2);
    });

    it('stays fast on a large closet', async () => {
      await Promise.all(
        Array.from({ length: 200 }, (_, index) =>
          add(['shirt', 'jeans', 'sneakers', 'jacket', 'dress'][index % 5])
        )
      );

      const suggestions = await service.suggest(1, request);

      expect(suggestions).toHaveLength(5);
    });

    it('keeps the best items when a slot has more than can be combined', async () => {
      await Promise.all(Array.from({ length: 30 }, () => add('shirt', 'white', 'Winter')));
      const summerShirt = await add('shirt', 'white', 'Summer');
      await add('jeans', 'black', 'Summer');

      expect(allIds(await service.suggest(1, request))).toContain(summerShirt.id);
    });

    it('uses rules it is given, so a new rule changes the ranking', async () => {
      const preferRed: MatchingRule = {
        name: 'red',
        score: (candidate) => (candidate.some((item) => item.color === 'red') ? 1000 : 0),
      };
      service = new OutfitService(
        items,
        new InMemoryOutfitRepository(),
        new MatchingEngine([...createDefaultRules(), preferRed])
      );
      await add('shirt', 'white');
      const red = await add('t shirt', 'red');
      await add('jeans');

      const [best] = await service.suggest(1, request);

      expect(best.items.map((item) => item.id)).toContain(red.id);
    });

    it.each([
      ['occasion', { occasion: 'wedding', season: 'summer' }],
      ['season', { occasion: 'casual', season: 'monsoon' }],
      ['limit', { occasion: 'casual', season: 'summer', limit: 0 }],
    ])('rejects an invalid %s', async (_label, input) => {
      await expect(service.suggest(1, input)).rejects.toThrow(ValidationError);
    });
  });
});
