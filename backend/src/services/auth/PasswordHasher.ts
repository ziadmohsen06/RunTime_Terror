export class PasswordHasher {
  constructor(private readonly rounds = 10) {}

  hash(plain: string): Promise<string> {
    throw new Error('not implemented');
  }

  verify(plain: string, hash: string): Promise<boolean> {
    throw new Error('not implemented');
  }
}