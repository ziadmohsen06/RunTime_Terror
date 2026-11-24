// Logic for outfit-builder.html. Mirrors backend/src/services/outfits/matching/matchingTables.ts
// (CATEGORY_RULES) for the slot headings only — the server is still the one that validates.

const SLOT_LABELS = { top: 'Tops', bottom: 'Bottoms', full: 'Full-body', outerwear: 'Outerwear', shoes: 'Shoes' };
const SLOT_ORDER = ['top', 'bottom', 'full', 'outerwear', 'shoes'];

const CATEGORY_SLOT = {
  top: 'top', 't shirt': 'top', tee: 'top', tshirt: 'top', shirt: 'top', blouse: 'top',
  blouses: 'top', sweater: 'top', jumper: 'top', hoodie: 'top',
  bottom: 'bottom', jeans: 'bottom', trousers: 'bottom', pants: 'bottom', chinos: 'bottom',
  skirt: 'bottom', shorts: 'bottom', sweatpants: 'bottom', joggers: 'bottom', leggings: 'bottom',
  dress: 'full', dresses: 'full', suit: 'full',
  blazer: 'outerwear', jacket: 'outerwear', coat: 'outerwear',
  shoes: 'shoes', sneakers: 'shoes', trainers: 'shoes', 'dress shoes': 'shoes',
  loafers: 'shoes', heels: 'shoes', boots: 'shoes', sandals: 'shoes',
};

function slotOf(category) {
  const key = String(category || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (key in CATEGORY_SLOT) return CATEGORY_SLOT[key];
  const singular = key.replace(/s$/, '');
  return CATEGORY_SLOT[singular];
}

const form = document.getElementById('outfitForm');
const nameInput = document.getElementById('outfitName');
const itemChoices = document.getElementById('itemChoices');
const saveButton = document.getElementById('saveButton');
const savedOutfits = document.getElementById('savedOutfits');
const formMessage = document.getElementById('formMessage');

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = type ? `notice notice-${type}` : '';
}

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

async function readResponse(response) {
  let body = {};
  try {
    body = await response.json();
  } catch {
    // The response may not contain JSON.
  }
  if (!response.ok) {
    throw new Error(body.error?.message || 'Something went wrong. Please try again.');
  }
  return body;
}

function selectedIds() {
  return [...itemChoices.querySelectorAll('input:checked')].map((box) => Number(box.value));
}

function updateSaveButton() {
  const count = selectedIds().length;
  saveButton.disabled = count === 0;
  saveButton.textContent = count === 0 ? 'Save outfit' : `Save outfit (${count} item${count === 1 ? '' : 's'})`;
}

function itemChoice(item) {
  const label = document.createElement('label');
  label.className = 'item-choice';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.value = item.id;

  const text = document.createElement('div');
  text.className = 'grow';
  text.append(textElement('strong', item.name), document.createElement('br'), textElement('span', `${item.category} · ${item.color}`, 'muted'));

  label.append(box, text);
  return label;
}

async function loadItems() {
  try {
    const items = await readResponse(await authFetch('/items?status=clean'));
    const bySlot = {};
    const leftover = [];
    for (const item of items) {
      const slot = slotOf(item.category);
      if (slot) {
        (bySlot[slot] ||= []).push(item);
      } else {
        leftover.push(item);
      }
    }

    const groups = [];
    for (const slot of SLOT_ORDER) {
      if (bySlot[slot]?.length) {
        const group = document.createElement('div');
        group.className = 'slot-group';
        group.append(textElement('h3', SLOT_LABELS[slot]), ...bySlot[slot].map(itemChoice));
        groups.push(group);
      }
    }
    if (leftover.length) {
      const group = document.createElement('div');
      group.className = 'slot-group';
      group.append(textElement('h3', 'Other'), ...leftover.map(itemChoice));
      groups.push(group);
    }

    itemChoices.replaceChildren(...groups);
    if (items.length === 0) {
      itemChoices.append(textElement('p', 'No clean items yet. Add some in My Closet.', 'muted'));
    }
    updateSaveButton();
  } catch (error) {
    itemChoices.replaceChildren(textElement('p', error.message, 'muted'));
    Shell.toast(error.message, 'error');
  }
}

function outfitCard(outfit) {
  const card = textElement('div', '', 'card static');
  card.append(textElement('h3', outfit.name));

  const tags = [outfit.occasion, outfit.season].filter(Boolean);
  if (tags.length) card.append(textElement('p', tags.map((tag) => tag[0].toUpperCase() + tag.slice(1)).join(' · '), 'muted'));

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '6px';
  for (const item of outfit.items) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.append(textElement('span', item.name), Shell.statusChip(item.status));
    list.appendChild(row);
  }
  card.append(list);
  return card;
}

async function loadOutfits() {
  try {
    const outfits = await readResponse(await authFetch('/outfits'));
    savedOutfits.replaceChildren(...outfits.map(outfitCard));
    if (outfits.length === 0) {
      savedOutfits.append(textElement('p', 'No saved outfits yet.', 'muted'));
    }
  } catch (error) {
    savedOutfits.replaceChildren(textElement('p', error.message, 'muted'));
    Shell.toast(error.message, 'error');
  }
}

itemChoices.addEventListener('change', updateSaveButton);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('');
  saveButton.disabled = true;

  try {
    const outfit = await readResponse(
      await authFetch('/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value,
          itemIds: selectedIds(),
          occasion: document.getElementById('outfitOccasion').value || undefined,
          season: document.getElementById('outfitSeason').value || undefined,
        }),
      })
    );
    showMessage(`Saved "${outfit.name}".`, 'success');
    Shell.toast(`Saved "${outfit.name}".`, 'success');
    form.reset();
  } catch (error) {
    // Covers: a dirty/ironing item slipped in since the page loaded, a blank name,
    // no items chosen, or an item that is no longer yours.
    showMessage(error.message, 'error');
    Shell.toast(error.message, 'error');
  }

  // Reloading also clears any item that stopped being clean after the page opened.
  await Promise.all([loadItems(), loadOutfits()]);
});

Promise.all([loadItems(), loadOutfits()]).catch((error) => {
  showMessage(error.message, 'error');
  Shell.toast(error.message, 'error');
});
