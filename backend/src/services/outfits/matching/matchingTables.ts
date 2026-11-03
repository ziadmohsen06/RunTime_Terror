import { Occasion } from '../../../domain/enums/Occasion';
import { Season } from '../../../domain/enums/Season';

// The team's matching decisions, as data. The README shows the same tables:
// change both together.

export type OutfitSlot = 'top' | 'bottom' | 'full' | 'outerwear' | 'shoes';

interface CategoryRule {
  slot: OutfitSlot;
  occasions: readonly Occasion[];
}

const { CASUAL, WORK, FORMAL, SPORT } = Occasion;

const CATEGORY_RULES: Readonly<Record<string, CategoryRule>> = {
  top: { slot: 'top', occasions: [CASUAL, WORK] },
  't shirt': { slot: 'top', occasions: [CASUAL, SPORT] },
  shirt: { slot: 'top', occasions: [CASUAL, WORK, FORMAL] },
  blouse: { slot: 'top', occasions: [CASUAL, WORK, FORMAL] },
  sweater: { slot: 'top', occasions: [CASUAL, WORK] },
  hoodie: { slot: 'top', occasions: [CASUAL, SPORT] },

  bottom: { slot: 'bottom', occasions: [CASUAL, WORK] },
  jeans: { slot: 'bottom', occasions: [CASUAL] },
  trousers: { slot: 'bottom', occasions: [CASUAL, WORK, FORMAL] },
  chinos: { slot: 'bottom', occasions: [CASUAL, WORK] },
  skirt: { slot: 'bottom', occasions: [CASUAL, WORK, FORMAL] },
  shorts: { slot: 'bottom', occasions: [CASUAL, SPORT] },
  sweatpants: { slot: 'bottom', occasions: [CASUAL, SPORT] },
  leggings: { slot: 'bottom', occasions: [CASUAL, SPORT] },

  dress: { slot: 'full', occasions: [CASUAL, WORK, FORMAL] },
  suit: { slot: 'full', occasions: [WORK, FORMAL] },

  blazer: { slot: 'outerwear', occasions: [CASUAL, WORK, FORMAL] },
  jacket: { slot: 'outerwear', occasions: [CASUAL, SPORT] },
  coat: { slot: 'outerwear', occasions: [CASUAL, WORK, FORMAL] },

  shoes: { slot: 'shoes', occasions: [CASUAL, WORK] },
  sneakers: { slot: 'shoes', occasions: [CASUAL, SPORT] },
  'dress shoes': { slot: 'shoes', occasions: [WORK, FORMAL] },
  loafers: { slot: 'shoes', occasions: [CASUAL, WORK, FORMAL] },
  heels: { slot: 'shoes', occasions: [WORK, FORMAL] },
  boots: { slot: 'shoes', occasions: [CASUAL, WORK] },
  sandals: { slot: 'shoes', occasions: [CASUAL] },
};

const CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  tee: 't shirt',
  tshirt: 't shirt',
  pants: 'trousers',
  jumper: 'sweater',
  joggers: 'sweatpants',
  trainers: 'sneakers',
  dresses: 'dress',
  blouses: 'blouse',
};

// Black, white and friends go with every color, known or not.
const NEUTRAL_COLORS: ReadonlySet<string> = new Set([
  'black',
  'white',
  'grey',
  'navy',
  'beige',
  'brown',
]);

const MATCHING_COLOR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['blue', 'orange'],
  ['blue', 'yellow'],
  ['blue', 'pink'],
  ['blue', 'green'],
  ['blue', 'red'],
  ['red', 'pink'],
  ['green', 'yellow'],
  ['orange', 'yellow'],
  ['purple', 'yellow'],
  ['purple', 'pink'],
];

const COLOR_ALIASES: Readonly<Record<string, string>> = {
  gray: 'grey',
  'navy blue': 'navy',
  denim: 'navy',
  cream: 'beige',
  tan: 'beige',
  khaki: 'beige',
  burgundy: 'red',
  maroon: 'red',
  olive: 'green',
  teal: 'blue',
  turquoise: 'blue',
  lilac: 'purple',
};

const ALL_SEASON_LABELS: ReadonlySet<string> = new Set(['all', 'all season', 'all seasons']);

const SEASON_ALIASES: Readonly<Record<string, Season>> = { fall: Season.AUTUMN };

function clean(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

// Items store whatever was typed ("Tops", "T-Shirt"), so matching compares a standard form.
export function normalizeCategory(raw: string): string {
  const key = clean(raw);
  if (key in CATEGORY_RULES) {
    return key;
  }
  if (key in CATEGORY_ALIASES) {
    return CATEGORY_ALIASES[key];
  }
  const singular = key.replace(/s$/, '');
  return singular in CATEGORY_RULES ? singular : key;
}

export function slotOf(category: string): OutfitSlot | undefined {
  return CATEGORY_RULES[normalizeCategory(category)]?.slot;
}

export function categoryFitsOccasion(category: string, occasion: Occasion): boolean {
  return CATEGORY_RULES[normalizeCategory(category)]?.occasions.includes(occasion) ?? false;
}

// "Light Blue" counts as blue; "navy blue" is listed first because navy is a neutral.
export function normalizeColor(raw: string): string {
  const key = clean(raw);
  const baseColor = key.split(' ').pop() ?? key;
  return COLOR_ALIASES[key] ?? COLOR_ALIASES[baseColor] ?? baseColor;
}

export function colorsMatch(first: string, second: string): boolean {
  const a = normalizeColor(first);
  const b = normalizeColor(second);
  return (
    a === b ||
    NEUTRAL_COLORS.has(a) ||
    NEUTRAL_COLORS.has(b) ||
    MATCHING_COLOR_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  );
}

export function parseSeason(raw: string): Season | undefined {
  const key = clean(raw);
  return SEASON_ALIASES[key] ?? Object.values(Season).find((season) => season === key);
}

export function itemFitsSeason(itemSeason: string, season: Season): boolean {
  return ALL_SEASON_LABELS.has(clean(itemSeason)) || parseSeason(itemSeason) === season;
}
