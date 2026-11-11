import { Item } from '../../domain/entities/Item';

/** One item waiting to be ironed, with how to iron it. */
export interface IroningTask {
  item: Item;
  /** Iron temperature in degrees Celsius. */
  temperature: number;
  /** Extra advice, for example "Use steam". */
  notes: string[];
}