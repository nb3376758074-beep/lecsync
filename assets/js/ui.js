/* ============ LecSync Web · shared UI kit (no cycles: screens import this) ============ */
import { $, el, I, L, toast, langName, LANGS } from './core.js?v=1.9.0';

export const nav = (p, { replace = false } = {}) => { replace ? location.replace('#' + p) : (location.hash = p); };
export const path = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];
export const query = () => Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));

export const viewEl = () => $('#view');
export function mount(node, { keepScroll = false } = {}) {
  const v = viewEl();
  v.innerHTML = ''; v.append(node);
  if (!keepScroll) v.scrollTop = 0;
}

export function header({ title, sub, back, actions = [], bordered = false }) {
  const h = el('header', { class: 'hdr' + (bordered ? ' bordered' : '') });
  if (back) {
    h.append(el('button', {
      class: 'iconbtn', html: I.back, 'aria-label': 'back',
      onClick: () => (typeof back === 'function' ? back() : (history.length > 1 ? history.back() : nav('/'))),
    }));
  }
  h.append(el('div', { class: 'h-title', html: `${title || ''}${sub ? `<small>${sub}</small>` : ''}` }));
  if (actions.length) {
    const act = el('div', { class: 'hdr-actions' });
    actions.forEach(a => act.append(el('button', {
      class: 'iconbtn', html: a.icon || '', title: a.label || '', 'aria-label': a.label || '', onClick: a.onClick,
    })));
    h.append(act);
  }
  return h;
}

let sheetStack = [];
export function sheet({ title, body, onClose, actions, keepOpenOnAction = false }) {
  const close = () => {
    scrim.remove(); panel.remove();
    sheetStack = sheetStack.filter(s => s.panel !== panel);
    onClose && onClose();
  };
  const scrim = el('div', { class: 'scrim', onClick: close });
  const panel = el('div', { class: 'sheet' }, el('div', { class: 'grab' }));
  if (title) panel.append(el('h3', { text: title }));
  if (typeof body === 'string') panel.append(el('div', { html: body }));
  else if (body) panel.append(body);
  if (actions) {
    const row = el('div', { class: 'stack sm', style: 'margin-top:14px' });
    actions.forEach(a => row.append(el('button', {
      class: 'btn block ' + (a.kind || ''), text: a.label,
      onClick: () => { if (a.onClick) a.onClick(); if (!a.keepOpen) close(); },
    })));
    panel.append(row);
  }
  document.body.append(scrim, panel);
  sheetStack.push({ panel, close });
  return { close, panel };
}
export const closeTopSheet = () => sheetStack[sheetStack.length - 1]?.close();

/* 强制重绘当前路由（location.hash = location.hash 不会触发 hashchange） */
export const refresh = () => {
  if (typeof window.__lcsRerender === 'function') window.__lcsRerender();
  else location.reload();
};

export function confirmBox({ title, message, confirmLabel, danger }) {
  return new Promise(res => {
    const scrim = el('div', { class: 'scrim', style: 'z-index:89' });
    const box = el('div', { class: 'modal' },
      el('div', { class: 'box stack' },
        el('div', { class: 'stack sm' },
          el('div', { style: 'font-size:17px;font-weight:680', text: title || L.t('confirm') }),
          message ? el('div', { class: 'small muted', text: message }) : null),
        el('div', { class: 'row', style: 'gap:8px;margin-top:8px' },
          el('button', { class: 'btn grow', text: L.t('cancel'), onClick: () => { scrim.remove(); host.remove(); res(false); } }),
          el('button', {
            class: 'btn grow ' + (danger ? 'danger' : 'primary'), text: confirmLabel || L.t('confirm'),
            onClick: () => { scrim.remove(); host.remove(); res(true); },
          }))));
    const host = el('div', { style: 'position:fixed;inset:0;z-index:90' }, box);
    document.body.append(scrim, host);
  });
}

export function promptBox({ title, value = '', placeholder = '', multiline = false, confirmLabel }) {
  return new Promise(res => {
    const scrim = el('div', { class: 'scrim', style: 'z-index:89' });
    const input = multiline
      ? el('textarea', { class: 'input', placeholder, rows: 5 })
      : el('input', { class: 'input', placeholder });
    input.value = value;
    const done = ok => { scrim.remove(); host.remove(); res(ok ? input.value.trim() : null); };
    const host = el('div', { class: 'modal', style: 'z-index:90' },
      el('div', { class: 'box stack' },
        el('div', { style: 'font-size:17px;font-weight:680', text: title }),
        input,
        el('div', { class: 'row', style: 'gap:8px' },
          el('button', { class: 'btn grow', text: L.t('cancel'), onClick: () => done(false) }),
          el('button', { class: 'btn primary grow', text: confirmLabel || L.t('confirm'), onClick: () => done(true) }))));
    document.body.append(scrim, host);
    setTimeout(() => input.focus(), 60);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !multiline) done(true); });
  });
}

export function pickLanguage({ value, onPick, title }) {
  const list = el('div', { class: 'list', style: 'max-height:58dvh;overflow:auto' });
  const search = el('input', {
    class: 'input', placeholder: L.t('searchAll'), style: 'margin-bottom:10px',
    onInput: e => {
      const q = e.target.value.toLowerCase();
      [...list.children].forEach(c => { c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    },
  });
  LANGS.forEach(([code]) => {
    list.append(el('button', {
      class: 'item', onClick: () => { s.close(); onPick(code); },
      html: `<div class="grow"><div class="t">${langName(code, L.lang)}</div><div class="s">${code}</div></div>` +
        (code === value ? `<span class="chev" style="color:var(--ok)">${I.check}</span>` : ''),
    }));
  });
  const s = sheet({ title: title || L.t('selectLang'), body: el('div', {}, search, list) });
  return s;
}

export async function shareText(text, title = 'LecSync') {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return true; } catch { return false; }
  }
  return copyText(text);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(L.t('copied')); }
  catch {
    const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text;
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(L.t('copied'));
  }
}

export function emptyState(icon, title, sub, action) {
  return el('div', { class: 'empty' },
    el('div', { html: icon }),
    el('div', { class: 't', text: title }),
    sub ? el('div', { class: 's', text: sub }) : null,
    action || null);
}

export function setTabState(tab, { recording = false } = {}) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  const showTab = !!tab;
  viewEl()?.classList.toggle('no-tab', !showTab);
  $('.tabbar')?.classList.toggle('hidden', !showTab);
  const dot = $('.tab[data-tab="record"] .dotwrap');
  if (dot) dot.classList.toggle('on', recording);
}
