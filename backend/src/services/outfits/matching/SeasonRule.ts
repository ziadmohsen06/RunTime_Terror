import { Item } from '../../../domain/entities/Item';
import { MatchContext, MatchingRule } from './MatchingRule';
import { itemFitsSeason } from './matchingTables';
import { share } from './share';

export class SeasonRule implements MatchingRule {
  readonly name = 'season';

  score(items: Item[], { season }: MatchContext): number {
    return share(items, (item) => itemFitsSeason(item.season, season));
  }
}
