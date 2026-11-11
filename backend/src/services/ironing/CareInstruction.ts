// What the user needs to know to iron one item. Fabric care gives the base values and
// decorators (steam, low heat) adjust them, so new advice never changes existing classes.
export interface CareInstruction {
  /** Iron temperature in degrees Celsius. */
  getTemperature(): number;
  /** Extra advice to show next to the temperature. */
  getNotes(): string[];
}