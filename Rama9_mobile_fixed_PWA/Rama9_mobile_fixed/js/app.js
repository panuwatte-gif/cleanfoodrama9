/* ============================================================
   app.js — Orchestrator: boot · login · shell · router
   ============================================================ */
import { state, notify, subscribe } from './state.js';
import { hydrate, persist } from './storage.js';
import { currentUser, login, logout, visiblePages, canAccess, PAGES, ROLES } from './auth.js';
import { icon } from './icons.js';
import { esc } from './components.js';

// ---- page modules ----
import dashboard from './pages/dashboard.js';
import mytasks from './pages/mytasks.js';
import stock from './pages/stock.js';
import capture from './pages/capture.js';
import revenue from './pages/revenue.js';
import attendance from './pages/attendance.js';
import recipe from './pages/recipe.js';
import simulator from './pages/simulator.js';
import users from './pages/users.js';
import control from './pages/control.js';
import receiving from './pages/receiving.js';
import handbook from './pages/handbook.js';
import music from './pages/music.js';

const PAGE_MODULES = { dashboard, mytasks, stock, capture, revenue, attendance, recipe, simulator, users, control, receiving, handbook, music };

const root = document.getElementById('app');

/* ---------- ROUTER ---------- */
function currentPage() {
  const h = (location.hash || '#dashboard').slice(1);
  return PAGE_MODULES[h] ? h : 'dashboard';
}
function navigate(pageId) {
  if (location.hash.slice(1) === pageId) renderApp();
  else location.hash = pageId; // triggers hashchange → renderApp
}
function refresh() { renderApp(); }

const ctx = { state, navigate, refresh };

/* ---------- LOGIN ---------- */
let selectedUser = null, loginErr = '';
function renderLogin() {
  root.innerHTML = `<div class="login-wrap">
    <div class="login-card">
      <img class="login-logo" src="assets/logo-kaphrao-clean.png" alt="logo">
      <h1>${esc(state.config.brand.companyName)}</h1>
      <div class="sub">ระบบจัดการหลังบ้าน · สาขาพระราม 9</div>
      <div class="login-users">
        ${state.db.users.map((u) => `<div class="login-user ${selectedUser === u.id ? 'sel' : ''}" data-u="${u.id}">
          <div class="ava">${u.avatar}</div><div class="nm">${esc(u.name)}</div><div class="rl">${ROLES[u.role].label}</div>
        </div>`).join('')}
      </div>
      <div class="pin-row">
        <input class="pin-input" id="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" ${selectedUser ? '' : 'disabled'}>
        <button class="btn btn-primary" id="login-btn" style="padding:0 22px" ${selectedUser ? '' : 'disabled'}>${icon('chevronRight', 22)}</button>
      </div>
      <div class="login-err">${esc(loginErr)}</div>
      <div class="login-hint">เดโม่: แตะเลือกผู้ใช้ แล้วใส่ PIN<br>แชมป์ 2425 · เหมยลี่ 9596 · ซู 1234 · ออม 9999 · User1 1111 · User2 2222</div>
    </div>
  </div>`;

  root.querySelectorAll('[data-u]').forEach((el) => el.addEventListener('click', () => {
    selectedUser = el.dataset.u; loginErr = ''; renderLogin();
    setTimeout(() => document.getElementById('pin')?.focus(), 30);
  }));
  const doLogin = () => {
    const pin = document.getElementById('pin').value;
    const res = login(selectedUser, pin);
    if (res.ok) { loginErr = ''; location.hash = 'dashboard'; renderApp(); }
    else { loginErr = res.error; renderLogin(); }
  };
  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  document.getElementById('pin')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
}

/* ---------- SHELL ---------- */
function renderSidebar() {
  const u = currentUser();
  const pages = visiblePages();
  const groups = [...new Set(pages.map((p) => p.group))];
  const active = currentPage();
  const r = ROLES[u.role];

  const nav = groups.map((g) => `<div class="sb-group">
    <div class="sb-group-label">${esc(g)}</div>
    ${pages.filter((p) => p.group === g).map((p) => `<div class="sb-item ${p.id === active ? 'active' : ''}" data-nav="${p.id}">
      ${icon(p.icon, 21)}<span class="lbl">${esc(p.label)}</span>${p.fn ? `<span class="fn-tag">${p.fn}</span>` : ''}
    </div>`).join('')}
  </div>`).join('');

  return `<aside class="sidebar">
    <div class="sb-brand"><img src="assets/logo-kaphrao-clean.png" alt=""><div class="bt"><div class="n">${esc(state.config.brand.appName)}</div><div class="s">สาขาพระราม 9</div></div></div>
    <nav class="sb-nav">${nav}</nav>
    <div class="sb-foot">
      <div class="sb-userchip"><div class="ava">${u.avatar}</div><div class="ut"><div class="n">${esc(u.name)}</div></div></div>
      <button class="sb-logout" id="logout-btn">${icon('logout', 18)}<span class="logout-txt">ออกจากระบบ</span></button>
    </div>
  </aside>`;
}

function renderTopbar() {
  const p = PAGES.find((x) => x.id === currentPage());
  const ann = state.db.announcements.find((a) => a.active);
  return `<header class="topbar">
    <button class="burger" id="burger">${icon('sliders', 20)}</button>
    <div><div class="pg-title">${esc(p?.label || '')}</div>${p?.fn ? `<div class="pg-sub">ฟังก์ชัน ${p.fn}</div>` : ''}</div>
    <div class="topbar-search">${icon('search', 18)}<input placeholder="ค้นหา…"></div>
    <button class="topbar-ico" title="แจ้งเตือน">${icon('bell', 20)}<span class="badge">3</span></button>
  </header>
  ${ann ? `<div class="marquee"><div class="marquee-inner">${icon('megaphone', 18)} ${esc(ann.text)} &nbsp;•&nbsp; ${icon('megaphone', 18)} ${esc(ann.text)}</div></div>` : ''}`;
}

function renderApp() {
  if (!currentUser()) { renderLogin(); return; }
  const pageId = currentPage();
  if (!canAccess(pageId)) { location.hash = 'dashboard'; }
  const mod = PAGE_MODULES[currentPage()];

  root.innerHTML = `<div class="app ${state.ui.sidebarCollapsed ? 'collapsed' : ''}" id="shell">
    ${renderSidebar()}
    <div class="main">${renderTopbar()}<div class="content" id="content"></div></div>
    ${renderTabbar()}
  </div>`;

  document.getElementById('content').innerHTML = mod.render(ctx);
  if (mod.mount) mod.mount(ctx);

  // iOS Safari sometimes fails to paint freshly-replaced content beneath fixed bars —
  // nudge a composite/repaint over two frames so the new page always shows.
  const _c = document.getElementById('content');
  _c.scrollTop = 0;
  requestAnimationFrame(() => { _c.style.transform = 'translateZ(0)'; requestAnimationFrame(() => { _c.style.transform = ''; }); });

  // close the mobile drawer when tapping the dimmed overlay
  document.getElementById('shell').addEventListener('click', (e) => {
    if (e.target.id === 'shell') document.getElementById('shell').classList.remove('mobile-open');
  });
  // mobile bottom tab bar
  document.querySelectorAll('[data-tab]').forEach((el) => el.addEventListener('click', () => {
    const t = el.dataset.tab;
    const shell = document.getElementById('shell');
    if (t === 'more') { shell.classList.toggle('mobile-open'); return; }
    shell.classList.remove('mobile-open');
    navigate(t);
  }));

  // wire shell events
  root.querySelectorAll('.sidebar [data-nav]').forEach((el) => el.addEventListener('click', () => {
    if (window.innerWidth <= 860) document.getElementById('shell').classList.remove('mobile-open');
    navigate(el.dataset.nav);
  }));
  document.getElementById('logout-btn')?.addEventListener('click', () => { logout(); location.hash = ''; renderLogin(); });
  document.getElementById('burger')?.addEventListener('click', () => {
    if (window.innerWidth <= 860) document.getElementById('shell').classList.toggle('mobile-open');
    else { state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed; persist(); renderApp(); }
  });
  // global data-nav inside content (quick actions etc.)
  document.getElementById('content').querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.nav)));
}

/* ---------- MOBILE BOTTOM TAB BAR ---------- */
function renderTabbar() {
  const active = currentPage();
  const tabs = [
    { id: 'dashboard', label: 'หน้าแรก', icon: 'dashboard' },
    { id: 'stock',     label: 'สต็อก',   icon: 'boxes' },
    { id: 'capture',   label: 'ถ่ายภาพ', icon: 'camera' },
    { id: 'receiving', label: 'รับของ',  icon: 'truck' },
    { id: 'more',      label: 'เพิ่มเติม', icon: 'sliders' },
  ].filter((t) => t.id === 'more' || canAccess(t.id));
  return `<nav class="tabbar-m">${tabs.map((t) => `
    <button class="tab-m ${t.id === active ? 'active' : ''}" data-tab="${t.id}">
      ${icon(t.icon, 21)}<span>${esc(t.label)}</span>
    </button>`).join('')}</nav>`;
}

/* ---------- BOOT ---------- */
hydrate();
window.addEventListener('hashchange', renderApp);
subscribe(() => renderApp());
renderApp();
