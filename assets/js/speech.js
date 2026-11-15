/* ============ speech: live recognition, recorder, chunked ASR, level meter ============ */
import { store, audioStore, uid, toast } from './core.js';

export const hasLiveSpeech = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function makeRecorder() {
  let media = null, rec = null, stream = null, chunks = [], startedAt = 0, timer = null;
  let analyser = null, ac = null, rafId = null, level = 0;
  const state = { recording: false, paused: false, mime: '' };

  const pickMime = () => {
    const c = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const m of c) if (window.MediaRecorder?.isTypeSupported?.(m)) return m;
    return '';
  };

  async function start(onChunk, onLevel, timeslice = 15000) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-mic-api');
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    state.mime = pickMime();
    chunks = [];
    rec = state.mime ? new MediaRecorder(stream, { mimeType: state.mime, audioBitsPerSecond: 64000 })
      : new MediaRecorder(stream);
    state.mime = rec.mimeType || state.mime || 'audio/webm';
    rec.ondataavailable = e => { if (e.data && e.data.size) { chunks.push(e.data); onChunk && onChunk(e.data); } };
    rec.start(timeslice); // 分片：既用于分片转写，也用于最终成片
    startedAt = Date.now();
    state.recording = true; state.paused = false;

    // level meter
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = ac.createMediaStreamSource(stream);
      analyser = ac.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i];
        level = Math.min(1, (sum / buf.length) / 90);
        onLevel && onLevel(level);
        rafId = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { /* level meter optional */ }
  }

  function pause() { if (rec && rec.state === 'recording') { rec.pause(); state.paused = true; stopLevel(); } }
  function resume() {
    if (rec && rec.state === 'paused') { rec.resume(); state.paused = false; }
    else if (state.mime && rec && rec.state === 'inactive') { try { rec.start(6000); state.paused = false; } catch {} }
  }
  function stopLevel() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  async function stop() {
    stopLevel();
    const out = await new Promise(res => {
      if (!rec) return res(null);
      if (rec.state === 'inactive') return res(chunks.length ? new Blob(chunks, { type: rec.mimeType || state.mime }) : null);
      rec.onstop = () => res(chunks.length ? new Blob(chunks, { type: rec.mimeType || state.mime }) : null);
      try { rec.stop(); } catch { res(null); }
    });
    stream?.getTracks().forEach(t => t.stop());
    try { ac?.close(); } catch {}
    state.recording = false; state.paused = false;
    return { blob: out, duration: (Date.now() - startedAt) / 1000, mime: state.mime };
  }

  return { state, start, pause, resume, stop, get level() { return level; } };
}

/* live recognizer (Chrome/Edge/Safari tech-preview only) */
export function makeLive(onFinal, onInterim, onError, lang) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = true; r.interimResults = true; r.lang = lang || 'zh-CN'; r.maxAlternatives = 1;
  let want = false;
  r.onresult = ev => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (res.isFinal) {
        const txt = (res[0].transcript || '').trim();
        if (txt) onFinal && onFinal(txt);
      } else interim += res[0].transcript || '';
    }
    if (interim) onInterim && onInterim(interim);
  };
  r.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { want = false; onError && onError('denied'); }
    else if (e.error === 'no-speech' || e.error === 'aborted') { /* benign */ }
    else onError && onError(e.error);
  };
  r.onend = () => { if (want) { try { r.start(); } catch {} } };
  return {
    start() { want = true; try { r.start(); } catch {} },
    stop() { want = false; try { r.stop(); } catch {} },
    setLang(l) { r.lang = l; },
  };
}

/* chunked upload ASR against an OpenAI-compatible /audio/transcriptions endpoint */
export async function transcribeBlob(blob, { endpoint, key, model, language }) {
  if (!endpoint) throw new Error('no-endpoint');
  const base = endpoint.replace(/\/+$/, '');
  const url = /\/audio\/transcriptions$/.test(base) ? base : base + '/audio/transcriptions';
  const fd = new FormData();
  const ext = (blob.type || '').includes('mp4') ? 'm4a' : 'webm';
  fd.append('file', blob, 'chunk.' + ext);
  fd.append('model', model || 'whisper-1');
  // 不强行指定语言：SenseVoice / Whisper 都会自动检测，指定错语言反而识别成错的
  if (language && language !== 'auto' && language !== 'zh-CN' && language !== 'zh-TW') {
    fd.append('language', language.split('-')[0]);
  }
  const headers = {};
  if (key) headers.Authorization = 'Bearer ' + key;
  const res = await fetch(url, { method: 'POST', headers, body: fd });
  if (!res.ok) throw new Error('asr ' + res.status + ' ' + (await res.text()).slice(0, 160));
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) { const j = await res.json(); return (j.text || j.result || '').trim(); }
  return (await res.text()).trim();
}

/* sentence splitter for pasted text / dictation mode */
export function splitSentences(text) {
  const t = String(text).replace(/\r/g, '').replace(/\n{2,}/g, '\n').trim();
  if (!t) return [];
  const parts = t.split(/(?<=[.!?。！？；;])\s*|\n+/).map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.length > 260) {
      // long paragraph: split on commas as a fallback
      const acc = p.split(/(?<=[，,、])\s*/).reduce((a, c) => {
        if ((a + c).length > 260 && a) { out.push(a.trim()); return c; }
        return a + c;
      }, '');
      if (acc.trim()) out.push(acc.trim());
    } else out.push(p);
  }
  return out;
}

/* simple sentence-level translation queue with cache */
const trCache = new Map();
export async function translateText(text, to, from = 'auto') {
  const key = from + '|' + to + '|' + text;
  if (trCache.has(key)) return trCache.get(key);
  const cached = readCache(key); if (cached) { trCache.set(key, cached); return cached; }
  const sl = (from || 'auto').split('-')[0], tl = (to || 'en').split('-')[0];
  let out = '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url, { mode: 'cors' });
    if (r.ok) {
      const j = await r.json();
      out = (j?.[0] || []).map(x => x?.[0] || '').join('').trim();
    }
  } catch {}
  if (!out) {
    try {
      const r2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 480))}&langpair=${sl === 'auto' ? 'zh' : sl}|${tl}`);
      if (r2.ok) { const j2 = await r2.json(); out = j2?.responseData?.translatedText || ''; }
    } catch {}
  }
  if (out) { trCache.set(key, out); writeCache(key, out); }
  return out;
}
function readCache(k) { try { return JSON.parse(localStorage.getItem('lcs.tr') || '{}')[k]; } catch { return ''; } }
function writeCache(k, v) {
  try {
    const o = JSON.parse(localStorage.getItem('lcs.tr') || '{}');
    o[k] = v; const ks = Object.keys(o);
    if (ks.length > 800) ks.slice(0, ks.length - 800).forEach(x => delete o[x]);
    localStorage.setItem('lcs.tr', JSON.stringify(o));
  } catch {}
}

export async function translateLines(lines, to, from = 'auto', onEach) {
  const out = [];
  const q = [...lines];
  const workers = Array.from({ length: 3 }, async () => {
    while (q.length) {
      const item = q.shift(); if (!item) break;
      let tr = '';
      try { tr = await translateText(item.text, to, from); } catch {}
      if (tr) onEach && onEach(item, tr);
      out.push(tr);
    }
  });
  await Promise.all(workers);
  return out;
}
