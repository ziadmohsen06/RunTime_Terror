export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds = 3600
  ) {}

  sign(userId: number): string {
    throw new Error('not implemented');
  }

  verify(token: string): number {
    throw new Error('not implemented');
  }
}