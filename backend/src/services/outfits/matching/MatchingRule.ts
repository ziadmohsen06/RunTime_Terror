import { Item } from '../../../domain/entities/Item';
import { Occasion } from '../../../domain/enums/Occasion';
import { Season } from '../../../domain/enums/Season';

export interface MatchContext {
  occasion: Occasion;
  season: Season;
}

// Strategy: each rule is one way of judging a set of items. New rules implement
// this interface and join the list in defaultRules.ts; the engine never changes.
export interface MatchingRule {
  readonly name: string;
  score(items: Item[], context: MatchContext): number;
}
