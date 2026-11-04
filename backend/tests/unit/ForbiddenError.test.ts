import { AppError, ForbiddenError } from '../../src/domain/errors/AppError';

describe('ForbiddenError', () => {
  it('represents an authorization failure with HTTP 403', () => {
    const error = new ForbiddenError('Not allowed');

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Not allowed');
  });
});
