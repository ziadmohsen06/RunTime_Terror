import { FabricCareRules } from '../../../src/services/ironing/FabricCareRules';

// As a user, I want to see which of my washed clothes need ironing and at what temperature.
describe('FabricCareRules', () => {
  const rules = new FabricCareRules();

  describe('needsIroning', () => {
    it.each(['linen', 'silk', ' Linen ', 'SILK'])('says %p needs ironing', (fabric) => {
      expect(rules.needsIroning(fabric)).toBe(true);
    });

    it.each(['cotton', 'wool', 'polyester', 'denim', 'moon dust', ''])(
      'says %p does not need ironing',
      (fabric) => {
        expect(rules.needsIroning(fabric)).toBe(false);
      }
    );
  });

  describe('instructionsFor', () => {
    it.each([
      ['linen', 230, ['Use steam']],
      ['cotton', 200, ['Use steam']],
      ['denim', 200, ['Use steam']],
      ['wool', 150, ['Use steam']],
      ['silk', 110, ['Use the low heat setting']],
      ['polyester', 110, ['Use the low heat setting']],
      ['moon dust', 150, []],
    ])('gives %s %i degrees and the notes %j', (fabric, temperature, notes) => {
      const care = rules.instructionsFor(fabric);

      expect(care.getTemperature()).toBe(temperature);
      expect(care.getNotes()).toEqual(notes);
    });
  });
});
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
