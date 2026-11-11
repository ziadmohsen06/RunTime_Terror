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