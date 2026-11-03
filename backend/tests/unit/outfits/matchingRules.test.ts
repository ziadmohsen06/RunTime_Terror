import { Occasion } from '../../../src/domain/enums/Occasion';
import { Season } from '../../../src/domain/enums/Season';
import { ColorRule } from '../../../src/services/outfits/matching/ColorRule';
import { MatchingRule } from '../../../src/services/outfits/matching/MatchingRule';
import { OccasionRule } from '../../../src/services/outfits/matching/OccasionRule';
import { SeasonRule } from '../../../src/services/outfits/matching/SeasonRule';
import {
  colorsMatch,
  normalizeCategory,
  normalizeColor,
  parseSeason,
  slotOf,
} from '../../../src/services/outfits/matching/matchingTables';
import { makeItem } from '../../helpers/outfitFixtures';

const context = { occasion: Occasion.WORK, season: Season.WINTER };

// User story: As a user, I want suggestions to respect the occasion, the season,
// and which colors go together so that I can trust what I am told to wear.
describe('matching decision tables', () => {
  it.each([
    ['Tops', 'top'],
    ['T-Shirt', 't shirt'],
    ['  JEANS ', 'jeans'],
    ['Pants', 'trousers'],
    ['Dresses', 'dress'],
    ['dress_shoes', 'dress shoes'],
  ])('normalizes the category %s to %s', (raw, expected) => {
    expect(normalizeCategory(raw)).toBe(expected);
  });

  it('puts each category in one outfit slot', () => {
    expect(slotOf('Tops')).toBe('top');
    expect(slotOf('jeans')).toBe('bottom');
    expect(slotOf('dress')).toBe('full');
    expect(slotOf('coat')).toBe('outerwear');
    expect(slotOf('sneakers')).toBe('shoes');
    expect(slotOf('scarf')).toBeUndefined();
  });

  it.each([
    ['White', 'white'],
    ['Light Blue', 'blue'],
    ['navy blue', 'navy'],
    ['Gray', 'grey'],
    ['burgundy', 'red'],
  ])('normalizes the color %s to %s', (raw, expected) => {
    expect(normalizeColor(raw)).toBe(expected);
  });

  it.each([
    ['black', 'red', true],
    ['navy', 'orange', true],
    ['blue', 'blue', true],
    ['blue', 'orange', true],
    ['orange', 'blue', true],
    ['red', 'green', false],
    ['pink', 'orange', false],
    ['mystery', 'blue', false],
    ['mystery', 'black', true],
  ])('decides whether %s matches %s: %s', (first, second, expected) => {
    expect(colorsMatch(first, second)).toBe(expected);
  });

  it.each([
    ['Autumn', Season.AUTUMN],
    ['fall', Season.AUTUMN],
    ['WINTER', Season.WINTER],
    ['monsoon', undefined],
  ])('parses the season %s', (raw, expected) => {
    expect(parseSeason(raw)).toBe(expected);
  });
});

describe('OccasionRule', () => {
  const rule = new OccasionRule();

  it('gives full marks when every item fits the occasion', () => {
    const items = [makeItem({ category: 'shirt' }), makeItem({ category: 'trousers' })];
    expect(rule.score(items, context)).toBe(100);
  });

  it('scores the share of items that fit', () => {
    const items = [makeItem({ category: 'shirt' }), makeItem({ category: 'jeans' })];
    expect(rule.score(items, { ...context, occasion: Occasion.FORMAL })).toBe(50);
  });

  it('gives nothing to a category outside the table', () => {
    expect(rule.score([makeItem({ category: 'cape' })], context)).toBe(0);
  });

  it('accepts categories typed with capitals and plurals', () => {
    expect(rule.score([makeItem({ category: 'Shirts' })], context)).toBe(100);
  });
});

describe('SeasonRule', () => {
  const rule = new SeasonRule();

  it('matches an item made for that season, ignoring case', () => {
    expect(rule.score([makeItem({ season: 'Winter' })], context)).toBe(100);
  });

  it('treats an All Season item as fitting any season', () => {
    expect(rule.score([makeItem({ season: 'All Season' })], context)).toBe(100);
  });

  it('scores the share of items that fit', () => {
    const items = [makeItem({ season: 'winter' }), makeItem({ season: 'summer' })];
    expect(rule.score(items, context)).toBe(50);
  });
});

describe('ColorRule', () => {
  const rule: MatchingRule = new ColorRule();

  it('gives a single item full marks because there is nothing to clash with', () => {
    expect(rule.score([makeItem({ color: 'red' })], context)).toBe(100);
  });

  it('gives full marks when every pair matches', () => {
    const items = [makeItem({ color: 'black' }), makeItem({ color: 'red' })];
    expect(rule.score(items, context)).toBe(100);
  });

  it('gives nothing to a clashing pair', () => {
    const items = [makeItem({ color: 'red' }), makeItem({ color: 'green' })];
    expect(rule.score(items, context)).toBe(0);
  });

  it('scores the share of matching pairs', () => {
    const items = [
      makeItem({ color: 'red' }),
      makeItem({ color: 'green' }),
      makeItem({ color: 'black' }),
    ];
    expect(rule.score(items, context)).toBe(67);
  });
});
