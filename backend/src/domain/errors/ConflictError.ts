import { AppError } from './AppError';

// 409 Conflict: the request clashes with existing data (e.g. item already in a load).
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}
