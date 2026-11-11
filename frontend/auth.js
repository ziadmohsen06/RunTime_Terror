// Shared by every page: keeps the login token and sends it with API calls.
(function () {
  const TOKEN_KEY = 'closet.token';
  const USER_KEY = 'closet.user';
  const LOGIN_PAGE = 'login.html';

  // Storage can be blocked (private mode, strict settings), so reads and writes never throw.
  function attempt(action) {
    try {
      return action();
    } catch (error) {
      return null;
    }
  }

  function getToken() {
    return attempt(() => localStorage.getItem(TOKEN_KEY));
  }

  function getUser() {
    const raw = attempt(() => localStorage.getItem(USER_KEY));
    return attempt(() => (raw ? JSON.parse(raw) : null));
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    attempt(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    });
  }

  function currentPage() {
    return location.pathname.split('/').pop();
  }

  function onLoginPage() {
    return currentPage() === LOGIN_PAGE;
  }

  // Remembers which page the visitor wanted, so login can bring them back to it.
  function goToLogin() {
    const page = currentPage();
    const next = page && page !== LOGIN_PAGE ? `?next=${encodeURIComponent(page)}` : '';
    location.replace(LOGIN_PAGE + next);
  }

  function logout() {
    clearSession();
    location.replace(LOGIN_PAGE);
  }

  // Use this instead of fetch() for every call to the API: it adds the token, and a 401
  // (missing, expired or invalid token) sends the visitor back to the login page.
  async function authFetch(url, options) {
    const settings = options || {};
    const headers = new Headers(settings.headers || {});
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, Object.assign({}, settings, { headers }));
    if (response.status === 401) {
      clearSession();
      goToLogin();
    }
    return response;
  }

  // A small "who is logged in / log out" box in the corner of every page except login.
  function addSessionBar() {
    const user = getUser();
    if (onLoginPage() || !user) return;

    const bar = document.createElement('div');
    bar.style.cssText =
      'position:fixed;top:10px;right:14px;z-index:1000;display:flex;align-items:center;gap:10px;' +
      'padding:6px 10px;background:#fff;border:1px solid #d5ccc5;border-radius:8px;' +
      'font:13px Arial,sans-serif;color:#302b28;box-shadow:0 2px 8px #00000010;';

    const who = document.createElement('span');
    who.textContent = user.email;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Log out';
    button.style.cssText =
      'width:auto;margin:0;padding:5px 10px;border:1px solid #73594b;border-radius:6px;' +
      'background:#fff;color:#73594b;font-size:13px;cursor:pointer;';
    button.addEventListener('click', logout);

    bar.append(who, button);
    document.body.append(bar);
  }

  window.Auth = { getToken, getUser, saveSession, clearSession, logout };
  window.authFetch = authFetch;

  // A page that needs a login is not shown to someone who has none.
  if (!onLoginPage() && !getToken()) {
    goToLogin();
  }
  document.addEventListener('DOMContentLoaded', addSessionBar);
})();