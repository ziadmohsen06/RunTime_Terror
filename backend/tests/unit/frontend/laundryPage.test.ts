import fs from 'fs';
import path from 'path';
import vm from 'vm';

// Tests for the Laundry page (frontend/laundry.html, laundry-logic.js, laundry.css).
// laundry-logic.js holds the page's pure rules (stage order, button labels, error messages),
// so it runs here in a plain sandbox. laundry.js only wires those rules to the DOM and the API.
const frontendDir = path.resolve(__dirname, '../../../../frontend');
const read = (name: string) => fs.readFileSync(path.join(frontendDir, name), 'utf8');

function loadLogic() {
  const sandbox: Record<string, any> = {};
  sandbox.window = sandbox;
  vm.runInNewContext(read('laundry-logic.js'), sandbox);
  return sandbox.LaundryLogic;
}

describe('laundry.html', () => {
  const html = read('laundry.html');

  // US-L8: the page uses the shared shell, so it has the sidebar, theme toggle and login check.
  it('loads the shared theme, auth client and shell, in that order, in the head', () => {
    const head = html.slice(0, html.indexOf('<body'));
    const theme = head.indexOf('href="theme.css"');
    const auth = head.indexOf('<script src="auth.js"></script>');
    const shell = head.indexOf('<script src="shell.js"></script>');
    expect(theme).toBeGreaterThan(-1);
    expect(auth).toBeGreaterThan(theme);
    expect(shell).toBeGreaterThan(auth);
  });

  it('has the main area the shell wraps with the sidebar', () => {
    expect(html).toContain('<main class="main">');
  });

  it('has a section for clean items, dirty items and loads', () => {
    for (const id of ['cleanItems', 'dirtyItems', 'createLoadButton', 'loads']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('loads the page logic before the page script', () => {
    expect(html.indexOf('laundry-logic.js')).toBeGreaterThan(-1);
    expect(html.indexOf('laundry-logic.js')).toBeLessThan(html.indexOf('laundry.js"'));
  });
});

describe('design tokens', () => {
  // The design spec: never hardcode a color, always use a var(--token).
  const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
  it.each(['laundry.html', 'laundry.js', 'laundry-logic.js', 'laundry.css'])('%s has no hardcoded hex color', (file) => {
    expect(read(file)).not.toMatch(HEX_COLOR);
  });

  it('laundry.css only animates transform, opacity and colors', () => {
    expect(read('laundry.css')).not.toMatch(/transition:[^;]*\b(width|height|top|left|margin|padding)\b/);
  });
});

describe('LaundryLogic stages', () => {
  const logic = loadLogic();

  // US-L1: a load moves Pending -> Washing -> Drying -> Done.
  it('lists the four stages in order', () => {
    expect(Array.from(logic.STAGES, (s: any) => s.key)).toEqual(['pending', 'washing', 'drying', 'done']);
    expect(Array.from(logic.STAGES, (s: any) => s.label)).toEqual(['Pending', 'Washing', 'Drying', 'Done']);
  });

  it.each([
    ['pending', 'washing'],
    ['washing', 'drying'],
    ['drying', 'done'],
  ])('the stage after %s is %s', (stage, next) => {
    expect(logic.nextStage(stage)).toBe(next);
  });

  it('a done load has no next stage', () => {
    expect(logic.nextStage('done')).toBeNull();
    expect(logic.advanceLabel('done')).toBeNull();
  });

  it.each([
    ['pending', 'Start washing'],
    ['washing', 'Start drying'],
    ['drying', 'Finish load'],
  ])('the button for a %s load says "%s"', (stage, label) => {
    expect(logic.advanceLabel(stage)).toBe(label);
  });

  // US-L5: an item can only be taken out before washing starts.
  it('items can be removed only while the load is pending', () => {
    expect(logic.canRemoveItems('pending')).toBe(true);
    for (const stage of ['washing', 'drying', 'done']) expect(logic.canRemoveItems(stage)).toBe(false);
  });

  it('shows unfinished loads first, newest first, and finished loads last', () => {
    const loads = [
      { id: 1, stage: 'done' },
      { id: 2, stage: 'pending' },
      { id: 3, stage: 'washing' },
      { id: 4, stage: 'done' },
    ];
    expect(logic.sortLoads(loads).map((l: any) => l.id)).toEqual([3, 2, 4, 1]);
  });

  it('does not change the list it is given', () => {
    const loads = [{ id: 1, stage: 'done' }, { id: 2, stage: 'pending' }];
    logic.sortLoads(loads);
    expect(loads.map((l) => l.id)).toEqual([1, 2]);
  });
});

describe('LaundryLogic.describeError', () => {
  const logic = loadLogic();

  // US-L9: clear messages for 400, 401, 404, 409 and network or server failures.
  it('401 says the session expired', () => {
    expect(logic.describeError(401, '', 'load')).toMatch(/session has expired/i);
  });

  it('404 says it no longer exists and the list was refreshed', () => {
    expect(logic.describeError(404, 'Load 9 not found', 'advance')).toMatch(/no longer exists/i);
  });

  // US-L6: the server's own sentence explains a mixed load.
  it('400 on create keeps the server sentence about mixed groups', () => {
    const message = 'A load can only contain items from the same color group and fabric group';
    expect(logic.describeError(400, message, 'createLoad')).toBe(message + '.');
  });

  it('400 without a server sentence asks to check the selection', () => {
    expect(logic.describeError(400, '', 'createLoad')).toMatch(/select/i);
  });

  // US-L3: an item cannot be in two loads.
  it('409 on create keeps the server sentence (item already in a load)', () => {
    expect(logic.describeError(409, 'Item 3 is already in load 2', 'createLoad')).toBe('Item 3 is already in load 2.');
  });

  // US-L4 and US-L5: invalid changes get a plain sentence for the action that failed.
  it('409 on remove says items can only be removed before washing starts', () => {
    expect(logic.describeError(409, 'Invalid status change: washing -> dirty', 'remove')).toMatch(/before washing starts/i);
  });

  it('409 on advance says the load cannot move on', () => {
    expect(logic.describeError(409, 'Invalid status change: x -> y', 'advance')).toMatch(/cannot move/i);
  });

  it('409 on mark dirty says the item is already dirty or in the laundry', () => {
    expect(logic.describeError(409, 'Invalid status change: dirty -> dirty', 'markDirty')).toMatch(/already dirty or in the laundry/i);
  });

  it('a server error mentions the status code', () => {
    expect(logic.describeError(500, '', 'advance')).toMatch(/500/);
  });

  it('no status at all means the server could not be reached', () => {
    expect(logic.describeError(0, '', 'load')).toMatch(/could not reach the server/i);
  });
});
