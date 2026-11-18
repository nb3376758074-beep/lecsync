/* ============ screen: Record (home) ============ */
import { $, el, I, L, store, toast, fmtClock, fmtAgo, langName, uid, audioStore, sleep } from './core.js?v=2.6.0';
import { header, nav, pickLanguage, setTabState, sheet, copyText } from './ui.js?v=2.6.0';
import { makeRecorder, makeLive, hasLiveSpeech, transcribeBlob, splitSentences, translateText, transcribeLocal } from './speech.js?v=2.6.0';
import { localDigest, suggestTitle } from './ai.js?v=2.6.0';

const BAR_COUNT = 34;
const IDLE_BARS = Array.from({ length: BAR_COUNT }, (_, i) =>
  Math.round(4 + Math.abs(Math.sin(i * 0.52) * Math.cos(i * 0.17)) * 13));
const st = {
  on: false, paused: false, startedAt: 0, elapsed: 0,
  session: null, lines: [], interim: '', rec: null, live: null,
  manual: false, seg: false, level: 0, timer: null, raf: null, refs: {},
};
export const isRecording = () => st.on;
export const isPaused = () => st.paused;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- view ---------- */
export async function render() {
  const root = el('div', {});
  root.append(header({
    title: st.on ? L.t('listening') : L.t('record'),
    sub: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    actions: [
      { icon: I.search, label: 'search', onClick: () => nav('/search') },
      { icon: I.plus, label: 'upload', onClick: () => nav('/upload') },
      { icon: I.settings, label: 'settings', onClick: () => nav('/settings') },
    ],
  }));
  const body = el('div', { class: 'rec-hero' });
  body.append(heroTitle());
  body.append(timerBlock());
  if (st.on) body.append(controls(), liveCard(), quotaCard());
  else body.append(controls(), startHint(), modeChips(), asrHint(), quickActions(), recentBlock());
  root.append(body);
  setTabState('record', { recording: st.on });
  return { node: root, title: st.on ? L.t('recording') : L.t('record') };
}

function heroTitle() {
  const t = el('div', {});
  if (st.on) {
    t.append(el('div', { class: 'row', style: 'gap:8px;align-items:center' },
      el('span', { class: 'badge live', text: st.paused ? L.t('paused') : L.t('recording') }),
      el('span', { class: 'small dim', text: st.manual ? '键盘听写' : (st.seg ? '分片转写 · 约 6 秒一句' : (hasLiveSpeech() ? L.t('speechReady') : L.t('engineManual'))) })));
    t.append(el('div', { class: 'rec-title', text: st.session?.title || L.t('newSessionTitle') }));
    t.append(el('div', { class: 'rec-sub', text: `${L.t('unlimited')} · ${langName(store.settings.recognitionLang, L.lang)} → ${langName(store.settings.targetLang, L.lang)}` }));
  } else {
    t.append(el('div', { class: 'rec-title', text: L.t('tapToStart') }));
    t.append(el('div', { class: 'rec-sub', text: `${L.t('unlimited')} · ${langName(store.settings.recognitionLang, L.lang)}` }));
  }
  return t;
}

function timerBlock() {
  const time = el('span', { class: 'mono', text: fmtClock(st.elapsed) });
  const ms = el('span', { class: 'ms', text: '0' });
  const timer = el('div', { class: 'timer' }, time, ms);
  const wave = el('div', { class: 'wave' + (st.on ? ' live' : '') });
  for (let i = 0; i < BAR_COUNT; i++) wave.append(el('i', { style: `height:${IDLE_BARS[i]}px` }));
  st.refs.time = time; st.refs.ms = ms; st.refs.wave = wave;
  startLoops();
  return el('div', {}, timer, wave);
}

function controls() {
  const mark = el('button', {
    class: 'sidebtn', title: L.t('mark'), html: I.star, 'aria-label': L.t('mark'), onClick: () => markMoment(),
  });
  const fs = el('button', {
    class: 'sidebtn', title: L.t('fullscreenSub'), html: I.expand, 'aria-label': L.t('fullscreenSub'), onClick: () => openFullscreen(),
  });
  const lang = el('button', {
    class: 'sidebtn', title: L.t('recognitionLang'), html: I.globe, 'aria-label': L.t('recognitionLang'),
    onClick: () => pickLanguage({
      value: store.settings.recognitionLang,
      onPick: code => {
        store.settings.recognitionLang = code; store.save();
        st.live?.setLang(code); toast(langName(code, L.lang)); reRender();
      },
    }),
  });
  const recBtn = el('button', {
    class: 'recbtn' + (st.paused ? ' paused' : ''),
    'aria-label': st.on ? L.t('stopAndSave') : L.t('startRecording'),
    html: st.on ? (st.paused ? '<span class="tri"></span>' : '<span class="sq"></span>')
      : '<span style="width:26px;height:26px;border-radius:50%;background:#fff"></span>',
    onClick: () => (st.on ? (st.paused ? resumeRec() : stopRec()) : startRec()),
  });
  const row = el('div', { class: 'rec-actions' });
  if (st.on) {
    const pause = el('button', {
      class: 'sidebtn' + (st.paused ? ' on' : ''), html: st.paused ? I.play : I.pause,
      'aria-label': st.paused ? L.t('resume') : L.t('pause'),
      onClick: () => (st.paused ? resumeRec() : pauseRec()),
    });
    row.append(pause, recBtn, mark);
    return el('div', {}, row,
      el('div', { class: 'center tiny dim', style: 'padding-bottom:4px', text: L.t('tapToStop') }),
      manualInputIfNeeded());
  }
  row.append(lang, recBtn, fs);
  return row;
}

const startHint = () => el('div', { class: 'center tiny dim', style: 'padding:6px 0 2px', text: L.t('tapToStart') });

/* 录音页：显示当前翻译方向，点一下对调 */
function modeChips() {
  const s = store.settings;
  return el('button', {
    class: 'chip ghost', style: 'justify-content:center;margin-top:12px;width:100%;padding:10px 14px',
    onClick: () => {
      const a = s.recognitionLang, b = s.targetLang;
      s.recognitionLang = b; s.targetLang = a;
      store.save();
      toast('已对调：' + langName(s.recognitionLang, L.lang) + ' → ' + langName(s.targetLang, L.lang));
      reRender();
    },
  },
    el('span', { text: langName(s.recognitionLang, L.lang) + '  →  ' + langName(s.targetLang, L.lang) }),
    el('span', { style: 'margin-left:10px;font-size:16px;color:var(--text-3)', text: '⇄' }));
}

function asrHint() {
  const s = store.settings;
  if (s.asrKey) {
    return el('div', { class: 'card flat', style: 'margin-top:14px;padding:12px 14px' },
      el('div', { class: 'row', style: 'gap:8px;align-items:center' },
        el('span', { class: 'badge ok', text: '转写已就绪' }),
        el('span', { class: 'tiny dim ellip', text: (s.asrModel || '') + ' · ' + (s.asrEndpoint || '').replace('https://', '') })));
  }
  return el('div', { class: 'card', style: 'margin-top:14px;padding:14px;border-color:var(--live)' },
    el('div', { class: 'stack sm' },
      el('div', { class: 'small', style: 'font-weight:660;color:var(--live)', text: '还没配置转写，录音不会有文字' }),
      el('div', { class: 'tiny dim', style: 'line-height:1.6', text: '打开我发给你的那条 setup.html#key=... 链接一次即可（Safari 里打开，之后回到这个页面刷新）。' }),
      el('div', { class: 'row', style: 'gap:8px;margin-top:4px' },
        el('button', { class: 'btn sm ghost', text: '去设置', onClick: () => nav('/settings/asr') }),
        el('button', { class: 'btn sm ghost', text: '刷新', onClick: () => location.reload() }))));
}

function quotaCard() {
  return el('div', { class: 'quotacard' },
    el('span', { html: I.crown, style: 'color:var(--ok);display:grid' }),
    el('div', { class: 'grow' },
      el('div', { class: 'small', style: 'font-weight:640', text: L.t('unlockedCard') }),
      el('div', { class: 'tiny dim', text: L.t('unlimited') })),
    el('div', { class: 'bar' }, el('i', {})));
}

function quickActions() {
  const item = (icon, label, onClick, sub) => el('button', { class: 'card flat', style: 'text-align:left;padding:13px', onClick },
    el('div', { class: 'row', style: 'gap:10px' },
      el('span', { html: icon, style: 'display:grid;color:var(--text-2)' }),
      el('div', { class: 'grow' },
        el('div', { class: 'small', style: 'font-weight:620', text: label }),
        sub ? el('div', { class: 'tiny dim ellip', text: sub }) : null)));
  const grid = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px' },
    item(I.upload, L.t('uploadAudio'), () => nav('/upload'), '音视频 → 文字'),
    item(I.translate, L.t('translate'), () => nav('/translate'), langName(store.settings.targetLang, L.lang)),
    item(I.doc, '拍照翻译', () => nav('/photo'), '菜单/路牌 → 中文'),
    item(I.dictation, L.t('dictation'), () => nav('/dictation'), '逐句跟打判分'),
    item(I.chat, L.t('newChat'), () => nav('/chats'), '围绕录音提问'));
  return el('div', {},
    el('div', { class: 'row between', style: 'margin-top:22px' },
      el('div', { class: 'small', style: 'font-weight:680', text: L.t('quickActions') }),
      el('button', { class: 'tiny dim', text: L.t('proTitle'), onClick: () => nav('/pro') })),
    grid);
}

function recentBlock() {
  const list = store.sessions.slice(0, 4);
  const wrap = el('div', { style: 'margin-top:22px' });
  wrap.append(el('div', { class: 'row between', style: 'margin-bottom:8px' },
    el('div', { class: 'small', style: 'font-weight:680', text: L.t('recent') }),
    el('button', { class: 'tiny dim', text: L.t('allSessions') + ' ›', onClick: () => nav('/folders') })));
  if (!list.length) {
    wrap.append(el('div', { class: 'card flat center', style: 'padding:22px' },
      el('div', { class: 'small muted', text: L.t('noSessions') }),
      el('div', { class: 'tiny dim', style: 'margin-top:4px', text: L.t('noSessionsSub') })));
    return wrap;
  }
  const box = el('div', { class: 'list' });
  list.forEach(s => box.append(sessionItem(s)));
  wrap.append(box);
  return wrap;
}

export function sessionItem(s) {
  const mins = Math.round((s.duration || 0) / 60) || 1;
  const lines = s.lines?.length || 0;
  return el('button', { class: 'item', onClick: () => nav('/session/' + s.id) },
    el('div', { class: 'ico', html: I.wave }),
    el('div', { class: 'grow' },
      el('div', { class: 't ellip', text: s.title || L.t('untitled') }),
      el('div', { class: 's', text: `${fmtAgo(s.createdAt, L.lang)} · ${mins} ${L.t('mins')} · ${lines} 句${s.digest ? ' · ' + L.t('digest') : ''}` })),
    el('span', { class: 'chev', html: I.chevron }));
}

/* ---------- live card ---------- */
function liveCard() {
  const lines = el('div', { class: 'live-lines', id: 'liveLines' });
  st.lines.forEach((ln, i) => lines.append(lineEl(ln, i)));
  if (st.interim) lines.append(el('div', { class: 'line interim', id: 'interimLine' },
    el('span', { class: 'ts', text: fmtClock(st.elapsed).slice(0, 5) }),
    el('span', { class: 'tx', text: st.interim })));
  st.refs.lines = lines;
  const assist = el('div', { class: 'assist', id: 'assistBox', style: 'display:none' });
  st.refs.assist = assist;
  if (!st.lines.length && !st.interim) {
    lines.append(el('div', { class: 'center dim small', style: 'padding:18px 0', text: L.t('listening') + '…' }));
  }
  return el('div', { class: 'live-card' }, lines, assist);
}

function lineEl(ln, idx) {
  return el('div', { class: 'line', dataset: { i: idx } },
    el('span', { class: 'ts', text: fmtClock(ln.t).slice(0, 5) }),
    el('span', { class: 'tx' },
      el('span', { text: ln.text }),
      ln.mark ? el('span', { class: 'mark', text: '★' }) : null,
      ln.tr ? el('span', { class: 'tr', text: ln.tr }) : null));
}

function manualInputIfNeeded() {
  if (!st.manual) return null;
  const ta = el('textarea', { class: 'input', rows: 3, placeholder: L.t('importPlaceholder'), style: 'margin-top:12px' });
  let t = null;
  ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => commitManual(ta), 1100); });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitManual(ta); } });
  st.refs.manual = ta;
  return el('div', {},
    el('div', { class: 'tiny dim', style: 'margin-top:14px;text-align:center', text: '点输入框，再用键盘上的麦克风说话；停顿会自动切句' }), ta);
}

function commitManual(ta) {
  const raw = (ta.value || '').trim();
  if (!raw) return;
  ta.value = '';
  splitSentences(raw).forEach(p => pushLine(p));
}

/* ---------- record lifecycle ---------- */
async function startRec() {
  const s = store.settings;
  st.session = { id: uid('ses'), title: '', lines: [], lang: s.recognitionLang, folderId: null };
  st.lines = []; st.interim = ''; st.elapsed = 0; st.paused = false;
  st.startedAt = Date.now(); st.on = true;

  const canSeg = !!(s.asrEndpoint && s.asrKey);
  const liveOk = hasLiveSpeech() && s.engine !== 'manual' && s.engine !== 'whisper';
  st.seg = !liveOk && canSeg;                       // 分片转写（iOS 主力路径）
  st.manual = (s.engine === 'manual') || (!liveOk && !canSeg);
  reRender(); // paint the recording UI right away — never wait on the mic

  if (liveOk) {
    st.live = makeLive(
      txt => pushLine(txt),
      txt => onInterim(txt),
      err => { if (err === 'denied') { st.manual = true; toast(L.t('micDenied'), 3200); reRender(); } },
      s.recognitionLang);
    if (st.live) st.live.start();
    else if (canSeg) { st.seg = true; st.manual = false; }
    else { st.manual = true; toast(L.t('noSpeech'), 3200); reRender(); }
  } else if (st.seg) {
    toast('分片转写模式：约 6 秒一句，边说边出文字+译文', 4000);
    setTimeout(() => {
      if (st.on && !st.lines.length) toast('如果一直没出字，停止录音后会整段转写（分片转写个别浏览器不支持）', 5000);
    }, 12000);
  }

  // audio capture runs in the background: playback + chunked ASR are optional extras
  (async () => {
    try {
      st.rec = makeRecorder();
      const wantChunks = st.seg || (s.engine === 'whisper' && canSeg);
      const timeslice = st.seg ? 6000 : 15000;
      await Promise.race([
        st.rec.start(wantChunks ? blob => onAudioChunk(blob) : null, lvl => { st.level = lvl; }, timeslice),
        sleep(5000),
      ]);
    } catch (e) {
      st.rec = null;
      if (/NotAllowed|no-mic-api/.test(String(e))) toast(L.t('micDenied'), 3200);
    }
  })();
}

function onInterim(txt) {
  st.interim = txt;
  const box = st.refs.lines; if (!box) return;
  let line = $('#interimLine', box);
  if (!line) { line = el('div', { class: 'line interim', id: 'interimLine' }); box.append(line); }
  line.innerHTML = `<span class="ts">${fmtClock(st.elapsed).slice(0, 5)}</span><span class="tx">${esc(txt)}</span>`;
  box.scrollTop = box.scrollHeight;
}

async function onAudioChunk(blob) {
  const s = store.settings;
  if (!s.asrEndpoint || !s.asrKey) { toast('转写未配置：先打开一次配置链接', 5000); return; }
  if (!blob || blob.size < 1000) { console.warn('chunk too small', blob && blob.size); return; }
  try {
    const txt = await transcribeBlob(blob, { endpoint: s.asrEndpoint, key: s.asrKey, model: s.asrModel, language: s.recognitionLang });
    if (txt) pushLine(txt);
    else console.warn('empty transcript for chunk');
  } catch (e) {
    const msg = String(e.message || e);
    console.warn('chunk asr failed', msg);
    toast('转写失败：' + msg.slice(0, 80), 5000);
  }
}

function pushLine(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return;
  const ln = { t: st.elapsed, text: clean, tr: '', mark: false };
  st.lines.push(ln);
  st.interim = '';
  const idx = st.lines.length - 1;
  const box = st.refs.lines;
  if (box) {
    $('#interimLine', box)?.remove();
    $('.center.dim.small', box)?.remove();
    box.append(lineEl(ln, idx));
    box.scrollTop = box.scrollHeight;
  }
  const s = store.settings;
  // 单向翻译：按「翻译目标」翻（方向可在录音页用 ⇄ 一键对调）
  if (s.autoTranslate && s.targetLang) {
    translateText(ln.text, s.targetLang, 'auto').then(tr => {
      if (!tr) return;
      if (tr.trim() === ln.text.trim()) return;
      ln.tr = tr;
      const tx = st.refs.lines?.querySelector(`.line[data-i="${idx}"] .tx`);
      if (tx && !$('.tr', tx)) tx.append(el('span', { class: 'tr', text: tr }));
    }).catch(e => console.warn('translate failed', e));
  }
  maybeAssist();
}

function maybeAssist() {
  if (st.lines.length % 3 !== 0 || !st.refs.assist) return;
  const last3 = st.lines.slice(-3).map(l => l.text).join(' ');
  const kw = (last3.match(/[A-Za-z\u4e00-\u9fff]{2,6}/g) || []).slice(0, 6);
  const isAction = /(作业|提交|截止|考试|复习|预习|deadline|homework|due|exam|submit)/i.test(last3);
  const q = isAction ? '作业的具体要求和截止时间是什么？' : `${kw[0] || '这部分'}想表达的核心是什么？`;
  const box = st.refs.assist;
  box.style.display = 'block';
  box.innerHTML = `<b>${L.t('assist')}</b> ${isAction ? '这句像一条作业要求。' : ''}可以追问：${esc(q)}`;
  box.onclick = () => openAssistSheet();
}

function openAssistSheet() {
  const recent = st.lines.slice(-6).map(l => l.text).join(' ');
  const questions = [
    '帮我总结刚才讲的重点',
    '老师布置了什么作业？截止时间？',
    `「${(recent.split(/[。！？.!?]/)[0] || '这段').slice(0, 18)}」是什么意思`,
    '把刚才的内容翻成英文',
  ];
  sheet({
    title: L.t('assist'),
    body: el('div', { class: 'stack sm' }, ...questions.map(q => el('button', {
      class: 'item', style: 'border-radius:12px;border:1px solid var(--line)',
      html: `<div class="grow t" style="font-weight:520;font-size:14.5px">${esc(q)}</div><span class="chev">${I.copy}</span>`,
      onClick: () => copyText(q),
    }))),
  });
}

function pauseRec() {
  st.paused = true; st.elapsed = (Date.now() - st.startedAt) / 1000;
  st.rec?.pause(); st.live?.stop(); stopLoops(); reRender();
}
function resumeRec() {
  st.paused = false; st.startedAt = Date.now() - st.elapsed * 1000;
  st.rec?.resume(); st.live?.start(); startLoops(); reRender();
}

async function stopRec() {
  const lines = st.lines.slice();
  const duration = Math.max(st.elapsed, (Date.now() - st.startedAt) / 1000);
  st.on = false; st.paused = false;
  st.live?.stop(); stopLoops();
  let blob = null;
  try {
    const r = await Promise.race([st.rec?.stop() ?? Promise.resolve(null), sleep(4000)]);
    blob = r?.blob || null;
  } catch {}
  st.rec = null; st.live = null; st.level = 0;
  if (!lines.length && !blob) { toast(L.t('nothingToCopy')); reRender(); return; }

  const session = store.addSession({
    title: suggestTitle(lines) || L.t('newSessionTitle'),
    lines: lines.map(l => ({ ...l })),
    duration, lang: store.settings.recognitionLang, targetLang: store.settings.targetLang,
    audioId: null, folderId: null,
  });
  if (blob) { session.audioId = session.id; await audioStore.put(session.id, blob); }
  if (store.settings.autoDigest && lines.length) session.digest = localDigest(session);
  store.save();

  // 录音后自动转写：没有实时识别（iOS）时，把整段音频送去转写
  const cfg = store.settings;
  if (blob && !lines.length) {
    const useLocal = cfg.engine === 'local' || !(cfg.asrEndpoint && cfg.asrKey);
    toast(useLocal ? '正在用本地模型转写（首次需下载模型）…' : '正在转写录音…', 5000);
    try {
      let txt = '';
      if (useLocal) {
        txt = await transcribeLocal(blob, {
          model: cfg.localModel || 'whisper-base',
          language: cfg.recognitionLang,
          onProgress: m => toast(m, 3000),
        });
      } else {
        txt = await transcribeBlob(blob, {
          endpoint: cfg.asrEndpoint, key: cfg.asrKey, model: cfg.asrModel, language: cfg.recognitionLang,
        });
      }
      const parts = splitSentences(txt || '');
      if (parts.length) {
        const step = Math.max(2, Math.round((duration || parts.length * 4) / parts.length));
        session.lines = parts.map((t, i) => ({ t: i * step, text: t, tr: '', mark: false }));
        session.digest = localDigest(session);
        session.title = suggestTitle(session.lines) || session.title;
        store.save();
        toast(`已转写 ${parts.length} 句`);
      }
    } catch (e) {
      toast('自动转写失败：' + String(e.message || e).slice(0, 70), 5000);
    }
  }

  st.session = null; st.lines = []; st.interim = ''; st.elapsed = 0;
  toast(L.t('recordingSaved'));
  nav('/session/' + session.id);
}

function markMoment() {
  const ln = st.lines[st.lines.length - 1];
  if (!ln) { toast(L.t('nothingToCopy')); return; }
  ln.mark = !ln.mark;
  const i = st.lines.length - 1;
  const tx = st.refs.lines?.querySelector(`.line[data-i="${i}"] .tx`);
  if (tx) {
    $('.mark', tx)?.remove();
    if (ln.mark) tx.append(el('span', { class: 'mark', text: '★' }));
  }
  toast(ln.mark ? `${L.t('marked')} · ${fmtClock(ln.t).slice(0, 5)}` : L.t('mark'));
}

/* ---------- loops ---------- */
function startLoops() {
  stopLoops();
  st.timer = setInterval(() => {
    if (!st.on || st.paused) return;
    st.elapsed = (Date.now() - st.startedAt) / 1000;
    if (st.refs.time) {
      st.refs.time.textContent = fmtClock(st.elapsed);
      st.refs.ms.textContent = String(Math.floor((st.elapsed % 1) * 10));
    }
  }, 200);
  const tick = () => {
    const wave = st.refs.wave;
    if (wave) {
      const bars = wave.children;
      for (let i = 0; i < bars.length; i++) {
        if (!st.on) {
          bars[i].style.height = IDLE_BARS[i] + 'px';
          bars[i].classList.remove('hot');
          continue;
        }
        const base = st.paused ? 0 : st.level;
        const h = 4 + Math.pow(Math.random(), 1.7) * 30 * (0.28 + base);
        bars[i].style.height = Math.min(36, h).toFixed(0) + 'px';
        bars[i].classList.toggle('hot', h > 20);
      }
    }
    st.raf = requestAnimationFrame(() => setTimeout(tick, 90));
  };
  tick();
}
function stopLoops() {
  clearInterval(st.timer); st.timer = null;
  if (st.raf) cancelAnimationFrame(st.raf);
  st.raf = null;
}

function reRender() {
  const p = location.hash.replace(/^#/, '') || '/';
  if (p !== '/') return;
  render().then(r => { const v = $('#view'); if (v) { v.innerHTML = ''; v.append(r.node); } });
}

/* ---------- fullscreen subtitles ---------- */
function openFullscreen() {
  const host = el('div', { id: 'fsz' });
  const linesBox = el('div', { class: 'f-lines' });
  linesBox.style.fontSize = ((store.settings.subtitleSize || 20) * 1.45) + 'px';
  const close = el('button', { style: 'color:#fff;display:grid', html: I.close, 'aria-label': 'close', onClick: () => { clearInterval(iv); host.remove(); } });
  host.append(linesBox, el('div', { class: 'f-bar' },
    el('span', { text: L.t('recording') + ' · ' + fmtClock(st.elapsed) }),
    close));
  document.body.append(host);
  const paint = () => {
    const last = st.lines.slice(-2);
    linesBox.innerHTML = '';
    if (!last.length) { linesBox.append(el('div', { class: 'old', text: L.t('tapToStart') })); return; }
    last.forEach((l, i) => {
      linesBox.append(el('div', { class: i === last.length - 1 ? 'cur' : 'old' },
        el('div', { text: l.text }),
        l.tr ? el('div', { class: 'trl', text: l.tr }) : null));
    });
  };
  paint();
  const iv = setInterval(paint, 900);
  host.addEventListener('click', e => { if (e.target === linesBox) host.remove(); });
}
