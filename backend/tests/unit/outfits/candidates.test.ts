import { buildCandidates, groupBySlot } from '../../../src/services/outfits/candidates';
import { makeItem } from '../../helpers/outfitFixtures';

const ids = (candidates: { id: number }[][]) =>
  candidates.map((candidate) => candidate.map((item) => item.id).sort((a, b) => a - b));

describe('outfit candidates', () => {
  const top = makeItem({ id: 1, category: 'shirt' });
  const secondTop = makeItem({ id: 2, category: 'Tops' });
  const bottom = makeItem({ id: 3, category: 'jeans' });
  const dress = makeItem({ id: 4, category: 'dress' });
  const shoes = makeItem({ id: 5, category: 'sneakers' });
  const coat = makeItem({ id: 6, category: 'coat' });

  it('groups items by slot and leaves out unknown categories', () => {
    const slots = groupBySlot([top, bottom, makeItem({ category: 'scarf' })]);
    expect(slots.top).toEqual([top]);
    expect(slots.bottom).toEqual([bottom]);
    expect(slots.shoes).toEqual([]);
  });

  it('pairs each top with each bottom', () => {
    const candidates = buildCandidates(groupBySlot([top, secondTop, bottom]));
    expect(ids(candidates)).toEqual([[1, 3], [2, 3]]);
  });

  it('counts a dress as a complete outfit on its own', () => {
    expect(ids(buildCandidates(groupBySlot([dress])))).toEqual([[4]]);
  });

  it('never wears a dress together with a top and bottom', () => {
    const candidates = buildCandidates(groupBySlot([top, bottom, dress]));
    expect(ids(candidates)).toEqual([[1, 3], [4]]);
  });

  it('offers shoes and outerwear as optional extras', () => {
    const candidates = buildCandidates(groupBySlot([dress, shoes, coat]));
    expect(ids(candidates)).toEqual([[4], [4, 6], [4, 5], [4, 5, 6]]);
  });

  it('builds nothing from a top without a bottom', () => {
    expect(buildCandidates(groupBySlot([top, shoes]))).toEqual([]);
  });
});
