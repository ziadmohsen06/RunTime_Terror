import { Item } from '../../../src/domain/entities/Item';
import { Occasion } from '../../../src/domain/enums/Occasion';
import { Season } from '../../../src/domain/enums/Season';
import { MatchingEngine } from '../../../src/services/outfits/matching/MatchingEngine';
import { MatchContext, MatchingRule } from '../../../src/services/outfits/matching/MatchingRule';
import { makeItem } from '../../helpers/outfitFixtures';

const context: MatchContext = { occasion: Occasion.CASUAL, season: Season.SUMMER };

// A stub keeps these tests about the engine: the scores are fixed by the test.
class StubRule implements MatchingRule {
  constructor(
    readonly name: string,
    private readonly scores: Map<Item[], number>
  ) {}

  score(items: Item[]): number {
    return this.scores.get(items) ?? 0;
  }
}

describe('MatchingEngine', () => {
  const first = [makeItem({ id: 101 })];
  const second = [makeItem({ id: 102 })];
  const third = [makeItem({ id: 103 })];

  it('adds the score of every rule', () => {
    const engine = new MatchingEngine([
      new StubRule('a', new Map([[first, 30]])),
      new StubRule('b', new Map([[first, 12]])),
    ]);

    const [ranked] = engine.rank([first], context);

    expect(ranked.totalScore).toBe(42);
    expect(ranked.breakdown).toEqual([
      { rule: 'a', score: 30 },
      { rule: 'b', score: 12 },
    ]);
  });

  it('ranks candidates from the highest total to the lowest', () => {
    const engine = new MatchingEngine([
      new StubRule('a', new Map([[first, 10], [second, 90], [third, 50]])),
    ]);

    const ranked = engine.rank([first, second, third], context);

    expect(ranked.map((outfit) => outfit.totalScore)).toEqual([90, 50, 10]);
    expect(ranked[0].items).toBe(second);
  });

  it('lets one rule outvote another when the totals say so', () => {
    const engine = new MatchingEngine([
      new StubRule('a', new Map([[first, 100], [second, 0]])),
      new StubRule('b', new Map([[first, 0], [second, 60]])),
      new StubRule('c', new Map([[first, 0], [second, 60]])),
    ]);

    expect(engine.rank([first, second], context)[0].items).toBe(second);
  });

  it('prefers the more complete outfit when totals tie', () => {
    const small = [makeItem({ id: 201 })];
    const large = [makeItem({ id: 202 }), makeItem({ id: 203 })];
    const engine = new MatchingEngine([new StubRule('a', new Map([[small, 5], [large, 5]]))]);

    expect(engine.rank([small, large], context)[0].items).toBe(large);
  });

  it('breaks remaining ties by item id so the order never changes', () => {
    const later = [makeItem({ id: 302 })];
    const earlier = [makeItem({ id: 301 })];
    const engine = new MatchingEngine([]);

    expect(engine.rank([later, earlier], context)[0].items).toBe(earlier);
  });

  it('hands the occasion and season to each rule', () => {
    const score = jest.fn().mockReturnValue(1);
    const engine = new MatchingEngine([{ name: 'spy', score }]);

    engine.rank([first], context);

    expect(score).toHaveBeenCalledWith(first, context);
  });

  // NFR2: a new rule is added by passing another class to the constructor.
  // Nothing in MatchingEngine changes, and this class exists only in the test.
  it('runs a new rule without any change to the engine (NFR2)', () => {
    class PrefersLinenRule implements MatchingRule {
      readonly name = 'linen';

      score(items: Item[]): number {
        return items.filter((item) => item.fabric === 'linen').length * 10;
      }
    }

    const linen = [makeItem({ id: 401, fabric: 'linen' })];
    const wool = [makeItem({ id: 402, fabric: 'wool' })];
    const engine = new MatchingEngine([new PrefersLinenRule()]);

    const ranked = engine.rank([wool, linen], context);

    expect(ranked[0].items).toBe(linen);
    expect(ranked[0].breakdown).toEqual([{ rule: 'linen', score: 10 }]);
  });
});
