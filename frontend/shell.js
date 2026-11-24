// Shared page shell: theme, sidebar, status helper and toasts. Load it in <head>, after auth.js:
//   <link rel="stylesheet" href="theme.css">
//   <script src="auth.js"></script>
//   <script src="shell.js"></script>
// A page puts its content in <main class="main">; the sidebar is added next to it.
(function () {
  // Every page link lives here. Renaming a page or adding one is a one-line change.
  const NAV = [
    { label: 'Closet', href: 'items.html' },
    { label: 'Outfits', href: 'outfit-builder.html' },
    { label: 'Laundry', href: 'laundry.html' },
    { label: 'Ironing', href: 'ironing.html' },
    { label: 'Wear log', href: 'wear-log.html' },
    { label: 'Recurring tasks', href: 'recurring.html' },
  ];

  const THEME_KEY = 'closet.theme';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- Theme ----------
  // Storage can be blocked, so reads and writes never throw.
  function readTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      /* the choice just will not be remembered */
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  // Runs while the <head> is parsed, before first paint, so there is no flash of the wrong theme.
  document.documentElement.setAttribute('data-theme', readTheme());

  // ---------- Small DOM helpers ----------
  function svg(paths, size) {
    const el = document.createElementNS(SVG_NS, 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('width', String(size || 18));
    el.setAttribute('height', String(size || 18));
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('aria-hidden', 'true');
    for (const d of paths) {
      const node = document.createElementNS(SVG_NS, d.startsWith('circle:') ? 'circle' : 'path');
      if (d.startsWith('circle:')) {
        const [cx, cy, r] = d.slice(7).split(',');
        node.setAttribute('cx', cx);
        node.setAttribute('cy', cy);
        node.setAttribute('r', r);
      } else {
        node.setAttribute('d', d);
      }
      el.appendChild(node);
    }
    return el;
  }

  const SUN = [
    'circle:12,12,4',
    'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4',
    'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4',
  ];
  const MOON = ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'];
  // Coat hanger.
  const HANGER = [
    'M12 7a2.5 2.5 0 1 0-2.5-2.5',
    'M12 7v3',
    'M12 10L3 17.5a1 1 0 0 0 .6 1.8h16.8a1 1 0 0 0 .6-1.8L12 10z',
  ];

  // ---------- Status helper (shared by every page that shows an item status) ----------
  // The backend sends lowercase values (clean, in_laundry, ...); the spec writes them uppercase.
  // Both spellings work. Washing and drying are stages of a laundry load, so they share the
  // "In laundry" colors.
  const STATUS = {
    CLEAN: { key: 'clean', label: 'Clean' },
    DIRTY: { key: 'dirty', label: 'Dirty' },
    IN_LAUNDRY: { key: 'laundry', label: 'In laundry' },
    WASHING: { key: 'laundry', label: 'Washing' },
    DRYING: { key: 'laundry', label: 'Drying' },
    IRONING: { key: 'ironing', label: 'Ironing' },
  };

  function statusInfo(status) {
    const normalised = String(status == null ? '' : status).trim().toUpperCase().replace(/[\s-]+/g, '_');
    return STATUS[normalised] || { key: 'unknown', label: String(status || 'Unknown') };
  }

  function statusChip(status) {
    const info = statusInfo(status);
    const chip = document.createElement('span');
    chip.className = 'status-chip status-' + info.key;
    chip.textContent = info.label;
    return chip;
  }

  // ---------- Toasts ----------
  function toastRegion() {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      document.body.appendChild(region);
    }
    return region;
  }

  // type: 'error' | 'success' | anything else for a neutral toast.
  function toast(message, type) {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast-' + type : '');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = message;
    toastRegion().appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 6000 : 3500);
    return el;
  }

  // ---------- Sidebar ----------
  function currentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function buildToggle() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';

    function render() {
      const dark = currentTheme() === 'dark';
      button.replaceChildren(svg(dark ? SUN : MOON), document.createTextNode(dark ? 'Light mode' : 'Dark mode'));
      button.setAttribute('aria-pressed', String(dark));
    }

    button.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      saveTheme(next);
      render();
    });
    render();
    return button;
  }

  function buildSidebar() {
    const aside = document.createElement('aside');
    aside.className = 'sidebar';

    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = NAV[0].href;
    brand.append(svg(HANGER, 24), document.createTextNode('Closet'));

    const nav = document.createElement('nav');
    nav.className = 'nav';
    nav.setAttribute('aria-label', 'Pages');
    const here = currentPage();
    for (const entry of NAV) {
      const link = document.createElement('a');
      link.href = entry.href;
      link.textContent = entry.label;
      if (entry.href === here) link.setAttribute('aria-current', 'page');
      nav.appendChild(link);
    }

    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.appendChild(buildToggle());
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'logout';
    logout.textContent = 'Log out';
    logout.addEventListener('click', () => {
      if (window.Auth && window.Auth.logout) window.Auth.logout();
    });
    footer.appendChild(logout);

    aside.append(brand, nav, footer);
    return aside;
  }

  function mountShell() {
    // auth.js adds its own fixed "email + Log out" bar. The sidebar replaces it, so drop it.
    for (const child of Array.from(document.body.children)) {
      if (child.tagName === 'DIV' && /position:\s*fixed/.test(child.getAttribute('style') || '')) {
        child.remove();
      }
    }

    const main = document.querySelector('main.main');
    if (!main || document.querySelector('.app')) return;
    const app = document.createElement('div');
    app.className = 'app';
    main.before(app);
    app.append(buildSidebar(), main);
  }

  window.Shell = { NAV, statusInfo, statusChip, toast, currentTheme };

  // auth.js registers its DOMContentLoaded handler first (it is loaded first), so its bar
  // already exists when this runs.
  document.addEventListener('DOMContentLoaded', mountShell);
})();
