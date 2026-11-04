import { ColorGroup } from '../../../src/domain/enums/ColorGroup';
import { colorGroupOf } from '../../../src/services/laundry/groups/colorGroupOf';
import { FabricGroup } from '../../../src/domain/enums/FabricGroup';
import { fabricGroupOf } from '../../../src/services/laundry/groups/fabricGroupOf';

// Loads may only mix items from the same color group AND the same fabric group.
describe('colorGroupOf', () => {
  it.each([
    ['white', ColorGroup.LIGHT],
    ['cream', ColorGroup.LIGHT],
    ['black', ColorGroup.DARK],
    ['navy', ColorGroup.DARK],
    ['red', ColorGroup.COLORED],
    ['blue', ColorGroup.COLORED],
  ])('%s -> %s', (color, group) => {
    expect(colorGroupOf(color)).toBe(group);
  });

  it('ignores case and surrounding spaces', () => {
    expect(colorGroupOf('  WHITE ')).toBe(ColorGroup.LIGHT);
  });

  it('treats an unknown color as COLORED (the safe group)', () => {
    expect(colorGroupOf('turquoise')).toBe(ColorGroup.COLORED);
  });
});

describe('fabricGroupOf', () => {
  it.each([
    ['cotton', FabricGroup.REGULAR],
    ['polyester', FabricGroup.REGULAR],
    ['silk', FabricGroup.DELICATE],
    ['wool', FabricGroup.DELICATE],
    ['denim', FabricGroup.HEAVY],
    ['fleece', FabricGroup.HEAVY],
  ])('%s -> %s', (fabric, group) => {
    expect(fabricGroupOf(fabric)).toBe(group);
  });

  it('ignores case and surrounding spaces', () => {
    expect(fabricGroupOf(' Silk ')).toBe(FabricGroup.DELICATE);
  });

  it('treats an unknown fabric as REGULAR', () => {
    expect(fabricGroupOf('unobtainium')).toBe(FabricGroup.REGULAR);
  });
});
