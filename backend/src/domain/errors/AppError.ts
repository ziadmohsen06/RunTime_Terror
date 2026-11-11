export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
  }
}
