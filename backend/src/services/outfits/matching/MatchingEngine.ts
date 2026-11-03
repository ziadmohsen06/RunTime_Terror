import { Item } from '../../../domain/entities/Item';
import { MatchContext, MatchingRule } from './MatchingRule';

export interface RuleScore {
  rule: string;
  score: number;
}

export interface RankedOutfit {
  items: Item[];
  totalScore: number;
  breakdown: RuleScore[];
}

function sortedIds(items: Item[]): number[] {
  return items.map((item) => item.id).sort((a, b) => a - b);
}

function compareIds(a: Item[], b: Item[]): number {
  const idsOfB = sortedIds(b);
  const firstDifference = sortedIds(a).map((id, index) => id - idsOfB[index]).find(Boolean);
  return firstDifference ?? 0;
}

// Runs whichever rules it is given, adds their scores, and ranks. It knows no rule
// by name, which is what lets a new rule join without editing this class (NFR2).
export class MatchingEngine {
  constructor(private readonly rules: readonly MatchingRule[]) {}

  rank(candidates: Item[][], context: MatchContext): RankedOutfit[] {
    return candidates
      .map((items) => this.evaluate(items, context))
      .sort(
        (a, b) =>
          b.totalScore - a.totalScore ||
          b.items.length - a.items.length ||
          compareIds(a.items, b.items)
      );
  }

  private evaluate(items: Item[], context: MatchContext): RankedOutfit {
    const breakdown = this.rules.map((rule) => ({
      rule: rule.name,
      score: rule.score(items, context),
    }));
    const totalScore = breakdown.reduce((total, { score }) => total + score, 0);
    return { items, totalScore, breakdown };
  }
}
