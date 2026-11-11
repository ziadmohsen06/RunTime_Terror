import { CareRules } from '../laundry/ports';

export interface CareInstructions {
  /** Highest safe ironing temperature in degrees Celsius. */
  ironTemperatureC: number;
  setting: 'low' | 'medium' | 'high';
  steam: boolean;
  instructions: string;
}

interface FabricCare extends CareInstructions {
  needsIroning: boolean;
}

// Declarative lookup table: supporting a new fabric means adding one line here and
// changing no code (Open/Closed). Fabrics not listed use the medium default below.
const FABRIC_CARE: Readonly<Record<string, FabricCare>> = {
  linen: { needsIroning: true, ironTemperatureC: 200, setting: 'high', steam: true, instructions: 'Iron while slightly damp, with steam, on the reverse side.' },
  silk: { needsIroning: true, ironTemperatureC: 110, setting: 'low', steam: false, instructions: 'Iron inside out on low heat. Never use steam.' },
  satin: { needsIroning: true, ironTemperatureC: 110, setting: 'low', steam: false, instructions: 'Iron inside out on low heat with a pressing cloth.' },
  cotton: { needsIroning: false, ironTemperatureC: 200, setting: 'high', steam: true, instructions: 'Iron while slightly damp, or use steam.' },
  denim: { needsIroning: false, ironTemperatureC: 200, setting: 'high', steam: true, instructions: 'Iron inside out on high heat.' },
  wool: { needsIroning: false, ironTemperatureC: 150, setting: 'medium', steam: true, instructions: 'Use steam or a damp pressing cloth. Do not press flat.' },
  cashmere: { needsIroning: false, ironTemperatureC: 110, setting: 'low', steam: true, instructions: 'Steam only, or iron on low through a pressing cloth.' },
  polyester: { needsIroning: false, ironTemperatureC: 110, setting: 'low', steam: false, instructions: 'Iron on low heat. High heat melts the fabric.' },
  nylon: { needsIroning: false, ironTemperatureC: 110, setting: 'low', steam: false, instructions: 'Iron on low heat through a pressing cloth.' },
};

const DEFAULT_CARE: FabricCare = {
  needsIroning: false,
  ironTemperatureC: 150,
  setting: 'medium',
  steam: false,
  instructions: 'Iron on a medium setting and test a hidden corner first.',
};

const careOf = (fabric: string): FabricCare => FABRIC_CARE[fabric.trim().toLowerCase()] ?? DEFAULT_CARE;

// The real CareRules that Laundry depends on, plus the care instructions the queue shows.
export class FabricCareRules implements CareRules {
  needsIroning(fabric: string): boolean {
    return careOf(fabric).needsIroning;
  }

  careFor(fabric: string): CareInstructions {
    const { ironTemperatureC, setting, steam, instructions } = careOf(fabric);
    return { ironTemperatureC, setting, steam, instructions };
  }
}
