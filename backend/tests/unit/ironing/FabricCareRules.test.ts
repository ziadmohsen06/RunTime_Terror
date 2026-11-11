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