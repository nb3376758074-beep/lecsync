/* ============ screens: Upload, Translate, Dictation ============ */
import { el, I, L, store, toast, fmtClock, langName, uid, audioStore } from './core.js?v=1.6.0';
import { header, nav, sheet, pickLanguage, copyText, emptyState, refresh } from './ui.js?v=1.6.0';
import { translateText, splitSentences, transcribeBlob, makeLive, makeRecorder, hasLiveSpeech } from './speech.js?v=1.6.0';
import { localDigest, suggestTitle } from './ai.js?v=1.6.0';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rerender = () => refresh();

/* ================= Upload / import ================= */
export async function upload() {
  const s = store.settings;
  const root = el('div', {});
  root.append(header({ title: L.t('upload'), back: () => nav('/') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  // audio/video → transcription
  const audioInput = el('input', { type: 'file', accept: 'audio/*,video/*', style: 'display:none' });
  const docInput = el('input', { type: 'file', accept: '.txt,.md,.srt,.vtt,.json', style: 'display:none' });

  const audioCard = el('button', { class: 'card', style: 'text-align:left;margin-top:12px', onClick: () => audioInput.click() },
    el('div', { class: 'drop' },
      el('div', { html: I.upload, style: 'display:grid;place-items:center' }),
      el('div', { class: 'small', style: 'font-weight:620;margin-top:6px', text: L.t('uploadAudio') }),
      el('div', { class: 'tiny', text: L.t('uploadHint') })));
  const docCard = el('button', { class: 'card', style: 'text-align:left;margin-top:10px', onClick: () => docInput.click() },
    el('div', { class: 'drop' },
      el('div', { html: I.doc, style: 'display:grid;place-items:center' }),
      el('div', { class: 'small', style: 'font-weight:620;margin-top:6px', text: '导入字幕 / 文本' }),
      el('div', { class: 'tiny', text: 'TXT / SRT / VTT / Markdown' })));
  body.append(audioCard, docCard, audioInput, docInput);

  const status = el('div', { class: 'card flat', style: 'margin-top:14px;display:none' });
  body.append(status);

  audioInput.onchange = async () => {
    const f = audioInput.files[0]; if (!f) return;
    status.style.display = 'block';
    status.innerHTML = '';
    const prog = el('div', { class: 'prog' }, el('i', { style: 'width:10%' }));
    status.append(el('div', { class: 'small', style: 'font-weight:640', text: f.name }),
      el('div', { class: 'tiny dim', style: 'margin:4px 0 8px', text: `${(f.size / 1048576).toFixed(1)} MB` }), prog);
    if (!s.asrEndpoint) {
      status.append(el('div', { class: 'small muted', style: 'margin-top:10px' },
        L.isZh ? '还没有配置转写接口。网页版可以在线听写：配置任意 Whisper 兼容接口后，这里会自动转写。' : 'No ASR endpoint configured.'));
      status.append(el('div', { class: 'row', style: 'gap:8px;margin-top:10px' },
        el('button', { class: 'btn sm primary', text: '去配置', onClick: () => nav('/settings/asr') }),
        el('button', { class: 'btn sm ghost', text: '改用手动导入', onClick: () => docInput.click() })));
      return;
    }
    try {
      el('i', prog) || null;
      prog.firstChild.style.width = '45%';
      const txt = await transcribeBlob(f, { endpoint: s.asrEndpoint, key: s.asrKey, model: s.asrModel, language: s.recognitionLang });
      prog.firstChild.style.width = '100%';
      const sentences = splitSentences(txt);
      const lines = sentences.map((t, i) => ({ t: i * 4, text: t, tr: '', mark: false }));
      const session = store.addSession({
        title: f.name.replace(/\.[^.]+$/, '') || L.t('newSessionTitle'),
        lines, duration: lines.length * 4, lang: s.recognitionLang, targetLang: s.targetLang, folderId: null,
      });
      session.audioId = session.id; await audioStore.put(session.id, f);
      session.digest = localDigest(session); store.save();
      toast(L.t('imported')); nav('/session/' + session.id);
    } catch (e) {
      status.append(el('div', { class: 'small', style: 'color:var(--live);margin-top:10px', text: '转写失败：' + String(e.message || e).slice(0, 140) }));
    }
  };

  docInput.onchange = async () => {
    const f = docInput.files[0]; if (!f) return;
    const text = await f.text();
    importTextAsSession(text, f.name.replace(/\.[^.]+$/, ''));
  };

  // paste text
  const ta = el('textarea', { class: 'input', rows: 5, placeholder: L.t('importPlaceholder'), style: 'margin-top:14px' });
  body.append(el('div', { class: 'field' },
    el('label', { text: L.t('importText') }), ta,
    el('button', {
      class: 'btn primary block', style: 'margin-top:10px', text: L.t('importBtn'),
      onClick: () => { if (!ta.value.trim()) return toast(L.t('needText')); importTextAsSession(ta.value); },
    })));

  body.append(el('div', { class: 'card flat', style: 'margin-top:14px' },
    el('div', { class: 'tiny dim', style: 'line-height:1.6', text: L.isZh
      ? '音频转写需要一个 Whisper 兼容接口（OpenAI、Groq、硅基流动、本地 faster-whisper 都行）。纯文本导入不需要任何接口。'
      : 'Audio transcription needs a Whisper-compatible endpoint; text import works offline.' })));
  return { node: root, title: L.t('upload') };
}

function importTextAsSession(text, name) {
  const parts = splitSentences(text);
  if (!parts.length) return toast(L.t('needText'));
  const lines = parts.map((t, i) => ({ t: i * 4, text: t, tr: '', mark: false }));
  const session = store.addSession({
    title: name || suggestTitle(lines) || L.t('newSessionTitle'),
    lines, duration: lines.length * 4,
    lang: store.settings.recognitionLang, targetLang: store.settings.targetLang, folderId: null,
  });
  session.digest = localDigest(session);
  store.save(); toast(L.t('imported') + ` · ${lines.length} 句`);
  nav('/session/' + session.id);
}

/* ================= Translate / interpretation ================= */
const tr = { src: 'auto', to: 'en-US', lines: [], on: false, live: null };
export async function translate() {
  const root = el('div', {});
  root.append(header({
    title: L.t('translate'), back: () => nav('/'),
    actions: [{ icon: I.expand, label: 'fullscreen', onClick: () => fsSub() }],
  }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  tr.to = store.settings.targetLang || tr.to;
  const pickRow = el('div', { class: 'row', style: 'gap:8px;margin-top:10px' },
    el('button', {
      class: 'chip ghost grow', style: 'justify-content:center',
      text: tr.src === 'auto' ? L.t('detectAuto') : langName(tr.src, L.lang),
      onClick: () => pickLanguage({ value: tr.src, onPick: c => { tr.src = c; rerender(); } }),
    }),
    el('span', { html: I.translate, style: 'display:grid;color:var(--text-3)' }),
    el('button', {
      class: 'chip ghost grow', style: 'justify-content:center', text: langName(tr.to, L.lang),
      onClick: () => pickLanguage({ value: tr.to, onPick: c => { tr.to = c; store.settings.targetLang = c; store.save(); rerender(); } }),
    }));
  body.append(pickRow);

  // live interpretation block
  const liveBox = el('div', { class: 'card', style: 'margin-top:14px' });
  const liveLines = el('div', { style: 'max-height:38dvh;overflow:auto;display:flex;flex-direction:column;gap:10px' });
  liveBox.append(liveLines);
  if (!tr.lines.length) liveBox.append(el('div', { class: 'tiny dim center', style: 'padding:12px 0', text: '点「开始同传」，边说边出双语字幕' }));
  tr.lines.forEach(ln => liveLines.append(trLine(ln)));

  const startBtn = el('button', {
    class: 'btn ' + (tr.on ? 'danger' : 'primary') + ' block', style: 'margin-top:14px',
    text: tr.on ? '停止同传' : '开始同传',
    onClick: () => tr.on ? stopLive() : startLive(),
  });
  body.append(startBtn, liveBox);

  function trLine(ln) {
    return el('div', { style: 'border-left:2px solid var(--line);padding-left:10px' },
      el('div', { class: 'tiny dim mono', text: fmtClock(ln.t).slice(0, 5) }),
      el('div', { style: 'font-size:15.5px;line-height:1.5', text: ln.text }),
      ln.tr ? el('div', { class: 'small', style: 'color:var(--blue);margin-top:2px', text: ln.tr })
        : el('div', { class: 'tiny dim', text: '…' }));
  }
  function paint() {
    liveLines.innerHTML = '';
    if (!tr.lines.length) { liveLines.append(el('div', { class: 'tiny dim center', style: 'padding:12px 0', text: '等待说话…' })); return; }
    tr.lines.forEach(ln => liveLines.append(trLine(ln)));
  }
  async function addSentence(txt) {
    const ln = { t: tr.lines.length * 3, text: txt, tr: '' };
    tr.lines.push(ln); paint();
    try { ln.tr = await translateText(txt, tr.to, 'auto'); paint(); } catch {}
  }

  const cfg = () => store.settings;
  const canAsr = () => !!(cfg().asrEndpoint && cfg().asrKey);

  function startLive() {
    if (tr.on) return;
    // 1) 有浏览器识别（Chrome/Edge）：直接实时
    if (hasLiveSpeech()) {
      tr.on = true;
      tr.live = makeLive(t => addSentence(t), null, e => toast('识别出错：' + e), cfg().recognitionLang);
      tr.live?.start(); rerender();
      return;
    }
    // 2) iOS 等没有识别接口：用分片 ASR 做“准实时同传”
    if (canAsr()) { startSeg(); return; }
    toast('还没配置转写：先打开一次 setup 配置链接，或到 设置 → 转写接口 填 key', 6000);
  }

  async function startSeg() {
    tr.on = true; rerender();
    try {
      tr.rec = makeRecorder();
      let busy = false;
      await tr.rec.start(async blob => {
        if (busy || !blob || blob.size < 1000) return;
        busy = true;
        try {
          const txt = await transcribeBlob(blob, {
            endpoint: cfg().asrEndpoint, key: cfg().asrKey, model: cfg().asrModel,
          });
          if (txt) await addSentence(txt);
        } catch (e) {
          toast('转写失败：' + String(e.message || e).slice(0, 70), 5000);
        }
        busy = false;
      }, () => {}, 6000);
      toast('分片同传中：约 6 秒一句，边说边出双语', 4000);
    } catch (e) {
      tr.on = false; rerender();
      toast('麦克风打不开：' + String(e.message || e).slice(0, 60), 5000);
    }
  }

  async function stopLive() {
    tr.on = false;
    tr.live?.stop(); tr.live = null;
    try { await tr.rec?.stop(); } catch {}
    tr.rec = null;
    rerender();
  }

  // text translation
  const ta = el('textarea', { class: 'input', rows: 4, placeholder: '输入或粘贴要翻译的文字…', style: 'margin-top:16px' });
  const out = el('div', { class: 'card flat', style: 'margin-top:10px;display:none' });
  body.append(el('div', { class: 'field', style: 'margin-top:16px' },
    el('label', { text: '文本翻译' }), ta,
    el('button', {
      class: 'btn ghost block', style: 'margin-top:10px', text: L.t('translate'),
      onClick: async () => {
        const v = ta.value.trim(); if (!v) return;
        out.style.display = 'block'; out.textContent = L.t('translating') + '…';
        const r = await translateText(v, tr.to, tr.src);
        out.innerHTML = esc(r || '翻译失败，检查网络') +
          `<div class="row" style="gap:8px;margin-top:10px"><button class="btn sm ghost" id="cp">${L.t('copyText')}</button><button class="btn sm ghost" id="save">存为会话</button></div>`;
        el('#cp', out).onclick = () => copyText(r);
        el('#save', out).onclick = () => importTextAsSession(v + '\n' + r);
      },
    })));
  body.append(out);

  function fsSub() {
    if (!tr.lines.length) return toast(L.t('needText'));
    const host = el('div', { id: 'fsz' });
    const box = el('div', { class: 'f-lines' });
    const paintFs = () => {
      const last = tr.lines.slice(-2);
      box.innerHTML = '';
      last.forEach((l, i) => box.append(el('div', { class: i === last.length - 1 ? 'cur' : 'old' },
        el('div', { text: l.text }), l.tr ? el('div', { class: 'trl', text: l.tr }) : null)));
    };
    paintFs();
    host.append(box, el('div', { class: 'f-bar' }, el('span', { text: langName(tr.to, L.lang) }),
      el('button', { style: 'color:#fff;display:grid', html: I.close, onClick: () => { clearInterval(iv); host.remove(); } })));
    document.body.append(host);
    const iv = setInterval(paintFs, 800);
  }
  return { node: root, title: L.t('translate') };
}

/* ================= Dictation ================= */
const dt = { idx: 0, current: '', typed: '', score: null, results: [], words: [], mode: 'session' };
export async function dictation() {
  const root = el('div', {});
  root.append(header({
    title: L.t('dictation'), back: () => nav('/'),
    actions: [{ icon: I.edit, label: 'words', onClick: () => nav('/dictation/words') }],
  }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  if (!dt.words.length) {
    const sessions = store.sessions.filter(s => s.lines?.length);
    if (!sessions.length && !(store.settings.dictationWords || []).length) {
      body.append(emptyState(I.dictation, L.t('dictation'), '先录一段，或添加自定义词组，再回来练。', el('button', {
        class: 'btn primary', text: L.t('record'), onClick: () => nav('/'),
      })));
      return { node: root, title: L.t('dictation') };
    }
    dt.words = (store.settings.dictationWords || []).length
      ? [...store.settings.dictationWords]
      : sessions[0].lines.slice(0, 8).map(l => l.text);
  }

  const total = dt.words.length;
  const done = Math.min(dt.idx, total);
  if (dt.idx >= total) {
    const avg = dt.results.length ? Math.round(dt.results.reduce((a, b) => a + b, 0) / dt.results.length) : 0;
    body.append(el('div', { class: 'card center', style: 'margin-top:14px;padding:26px' },
      el('div', { style: 'font-size:44px;font-weight:300', text: avg + '%' }),
      el('div', { class: 'small dim', text: L.t('accuracy') }),
      el('div', { class: 'tiny dim', style: 'margin-top:6px', text: `${total} 句` })));
    body.append(el('div', { class: 'stack', style: 'margin-top:14px' },
      el('button', { class: 'btn primary block', text: L.isZh ? '再来一轮' : 'Again', onClick: () => { dt.idx = 0; dt.results = []; rerender(); } }),
      el('button', { class: 'btn ghost block', text: L.t('dictationWords'), onClick: () => nav('/dictation/words') })));
    return { node: root, title: L.t('dictation') };
  }

  dt.current = dt.words[dt.idx];
  body.append(el('div', { class: 'row between', style: 'margin:12px 0 6px' },
    el('span', { class: 'tiny dim', text: `第 ${dt.idx + 1} / ${total} 句` }),
    el('span', { class: 'tiny dim', text: `${L.t('accuracy')} ${dt.results.length ? Math.round(dt.results.reduce((a, b) => a + b, 0) / dt.results.length) : 0}%` })));
  body.append(el('div', { class: 'card', style: 'margin-top:6px' },
    el('div', { class: 'small dim', text: '听写这句（可点 🔊 反复听）' }),
    el('div', { class: 'row', style: 'gap:10px;margin-top:8px' },
      el('button', {
        class: 'sidebtn', html: I.headphones, onClick: () => speakText(dt.current),
      }),
      el('div', { class: 'grow', style: 'font-size:16px;line-height:1.5', text: dt.current }))));

  const input = el('textarea', { class: 'input', rows: 3, placeholder: '在这里打出来…', style: 'margin-top:14px' });
  const fb = el('div', { class: 'small', style: 'margin-top:10px' });
  const next = el('button', { class: 'btn primary block', style: 'margin-top:10px', text: '下一句' });
  body.append(input, fb, next);

  const check = () => {
    const score = similarity(dt.current, input.value.trim());
    dt.score = score;
    fb.innerHTML = `<b style="color:${score >= 90 ? 'var(--ok)' : score >= 60 ? 'var(--warn)' : 'var(--live)'}">${score}%</b>`;
    if (score < 100) fb.append(el('div', { class: 'tiny dim', style: 'margin-top:4px', text: '原文：' + dt.current }));
  };
  input.addEventListener('input', () => { clearTimeout(input._t); input._t = setTimeout(check, 200); });
  next.onclick = () => {
    dt.results.push(dt.score ?? similarity(dt.current, input.value.trim()));
    dt.idx++; dt.typed = ''; dt.score = null; rerender();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); next.click(); }
  });
  setTimeout(() => { input.focus(); speakText(dt.current); }, 300);
  return { node: root, title: L.t('dictation') };
}

function speakText(t) {
  if (!window.speechSynthesis) return toast('不支持朗读');
  const u = new SpeechSynthesisUtterance(t);
  u.lang = store.settings.recognitionLang;
  const v = speechSynthesis.getVoices().find(x => x.lang.startsWith(store.settings.recognitionLang.split('-')[0]));
  if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

export async function dictationWords() {
  const s = store.settings;
  s.dictationWords ||= [];
  const root = el('div', {});
  root.append(header({ title: L.t('dictationWords'), back: () => nav('/dictation') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  const list = el('div', { class: 'list', style: 'margin-top:12px' });
  if (!s.dictationWords.length) list.append(el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 't', text: '还没有词组' }))));
  s.dictationWords.forEach((w, i) => list.append(el('div', { class: 'item' },
    el('div', { class: 'ico', html: I.dictation }),
    el('div', { class: 'grow' }, el('div', { class: 't', text: w })),
    el('button', { class: 'tiny dim', style: 'color:var(--live)', text: L.t('remove'), onClick: () => { s.dictationWords.splice(i, 1); store.save(); rerender(); } }))));
  body.append(list);
  const input = el('input', { class: 'input', placeholder: '输入一个句子或短语', style: 'margin-top:14px' });
  body.append(input, el('button', {
    class: 'btn primary block', style: 'margin-top:10px', text: L.t('addWord'),
    onClick: () => {
      const v = input.value.trim(); if (!v) return;
      s.dictationWords.push(v); store.save(); input.value = ''; rerender();
    },
  }));
  body.append(el('button', { class: 'btn ghost block', style: 'margin-top:10px', text: '从最近的录音导入', onClick: () => {
    const sess = store.sessions.find(x => x.lines?.length);
    if (!sess) return toast(L.t('trashEmpty'));
    sess.lines.slice(0, 10).forEach(l => s.dictationWords.push(l.text));
    store.save(); rerender();
  } }));
  return { node: root, title: L.t('dictationWords') };
}

/* ---------- similarity ---------- */
function similarity(a, b) {
  if (!a && !b) return 100;
  if (!b) return 0;
  const norm = t => t.replace(/[\s，。！？、,.!?;；:：""'']/g, '').toLowerCase();
  const A = norm(a), B = norm(b);
  if (!B) return 0;
  const dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = 0; i <= A.length; i++) dp[i][0] = i;
  for (let j = 0; j <= B.length; j++) dp[0][j] = j;
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
  }
  return Math.max(0, Math.round((1 - dp[A.length][B.length] / Math.max(A.length, B.length)) * 100));
}

function $(sel, root = document) { return root.querySelector(sel); }
