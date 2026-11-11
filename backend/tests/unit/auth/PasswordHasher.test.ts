import { PasswordHasher } from '../../../src/services/auth/PasswordHasher';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher(4); // low cost keeps tests fast

  it('does not store the plain password', async () => {
    const hash = await hasher.hash('secret123');
    expect(hash).not.toBe('secret123');
    expect(hash).not.toContain('secret123');
  });

  it('verifies the correct password against its hash', async () => {
    const hash = await hasher.hash('secret123');
    expect(await hasher.verify('secret123', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('secret123');
    expect(await hasher.verify('wrong', hash)).toBe(false);
  });

  it('salts, so the same password hashes differently each time', async () => {
    expect(await hasher.hash('secret123')).not.toBe(await hasher.hash('secret123'));
  });
});