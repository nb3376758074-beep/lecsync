/* ============ screen: Session detail (transcript / digest / files / chat) ============ */
import { $, el, I, L, store, toast, fmtClock, fmtDate, fmtDur, langName, audioStore, bytes } from './core.js?v=2.5.0';
import { header, nav, sheet, confirmBox, promptBox, copyText, shareText, pickLanguage, emptyState } from './ui.js?v=2.5.0';
import { localDigest, askAI, llmReady, toTxt, toSrt, toVtt, toMarkdown, download, safeName } from './ai.js?v=2.5.0';
import { translateText, transcribeBlob, splitSentences, transcribeLocal } from './speech.js?v=2.5.0';

let ui = { tab: 'transcript', q: '', showTr: true, sel: null };

export async function render({ id }) {
  const qs = new URLSearchParams((location.hash.split('?')[1] || ''));
  if (qs.get('tab') && ['transcript', 'digest', 'docs', 'chat'].includes(qs.get('tab'))) ui.tab = qs.get('tab');
  const s = store.getSession(id);
  if (!s) { toast('会话不存在'); nav('/'); return { node: el('div') }; }
  if (s.deletedAt) { toast(L.t('trash')); nav('/'); return { node: el('div') }; }
  ui.sel = s;
  const root = el('div', {});
  root.append(header({
    title: s.title || L.t('untitled'),
    sub: `${fmtDate(s.createdAt)} · ${Math.round((s.duration || 0) / 60)} ${L.t('mins')} · ${s.lines?.length || 0} 句`,
    back: () => nav('/'),
    actions: [
      { icon: I.share, label: 'share', onClick: () => shareSheet(s) },
      { icon: I.more, label: 'more', onClick: () => moreSheet(s) },
    ],
    bordered: true,
  }));

  // meta chips
  const chipRow = el('div', { class: 'wrap', style: 'padding:10px 18px 0' },
    el('span', { class: 'chip ghost', text: `🌐 ${langName(s.lang || store.settings.recognitionLang, L.lang)} → ${langName(s.targetLang || store.settings.targetLang, L.lang)}` }),
    el('span', { class: 'chip ghost', text: `★ ${(s.lines || []).filter(l => l.mark).length}` }),
    s.digest ? el('span', { class: 'chip ghost', text: L.t('digest') }) : null);
  root.append(chipRow);

  const seg = el('div', { class: 'seg', style: 'margin-top:12px' },
    ...[['transcript', L.t('transcript')], ['digest', L.t('digest')], ['docs', L.t('docs')], ['chat', L.t('chatTab')]]
      .map(([k, label]) => el('button', {
        class: ui.tab === k ? 'on' : '', text: label,
        onClick: () => { ui.tab = k; reload(); },
      })));
  root.append(seg);

  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  const player = await playerBlock(s);
  if (player) body.append(player);

  const content = el('div', { id: 'sessionBody' });
  body.append(content);
  paint();

  function paint() {
    content.innerHTML = '';
    if (ui.tab === 'transcript') content.append(transcriptTab(s));
    else if (ui.tab === 'digest') content.append(digestTab(s));
    else if (ui.tab === 'docs') content.append(docsTab(s));
    else content.append(chatTab(s));
  }
  function reload() {
    // re-render whole screen to update segment highlight
    render({ id }).then(r => { const v = $('#view'); if (v) { v.innerHTML = ''; v.append(r.node); } });
  }

  return { node: root, title: s.title || L.t('transcript') };
}

/* ---------- player ---------- */
async function playerBlock(s) {
  const blob = s.audioId ? await audioStore.get(s.audioId) : null;
  if (!blob && !s.audioUrl) return null;
  const url = s.audioUrl || URL.createObjectURL(blob);
  const audio = el('audio', { src: url, preload: 'metadata', style: 'display:none' });
  ui.audio = audio;
  const playBtn = el('button', { html: I.play, 'aria-label': 'play' });
  const seek = el('div', { class: 'seek' }, el('i'));
  const tm = el('span', { class: 'tm', text: '0:00 / 0:00' });
  playBtn.onclick = () => { audio.paused ? audio.play() : audio.pause(); };
  audio.onplay = () => { playBtn.innerHTML = I.pause; };
  audio.onpause = () => { playBtn.innerHTML = I.play; };
  audio.ontimeupdate = () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    $('i', seek).style.width = pct + '%';
    tm.textContent = `${fmtClock(audio.currentTime)} / ${fmtClock(audio.duration || 0)}`;
    highlightLine(audio.currentTime);
  };
  seek.onclick = e => {
    const r = seek.getBoundingClientRect();
    if (audio.duration) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  };
  ui.seekTo = t => { try { audio.currentTime = t; audio.play(); } catch {} };
  return el('div', { class: 'player', style: 'margin-top:12px' }, audio, playBtn, seek, tm);
}

function highlightLine(t) {
  if (ui.tab !== 'transcript') return;
  const rows = document.querySelectorAll('#sessionBody .tr-line');
  let cur = null;
  rows.forEach(r => {
    const ts = Number(r.dataset.t || 0);
    if (ts <= t) cur = r;
    r.classList.remove('hit');
  });
  cur?.classList.add('hit');
}

/* ---------- transcript ---------- */
function transcriptTab(s) {
  const wrap = el('div', {});
  const search = el('input', {
    class: 'input', placeholder: L.t('searchInSession'), value: ui.q, style: 'margin:12px 0 8px',
    onInput: e => { ui.q = e.target.value; clearTimeout(search._t); search._t = setTimeout(() => refresh(), 300); },
  });
  const row = el('div', { class: 'row', style: 'gap:8px;margin-bottom:12px;flex-wrap:wrap' },
    el('button', {
      class: 'btn sm ghost', text: L.t('translate') + ' ' + langName(s.targetLang || store.settings.targetLang, L.lang),
      onClick: () => translateAll(s),
    }),
    el('button', {
      class: 'btn sm ghost', text: ui.showTr ? '只看原文' : '原文 + 译文',
      onClick: () => { ui.showTr = !ui.showTr; refresh(); },
    }),
    el('button', {
      class: 'btn sm ghost', text: L.t('fullscreenSub'),
      onClick: () => import('./ui.js?v=2.5.0').then(m => m.sheet({ title: L.t('fullscreenSub'), body: el('div', { class: 'small muted', text: '录音页右上角的全屏按钮可以在录音时放大字幕；这里可以用浏览器全屏查看转录。' }), actions: [{ label: L.t('ok'), kind: 'primary', onClick: () => document.documentElement.requestFullscreen?.() }] })),
    }));
  wrap.append(search, row);

  if (!s.lines?.length) {
    const canTranscribe = !!(store.settings.asrEndpoint && store.settings.asrKey && (s.audioId || s.audioUrl));
    wrap.append(emptyState(I.txt, L.t('transcriptEmpty'), '录音没有产生文字，或者麦克风权限被拒了。', el('div', { class: 'stack sm', style: 'align-items:center' },
      canTranscribe ? el('button', {
        class: 'btn primary', text: '转写这段录音', onClick: () => transcribeSession(s),
      }) : null,
      el('button', { class: 'btn ghost', text: L.t('record'), onClick: () => nav('/') }))));
    if (!canTranscribe) {
      wrap.append(el('div', { class: 'tiny dim center', style: 'margin-top:10px;line-height:1.6' },
        '想让它自动出文字：设置 → 转写接口，填一个 Whisper 兼容地址（硅基流动 / OpenAI / 本地服务），', el('br'),
        '然后用键盘上的 🎤 说话，或录完点“转写这段录音”。'));
    }
    return wrap;
  }

  const q = ui.q.trim().toLowerCase();
  const list = el('div', {});
  const lines = s.lines.filter(l => !q || (l.text + ' ' + (l.tr || '')).toLowerCase().includes(q));
  if (!lines.length) { list.append(el('div', { class: 'empty', html: `<div>${I.search}</div><div class="t">没有匹配的内容</div>` })); }
  lines.forEach(l => {
    const idx = s.lines.indexOf(l);
    const hl = (txt) => {
      if (!q) return esc(txt);
      const i = txt.toLowerCase().indexOf(q);
      if (i < 0) return esc(txt);
      return esc(txt.slice(0, i)) + '<mark>' + esc(txt.slice(i, i + q.length)) + '</mark>' + esc(txt.slice(i + q.length));
    };
    const row = el('div', { class: 'tr-line', dataset: { t: l.t } },
      el('button', { class: 'ts', text: fmtClock(l.t).slice(0, 5), style: 'text-align:left', onClick: () => ui.seekTo?.(l.t) }),
      el('div', { class: 'tx' },
        el('div', { html: hl(l.text) + (l.mark ? ' <span style="color:var(--warn)">★</span>' : '') }),
        ui.showTr && l.tr ? el('span', { class: 'tr', text: l.tr }) : null,
        el('div', { class: 'row', style: 'gap:10px;margin-top:6px;opacity:.65' },
          el('button', { class: 'tiny dim', text: l.mark ? L.t('marked') : L.t('mark'), onClick: () => { l.mark = !l.mark; store.save(); refresh(); } }),
          el('button', { class: 'tiny dim', text: L.t('translate'), onClick: async () => { await oneTranslate(s, l); refresh(); } }),
          el('button', { class: 'tiny dim', text: L.t('askThisQuestion'), onClick: () => { ui.tab = 'chat'; refresh(); prefillChat(l.text); } }))));
    list.append(row);
  });
  wrap.append(list);

  function refresh() {
    render({ id: s.id }).then(r => { const v = $('#view'); if (v) { v.innerHTML = ''; v.append(r.node); } });
  }
  return wrap;
}

async function oneTranslate(s, l) {
  const to = s.targetLang || store.settings.targetLang;
  const from = 'auto';
  try { l.tr = await translateText(l.text, to, from); store.save(); }
  catch { toast(L.t('translating')); }
}
async function translateAll(s) {
  const to = s.targetLang || store.settings.targetLang;
  const from = 'auto';
  toast(L.t('translating') + ' 0/' + s.lines.length, 1400);
  let done = 0;
  for (const l of s.lines) {
    if (l.tr) { done++; continue; }
    try { l.tr = await translateText(l.text, to, from); } catch {}
    done++;
    if (done % 5 === 0) { store.save(); toast(`${L.t('translating')} ${done}/${s.lines.length}`, 900); }
  }
  store.save(); toast(L.t('done'));
  render({ id: s.id }).then(r => { const v = $('#view'); if (v) { v.innerHTML = ''; v.append(r.node); } });
}

async function transcribeSession(s) {
  const cfg = store.settings;
  const useLocal = cfg.engine === 'local' || !(cfg.asrEndpoint && cfg.asrKey);
  toast(useLocal ? '正在用本地模型转写（首次要下载模型）…' : '正在转写…', 5000);
  try {
    const blob = s.audioId ? await audioStore.get(s.audioId) : null;
    if (!blob) { toast('这段录音没有音频文件'); return; }
    let txt = '';
    if (useLocal) {
      txt = await transcribeLocal(blob, {
        model: cfg.localModel || 'whisper-base',
        language: s.lang || cfg.recognitionLang,
        onProgress: m => toast(m, 3000),
      });
    } else {
      txt = await transcribeBlob(blob, {
        endpoint: cfg.asrEndpoint, key: cfg.asrKey, model: cfg.asrModel, language: s.lang || cfg.recognitionLang,
      });
    }
    const parts = splitSentences(txt || '');
    if (!parts.length) { toast('没有识别到内容'); return; }
    const step = Math.max(2, Math.round((s.duration || parts.length * 4) / parts.length));
    s.lines = parts.map((t, i) => ({ t: i * step, text: t, tr: '', mark: false }));
    s.digest = localDigest(s);
    s.title = suggestTitle(s.lines) || s.title;
    store.save();
    toast(`转写完成 · ${parts.length} 句`);
    rerender(s.id);
  } catch (e) {
    toast('转写失败：' + String(e.message || e).slice(0, 80), 5000);
  }
}

/* ---------- digest ---------- */
function digestTab(s) {
  const wrap = el('div', { class: 'digest' });
  if (!s.digest) {
    wrap.append(emptyState(I.sparkle, L.t('summaryEmpty'), L.t('digestNote'), el('button', {
      class: 'btn primary', text: L.t('genSummary'), onClick: () => genDigest(s),
    })));
    return wrap;
  }
  const d = s.digest;
  const head = el('div', { class: 'row between', style: 'margin:12px 0 4px' },
    el('div', { class: 'tiny dim', text: (d.source === 'llm' ? L.t('aiModelOn') : L.t('aiLocal')) + ' · ' + fmtClock(d.duration || 0) }),
    el('button', { class: 'tiny dim', text: L.t('regenSummary'), onClick: () => genDigest(s) }));
  wrap.append(head);

  wrap.append(el('div', { class: 'card flat', style: 'margin-top:8px' },
    el('p', { text: d.summary || '' })));

  if (d.outline?.length) {
    wrap.append(el('h4', { text: L.t('outline') }));
    d.outline.forEach(o => wrap.append(el('div', { class: 'tl' },
      el('button', { class: 't', text: fmtClock(o.t).slice(0, 5), onClick: () => ui.seekTo?.(o.t), style: 'text-align:left' }),
      el('div', { class: 'd', text: o.head }))));
  }
  if (d.keyPoints?.length) {
    wrap.append(el('h4', { text: L.t('keyPoints') }));
    const ul = el('ul');
    d.keyPoints.forEach(k => ul.append(el('li', { html: `<span class="mono tiny dim">${fmtClock(k.t).slice(0, 5)}</span> ${esc(k.text)}` })));
    wrap.append(ul);
  }
  if (d.actionItems?.length) {
    wrap.append(el('h4', { text: L.t('actionItems') }));
    const ul = el('ul', { style: 'list-style:none;padding-left:0' });
    d.actionItems.forEach((a, i) => {
      const box = el('input', { type: 'checkbox', style: 'margin-right:8px' });
      box.checked = !!a.done;
      box.onchange = () => { a.done = box.checked; store.save(); };
      ul.append(el('li', { style: 'display:flex;gap:2px' }, box, el('span', { text: a.text })));
    });
    wrap.append(ul);
  }
  if (d.keywords?.length) {
    wrap.append(el('h4', { text: L.t('keywords') }));
    const kw = el('div', {});
    d.keywords.forEach(k => kw.append(el('span', { class: 'kw', text: k })));
    wrap.append(kw);
  }
  if (d.timeline?.length) {
    wrap.append(el('h4', { text: L.t('timeline') }));
    d.timeline.forEach(t => wrap.append(el('div', { class: 'tl' },
      el('button', { class: 't', text: fmtClock(t.t).slice(0, 5), onClick: () => ui.seekTo?.(t.t) }),
      el('div', { class: 'd', text: t.text }))));
  }
  wrap.append(el('div', { class: 'tiny dim', style: 'margin-top:14px', text: L.t('digestNote') }));
  return wrap;
}

async function genDigest(s) {
  toast(L.t('processing'));
  await new Promise(r => setTimeout(r, 60));
  s.digest = localDigest(s);
  store.save();
  toast(L.t('done'));
  render({ id: s.id }).then(r => { const v = $('#view'); if (v) { v.innerHTML = ''; v.append(r.node); } });
}

/* ---------- docs ---------- */
function docsTab(s) {
  const wrap = el('div', {});
  const docs = s.docs || [];
  if (!docs.length) {
    wrap.append(emptyState(I.doc, L.t('docs'), '把课件、讲义丢进来，AI 对话会引用文件内容。'));
  } else {
    const list = el('div', { class: 'list' });
    docs.forEach((d, i) => list.append(el('div', { class: 'item' },
      el('div', { class: 'ico', html: I.file }),
      el('div', { class: 'grow' },
        el('div', { class: 't ellip', text: d.name }),
        el('div', { class: 's', text: `${bytes(d.size || d.text?.length || 0)} · ${fmtDate(d.addedAt)}` })),
      el('button', { class: 'tiny dim', text: L.t('remove'), onClick: () => { s.docs.splice(i, 1); store.save(); reload(s); } }))));
    wrap.append(list);
  }
  const file = el('input', { type: 'file', accept: '.txt,.md,.json,.csv,.srt,.vtt,text/*', style: 'display:none' });
  file.onchange = async () => {
    const f = file.files[0]; if (!f) return;
    const text = await f.text();
    s.docs = s.docs || [];
    s.docs.push({ name: f.name, size: f.size, addedAt: Date.now(), text: text.slice(0, 200000) });
    store.save(); toast(L.t('imported')); reload(s);
  };
  wrap.append(el('div', { class: 'stack', style: 'margin-top:14px' },
    el('button', { class: 'btn ghost block', html: `${I.upload} <span>${L.t('uploadDoc')}</span>`, onClick: () => file.click() }),
    file,
    el('div', { class: 'tiny dim center', text: '支持 txt / md / srt / vtt / csv（PDF 建议先复制文字）' })));
  return wrap;
}

/* ---------- chat about this session ---------- */
function chatTab(s) {
  const wrap = el('div', {});
  s.chat ||= [];
  const box = el('div', { class: 'chat', id: 'sessChat' });
  const paintMsg = m => {
    const n = el('div', { class: 'msg ' + (m.role === 'user' ? 'me' : 'ai') });
    n.innerHTML = mdLite(m.content);
    box.append(n); return n;
  };
  s.chat.forEach(paintMsg);
  if (!s.chat.length) {
    box.append(el('div', { class: 'center tiny dim', style: 'padding:18px 8px', text: L.t('chatIntro') }));
    const sugg = ['总结重点', '老师布置了什么作业？', '有哪些概念需要复习？'];
    box.append(el('div', { class: 'wrap', style: 'justify-content:center' },
      ...sugg.map(q => el('button', { class: 'chip', text: q, onClick: () => send(q) }))));
  }
  wrap.append(box);

  const ta = el('textarea', { placeholder: L.t('askPlaceholder'), rows: 1 });
  const sendBtn = el('button', { class: 'send', html: I.send });
  const micBtn = el('button', { class: 'mic', html: I.mic });
  let recog = null;
  micBtn.onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast(L.t('noSpeech')); return; }
    recog ||= new SR();
    recog.lang = store.settings.recognitionLang; recog.continuous = false; recog.interimResults = false;
    recog.onresult = ev => { ta.value = ev.results[0][0].transcript; ta.focus(); };
    recog.onerror = () => toast(L.t('noSpeech'));
    try { recog.start(); toast(L.t('listening')); } catch {}
  };
  const bar = el('div', { class: 'composer', style: 'position:static;margin-top:12px;border-radius:16px;border:1px solid var(--line)' },
    micBtn, ta, sendBtn);
  wrap.append(bar);

  async function send(q) {
    const text = (q ?? ta.value).trim();
    if (!text) return;
    ta.value = '';
    s.chat.push({ role: 'user', content: text, at: Date.now() });
    paintMsg(s.chat[s.chat.length - 1]);
    const thinking = el('div', { class: 'msg ai' }, el('span', { class: 'typing', html: '<i></i><i></i><i></i>' }));
    box.append(thinking); scroll();
    try {
      const { text: ans, source } = await askAI(text, s, s.chat.slice(0, -1));
      thinking.remove();
      const m = { role: 'assistant', content: ans, at: Date.now(), source };
      s.chat.push(m); paintMsg(m); store.save(); scroll();
    } catch (e) {
      thinking.remove();
      paintMsg({ role: 'assistant', content: '请求失败：' + String(e.message || e).slice(0, 160) + '\n\n检查「设置 → AI 接口」。' });
    }
  }
  function scroll() { const v = $('#view'); if (v) v.scrollTop = v.scrollHeight; }
  sendBtn.onclick = () => send();
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
  ui.sendToChat = send;
  return wrap;
}
function prefillChat(line) {
  setTimeout(() => { ui.sendToChat?.('这句是什么意思，帮我解释一下：' + line); }, 300);
}

/* ---------- sheets ---------- */
function shareSheet(s) {
  const opts = [
    ['txt', 'TXT · 纯文本', () => toTxt(s)],
    ['srt', 'SRT · 字幕' + (s.lines?.some(l => l.tr) ? '（双语）' : ''), () => toSrt(s, true)],
    ['vtt', 'VTT · 网页字幕', () => toVtt(s, true)],
    ['md', 'Markdown · 含纪要', () => toMarkdown(s)],
  ];
  const list = el('div', { class: 'list' });
  opts.forEach(([k, label, gen]) => list.append(el('button', {
    class: 'item', onClick: () => { download(`${safeName(s.title)}.${k}`, gen(), k === 'md' ? 'text/markdown' : 'text/plain'); toast(L.t('exportStarted')); },
    html: `<div class="ico">${I.download}</div><div class="grow"><div class="t">${label}</div><div class="s">${k === 'md' ? L.t('mdHint') : k === 'txt' ? '逐行带时间戳' : L.t('srtHint')}</div></div>`,
  })));
  sheet({
    title: L.t('exportAs'),
    body: list,
    actions: [
      { label: L.t('copyText'), kind: 'ghost', onClick: () => copyText(toTxt(s)) },
      { label: L.t('shareVia'), onClick: () => shareText(toMarkdown(s), s.title || 'LecSync') },
    ],
  });
}

function moreSheet(s) {
  const act = (icon, label, onClick, danger) => el('button', {
    class: 'item', onClick: () => { sheetClose(); onClick(); },
    html: `<div class="ico" style="${danger ? 'color:var(--live)' : ''}">${icon}</div><div class="grow"><div class="t" style="${danger ? 'color:var(--live)' : ''}">${label}</div></div>`,
  });
  const body = el('div', {},
    el('div', { class: 'list' },
      act(I.edit, L.t('rename'), async () => {
        const name = await promptBox({ title: L.t('sessionTitle'), value: s.title || '', confirmLabel: L.t('confirm') });
        if (name) { store.updateSession(s.id, { title: name }); rerender(s.id); }
      }),
      act(I.folder, L.t('moveTo'), () => moveSheet(s)),
      act(I.copy, L.t('duplicate'), () => {
        const cp = store.addSession({ ...structuredClone(s), id: undefined, title: (s.title || '') + ' copy', createdAt: undefined });
        store.save(); toast(L.t('saved')); nav('/session/' + cp.id, { replace: true });
      }),
      act(I.doc, L.t('docs'), () => { ui.tab = 'docs'; rerender(s.id); }),
    ),
    el('div', { class: 'list', style: 'margin-top:10px' },
      act(I.trash, L.t('moveToTrash'), async () => {
        if (await confirmBox({ title: L.t('moveToTrash'), message: s.title, danger: true, confirmLabel: L.t('delete') })) {
          store.deleteSession(s.id); nav('/', { replace: true });
        }
      }, true)));
  const sh = sheet({ title: s.title || L.t('session'), body });
  function sheetClose() { sh.close(); }
}

function moveSheet(s) {
  const body = el('div', {});
  const list = el('div', { class: 'list' });
  list.append(el('button', {
    class: 'item', onClick: () => { store.updateSession(s.id, { folderId: null }); sh.close(); toast(L.t('saved')); },
    html: `<div class="ico">${I.archive}</div><div class="grow"><div class="t">${L.t('allSessions')}</div></div>`,
  }));
  store.data.folders.forEach(f => list.append(el('button', {
    class: 'item', onClick: () => { store.updateSession(s.id, { folderId: f.id }); sh.close(); toast(L.t('saved')); },
    html: `<div class="ico">${I.folder}</div><div class="grow"><div class="t">${esc(f.name)}</div></div>`,
  })));
  body.append(list);
  const sh = sheet({ title: L.t('moveTo'), body });
}

function rerender(id) {
  render({ id }).then(r => { const v = $('#view'); if (v) { v.innerHTML = ''; v.append(r.node); } });
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function mdLite(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[(\d{1,2}:\d{2})\]/g, '<span class="mono tiny dim">[$1]</span>')
    .replace(/\n/g, '<br>');
}
