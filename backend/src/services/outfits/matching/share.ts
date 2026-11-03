// A whole-number percentage, so that scores from every rule stay comparable.
export function share<T>(values: readonly T[], passes: (value: T) => boolean): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round((values.filter(passes).length / values.length) * 100);
}
