// ═══ API Client (js/api.js) ═══
// Thin fetch wrapper for Industrial Pipeline backend.
// Handles JWT access tokens + automatic refresh rotation.

window.API = (() => {
  const BASE = '/api';

  // ── Token storage ──────────────────────────────────────────────────────
  let _accessToken = localStorage.getItem('ip_access_token') || null;
  let _refreshToken = localStorage.getItem('ip_refresh_token') || null;
  let _refreshPromise = null;

  function setTokens({ accessToken, refreshToken }) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    localStorage.setItem('ip_access_token', accessToken);
    localStorage.setItem('ip_refresh_token', refreshToken);
  }

  function clearTokens() {
    _accessToken = null;
    _refreshToken = null;
    localStorage.removeItem('ip_access_token');
    localStorage.removeItem('ip_refresh_token');
  }

  function isLoggedIn() {
    return !!_accessToken;
  }

  function getUsername() {
    if (!_accessToken) return null;
    try {
      const payload = JSON.parse(atob(_accessToken.split('.')[1]));
      return payload.username || null;
    } catch {
      return null;
    }
  }

  // ── Core fetch with auto-refresh ───────────────────────────────────────
  async function _fetch(path, options = {}, retry = true) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (res.status === 401 && retry && _refreshToken) {
      // Try to refresh once
      if (!_refreshPromise) {
        _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
      }
      const ok = await _refreshPromise;
      if (ok) return _fetch(path, options, false);
      clearTokens();
      window.dispatchEvent(new CustomEvent('api:logout'));
      throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body.error || 'Erro desconhecido.');
    return body;
  }

  async function _doRefresh() {
    if (!_refreshToken) return false;
    try {
      const data = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: _refreshToken }),
      }).then(r => r.json());
      if (data.ok) { setTokens(data.data); return true; }
      return false;
    } catch { return false; }
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  async function register(username, email, password) {
    const res = await _fetch('/auth/register', {
      method: 'POST', body: JSON.stringify({ username, email, password }),
    });
    setTokens(res.data);
    window.dispatchEvent(new CustomEvent('api:login', { detail: { username } }));
    return res.data;
  }

  async function login(emailOrUsername, password) {
    const res = await _fetch('/auth/login', {
      method: 'POST', body: JSON.stringify({ emailOrUsername, password }),
    });
    setTokens(res.data);
    window.dispatchEvent(new CustomEvent('api:login', { detail: { username: getUsername() } }));
    return res.data;
  }

  async function logout() {
    try {
      await _fetch('/auth/logout', {
        method: 'POST', body: JSON.stringify({ refreshToken: _refreshToken }),
      });
    } catch { /* best-effort */ }
    clearTokens();
    window.dispatchEvent(new CustomEvent('api:logout'));
  }

  async function me() {
    return (await _fetch('/auth/me')).data;
  }

  // ── Saves ──────────────────────────────────────────────────────────────
  async function listSaves() {
    return (await _fetch('/saves')).data;
  }

  async function loadSave(slot) {
    return (await _fetch(`/saves/${slot}`)).data;
  }

  async function saveSave(slot, stateJson, name, thumbnail) {
    return (await _fetch(`/saves/${slot}`, {
      method: 'POST',
      body: JSON.stringify({ stateJson, name, thumbnail }),
    })).data;
  }

  async function deleteSave(slot) {
    return (await _fetch(`/saves/${slot}`, { method: 'DELETE' }));
  }

  // ── Leaderboard ────────────────────────────────────────────────────────
  async function getLeaderboard(limit = 100) {
    return (await _fetch(`/leaderboard?limit=${limit}`)).data;
  }

  async function getMyRank() {
    return (await _fetch('/leaderboard/me')).data;
  }

  // ── Health ─────────────────────────────────────────────────────────────
  async function health() {
    return (await _fetch('/health')).ok;
  }

  return {
    isLoggedIn, getUsername, clearTokens,
    register, login, logout, me,
    listSaves, loadSave, saveSave, deleteSave,
    getLeaderboard, getMyRank,
    health,
  };
})();

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
window.ApiError = ApiError;
