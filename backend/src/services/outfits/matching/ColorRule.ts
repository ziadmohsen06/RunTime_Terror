import { Item } from '../../../domain/entities/Item';
import { MatchingRule } from './MatchingRule';
import { colorsMatch } from './matchingTables';
import { share } from './share';

export class ColorRule implements MatchingRule {
  readonly name = 'color';

  score(items: Item[]): number {
    const pairs = items.flatMap((item, index) =>
      items.slice(index + 1).map((other): [Item, Item] => [item, other])
    );
    if (pairs.length === 0) {
      return 100;
    }
    return share(pairs, ([first, second]) => colorsMatch(first.color, second.color));
  }
}
