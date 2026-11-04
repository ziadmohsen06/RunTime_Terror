import { AppError } from './AppError';

// 409 Conflict: the request is well-formed but not allowed in the item's current state.
export class InvalidTransitionError extends AppError {
  constructor(public readonly from: string, public readonly to: string) {
    super(409, `Invalid status change: ${from} -> ${to}`);
  }
}
