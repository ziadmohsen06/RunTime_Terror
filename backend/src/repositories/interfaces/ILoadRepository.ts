import { LaundryLoad, NewLaundryLoad } from '../../domain/entities/LaundryLoad';

// The laundry service depends on this interface, never on a concrete class.
export interface ILoadRepository {
  create(load: NewLaundryLoad): Promise<LaundryLoad>;
  findById(id: number): Promise<LaundryLoad | null>;
  findByUser(userId: number): Promise<LaundryLoad[]>;
  /** The load (stage other than DONE) that currently contains this item, if any. */
  findActiveByItemId(itemId: number): Promise<LaundryLoad | null>;
  update(load: LaundryLoad): Promise<LaundryLoad>;
  delete(id: number): Promise<void>;
}
