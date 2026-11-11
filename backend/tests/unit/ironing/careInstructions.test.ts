import {
  BaseCare,
  HighHeatDecorator,
  LowHeatDecorator,
  NoSteamDecorator,
  SteamDecorator,
} from '../../../src/services/ironing/careInstructions';

describe('care instruction decorators', () => {
  it('starts from a medium, no-steam base', () => {
    const base = new BaseCare();
    expect([base.ironTemperatureC(), base.setting(), base.steam()]).toEqual([150, 'medium', false]);
  });

  it('lets a decorator change one property and keep the rest', () => {
    const care = new SteamDecorator(new LowHeatDecorator(new BaseCare()));

    expect(care.ironTemperatureC()).toBe(110);
    expect(care.setting()).toBe('low');
    expect(care.steam()).toBe(true);
    expect(care.text()).toContain('Use steam.');
  });

  it('applies the outermost decorator last', () => {
    expect(new NoSteamDecorator(new SteamDecorator(new BaseCare())).steam()).toBe(false);
    expect(new HighHeatDecorator(new LowHeatDecorator(new BaseCare())).ironTemperatureC()).toBe(200);
  });
});
