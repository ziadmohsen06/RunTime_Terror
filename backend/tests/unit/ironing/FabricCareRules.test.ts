import { FabricCareRules } from '../../../src/services/ironing/FabricCareRules';

describe('FabricCareRules', () => {
  const rules = new FabricCareRules();

  it.each(['linen', 'silk', 'satin'])('%s needs ironing', (fabric) => {
    expect(rules.needsIroning(fabric)).toBe(true);
  });

  it.each(['cotton', 'denim', 'wool', 'polyester', 'something-new'])('%s goes straight back to the closet', (fabric) => {
    expect(rules.needsIroning(fabric)).toBe(false);
  });

  it('ignores letter case and surrounding spaces', () => {
    expect(rules.needsIroning('  LINEN ')).toBe(true);
    expect(rules.careFor(' Silk ').ironTemperatureC).toBe(110);
  });

  it('gives a safe iron temperature per fabric', () => {
    expect(rules.careFor('linen')).toMatchObject({ ironTemperatureC: 200, setting: 'high', steam: true });
    expect(rules.careFor('silk')).toMatchObject({ ironTemperatureC: 110, setting: 'low', steam: false });
    expect(rules.careFor('wool').setting).toBe('medium');
  });

  it('gives an unknown fabric a medium default with instructions', () => {
    const care = rules.careFor('hemp');
    expect(care).toMatchObject({ ironTemperatureC: 150, setting: 'medium' });
    expect(care.instructions.length).toBeGreaterThan(0);
  });

  it('does not expose the internal needsIroning flag in the care instructions', () => {
    expect(rules.careFor('linen')).not.toHaveProperty('needsIroning');
  });
});
