
const itemForm = document.getElementById('itemForm');
const formMessage = document.getElementById('formMessage');
const itemsList = document.getElementById('itemsList');
const itemCount = document.getElementById('itemCount');
const addButton = document.getElementById('addButton');
const statusFilters = document.getElementById('statusFilters');

let selectedStatus = '';

function showMessage(message, type = '') {
  formMessage.textContent = message;
  formMessage.className = type ? `notice notice-${type}` : '';
}

function showState(message, loading = false) {
  const state = document.createElement('div');
  state.className = 'state';
  state.style.gridColumn = '1 / -1';

  if (loading) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    state.appendChild(spinner);
  }

  state.appendChild(document.createTextNode(message));
  itemsList.replaceChildren(state);
}

async function readResponse(response) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    // The response may not contain JSON.
  }

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(data.error?.message || 'Please check the item information and try again.');
    }

    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }

    if (response.status === 404) {
      throw new Error(data.error?.message || 'The requested item could not be found.');
    }

    throw new Error(data.error?.message || 'Something went wrong. Please try again.');
  }

  return data;
}

function createItemCard(item) {
  const card = document.createElement('article');
  card.className = 'card';

  if (item.photoUrl) {
    try {
      const photoUrl = new URL(item.photoUrl);

      if (photoUrl.protocol === 'http:' || photoUrl.protocol === 'https:') {
        const image = document.createElement('img');
        image.src = photoUrl.href;
        image.alt = item.name;
        image.loading = 'lazy';
        image.style.width = '100%';
        image.style.height = '160px';
        image.style.objectFit = 'cover';
        image.style.borderRadius = '8px';
        card.appendChild(image);
      }
    } catch {
      // Ignore an invalid photo URL.
    }
  }

  const title = document.createElement('h3');
  title.textContent = item.name;

  const status = Shell.statusChip(item.status);

  const details = document.createElement('p');
  details.className = 'muted';
  details.textContent = `${item.category} · ${item.color}`;

  const season = document.createElement('p');
  season.textContent = `Season: ${item.season}`;

  const fabric = document.createElement('p');
  fabric.textContent = `Fabric: ${item.fabric}`;

  card.append(title, status, details, season, fabric);

  return card;
}

async function loadItems() {
  itemCount.textContent = 'Loading items...';
  showState('Loading your closet...', true);

  const params = new URLSearchParams();

  const category = document.getElementById('filterCategory').value.trim();
  const color = document.getElementById('filterColor').value.trim();
  const season = document.getElementById('filterSeason').value.trim();

  if (category) params.set('category', category);
  if (color) params.set('color', color);
  if (season) params.set('season', season);

  try {
    const response = await authFetch(`/items?${params.toString()}`);
    const items = await readResponse(response);

    let filteredItems = items;

    if (selectedStatus === 'in_laundry') {
      filteredItems = items.filter(item =>
        ['in_laundry', 'washing', 'drying'].includes(item.status)
      );
    } else if (selectedStatus) {
      filteredItems = items.filter(item => item.status === selectedStatus);
    }

    itemCount.textContent = `${filteredItems.length} item(s) found`;

    if (filteredItems.length === 0) {
      showState('No items found. Try changing your filters or adding an item.');
      return;
    }

    itemsList.replaceChildren(
      ...filteredItems.map(createItemCard)
    );
  } catch (error) {
    itemCount.textContent = 'Could not load items.';
    showState(error.message);
    Shell.toast(error.message, 'error');
  }
}

itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  addButton.disabled = true;
  showMessage('Adding your item...');

  const item = {
    name: document.getElementById('name').value.trim(),
    category: document.getElementById('category').value.trim(),
    color: document.getElementById('color').value.trim(),
    season: document.getElementById('season').value,
    fabric: document.getElementById('fabric').value.trim()
  };

  const photoUrl = document.getElementById('photoUrl').value.trim();

  if (photoUrl) {
    item.photoUrl = photoUrl;
  }

  try {
    const response = await authFetch('/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    });

    await readResponse(response);

    itemForm.reset();
    showMessage('Item added successfully!', 'success');
    Shell.toast('Item added successfully!', 'success');

    selectedStatus = '';
    updateActiveChip();

    await loadItems();
  } catch (error) {
    showMessage(error.message, 'error');
    Shell.toast(error.message, 'error');
  } finally {
    addButton.disabled = false;
  }
});

function updateActiveChip() {
  const chips = statusFilters.querySelectorAll('[data-status]');

  chips.forEach(chip => {
    const isActive = chip.dataset.status === selectedStatus;
    chip.classList.toggle('is-active', isActive);
    chip.setAttribute('aria-pressed', String(isActive));
  });
}

statusFilters.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-status]');

  if (!chip) return;

  selectedStatus = chip.dataset.status;
  updateActiveChip();
  loadItems();
});

document.getElementById('applyFilters').addEventListener('click', () => {
  loadItems();
});
document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterColor').value = '';
  document.getElementById('filterSeason').value = '';

  selectedStatus = '';
  updateActiveChip();
  loadItems();
});

updateActiveChip();
loadItems();
