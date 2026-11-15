/* ============ LecSync Web · router & boot ============ */
import { $, el, I, L, store } from './core.js?v=1.8.0';
import { nav, path, mount, setTabState, viewEl } from './ui.js?v=1.8.0';
import * as Record from './screen-record.js?v=1.8.0';
import * as Session from './screen-session.js?v=1.8.0';
import * as Library from './screen-library.js?v=1.8.0';
import * as Me from './screen-me.js?v=1.8.0';
import * as Tools from './screen-tools.js?v=1.8.0';

const routes = [
  { re: /^\/$/, render: Record.render, tab: 'record' },
  { re: /^\/session\/([\w-]+)$/, render: Session.render, keys: ['id'] },
  { re: /^\/folders$/, render: Library.folders, tab: 'folders' },
  { re: /^\/folder\/([\w-]+)$/, render: Library.folder, tab: 'folders', keys: ['id'] },
  { re: /^\/chats$/, render: Library.chats, tab: 'chat' },
  { re: /^\/chat\/([\w-]+)$/, render: Library.chat, tab: 'chat', keys: ['id'] },
  { re: /^\/me$/, render: Me.profile, tab: 'me' },
  { re: /^\/settings$/, render: Me.settings },
  { re: /^\/settings\/(\w+)$/, render: Me.settingsSub, keys: ['sub'] },
  { re: /^\/pro$/, render: Me.pro },
  { re: /^\/trash$/, render: Library.trash },
  { re: /^\/search$/, render: Library.search },
  { re: /^\/team$/, render: Me.team },
  { re: /^\/invite$/, render: Me.invite },
  { re: /^\/redeem$/, render: Me.redeem },
  { re: /^\/shared$/, render: Library.shared },
  { re: /^\/voice$/, render: Me.voice },
  { re: /^\/models$/, render: Me.models },
  { re: /^\/privacy$/, render: Me.privacy },
  { re: /^\/about$/, render: Me.about },
  { re: /^\/upload$/, render: Tools.upload },
  { re: /^\/translate$/, render: Tools.translate },
  { re: /^\/dictation$/, render: Tools.dictation },
  { re: /^\/dictation\/words$/, render: Tools.dictationWords },
  { re: /^\/auth$/, render: Me.auth },
];

let current = '', cleanup = null, routeSeq = 0;
export const setCleanup = fn => { cleanup = fn; };
export function clearCleanup() { if (typeof cleanup === 'function') { try { cleanup(); } catch {} } cleanup = null; }

async function route() {
  const p = path();
  const my = ++routeSeq;
  current = p;
  clearCleanup();
  let hit = null, m = null;
  for (const r of routes) { m = p.match(r.re); if (m) { hit = r; break; } }
  if (!hit) { nav('/', { replace: true }); return; }
  const params = {};
  (hit.keys || []).forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));

  setTabState(hit.tab || null, { recording: Record.isRecording() });
  let res = null;
  try {
    res = await hit.render(params, { mount, nav, params });
  } catch (e) {
    console.error('[route]', p, e);
    res = { node: el('div', { style: 'padding:24px' },
      el('div', { class: 'card' },
        el('div', { style: 'font-weight:700;margin-bottom:6px', text: '这个页面出错了' }),
        el('div', { class: 'tiny dim mono', style: 'white-space:pre-wrap', text: String(e && (e.stack || e.message) || e).slice(0, 700) }),
        el('button', { class: 'btn sm ghost', style: 'margin-top:12px', text: '回首页', onClick: () => nav('/') }))) };
  }
  if (my !== routeSeq) return; // a newer navigation won
  if (res && res.node) mount(res.node);
  document.title = (res && res.title ? res.title + ' · ' : '') + L.t('appName');
  setTabState(hit.tab || null, { recording: Record.isRecording() });
}

export function tabbar() {
  const mk = (id, label, icon, onClick) => el('button', {
    class: 'tab', dataset: { tab: id }, onClick,
    html: (id === 'record'
      ? `<span class="dotwrap">${icon}<i class="dot"></i></span>`
      : icon) + `<span>${label}</span>`,
  });
  return el('nav', { class: 'tabbar' },
    mk('record', L.t('tabRecord'), I.mic, () => nav('/')),
    mk('folders', L.t('tabFolders'), I.folder, () => nav('/folders')),
    mk('chat', L.t('tabChat'), I.chat, () => nav('/chats')),
    mk('me', L.t('tabProfile'), I.user, () => nav('/me')));
}

export function boot() {
  document.documentElement.dataset.theme = store.settings.theme || 'auto';
  L.set(store.settings.uiLang || 'zh');
  document.documentElement.lang = L.isZh ? 'zh-CN' : 'en';

  const app = $('#app');
  app.innerHTML = '';
  app.append(el('main', { class: 'view', id: 'view' }), tabbar());
  window.addEventListener('hashchange', route);
  window.__lcsRerender = () => route();
  if (!location.hash) history.replaceState(null, '', '#/');
  route();

  if (!store.settings.seenOnboarding) {
    import('./screen-onboard.js?v=1.8.0').then(m => m.show());
  }
  // iOS hint once
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !standalone && !store.settings.iosTipDismissed) {
    setTimeout(() => {
      import('./ui.js?v=1.8.0').then(({ sheet }) => {
        const s = sheet({
          title: '装到主屏幕（30 秒）',
          body: `<div class="stack">
            <div class="small muted">1. 点 Safari 底部「分享」<b>⬆️</b></div>
            <div class="small muted">2. 选「添加到主屏幕」→「添加」</div>
            <div class="small muted">3. 桌面点「LecSync」图标，全屏使用、可离线打开</div>
            <div class="small dim">微信 / QQ 内置浏览器不支持，请用 Safari 打开。</div>
          </div>`,
          actions: [{
            label: '知道了', kind: 'primary',
            onClick: () => { store.settings.iosTipDismissed = true; store.save(); s.close(); },
          }],
        });
      });
    }, 1400);
  }
  // keyboard shortcuts (desktop testing)
  document.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    if (e.key === 'Escape') import('./ui.js?v=1.8.0').then(m => m.closeTopSheet());
  });
}
