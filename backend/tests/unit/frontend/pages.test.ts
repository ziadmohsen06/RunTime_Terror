import fs from 'fs';
import path from 'path';

// Every page except the login page needs a logged-in user, so it must load the shared
// auth client and talk to the API through authFetch (which adds the token).
const frontendDir = path.resolve(__dirname, '../../../../frontend');
const pages = fs
  .readdirSync(frontendDir)
  .filter((name) => name.endsWith('.html') && name !== 'login.html');

function read(page: string): string {
  return fs.readFileSync(path.join(frontendDir, page), 'utf8');
}

describe('frontend pages', () => {
  it.each(pages)('%s loads the auth client in its head', (page) => {
    const html = read(page);
    const scriptAt = html.indexOf('<script src="auth.js"></script>');

    expect(scriptAt).toBeGreaterThan(-1);
    expect(scriptAt).toBeLessThan(html.indexOf('<body'));
  });

  it.each(pages)('%s calls the API through authFetch, never plain fetch', (page) => {
    expect(read(page)).not.toMatch(/(?<![\w.])fetch\(/);
  });

    // As a user, I want to reach the ironing queue from every page.
  it.each(pages.filter((page) => page !== 'ironing.html'))('%s links to the ironing page', (page) => {
    expect(read(page)).toContain('href="ironing.html"');
  });
});