import { ColorRule } from './ColorRule';
import { MatchingRule } from './MatchingRule';
import { OccasionRule } from './OccasionRule';
import { SeasonRule } from './SeasonRule';

// To add a rule: write a class that implements MatchingRule and list it here.
export function createDefaultRules(): MatchingRule[] {
  return [new OccasionRule(), new SeasonRule(), new ColorRule()];
}
