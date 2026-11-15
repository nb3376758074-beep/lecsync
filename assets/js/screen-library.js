/* ============ screens: Folders, Chats, Trash, Search, Shared ============ */
import { el, I, L, store, toast, fmtAgo, fmtDate, fmtClock, uid, langName } from './core.js';
import { header, nav, sheet, confirmBox, promptBox, emptyState, shareText } from './ui.js';
import { sessionItem } from './screen-record.js';
import { askAI, llmReady, localAnswer } from './ai.js';

const rl = () => import('./screen-library.js'); // self (for re-render)
function rerender() {
  import('./app.js').then(() => { location.hash = location.hash; });
}

/* ---------------- Folders ---------------- */
export async function folders() {
  const root = el('div', {});
  root.append(header({
    title: L.t('tabFolders'),
    actions: [
      { icon: I.search, label: 'search', onClick: () => nav('/search') },
      { icon: I.plus, label: 'new', onClick: () => newFolder() },
    ],
  }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  const fl = store.data.folders;
  body.append(el('div', { class: 'row between', style: 'margin:8px 0 8px' },
    el('div', { class: 'small', style: 'font-weight:680', text: L.t('folders') }),
    el('button', { class: 'tiny dim', text: L.t('newFolder') + ' +', onClick: () => newFolder() })));

  if (!fl.length) {
    body.append(el('div', { class: 'card flat center', style: 'padding:20px' },
      el('div', { class: 'small muted', text: L.t('noFolders') }),
      el('button', { class: 'btn sm ghost', style: 'margin-top:10px', text: L.t('newFolder'), onClick: () => newFolder() })));
  } else {
    const grid = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' });
    fl.forEach(f => {
      const count = store.sessions.filter(s => s.folderId === f.id).length;
      grid.append(el('button', { class: 'card', style: 'text-align:left;padding:14px', onClick: () => nav('/folder/' + f.id) },
        el('div', { class: 'row between' },
          el('span', { html: I.folder, style: 'display:grid;color:var(--text-2)' }),
          el('button', {
            class: 'tiny dim', text: '⋯', onClick: e => { e.stopPropagation(); folderMenu(f); },
          })),
        el('div', { style: 'font-size:14.5px;font-weight:620;margin-top:10px', text: f.name }),
        el('div', { class: 'tiny dim', text: `${count} ${L.t('sessions')}` })));
    });
    body.append(grid);
  }

  // all sessions
  const all = store.sessions;
  body.append(el('div', { class: 'row between', style: 'margin:24px 0 8px' },
    el('div', { class: 'small', style: 'font-weight:680', text: L.t('allSessions') }),
    el('button', {
      class: 'tiny dim', text: L.t('trash'), onClick: () => nav('/trash'),
    })));

  if (!all.length) {
    body.append(emptyState(I.wave, L.t('noSessions'), L.t('noSessionsSub'), el('button', {
      class: 'btn primary', text: L.t('startRecording'), onClick: () => nav('/'),
    })));
  } else {
    const groups = groupByDay(all);
    for (const [label, items] of groups) {
      body.append(el('div', { class: 'tiny dim', style: 'margin:12px 0 6px;font-weight:640', text: label }));
      const list = el('div', { class: 'list' });
      items.forEach(s => {
        const row = sessionItem(s);
        row.append(el('button', {
          class: 'tiny dim', style: 'padding:6px', text: '⋯',
          onClick: e => { e.stopPropagation(); sessionMenu(s); },
        }));
        list.append(row);
      });
      body.append(list);
    }
  }
  return { node: root, title: L.t('tabFolders') };
}

function groupByDay(list) {
  const out = new Map();
  const day = 86400000;
  list.forEach(s => {
    const d = new Date(s.createdAt); d.setHours(0, 0, 0, 0);
    const diff = Math.round((Date.now() - d.getTime()) / day);
    const label = diff <= 0 ? L.t('today') : diff === 1 ? (L.isZh ? '昨天' : 'Yesterday') :
      diff < 7 ? (L.isZh ? `${diff} 天前` : `${diff} days ago`) : fmtDate(s.createdAt);
    if (!out.has(label)) out.set(label, []);
    out.get(label).push(s);
  });
  return [...out.entries()];
}

function newFolder() {
  promptBox({ title: L.t('newFolder'), placeholder: L.t('folderName'), confirmLabel: L.t('confirm') }).then(name => {
    if (!name) return;
    store.addFolder(name);
    toast(L.t('saved'));
    rerender();
  });
}
function folderMenu(f) {
  const sh = sheet({
    title: f.name,
    actions: [
      {
        label: L.t('rename'), onClick: async () => {
          const name = await promptBox({ title: L.t('rename'), value: f.name });
          if (name) { store.updateFolder(f.id, { name }); rerender(); }
        },
      },
      {
        label: L.t('delete'), kind: 'danger', onClick: async () => {
          if (await confirmBox({ title: L.t('delete'), message: f.name, danger: true, confirmLabel: L.t('delete') })) {
            store.deleteFolder(f.id); rerender();
          }
        },
      },
    ],
  });
}
function sessionMenu(s) {
  const sh = sheet({
    title: s.title || L.t('session'),
    actions: [
      { label: L.t('rename'), onClick: async () => { const n = await promptBox({ title: L.t('sessionTitle'), value: s.title }); if (n) { store.updateSession(s.id, { title: n }); rerender(); } } },
      { label: L.t('moveTo'), onClick: () => moveToOne(s) },
      { label: L.t('moveToTrash'), kind: 'danger', onClick: async () => { if (await confirmBox({ title: L.t('moveToTrash'), message: s.title, danger: true, confirmLabel: L.t('delete') })) { store.deleteSession(s.id); rerender(); } } },
    ],
  });
}
function moveToOne(s) {
  const list = el('div', { class: 'list' });
  const sh = sheet({
    title: L.t('moveTo'),
    body: (() => {
      list.append(el('button', {
        class: 'item', onClick: () => { store.updateSession(s.id, { folderId: null }); sh.close(); rerender(); },
        html: `<div class="ico">${I.archive}</div><div class="grow"><div class="t">${L.t('allSessions')}</div></div>`,
      }));
      store.data.folders.forEach(f => list.append(el('button', {
        class: 'item', onClick: () => { store.updateSession(s.id, { folderId: f.id }); sh.close(); rerender(); },
        html: `<div class="ico">${I.folder}</div><div class="grow"><div class="t">${f.name}</div></div>`,
      })));
      return list;
    })(),
  });
}

/* ---------------- Folder detail ---------------- */
export async function folder({ id }) {
  const f = store.data.folders.find(x => x.id === id);
  if (!f) { nav('/folders', { replace: true }); return { node: el('div') }; }
  const items = store.sessions.filter(s => s.folderId === id);
  const root = el('div', {});
  root.append(header({
    title: f.name, sub: `${items.length} ${L.t('sessions')}`, back: () => nav('/folders'),
    actions: [{ icon: I.more, label: 'more', onClick: () => folderMenu(f) }],
  }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  if (!items.length) {
    body.append(emptyState(I.folder, L.t('folderEmpty'), '在会话的「⋯」里可以把它移动到这个文件夹。'));
  } else {
    const list = el('div', { class: 'list', style: 'margin-top:10px' });
    items.forEach(s => {
      const row = sessionItem(s);
      row.append(el('button', { class: 'tiny dim', style: 'padding:6px', text: '⋯', onClick: e => { e.stopPropagation(); sessionMenu(s); } }));
      list.append(row);
    });
    body.append(list);
  }
  return { node: root, title: f.name };
}

/* ---------------- Chats ---------------- */
export async function chats() {
  const root = el('div', {});
  root.append(header({
    title: L.t('tabChat'),
    actions: [{ icon: I.plus, label: 'new', onClick: () => newChat() }],
  }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  body.append(el('div', { class: 'card flat', style: 'margin-top:8px' },
    el('div', { class: 'row', style: 'gap:10px' },
      el('span', { html: I.sparkle, style: 'display:grid' }),
      el('div', { class: 'grow' },
        el('div', { class: 'small', style: 'font-weight:640', text: llmReady() ? L.t('aiModelOn') : L.t('aiLocal') }),
        el('div', { class: 'tiny dim', text: llmReady() ? '已接入大模型，回答基于你的录音与文件' : '本地检索模式；在设置里填 Key 可升级为大模型' })))));

  const list = store.data.chats;
  if (!list.length) {
    body.append(emptyState(I.chat, L.t('chatEmpty'), L.t('chatIntro'), el('button', { class: 'btn primary', text: L.t('newChat'), onClick: () => newChat() })));
  } else {
    const box = el('div', { class: 'list', style: 'margin-top:14px' });
    list.forEach(c => {
      const last = c.messages?.[c.messages.length - 1]?.content || '';
      box.append(el('button', { class: 'item', onClick: () => nav('/chat/' + c.id) },
        el('div', { class: 'ico', html: I.chat }),
        el('div', { class: 'grow' },
          el('div', { class: 't ellip', text: c.title || L.t('newChat') }),
          el('div', { class: 's ellip', text: last.slice(0, 60) })),
        el('button', {
          class: 'tiny dim', style: 'padding:6px', text: '⋯',
          onClick: e => {
            e.stopPropagation();
            sheet({
              title: c.title || L.t('newChat'),
              actions: [{ label: L.t('delete'), kind: 'danger', onClick: () => { store.deleteChat(c.id); rerender(); } }],
            });
          },
        })));
    });
    body.append(box);
  }
  return { node: root, title: L.t('tabChat') };
}

function newChat() {
  const sessions = store.sessions.slice(0, 12);
  const list = el('div', { class: 'list', style: 'max-height:52dvh;overflow:auto' });
  list.append(el('button', {
    class: 'item', onClick: () => { sh.close(); create(null); },
    html: `<div class="ico">${I.sparkle}</div><div class="grow"><div class="t">${L.isZh ? '通用对话（不绑定录音）' : 'General chat'}</div></div>`,
  }));
  sessions.forEach(s => list.append(el('button', {
    class: 'item', onClick: () => { sh.close(); create(s.id); },
    html: `<div class="ico">${I.wave}</div><div class="grow"><div class="t ellip">${s.title || L.t('untitled')}</div><div class="s">${fmtAgo(s.createdAt, L.lang)} · ${s.lines?.length || 0} 句</div></div>`,
  })));
  const sh = sheet({
    title: L.t('newChat'),
    body: el('div', {}, el('div', { class: 'tiny dim', style: 'margin-bottom:8px', text: '选一段录音，AI 会基于它的转录回答' }), list),
  });
}
function create(sessionId) {
  const s = sessionId ? store.getSession(sessionId) : null;
  const c = store.addChat({ title: s ? (s.title || L.t('newChat')) : L.t('newChat'), sessionId: sessionId || null, messages: [] });
  nav('/chat/' + c.id);
}

/* ---------------- Chat detail ---------------- */
export async function chat({ id }) {
  const c = store.getChat(id);
  if (!c) { nav('/chats', { replace: true }); return { node: el('div') }; }
  const s = c.sessionId ? store.getSession(c.sessionId) : null;
  const root = el('div', {});
  root.append(header({
    title: c.title || L.t('newChat'),
    sub: s ? `${s.lines?.length || 0} 句 · ${Math.round((s.duration || 0) / 60)} ${L.t('mins')}` : L.t('tabChat'),
    back: () => nav('/chats'),
    actions: [
      { icon: I.more, label: 'more', onClick: () => sheet({ title: c.title, actions: [{ label: L.t('delete'), kind: 'danger', onClick: () => { store.deleteChat(c.id); nav('/chats', { replace: true }); } }] }) },
    ],
  }));
  const body = el('div', { style: 'padding:0 16px 20px' });
  root.append(body);
  const box = el('div', { class: 'chat', style: 'padding-top:12px' });
  body.append(box);

  const paint = m => {
    const n = el('div', { class: 'msg ' + (m.role === 'user' ? 'me' : 'ai') });
    n.innerHTML = esc(m.content).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[(\d{1,2}:\d{2})(?::(\d{2}))?\]/g, '<span class="mono tiny dim">[$1]</span>')
      .replace(/\n/g, '<br>');
    if (m.role !== 'user' && m.source === 'local') n.append(el('span', { class: 'cite', text: L.t('aiLocal') }));
    box.append(n);
    return n;
  };
  c.messages.forEach(paint);
  if (!c.messages.length) {
    box.append(el('div', { class: 'empty', html: `<div>${I.sparkle}</div><div class="t">${s ? s.title : L.t('chatIntro')}</div><div class="s">${L.t('chatIntro')}</div>` }));
    const sugg = s ? ['总结这段录音', '老师布置了什么作业？', '列出重要概念'] : ['你好，你能做什么？'];
    box.append(el('div', { class: 'wrap', style: 'justify-content:center' }, ...sugg.map(q => el('button', { class: 'chip', text: q, onClick: () => send(q) }))));
  }

  const ta = el('textarea', { placeholder: L.t('askAnything'), rows: 1 });
  const sendBtn = el('button', { class: 'send', html: I.send });
  const micBtn = el('button', { class: 'mic', html: I.mic });
  body.append(el('div', { class: 'composer', style: 'position:sticky' }, micBtn, ta, sendBtn));

  micBtn.onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast(L.t('noSpeech')); return; }
    const r = new SR(); r.lang = store.settings.recognitionLang; r.interimResults = false; r.continuous = false;
    r.onresult = ev => { ta.value = ev.results[0][0].transcript; };
    r.onerror = () => toast(L.t('noSpeech'));
    try { r.start(); } catch {}
  };

  async function send(q) {
    const text = (q ?? ta.value).trim();
    if (!text) return;
    ta.value = ''; ta.style.height = 'auto';
    const um = { role: 'user', content: text, at: Date.now() };
    c.messages.push(um); paint(um);
    const thinking = el('div', { class: 'msg ai' }, el('span', { class: 'typing', html: '<i></i><i></i><i></i>' }));
    box.append(thinking);
    const v = document.querySelector('#view'); if (v) v.scrollTop = v.scrollHeight;
    try {
      let ans;
      if (!s) {
        ans = llmReady()
          ? { text: await askGeneral(text), source: 'llm' }
          : { text: '我是本地版本，只能基于录音作答。选一段录音开始对话，或在「设置 → AI 接口」填入 Key 以获得通用问答。', source: 'local' };
      } else {
        ans = await askAI(text, s, c.messages.filter(m => m.role !== 'system').slice(-6));
      }
      thinking.remove();
      const am = { role: 'assistant', content: ans.text, source: ans.source, at: Date.now() };
      c.messages.push(am); paint(am); store.save();
    } catch (e) {
      thinking.remove();
      paint({ role: 'assistant', content: '请求失败：' + String(e.message || e).slice(0, 200), source: 'local' });
    }
    const v2 = document.querySelector('#view'); if (v2) v2.scrollTop = v2.scrollHeight;
  }
  async function askGeneral(q) {
    const { llmChat } = await import('./ai.js');
    return llmChat([{ role: 'system', content: 'You are LecSync, a concise study assistant.' }, { role: 'user', content: q }]);
  }
  sendBtn.onclick = () => send();
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(110, ta.scrollHeight) + 'px'; });
  if (!c.title || c.title === L.t('newChat')) {
    if (c.messages.length) { c.title = c.messages[0].content.slice(0, 24); store.save(); }
  }
  return { node: root, title: c.title || L.t('tabChat') };
}

/* ---------------- Trash ---------------- */
export async function trash() {
  const root = el('div', {});
  root.append(header({
    title: L.t('trash'), back: () => nav('/me'),
    actions: [{
      icon: I.trash, label: 'empty', onClick: async () => {
        if (await confirmBox({ title: L.t('trash'), message: L.t('clearWarn'), danger: true, confirmLabel: L.t('delete') })) {
          store.data.trash = []; store.save(); rerender();
        }
      },
    }],
  }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  const items = store.data.trash || [];
  if (!items.length) body.append(emptyState(I.trash, L.t('trashEmpty'), '删除的会话会先放到这里。'));
  else {
    const list = el('div', { class: 'list', style: 'margin-top:10px' });
    items.forEach(s => list.append(el('div', { class: 'item' },
      el('div', { class: 'ico', html: I.txt }),
      el('div', { class: 'grow' },
        el('div', { class: 't ellip', text: s.title || L.t('untitled') }),
        el('div', { class: 's', text: fmtAgo(s.deletedAt || s.createdAt, L.lang) })),
      el('button', { class: 'tiny dim', text: L.t('restore'), onClick: () => { store.restoreSession(s.id); toast(L.t('saved')); rerender(); } }),
      el('button', { class: 'tiny dim', style: 'color:var(--live)', text: L.t('delete'), onClick: () => { store.purgeSession(s.id); rerender(); } }))));
    body.append(list);
  }
  return { node: root, title: L.t('trash') };
}

/* ---------------- Search ---------------- */
export async function search() {
  const root = el('div', {});
  root.append(header({ title: L.t('searchAll'), back: () => nav('/') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  const input = el('input', { class: 'input', placeholder: L.t('searchAll'), autofocus: true, style: 'margin-top:8px' });
  const out = el('div', { style: 'margin-top:12px' });
  body.append(input, out);

  const run = () => {
    const q = input.value.trim().toLowerCase();
    out.innerHTML = '';
    if (!q) return;
    const hits = [];
    store.sessions.forEach(s => {
      if ((s.title || '').toLowerCase().includes(q)) hits.push({ s, text: '(标题) ' + s.title, t: 0 });
      (s.lines || []).forEach(l => {
        if ((l.text + ' ' + (l.tr || '')).toLowerCase().includes(q)) hits.push({ s, text: l.text, t: l.t, tr: l.tr });
      });
    });
    if (!hits.length) { out.append(emptyState(I.search, L.t('nothingToCopy'), q)); return; }
    const list = el('div', { class: 'list' });
    hits.slice(0, 60).forEach(h => {
      const idx = h.text.toLowerCase().indexOf(q);
      const snip = idx > 30 ? '…' + h.text.slice(idx - 30) : h.text;
      list.append(el('button', { class: 'item', onClick: () => nav('/session/' + h.s.id) },
        el('div', { class: 'ico', html: I.wave }),
        el('div', { class: 'grow' },
          el('div', { class: 't ellip', text: h.s.title || L.t('untitled') }),
          el('div', { class: 's', html: (h.t ? `<span class="mono">${fmtClock(h.t).slice(0, 5)}</span> ` : '') + esc(snip).replace(new RegExp(escRe(q), 'ig'), m => `<mark style="background:rgba(255,214,0,.4)">${m}</mark>`).slice(0, 130) }))));
    });
    out.append(list);
    out.append(el('div', { class: 'tiny dim center', style: 'margin-top:10px', text: `${hits.length} 条结果` }));
  };
  input.addEventListener('input', () => { clearTimeout(input._t); input._t = setTimeout(run, 180); });
  setTimeout(() => input.focus(), 120);
  return { node: root, title: L.t('searchAll') };
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------------- Shared ---------------- */
export async function shared() {
  const root = el('div', {});
  root.append(header({ title: L.t('sharedWithMe'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  const items = (store.data.shared || []);
  if (!items.length) {
    body.append(emptyState(I.users, L.t('sharedWithMe'), '这个版本没有账号体系，共享需要一个后端。录音本体都在本机，可先用「导出 → 分享」发给别人。'));
  }
  return { node: root, title: L.t('sharedWithMe') };
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
