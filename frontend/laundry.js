// Laundry page: mark items dirty, create loads, follow each load through its stages.
// Every API call goes through authFetch (adds the token, sends a 401 back to the login page).
// The rules that need no browser (stage order, labels, error messages) live in laundry-logic.js.
// Item names come from users, so the page only ever sets textContent, never innerHTML.
(function () {
  const L = window.LaundryLogic;

  const el = {
    cleanItems: document.getElementById('cleanItems'),
    dirtyItems: document.getElementById('dirtyItems'),
    createLoadButton: document.getElementById('createLoadButton'),
    loads: document.getElementById('loads'),
  };

  // What the page shows: everything comes from the server, apart from the selection.
  const data = { items: [], dirty: [], loads: [], selected: new Set() };

  // ---------- API ----------
  class ApiError extends Error {
    constructor(status, serverMessage) {
      super(serverMessage || '');
      this.status = status;
      this.serverMessage = serverMessage || '';
    }
  }

  async function request(method, url, body) {
    const options = { method };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await authFetch(url, options);
    } catch (networkError) {
      throw new ApiError(0, '');
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (parseError) {
      payload = null;
    }
    if (!response.ok) {
      const message = payload && payload.error && typeof payload.error.message === 'string' ? payload.error.message : '';
      throw new ApiError(response.status, message);
    }
    return payload;
  }

  // ---------- Small UI helpers ----------
  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function stateBox(text, loading) {
    const box = h('div', 'state');
    if (loading) box.appendChild(h('span', 'spinner'));
    box.appendChild(document.createTextNode(text));
    return box;
  }

  function button(label, className, onClick) {
    const node = h('button', className, label);
    node.type = 'button';
    node.addEventListener('click', () => onClick(node));
    return node;
  }

  // Disables a button while its request is running, so a double click cannot send it twice.
  async function withBusy(node, work) {
    const label = node.textContent;
    node.disabled = true;
    node.textContent = 'Working...';
    try {
      return await work();
    } finally {
      node.disabled = false;
      node.textContent = label;
    }
  }

  function details(item) {
    return [item.category, item.color, item.fabric].filter(Boolean).join(' · ');
  }

  // ---------- Loading and errors ----------
  // A failed action shows one clear message. The page is then refreshed, because a 404 or 409
  // usually means what the person saw was out of date.
  async function perform(action, work) {
    try {
      await work();
    } catch (error) {
      Shell.toast(L.describeError(error.status || 0, error.serverMessage, action), 'error');
    }
    await refresh();
  }

  function showLoadFailure(error) {
    const box = h('div', 'notice notice-error');
    box.setAttribute('role', 'alert');
    box.appendChild(document.createTextNode(L.describeError(error.status || 0, error.serverMessage, 'load') + ' '));
    box.appendChild(button('Retry', 'btn btn-secondary', () => load()));
    for (const target of [el.cleanItems, el.dirtyItems, el.loads]) target.replaceChildren();
    el.cleanItems.appendChild(box);
  }

  async function refresh() {
    try {
      const [items, dirty, loads] = await Promise.all([
        request('GET', '/items'),
        request('GET', '/laundry/dirty-items'),
        request('GET', '/laundry/loads'),
      ]);
      data.items = items;
      data.dirty = dirty;
      data.loads = loads;
      // Forget a selected item that is no longer dirty (someone else put it in a load).
      const stillDirty = new Set(dirty.map((item) => item.id));
      for (const id of Array.from(data.selected)) if (!stillDirty.has(id)) data.selected.delete(id);
      render();
    } catch (error) {
      showLoadFailure(error);
    }
  }

  function load() {
    for (const target of [el.cleanItems, el.dirtyItems, el.loads]) target.replaceChildren(stateBox('Loading...', true));
    return refresh();
  }

  // ---------- Actions ----------
  function markDirty(item, node) {
    return withBusy(node, () =>
      perform('markDirty', async () => {
        await request('POST', '/laundry/items/' + item.id + '/dirty');
        Shell.toast('Marked "' + item.name + '" as dirty.', 'success');
      })
    );
  }

  function createLoad(node) {
    const itemIds = Array.from(data.selected);
    return withBusy(node, () =>
      perform('createLoad', async () => {
        const created = await request('POST', '/laundry/loads', { itemIds });
        data.selected.clear(); // only after success, so a rejected selection can be adjusted
        Shell.toast('Load #' + created.id + ' created.', 'success');
      })
    );
  }

  function advance(loadItem, node) {
    return withBusy(node, () =>
      perform('advance', async () => {
        const updated = await request('POST', '/laundry/loads/' + loadItem.id + '/advance');
        Shell.toast('Load #' + updated.id + ' is now ' + updated.stage + '.', 'success');
      })
    );
  }

  function removeItem(loadItem, item, node) {
    return withBusy(node, () =>
      perform('remove', async () => {
        await request('DELETE', '/laundry/loads/' + loadItem.id + '/items/' + item.id);
        Shell.toast('Removed "' + item.name + '" from load #' + loadItem.id + '.', 'success');
      })
    );
  }

  // ---------- Rendering ----------
  function render() {
    renderClean();
    renderDirty();
    renderLoads();
  }

  function renderClean() {
    const clean = data.items.filter((item) => String(item.status).toLowerCase() === 'clean');
    if (clean.length === 0) {
      el.cleanItems.replaceChildren(stateBox('No clean items. Add clothes in the Closet.', false));
      return;
    }
    const list = h('ul', 'list');
    for (const item of clean) {
      const row = h('li', 'list-row');
      const text = h('div', 'grow');
      text.append(h('strong', null, item.name), h('div', 'muted', details(item)));
      row.append(text, Shell.statusChip(item.status), button('Mark dirty', 'btn btn-secondary', (node) => markDirty(item, node)));
      list.appendChild(row);
    }
    el.cleanItems.replaceChildren(list);
  }

  function renderDirty() {
    if (data.dirty.length === 0) {
      el.dirtyItems.replaceChildren(stateBox('No dirty items. Mark an item dirty first.', false));
    } else {
      const grid = h('div', 'card-grid');
      for (const item of data.dirty) {
        const picked = data.selected.has(item.id);
        const card = h('button', 'card pick' + (picked ? ' is-selected' : ''));
        card.type = 'button';
        card.setAttribute('aria-pressed', String(picked));
        card.append(h('span', 'pick-title', item.name), h('span', 'meta', details(item)), Shell.statusChip(item.status));
        card.addEventListener('click', () => {
          if (data.selected.has(item.id)) data.selected.delete(item.id);
          else data.selected.add(item.id);
          renderDirty();
        });
        grid.appendChild(card);
      }
      el.dirtyItems.replaceChildren(grid);
    }
    const count = data.selected.size;
    el.createLoadButton.disabled = count === 0;
    el.createLoadButton.textContent = count === 0 ? 'Create load' : 'Create load (' + count + ' selected)';
  }

  function renderTracker(stage) {
    const current = L.stageIndex(stage);
    const tracker = h('ol', 'stage-tracker');
    tracker.setAttribute('aria-label', 'Load stage');
    L.STAGES.forEach((step, index) => {
      const entry = h('li', 'stage');
      if (index < current || stage === 'done') entry.classList.add('is-complete');
      if (index === current && stage !== 'done') entry.classList.add('is-current');
      if (index === current) entry.setAttribute('aria-current', 'step');
      entry.append(h('span', 'dot'), document.createTextNode(step.label));
      tracker.appendChild(entry);
    });
    return tracker;
  }

  function renderLoads() {
    if (data.loads.length === 0) {
      el.loads.replaceChildren(stateBox('No loads yet. Select dirty items above and create one.', false));
      return;
    }
    const itemById = new Map(data.items.map((item) => [item.id, item]));
    const cards = L.sortLoads(data.loads).map((loadItem) => renderLoad(loadItem, itemById));
    el.loads.replaceChildren(...cards);
  }

  function renderLoad(loadItem, itemById) {
    const card = h('article', 'card static');
    const head = h('div', 'load-head');
    head.append(
      h('h3', null, 'Load #' + loadItem.id),
      h('span', 'count-badge', loadItem.colorGroup),
      h('span', 'count-badge', loadItem.fabricGroup),
      h('span', 'muted num', loadItem.itemIds.length + (loadItem.itemIds.length === 1 ? ' item' : ' items'))
    );
    card.append(head, renderTracker(loadItem.stage));

    const list = h('ul', 'list');
    let needIroning = 0;
    for (const id of loadItem.itemIds) {
      const item = itemById.get(id) || { id, name: 'Item #' + id, status: '' };
      if (String(item.status).toLowerCase() === 'ironing') needIroning += 1;
      const row = h('li', 'list-row');
      const text = h('div', 'grow');
      text.append(h('strong', null, item.name), h('div', 'muted', details(item)));
      row.append(text, Shell.statusChip(item.status));
      if (L.canRemoveItems(loadItem.stage)) {
        row.appendChild(button('Remove', 'btn btn-secondary', (node) => removeItem(loadItem, item, node)));
      }
      list.appendChild(row);
    }
    card.appendChild(list);

    const footer = h('div', 'load-footer');
    const label = L.advanceLabel(loadItem.stage);
    if (label) {
      footer.appendChild(button(label, 'btn', (node) => advance(loadItem, node)));
    } else {
      footer.appendChild(h('span', 'muted', 'This load is finished.'));
    }
    if (needIroning > 0) {
      const note = h('span', 'muted');
      note.append(
        document.createTextNode(needIroning + (needIroning === 1 ? ' item needs' : ' items need') + ' ironing. '),
      );
      const link = h('a', null, 'Open the ironing queue');
      link.href = 'ironing.html';
      note.appendChild(link);
      footer.appendChild(note);
    }
    card.appendChild(footer);
    return card;
  }

  el.createLoadButton.addEventListener('click', () => createLoad(el.createLoadButton));
  load();
})();
