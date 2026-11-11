import { Item } from '../../domain/entities/Item';
import { ItemStatus } from '../../domain/enums/ItemStatus';
import { CareInstruction } from './CareInstruction';

// The small interfaces the ironing queue depends on (Dependency Inversion). Joudy's
// ItemService and this module's FabricCareRules satisfy them without any changes.

/** Joudy (Items): the two reads the queue needs. */
export interface IroningItemReader {
  listItems(userId: number, filter: { status: ItemStatus }): Promise<Item[]>;
  getById(id: number): Promise<Item | null>;
}

/** FabricCareRules: how to iron a fabric. */
export interface CareInstructionProvider {
  instructionsFor(fabric: string): CareInstruction;
}