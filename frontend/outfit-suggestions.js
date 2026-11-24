// Logic for outfit-suggestions.html.

const occasionChips = document.getElementById('occasionChips');
const seasonChips = document.getElementById('seasonChips');
const message = document.getElementById('message');
const contextLabel = document.getElementById('contextLabel');
const results = document.getElementById('results');

let occasion = 'casual';
let season = 'summer';

function showMessage(text, type) {
  message.textContent = text;
  message.className = type ? `notice notice-${type}` : '';
}

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function updateActiveChips() {
  for (const chip of occasionChips.querySelectorAll('[data-occasion]')) {
    chip.classList.toggle('is-active', chip.dataset.occasion === occasion);
  }
  for (const chip of seasonChips.querySelectorAll('[data-season]')) {
    chip.classList.toggle('is-active', chip.dataset.season === season);
  }
  contextLabel.textContent = `${capitalize(occasion)} · ${capitalize(season)}`;
}

function scoreBar(part) {
  const bar = document.createElement('div');
  bar.className = 'score-bar';
  const label = textElement('div', '', 'label');
  label.append(textElement('span', capitalize(part.rule)), textElement('span', String(part.score)));
  const track = document.createElement('div');
  track.className = 'track';
  const fill = document.createElement('div');
  fill.className = 'fill';
  fill.style.width = `${Math.max(0, Math.min(100, part.score))}%`;
  track.appendChild(fill);
  bar.append(label, track);
  return bar;
}

function suggestionCard(outfit, index) {
  const card = textElement('div', '', 'card');

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.alignItems = 'center';
  head.style.justifyContent = 'space-between';
  const scoreBadge = textElement('span', String(outfit.totalScore), 'count-badge');
  head.append(textElement('h3', `Option ${index + 1}`), scoreBadge);

  const list = document.createElement('ul');
  list.style.margin = '0';
  list.style.paddingLeft = '18px';
  list.append(...outfit.items.map((item) => textElement('li', `${item.name} (${item.category}, ${item.color})`)));

  const bars = document.createElement('div');
  bars.className = 'score-bars';
  bars.append(...outfit.breakdown.map(scoreBar));

  card.append(head, list, bars);
  return card;
}

async function loadSuggestions() {
  showMessage('');
  results.replaceChildren(textElement('p', 'Loading suggestions…', 'muted'));

  const query = new URLSearchParams({ occasion, season });

  try {
    const response = await authFetch(`/outfits/suggestions?${query}`);
    let body = [];
    try {
      body = await response.json();
    } catch {
      // The response may not contain JSON.
    }
    if (!response.ok) {
      // Covers: an unknown occasion or season reaching the API despite the fixed chip set.
      throw new Error(body.error?.message || 'Something went wrong. Please try again.');
    }

    if (body.length === 0) {
      results.replaceChildren(
        textElement('p', 'No outfit can be built yet. You need a clean top and bottom, or a clean dress or suit.', 'muted')
      );
      return;
    }

    results.replaceChildren(...body.map(suggestionCard));
  } catch (error) {
    results.replaceChildren();
    showMessage(error.message, 'error');
    Shell.toast(error.message, 'error');
  }
}

occasionChips.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-occasion]');
  if (!chip) return;
  occasion = chip.dataset.occasion;
  updateActiveChips();
  loadSuggestions();
});

seasonChips.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-season]');
  if (!chip) return;
  season = chip.dataset.season;
  updateActiveChips();
  loadSuggestions();
});

updateActiveChips();
loadSuggestions();
