import { CareInstruction } from './CareInstruction';

// The hottest iron temperature (degrees Celsius) each fabric can take. Declarative lookup:
// add a fabric by adding a line. A Map is used so names like "constructor" are not found.
const HOTTEST_SAFE = new Map<string, number>([
  ['linen', 230],
  ['cotton', 200],
  ['denim', 200],
  ['wool', 150],
  ['cashmere', 150],
  ['silk', 150],
  ['satin', 150],
  ['chiffon', 150],
  ['lace', 150],
  ['polyester', 150],
  ['nylon', 150],
  ['acrylic', 150],
]);
const MEDIUM = 150; // for a fabric we do not know

export class FabricCare implements CareInstruction {
  private readonly fabric: string;

  constructor(fabric: string) {
    this.fabric = fabric.trim().toLowerCase();
  }

  getTemperature(): number {
    return HOTTEST_SAFE.get(this.fabric) ?? MEDIUM;
  }

  getNotes(): string[] {
    return [];
  }
}