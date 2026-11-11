// Runs before every test file (see jest.config.js). It gives createApp() a signing secret,
// so tests never depend on a real .env file, and keeps password hashing fast.
process.env.JWT_SECRET = 'test-secret-for-jest-only';
process.env.BCRYPT_ROUNDS = '4';