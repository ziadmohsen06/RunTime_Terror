import { Item } from '../../../domain/entities/Item';
import { MatchContext, MatchingRule } from './MatchingRule';
import { categoryFitsOccasion } from './matchingTables';
import { share } from './share';

export class OccasionRule implements MatchingRule {
  readonly name = 'occasion';

  score(items: Item[], { occasion }: MatchContext): number {
    return share(items, (item) => categoryFitsOccasion(item.category, occasion));
  }
}
