// ═══ Auth UI (js/auth.js) ═══
// Login / Register modal + session management.

window.AuthUI = (() => {
  let _modal = null;

  // ── Segurança: escapa HTML antes de injetar em innerHTML ───────────────
  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────
  function init() {
    _injectModal();
    _bindEvents();
    _updateTopBar();

    // Re-check on login/logout events
    window.addEventListener('api:login',  () => _updateTopBar());
    window.addEventListener('api:logout', () => { _updateTopBar(); _showModal('login'); });
  }

  // ── Inject modal HTML ──────────────────────────────────────────────────
  function _injectModal() {
    const el = document.createElement('div');
    el.id = 'authModal';
    el.className = 'auth-modal-overlay hidden';
    el.innerHTML = `
      <div class="auth-modal-box" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
        <div class="auth-modal-tabs">
          <button class="auth-tab active" data-tab="login">Entrar</button>
          <button class="auth-tab" data-tab="register">Criar Conta</button>
        </div>

        <!-- LOGIN -->
        <form id="authLoginForm" class="auth-form">
          <h2 id="authModalTitle" class="auth-title">Industrial Pipeline</h2>
          <p class="auth-sub">Entre para salvar seu progresso na nuvem.</p>
          <label class="auth-label">
            Email ou usuário
            <input class="auth-input" type="text" name="emailOrUsername" required autocomplete="username">
          </label>
          <label class="auth-label">
            Senha
            <input class="auth-input" type="password" name="password" required autocomplete="current-password">
          </label>
          <div class="auth-error" id="loginError"></div>
          <button class="auth-submit" type="submit">Entrar</button>
          <button class="auth-guest" type="button" onclick="AuthUI.playGuest()">Jogar sem conta →</button>
        </form>

        <!-- REGISTER -->
        <form id="authRegisterForm" class="auth-form hidden">
          <h2 class="auth-title">Criar Conta</h2>
          <p class="auth-sub">Seus saves ficam seguros no servidor.</p>
          <label class="auth-label">
            Usuário <span class="auth-hint">(3–24 chars, letras/números/_/-)</span>
            <input class="auth-input" type="text" name="username" required minlength="3" maxlength="24" autocomplete="username">
          </label>
          <label class="auth-label">
            Email
            <input class="auth-input" type="email" name="email" required autocomplete="email">
          </label>
          <label class="auth-label">
            Senha <span class="auth-hint">(mín. 8 chars)</span>
            <input class="auth-input" type="password" name="password" required minlength="8" autocomplete="new-password">
          </label>
          <div class="auth-error" id="registerError"></div>
          <button class="auth-submit" type="submit">Criar Conta</button>
          <button class="auth-guest" type="button" onclick="AuthUI.playGuest()">Jogar sem conta →</button>
        </form>
      </div>
    `;
    document.body.appendChild(el);
    _modal = el;
  }

  // ── Bind events ────────────────────────────────────────────────────────
  function _bindEvents() {
    // Tab switching
    _modal.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _modal.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _modal.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        const target = tab.dataset.tab === 'login' ? 'authLoginForm' : 'authRegisterForm';
        document.getElementById(target).classList.remove('hidden');
      });
    });

    // Login submit
    document.getElementById('authLoginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const errEl = document.getElementById('loginError');
      errEl.textContent = '';
      const btn = e.target.querySelector('.auth-submit');
      btn.disabled = true;
      btn.textContent = 'Entrando…';
      try {
        await API.login(fd.get('emailOrUsername'), fd.get('password'));
        _hideModal();
        _showToast('✅ Login realizado!');
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    });

    // Register submit
    document.getElementById('authRegisterForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const errEl = document.getElementById('registerError');
      errEl.textContent = '';
      const btn = e.target.querySelector('.auth-submit');
      btn.disabled = true;
      btn.textContent = 'Criando…';
      try {
        await API.register(fd.get('username'), fd.get('email'), fd.get('password'));
        _hideModal();
        _showToast('🎉 Conta criada! Bem-vindo!');
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Criar Conta';
      }
    });
  }

  // ── Top bar user widget ────────────────────────────────────────────────
  function _updateTopBar() {
    const existing = document.getElementById('authTopWidget');
    if (existing) existing.remove();

    const topActions = document.querySelector('.top-bar-actions');
    if (!topActions) return;

    const widget = document.createElement('div');
    widget.id = 'authTopWidget';
    widget.style.cssText = 'display:flex;align-items:center;gap:6px;';

    if (API.isLoggedIn()) {
      const username = API.getUsername() || 'Jogador';
      widget.innerHTML = `
        <span style="font-size:11px;color:var(--text-secondary);padding:0 4px;">👤 ${username}</span>
        <button class="top-btn" onclick="AuthUI.openSaveMenu()" title="Saves">💾</button>
        <button class="top-btn" onclick="AuthUI.confirmLogout()" title="Sair" style="color:#f87171;">⏻</button>
      `;
    } else {
      widget.innerHTML = `
        <button class="top-btn" onclick="AuthUI.showModal('login')" style="color:#4ade80;border-color:#4ade80;">🔑 Login</button>
      `;
    }

    topActions.prepend(widget);
  }

  // ── Save menu (slot picker) ────────────────────────────────────────────
  async function openSaveMenu() {
    if (!API.isLoggedIn()) { _showModal('login'); return; }
    
    let saves = [];
    try { saves = await API.listSaves(); } catch { saves = []; }

    const slotsHtml = [1,2,3,4,5].map(slot => {
      const s = saves.find(s => s.slot === slot);
      return `
        <div class="save-slot" style="display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--border-primary);border-radius:8px;margin-bottom:6px;">
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:600;">Slot ${slot}: ${s ? _escHtml(s.name || 'Partida') : '— Vazio —'}</div>
            ${s ? `<div style="font-size:10px;color:var(--text-secondary);">Era ${s.era} · 💰${(s.gold||0).toLocaleString('pt-BR')} · ${_formatTime(s.playTime||0)}</div>` : ''}
          </div>
          <button onclick="AuthUI.saveToSlot(${slot})" class="top-btn" style="font-size:11px;" title="Salvar aqui">💾</button>
          ${s ? `<button onclick="AuthUI.loadFromSlot(${slot})" class="top-btn" style="font-size:11px;" title="Carregar">📂</button>` : ''}
          ${s ? `<button onclick="AuthUI.deleteSlot(${slot})" class="top-btn" style="font-size:11px;color:#f87171;" title="Apagar">🗑</button>` : ''}
        </div>`;
    }).join('');

    _showDialog('💾 Saves na Nuvem', slotsHtml);
  }

  async function saveToSlot(slot) {
    _closeDialog();
    try {
      const stateJson = JSON.stringify(_buildSavePayload());
      const name = `Partida ${slot} · Era ${window.gameState?.era ?? 0}`;
      const thumbnail = _captureThumbnail();
      await API.saveSave(slot, stateJson, name, thumbnail);
      _showToast(`✅ Salvo no slot ${slot}!`);
    } catch (err) {
      _showToast(`❌ ${err.message}`, 'error');
    }
  }

  async function loadFromSlot(slot) {
    _closeDialog();
    try {
      const save = await API.loadSave(slot);
      const state = JSON.parse(save.stateJson);
      _applyLoadedState(state);
      _showToast(`📂 Slot ${slot} carregado!`);
    } catch (err) {
      _showToast(`❌ ${err.message}`, 'error');
    }
  }

  async function deleteSlot(slot) {
    _closeDialog();
    try {
      await API.deleteSave(slot);
      _showToast(`🗑 Slot ${slot} apagado.`);
    } catch (err) {
      _showToast(`❌ ${err.message}`, 'error');
    }
  }

  function confirmLogout() {
    if (!confirm('Sair da conta? Saves locais não serão afetados.')) return;
    API.logout();
    _showToast('Logout realizado.');
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function _buildSavePayload() {
    // Delegate to existing saveGameState logic if available
    if (typeof buildSaveData === 'function') return buildSaveData();
    return window.gameState || {};
  }

  function _applyLoadedState(state) {
    // Delegate to existing loadGameState apply logic if available
    if (typeof applyLoadedState === 'function') { applyLoadedState(state); return; }
    Object.assign(window.gameState, state);
  }

  function _captureThumbnail() {
    try {
      const svg = document.querySelector('#industryCanvas svg, #industryCanvas');
      if (!svg) return null;
      const canvas = document.createElement('canvas');
      canvas.width = 120; canvas.height = 80;
      // Simple color fill as fallback (SVG → canvas needs CORS)
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, 120, 80);
      return canvas.toDataURL('image/png', 0.5);
    } catch { return null; }
  }

  function _formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m}m` : `${m}m`;
  }

  let _dialog = null;
  function _showDialog(title, html) {
    if (_dialog) _dialog.remove();
    _dialog = document.createElement('div');
    _dialog.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
    _dialog.innerHTML = `
      <div style="background:var(--bg-secondary);border:1px solid var(--border-primary);border-radius:12px;padding:20px;width:360px;max-height:80vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <strong>${title}</strong>
          <button onclick="AuthUI._closeDialog()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;">×</button>
        </div>
        ${html}
      </div>`;
    _dialog.addEventListener('click', e => { if (e.target === _dialog) _closeDialog(); });
    document.body.appendChild(_dialog);
  }

  function _closeDialog() { if (_dialog) { _dialog.remove(); _dialog = null; } }

  function _showToast(msg, type = 'success') {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99999;padding:10px 16px;border-radius:8px;font-size:13px;color:#fff;background:${type === 'error' ? '#ef4444' : '#22c55e'};box-shadow:0 4px 12px rgba(0,0,0,.4);transition:opacity .3s;`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
  }

  function _showModal(tab = 'login') {
    _modal?.classList.remove('hidden');
    const tabBtn = _modal?.querySelector(`.auth-tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.click();
  }

  function _hideModal() {
    _modal?.classList.add('hidden');
  }

  function showModal(tab) { _showModal(tab); }
  function playGuest() { _hideModal(); }

  return { init, showModal, playGuest, openSaveMenu, saveToSlot, loadFromSlot, deleteSlot, confirmLogout, _closeDialog };
})();
