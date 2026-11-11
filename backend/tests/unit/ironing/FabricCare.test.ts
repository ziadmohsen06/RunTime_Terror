import { CareInstruction } from '../../../src/services/ironing/CareInstruction';
import { FabricCare } from '../../../src/services/ironing/FabricCare';
import { LowHeatDecorator } from '../../../src/services/ironing/LowHeatDecorator';
import { SteamDecorator } from '../../../src/services/ironing/SteamDecorator';

// As a user, I want to see at what temperature to iron each item, so that I do not damage it.
describe('FabricCare', () => {
  it.each([
    ['linen', 230],
    ['cotton', 200],
    ['denim', 200],
    ['wool', 150],
    ['silk', 150],
  ])('gives %s its hottest safe temperature of %i degrees', (fabric, temperature) => {
    expect(new FabricCare(fabric).getTemperature()).toBe(temperature);
  });

  it('ignores letter case and spaces around the fabric name', () => {
    expect(new FabricCare('  Linen ').getTemperature()).toBe(230);
  });

  it('gives an unknown fabric a medium temperature of 150 degrees', () => {
    expect(new FabricCare('moon dust').getTemperature()).toBe(150);
  });

  it('is not fooled by names that exist on every JavaScript object', () => {
    expect(new FabricCare('constructor').getTemperature()).toBe(150);
  });

  it('has no extra notes on its own', () => {
    expect(new FabricCare('cotton').getNotes()).toEqual([]);
  });
});

describe('care decorators', () => {
  it('SteamDecorator keeps the temperature and adds a steam note', () => {
    const care = new SteamDecorator(new FabricCare('cotton'));

    expect(care.getTemperature()).toBe(200);
    expect(care.getNotes()).toEqual(['Use steam']);
  });

  it('LowHeatDecorator caps the temperature at 110 degrees and adds a note', () => {
    const care = new LowHeatDecorator(new FabricCare('silk'));

    expect(care.getTemperature()).toBe(110);
    expect(care.getNotes()).toEqual(['Use the low heat setting']);
  });

  it('LowHeatDecorator never raises a temperature that is already lower', () => {
    const alreadyCool: CareInstruction = { getTemperature: () => 90, getNotes: () => [] };

    expect(new LowHeatDecorator(alreadyCool).getTemperature()).toBe(90);
  });

  it('decorators stack and keep every note, in the order they were added', () => {
    const care = new LowHeatDecorator(new SteamDecorator(new FabricCare('silk')));

    expect(care.getTemperature()).toBe(110);
    expect(care.getNotes()).toEqual(['Use steam', 'Use the low heat setting']);
  });

  it('are interchangeable with the care they wrap (Liskov)', () => {
    const plain: CareInstruction = new FabricCare('linen');
    const decorated: CareInstruction = new SteamDecorator(plain);

    expect(typeof decorated.getTemperature()).toBe('number');
    expect(Array.isArray(decorated.getNotes())).toBe(true);
  });
});