import { CareRules } from '../laundry/ports';
import { CareInstruction } from './CareInstruction';
import { FabricCare } from './FabricCare';
import { LowHeatDecorator } from './LowHeatDecorator';
import { SteamDecorator } from './SteamDecorator';

// Declarative lookups: change the care rules by editing these lists.
const NEEDS_IRONING = ['linen', 'silk'];
const USE_STEAM = ['linen', 'cotton', 'denim', 'wool', 'cashmere'];
const USE_LOW_HEAT = ['silk', 'satin', 'chiffon', 'lace', 'polyester', 'nylon', 'acrylic'];

const normalize = (fabric: string) => fabric.trim().toLowerCase();

/** Valen's Laundry asks needsIroning; the ironing queue asks instructionsFor. */
export class FabricCareRules implements CareRules {
  needsIroning(fabric: string): boolean {
    return NEEDS_IRONING.includes(normalize(fabric));
  }

  // Imperative: start from the fabric's base care and wrap it once per extra that applies.
  instructionsFor(fabric: string): CareInstruction {
    const name = normalize(fabric);
    let care: CareInstruction = new FabricCare(name);
    if (USE_STEAM.includes(name)) care = new SteamDecorator(care);
    if (USE_LOW_HEAT.includes(name)) care = new LowHeatDecorator(care);
    return care;
  }
}
import {
  BaseCare,
  CareInstruction,
  HighHeatDecorator,
  InsideOutDecorator,
  LowHeatDecorator,
  NoSteamDecorator,
  PressingClothDecorator,
  SteamDecorator,
} from './careInstructions';

export interface CareInstructions {
  /** Highest safe ironing temperature in degrees Celsius. */
  ironTemperatureC: number;
  setting: 'low' | 'medium' | 'high';
  steam: boolean;
  instructions: string;
}

interface FabricCare {
  needsIroning: boolean;
  build: () => CareInstruction;
}

const low = () => new LowHeatDecorator(new BaseCare());
const high = () => new HighHeatDecorator(new BaseCare());

// Declarative table: supporting a new fabric means adding one line here and changing no
// other code (Open/Closed). Each entry composes decorators around the base instruction.
// Fabrics not listed use the plain base instruction (medium heat).
const FABRIC_CARE: Readonly<Record<string, FabricCare>> = {
  linen: { needsIroning: true, build: () => new SteamDecorator(high()) },
  silk: { needsIroning: true, build: () => new NoSteamDecorator(new InsideOutDecorator(low())) },
  satin: { needsIroning: true, build: () => new NoSteamDecorator(new PressingClothDecorator(new InsideOutDecorator(low()))) },
  cotton: { needsIroning: false, build: () => new SteamDecorator(high()) },
  denim: { needsIroning: false, build: () => new InsideOutDecorator(high()) },
  wool: { needsIroning: false, build: () => new SteamDecorator(new PressingClothDecorator(new BaseCare())) },
  cashmere: { needsIroning: false, build: () => new SteamDecorator(new PressingClothDecorator(low())) },
  polyester: { needsIroning: false, build: () => new NoSteamDecorator(low()) },
  nylon: { needsIroning: false, build: () => new NoSteamDecorator(new PressingClothDecorator(low())) },
};

const DEFAULT_CARE: FabricCare = { needsIroning: false, build: () => new BaseCare() };

const careOf = (fabric: string): FabricCare => FABRIC_CARE[fabric.trim().toLowerCase()] ?? DEFAULT_CARE;

// The real CareRules that Laundry depends on, plus the care instructions the queue shows.
export class FabricCareRules implements CareRules {
  needsIroning(fabric: string): boolean {
    return careOf(fabric).needsIroning;
  }

  careFor(fabric: string): CareInstructions {
    const care = careOf(fabric).build();
    return {
      ironTemperatureC: care.ironTemperatureC(),
      setting: care.setting(),
      steam: care.steam(),
      instructions: care.text(),
    };
  }
}
