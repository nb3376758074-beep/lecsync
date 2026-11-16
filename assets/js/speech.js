/* ============ speech: live recognition, recorder, chunked ASR, level meter ============ */
import { store, audioStore, uid, toast } from './core.js?v=2.2.1';

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
/* ---------- 本地 Whisper（transformers.js，纯浏览器推理，不花钱、不用 key） ---------- */
const CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
let tf = null, asrPipe = null, asrModel = null;

async function loadTransformers(onProgress) {
  if (tf) return tf;
  onProgress && onProgress('正在加载本地识别引擎（首次约 5MB）…');
  tf = await import(/* @vite-ignore */ CDN);
  tf.env.allowLocalModels = false;
  tf.env.allowRemoteModels = true;
  if (tf.env.backends?.onnx?.wasm) {
    tf.env.backends.onnx.wasm.wasmPaths = CDN + '/dist/';
  }
  return tf;
}

async function getAsr(model = 'Xenova/whisper-tiny', onProgress) {
  const t = await loadTransformers(onProgress);
  if (asrPipe && asrModel === model) return asrPipe;
  const build = async () => t.pipeline('automatic-speech-recognition', model, {
    quantized: true,
    progress_callback: p => {
      if (p && p.status === 'progress' && p.total) {
        onProgress && onProgress(`下载模型 ${Math.round((p.loaded / p.total) * 100)}%`);
      }
    },
  });
  onProgress && onProgress('首次使用要下载模型（约 40MB），之后会缓存…');
  try {
    asrPipe = await build();
  } catch (e) {
    // 直连 huggingface 失败时换镜像再试一次
    onProgress && onProgress('直连失败，改用镜像下载…');
    t.env.remoteHost = 'https://hf-mirror.com';
    asrPipe = await build();
  }
  asrModel = model;
  return asrPipe;
}

async function blobTo16k(blob) {
  const buf = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let audio;
  try { audio = await ctx.decodeAudioData(buf.slice(0)); }
  finally { try { ctx.close(); } catch {} }
  const targetRate = 16000;
  const frameCount = Math.ceil(audio.duration * targetRate);
  const off = new OfflineAudioContext(1, frameCount, targetRate);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start(0);
  const rendered = await off.startRendering();
  return rendered.getChannelData(0);
}

/** 本地转写：返回识别文本。onProgress(阶段文字) */
export async function transcribeLocal(blob, { model = 'Xenova/whisper-tiny', language = null, onProgress } = {}) {
  const pipe = await getAsr(model, onProgress);
  onProgress && onProgress('解码音频…');
  const audio = await blobTo16k(blob);
  onProgress && onProgress('本地识别中（比云端慢，请稍等）…');
  const opts = { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe' };
  if (language && language !== 'auto') opts.language = language.split('-')[0];
  const out = await pipe(audio, opts);
  return (out?.text || '').trim();
}

let googleDead = 0; // 0=未知 1=可用 2=挂了
const LANG_ZH = { zh: '简体中文', en: '英文', ru: '俄语', ja: '日语', ko: '韩语', de: '德语', fr: '法语', es: '西班牙语', it: '意大利语', pt: '葡萄牙语', ar: '阿拉伯语', tr: '土耳其语', uk: '乌克兰语', hi: '印地语', th: '泰语', vi: '越南语', id: '印尼语', pl: '波兰语', nl: '荷兰语' };

async function llmTranslate(text, to) {
  const s = store.settings;
  // 优先用「AI 模型」那套配置（可单独接 DeepSeek / 豆包 / 百炼），没有再退回转写接口的 key
  const useAi = !!(s.aiEndpoint && s.aiKey);
  const base = (useAi ? s.aiEndpoint : s.asrEndpoint || '').replace(/\/+$/, '');
  const key = useAi ? s.aiKey : s.asrKey;
  const model = useAi ? (s.aiModel || 'deepseek-chat') : (s.translateModel || 'deepseek-ai/DeepSeek-V4-Flash');
  if (!base || !key) return '';
  const url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
  const targetName = LANG_ZH[(to || 'zh').split('-')[0]] || to;
  const body = {
    model,
    messages: [
      { role: 'system', content: `You are a translator. Translate the user's text into ${targetName}. Output ONLY the translation, no explanations, no quotes.` },
      { role: 'user', content: text },
    ],
    temperature: 0.2,
    max_tokens: 600,
    stream: false,
  };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) { console.warn('llm translate http', r.status, (await r.text()).slice(0, 120)); return ''; }
    const j = await r.json();
    return (j?.choices?.[0]?.message?.content || '').trim().replace(/^["“]|["”]$/g, '');
  } catch (e) { console.warn('llm translate failed', e); return ''; }
  finally { clearTimeout(timer); }
}

/* 按字符集猜源语言（MyMemory 这类接口不支持 auto 检测） */
function guessLang(text) {
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  return 'en';
}

/* MyMemory：国内可直连、带 ACAO:* ，但有每日免费额度 */
async function myMemoryTranslate(text, from, to) {
  const src = from && from !== 'auto' ? from.split('-')[0] : guessLang(text);
  const q = encodeURIComponent(text.slice(0, 480));
  const deadline = 6000;
  const attempt = async (s, t) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), deadline);
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${q}&langpair=${s}|${t}`, { signal: ctl.signal });
      if (!r.ok) return '';
      const j = await r.json();
      const v = (j?.responseData?.translatedText || '').trim();
      if (!v || /MYMEMORY WARNING|QUOTA|INVALID/i.test(v)) return '';
      return v;
    } catch { return ''; }
    finally { clearTimeout(timer); }
  };
  return (await attempt(src, to)) || (await attempt('en', to));
}

export async function translateText(text, to, from = 'auto') {
  const key = from + '|' + to + '|' + text;
  if (trCache.has(key)) return trCache.get(key);
  const cached = readCache(key); if (cached) { trCache.set(key, cached); return cached; }
  const sl = (from || 'auto').split('-')[0], tl = (to || 'en').split('-')[0];
  let out = '';

  // 1) Google（快，但中国大陆不可用、俄区不稳）
  if (googleDead !== 2) {
    try {
      const ctl = new AbortController();
      // 首次探测给 2.5s（国内 Google 直接不通，别让每句都卡 5 秒）
      const t = setTimeout(() => ctl.abort(), googleDead === 0 ? 2500 : 5000);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
      const r = await fetch(url, { mode: 'cors', signal: ctl.signal });
      clearTimeout(t);
      if (r.ok) {
        const j = await r.json();
        out = (j?.[0] || []).map(x => x?.[0] || '').join('').trim();
        if (out) googleDead = 1;
      } else { googleDead = 2; }
    } catch { googleDead = 2; }
  }

  // 2) 自己配的大模型（质量最好，且国内/俄区都能连）
  if (!out) {
    const s = store.settings;
    if ((s.aiEndpoint && s.aiKey) || (s.asrEndpoint && s.asrKey)) {
      try { out = await llmTranslate(text, to); } catch {}
    }
  }

  // 3) MyMemory（免 key，国内可直连，但质量一般、有每日额度）
  if (!out) {
    try { out = await myMemoryTranslate(text, from, to); } catch {}
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
