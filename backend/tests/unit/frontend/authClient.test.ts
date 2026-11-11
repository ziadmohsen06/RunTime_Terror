import fs from 'fs';
import path from 'path';
import vm from 'vm';

// frontend/auth.js is a plain browser script, so these tests run it in a sandbox
// that stands in for the browser: storage, location, fetch and the document.
const source = fs.readFileSync(path.resolve(__dirname, '../../../../frontend/auth.js'), 'utf8');

interface Options {
  page?: string;
  token?: string;
  user?: object;
  status?: number;
}

function loadClient({ page = '/index.html', token, user, status = 200 }: Options = {}) {
  const store = new Map<string, string>();
  if (token) store.set('closet.token', token);
  if (user) store.set('closet.user', JSON.stringify(user));

  const calls: { url: string; method?: string; body?: string; headers: Headers }[] = [];
  const redirects: string[] = [];

  const sandbox: Record<string, any> = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    location: { pathname: page, replace: (url: string) => redirects.push(url) },
    document: { addEventListener: () => undefined },
    Headers,
    fetch: async (url: string, init: { method?: string; body?: string; headers: Headers }) => {
      calls.push({ url, ...init });
      return { status };
    },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);

  return { sandbox, store, calls, redirects };
}

describe('frontend auth client', () => {
  describe('authFetch', () => {
    it('sends the saved token with the request', async () => {
      const { sandbox, calls } = loadClient({ token: 'abc' });

      await sandbox.authFetch('/items');

      expect(calls[0].headers.get('Authorization')).toBe('Bearer abc');
    });

    it('keeps the method, body and other headers of the call', async () => {
      const { sandbox, calls } = loadClient({ token: 'abc' });

      await sandbox.authFetch('/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"Shirt"}',
      });

      expect(calls[0].method).toBe('POST');
      expect(calls[0].body).toBe('{"name":"Shirt"}');
      expect(calls[0].headers.get('Content-Type')).toBe('application/json');
      expect(calls[0].headers.get('Authorization')).toBe('Bearer abc');
    });

    it('leaves a good response alone', async () => {
      const { sandbox, store, redirects } = loadClient({ token: 'abc', status: 200 });

      const response = await sandbox.authFetch('/items');

      expect(response.status).toBe(200);
      expect(redirects).toEqual([]);
      expect(store.get('closet.token')).toBe('abc');
    });

    it('clears the session and goes to the login page on a 401', async () => {
      const { sandbox, store, redirects } = loadClient({
        page: '/wear-log.html',
        token: 'old',
        user: { id: 1, email: 'sara@example.com' },
        status: 401,
      });

      await sandbox.authFetch('/items');

      expect(store.has('closet.token')).toBe(false);
      expect(store.has('closet.user')).toBe(false);
      expect(redirects).toEqual(['login.html?next=wear-log.html']);
    });
  });

  describe('session', () => {
    it('stores the token and the user, and reads them back', () => {
      const { sandbox, store } = loadClient({ page: '/login.html' });

      sandbox.Auth.saveSession('t0ken', { id: 5, email: 'omar@example.com' });

      expect(store.get('closet.token')).toBe('t0ken');
      expect(sandbox.Auth.getToken()).toBe('t0ken');
      expect(sandbox.Auth.getUser()).toEqual({ id: 5, email: 'omar@example.com' });
    });

    it('has no token before anyone logs in', () => {
      const { sandbox } = loadClient({ page: '/login.html' });

      expect(sandbox.Auth.getToken()).toBeNull();
    });

    it('logout clears the session and goes to the login page', () => {
      const { sandbox, store, redirects } = loadClient({ token: 'abc', user: { id: 1 } });

      sandbox.Auth.logout();

      expect(store.size).toBe(0);
      expect(redirects).toEqual(['login.html']);
    });
  });

  describe('page guard', () => {
    it('sends a visitor without a token to the login page, remembering the page', () => {
      const { redirects } = loadClient({ page: '/outfit-builder.html' });

      expect(redirects).toEqual(['login.html?next=outfit-builder.html']);
    });

    it('lets a visitor with a token stay on the page', () => {
      const { redirects } = loadClient({ page: '/index.html', token: 'abc' });

      expect(redirects).toEqual([]);
    });

    it('never redirects the login page itself', () => {
      const { redirects } = loadClient({ page: '/login.html' });

      expect(redirects).toEqual([]);
    });
  });
});