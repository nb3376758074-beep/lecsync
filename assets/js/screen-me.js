/* ============ screens: Profile / Settings / Pro / Team / Voice / Models / About ============ */
import { el, I, L, store, toast, fmtDate, fmtDur, bytes, audioStore, langName, uid, LANGS } from './core.js?v=2.2.0';
import { header, nav, sheet, confirmBox, promptBox, pickLanguage, copyText, shareText, refresh } from './ui.js?v=2.2.0';
import { llmReady } from './ai.js?v=2.2.0';
import { translateText } from './speech.js?v=2.2.0';

function rerender() { refresh(); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const item = ({ icon, title, sub, onClick, right, danger }) => el('button', { class: 'item', onClick },
  icon ? el('div', { class: 'ico', html: icon, style: danger ? 'color:var(--live)' : '' }) : null,
  el('div', { class: 'grow' },
    el('div', { class: 't', text: title, style: danger ? 'color:var(--live)' : '' }),
    sub ? el('div', { class: 's ellip', text: sub }) : null),
  right || el('span', { class: 'chev', html: I.chevron }));

function switchRow({ title, sub, on, onToggle }) {
  const sw = el('div', { class: 'switch' + (on ? ' on' : '') });
  const b = el('button', { class: 'item', onClick: () => { onToggle(!on); rerender(); } },
    el('div', { class: 'grow' }, el('div', { class: 't', text: title }), sub ? el('div', { class: 's', text: sub }) : null), sw);
  return b;
}

/* ---------------- Profile ---------------- */
export async function profile() {
  const s = store.settings, p = store.data.profile;
  const sessions = store.sessions;
  const totalSec = sessions.reduce((a, x) => a + (x.duration || 0), 0);
  const words = sessions.reduce((a, x) => a + (x.lines || []).reduce((b, l) => b + (l.text || '').replace(/\s/g, '').length, 0), 0);

  const root = el('div', {});
  root.append(header({ title: L.t('tabProfile'), actions: [{ icon: I.settings, label: 'settings', onClick: () => nav('/settings') }] }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  body.append(el('div', { class: 'row', style: 'gap:14px;margin:10px 0 18px' },
    el('div', { class: 'avatar', text: (p.name || 'L').slice(0, 1).toUpperCase() }),
    el('div', { class: 'grow' },
      el('div', { style: 'font-size:19px;font-weight:700;letter-spacing:-.02em', text: p.name || (L.isZh ? '本地用户' : 'Local user') }),
      el('div', { class: 'tiny dim ellip', text: p.email || L.t('synced') })),
    el('button', { class: 'chip', text: 'Pro', onClick: () => nav('/pro') })));

  const hero = el('div', { class: 'hero-card', onClick: () => nav('/pro'), style: 'cursor:pointer' },
    el('div', { class: 't', text: L.t('proTitle') }),
    el('div', { class: 's', text: L.t('proSub') }),
    el('div', { class: 'row', style: 'gap:16px;margin-top:16px;position:relative' },
      stat(Math.round(totalSec / 60), L.t('statMinutes')),
      stat(sessions.length, L.t('statSessions')),
      stat(words >= 1000 ? (words / 1000).toFixed(1) + 'k' : words, L.t('statWords'))),
    el('div', { class: 'wave-deco', html: '<svg viewBox="0 0 48 48" fill="none"><path d="M4 34c6-2 8-10 12-10s6 8 10 8 6-12 10-12 6 4 8 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>' }));
  body.append(hero);

  body.append(el('div', { class: 'list', style: 'margin-top:18px' },
    item({ icon: I.crown, title: L.t('proTitle'), sub: L.t('unlimited'), onClick: () => nav('/pro') }),
    item({ icon: I.users, title: L.t('team'), sub: store.data.team?.name || L.t('teamEmpty'), onClick: () => nav('/team') }),
    item({ icon: I.gift, title: L.t('invite'), sub: store.data.team?.code || '邀请成员加入团队', onClick: () => nav('/invite') }),
    item({ icon: I.key, title: L.t('redeem'), sub: L.t('redeemHint'), onClick: () => nav('/redeem') }),
    item({ icon: I.archive, title: L.t('sharedWithMe'), onClick: () => nav('/shared') }),
  ));

  body.append(el('div', { class: 'list', style: 'margin-top:12px' },
    item({ icon: I.headphones, title: L.t('myVoice'), sub: L.t('voiceHint').slice(0, 30) + '…', onClick: () => nav('/voice') }),
    item({ icon: I.download2, title: L.t('offlineModels'), sub: (s.downloadedModels || []).length + ' ' + L.t('downloaded'), onClick: () => nav('/models') }),
    item({ icon: I.trash, title: L.t('trash'), sub: (store.data.trash || []).length + ' 项', onClick: () => nav('/trash') }),
  ));

  body.append(el('div', { class: 'list', style: 'margin-top:12px' },
    item({ icon: I.settings, title: L.t('settings'), onClick: () => nav('/settings') }),
    item({ icon: I.lock, title: L.t('privacy'), onClick: () => nav('/privacy') }),
    item({ icon: I.info, title: L.t('about'), sub: 'v1.0 · web', onClick: () => nav('/about') }),
  ));

  const storageLine = el('div', { class: 'tiny dim center', style: 'margin-top:18px;line-height:1.6' },
    `${L.t('storage')} · 0 B · ${sessions.length} ${L.t('files')}`,
    el('br'), L.t('synced'));
  body.append(storageLine);
  // audio usage loads async (never blocks the screen)
  audioStore.size().then(n => {
    if (n) storageLine.firstChild.textContent = `${L.t('storage')} · ${bytes(n)} · ${sessions.length} ${L.t('files')}`;
  }).catch(() => {});
  return { node: root, title: L.t('tabProfile') };
}

const stat = (n, l) => el('div', { class: 'stat', style: 'position:relative' },
  el('div', { class: 'n', text: String(n) }), el('div', { class: 'l', text: l }));

/* ---------------- Settings ---------------- */
export async function settings() {
  const s = store.settings;
  const root = el('div', {});
  root.append(header({ title: L.t('settings'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  body.append(el('div', { class: 'list', style: 'margin-top:10px' },
    item({
      icon: I.globe, title: L.t('language'), right: el('span', { class: 'val', text: L.isZh ? '中文' : 'English' }),
      onClick: () => sheet({
        title: L.t('language'),
        actions: [
          { label: '中文（简体）', onClick: () => { s.uiLang = 'zh'; store.save(); L.set('zh'); document.documentElement.lang = 'zh-CN'; location.reload(); } },
          { label: 'English', onClick: () => { s.uiLang = 'en'; store.save(); L.set('en'); document.documentElement.lang = 'en'; location.reload(); } },
        ],
      }),
    }),
    item({
      icon: I.moon, title: L.t('theme'),
      right: el('span', { class: 'val', text: s.theme === 'auto' ? L.t('themeAuto') : s.theme === 'dark' ? L.t('themeDark') : L.t('themeLight') }),
      onClick: () => sheet({
        title: L.t('theme'),
        actions: [
          ['auto', L.t('themeAuto')], ['light', L.t('themeLight')], ['dark', L.t('themeDark')],
        ].map(([v, label]) => ({
          label: (s.theme === v ? '✓ ' : '') + label,
          onClick: () => { s.theme = v; store.save(); document.documentElement.dataset.theme = v; rerender(); },
        })),
      }),
    }),
    item({
      icon: I.type, title: L.t('subtitleSize'), right: el('span', { class: 'val', text: s.subtitleSize + ' px' }),
      onClick: () => sheet({
        title: L.t('subtitleSize'),
        body: el('div', { class: 'stack' }, el('input', {
          type: 'range', min: 14, max: 30, step: 1, value: s.subtitleSize,
          onInput: e => { s.subtitleSize = Number(e.target.value); store.save(); },
        })),
        actions: [{ label: L.t('ok'), kind: 'primary', onClick: () => rerender() }],
      }),
    }),
  ));

  body.append(el('div', { class: 'list', style: 'margin-top:12px' },
    item({
      icon: I.mic, title: L.t('recognitionLang'), right: el('span', { class: 'val', text: langName(s.recognitionLang, L.lang) }),
      onClick: () => pickLanguage({ value: s.recognitionLang, onPick: c => { s.recognitionLang = c; store.save(); rerender(); } }),
    }),
    item({
      icon: I.translate, title: L.t('targetLang'), right: el('span', { class: 'val', text: langName(s.targetLang, L.lang) }),
      onClick: () => pickLanguage({ value: s.targetLang, onPick: c => { s.targetLang = c; store.save(); rerender(); } }),
    }),
    switchRow({ title: L.t('autoTranslate'), sub: L.t('bilingual'), on: s.autoTranslate, onToggle: v => { s.autoTranslate = v; store.save(); } }),
    switchRow({ title: L.t('autoDigest'), sub: '录音结束后自动生成纪要', on: s.autoDigest, onToggle: v => { s.autoDigest = v; store.save(); } }),
    switchRow({ title: L.t('bilingual'), on: s.bilingual, onToggle: v => { s.bilingual = v; store.save(); } }),
  ));

  body.append(el('div', { class: 'list', style: 'margin-top:12px' },
    item({
      icon: I.bolt, title: L.t('engine'),
      right: el('span', { class: 'val', text: s.engine === 'whisper' ? 'Whisper' : s.engine === 'manual' ? L.t('engineManual') : 'Auto' }),
      onClick: () => sheet({
        title: L.t('engine'),
        actions: [
          { label: L.t('engineBrowser'), onClick: () => { s.engine = 'browser'; store.save(); rerender(); } },
          { label: L.t('engineWhisper'), onClick: () => { s.engine = 'whisper'; store.save(); nav('/settings/asr'); } },
          { label: '本地模型（不联网、不用 key，慢一点）', onClick: () => { s.engine = 'local'; store.save(); toast('已切换到本地模型'); rerender(); } },
          { label: L.t('engineManual'), onClick: () => { s.engine = 'manual'; store.save(); rerender(); } },
        ],
      }),
    }),
    item({ icon: I.sparkle, title: 'AI 接口', sub: llmReady(s) ? s.aiModel : '未配置（本地纪要）', onClick: () => nav('/settings/ai') }),
    item({ icon: I.wave, title: '转写接口', sub: s.asrEndpoint || '未配置', onClick: () => nav('/settings/asr') }),
  ));

  body.append(el('div', { class: 'list', style: 'margin-top:12px' },
    item({ icon: I.refresh, title: '强制更新（清缓存重载）', sub: '发新版后还看到旧界面就点这个', onClick: hardReload }),
    item({ icon: I.download, title: L.t('dataExport'), onClick: exportAll }),
    item({ icon: I.upload, title: L.t('dataImport'), onClick: importAll }),
    item({ icon: I.trash, title: L.t('clearData'), danger: true, onClick: clearAll }),
  ));

  body.append(el('div', { class: 'tiny dim center', style: 'margin-top:18px' }, '皓月翻译 1.0 · ' + L.t('proTitle')));
  return { node: root, title: L.t('settings') };
}

async function hardReload() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) { console.warn(e); }
  location.replace(location.pathname + '?v=' + Date.now());
}

function exportAll() {
  const data = JSON.stringify(store.data, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = el('a', { href: url, download: `lecsync-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  toast(L.t('exportStarted'));
}
function importAll() {
  const f = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
  f.onchange = async () => {
    try {
      const txt = await f.files[0].text();
      store.import(txt); toast(L.t('imported')); setTimeout(() => location.reload(), 600);
    } catch { toast(L.t('importFail'), 3000); }
  };
  document.body.append(f); f.click();
}
async function clearAll() {
  if (await confirmBox({ title: L.t('clearData'), message: L.t('clearWarn'), danger: true, confirmLabel: L.t('delete') })) {
    localStorage.clear();
    try { indexedDB.deleteDatabase('lecsync-audio'); } catch {}
    location.hash = '/'; location.reload();
  }
}

export async function settingsSub({ sub }) {
  const s = store.settings;
  const root = el('div', {});
  root.append(header({
    title: sub === 'ai' ? 'AI 接口' : sub === 'asr' ? '转写接口' : L.t('settings'),
    back: () => nav('/settings'),
  }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);

  const field = (label, key, placeholder, type = 'text') => el('div', { class: 'field', style: 'margin-top:12px' },
    el('label', { text: label }),
    el('input', {
      class: 'input', type, placeholder, value: s[key] || '',
      onInput: e => { s[key] = e.target.value.trim(); store.save(); },
    }));

  if (sub === 'ai') {
    body.append(el('div', { class: 'card flat', style: 'margin-top:12px' },
      el('div', { class: 'small', text: '填任意 OpenAI 兼容接口即可（DeepSeek / 豆包方舟 / 阿里百炼 / OpenAI / Ollama 都行）。留空则用本地规则纪要。' })));
    body.append(providerPresets());
    body.append(field('Base URL', 'aiEndpoint', 'https://api.deepseek.com'));
    body.append(field('API Key', 'aiKey', 'sk-…', 'password'));
    body.append(field('模型', 'aiModel', 'deepseek-chat'));
    body.append(testButton('ai'));
  } else if (sub === 'asr') {
    body.append(el('div', { class: 'card flat', style: 'margin-top:12px' },
      el('div', { class: 'small', text: 'iOS Safari 没有实时语音识别接口。填一个 Whisper 兼容接口（/audio/transcriptions），就能边录边转写；不填则用键盘听写。' })));
    body.append(field('Base URL', 'asrEndpoint', 'https://api.openai.com/v1'));
    body.append(field('API Key', 'asrKey', 'sk-…', 'password'));
    body.append(field('模型', 'asrModel', 'whisper-1'));
    body.append(testButton('asr'));
    body.append(localCard());
    body.append(diagCard());
  } else {
    body.append(el('div', { class: 'small muted', style: 'margin-top:12px', text: '未知设置项' }));
  }
  return { node: root, title: L.t('settings') };
}

function providerPresets() {
  const s = store.settings;
  const P = [
    { name: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen3.5-9B', tip: '注册送额度，国内直连' },
    { name: 'DeepSeek', base: 'https://api.deepseek.com', model: 'deepseek-chat', tip: '便宜，¥1/百万字' },
    { name: '豆包·方舟', base: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-1-6-250615', tip: '有免费额度，需实名' },
    { name: '阿里百炼', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', tip: '有免费额度' },
  ];
  const row = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-top:10px' });
  P.forEach(p => {
    row.append(el('button', {
      class: 'chip ghost', text: p.name, title: p.tip,
      onClick: () => {
        s.aiEndpoint = p.base; s.aiModel = p.model; store.save();
        toast(p.name + ' 已填入：' + p.model + '，再粘贴 Key 即可');
        rerender();
      },
    }));
  });
  return el('div', { class: 'card', style: 'margin-top:12px' },
    el('div', { class: 'small', style: 'font-weight:640', text: '一键选服务商（自动填地址和模型）' }),
    row,
    el('div', { class: 'tiny dim', style: 'margin-top:8px;line-height:1.6' },
      '浏览器直连已实测可用：DeepSeek、豆包方舟、阿里百炼、硅基流动 都返回 CORS 放行头。模型名以各家控制台为准（方舟要填「接入点 ID」，形如 ep-xxxx）。'));
}

function localCard() {
  const s = store.settings;
  const on = s.engine === 'local';
  const out = el('div', { class: 'tiny dim', style: 'margin-top:8px;line-height:1.6;white-space:pre-wrap' });
  const btn = el('button', {
    class: 'btn block ' + (on ? 'primary' : 'ghost'), style: 'margin-top:10px',
    text: on ? '✓ 已启用本地模型（点击关闭）' : '改用本地模型（不联网、不用 key）',
    onClick: () => {
      s.engine = on ? 'auto' : 'local';
      store.save();
      toast(on ? '已切回云端接口' : '已启用本地模型：录音结束后在手机里识别');
      rerender();
    },
  });
  const test = el('button', {
    class: 'btn sm ghost block', style: 'margin-top:8px', text: '测试本地模型（下载并跑一次）',
    onClick: async () => {
      out.textContent = '准备中…';
      try {
        const { transcribeLocal } = await import('./speech.js?v=2.2.0');
        const blob = makeTone();
        const t0 = Date.now();
        const txt = await transcribeLocal(blob, {
          model: s.localModel || 'Xenova/whisper-tiny',
          onProgress: m => { out.textContent = m; },
        });
        out.textContent = `完成，用时 ${Math.round((Date.now() - t0) / 1000)}s\n识别结果：${txt || '(空)'}`;
      } catch (e) {
        out.textContent = '失败：' + String(e.message || e).slice(0, 200);
      }
    },
  });
  return el('div', { class: 'card', style: 'margin-top:14px' },
    el('div', { class: 'small', style: 'font-weight:640', text: '本地模型（免费，不依赖账号余额）' }),
    el('div', { class: 'tiny dim', style: 'margin-top:4px;line-height:1.6' },
      '在手机浏览器里直接运行 Whisper（WASM）。首次要下载约 40MB 模型，之后缓存；识别速度比云端慢，适合录完再转。'),
    btn, test, out);
}

/* 生成 0.8 秒正弦音，用于本地模型自检（能跑通流程即可） */
function makeTone() {
  const sr = 16000, dur = 1.0, n = sr * dur;
  const buf = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(buf);
  const ws = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 440 * i / sr) * 8000, true);
  return new Blob([buf], { type: 'audio/wav' });
}

function diagCard() {
  const out = el('pre', {
    class: 'tiny', style: 'white-space:pre-wrap;margin:10px 0 0;color:var(--text-2);line-height:1.5',
    text: '点下面的按钮做一次真实网络测试',
  });
  const btn = el('button', {
    class: 'btn ghost block', style: 'margin-top:14px', text: '诊断：翻译 + 转写',
    onClick: async () => {
      const s = store.settings;
      const lines = [];
      lines.push('目标语言: ' + s.targetLang);
      lines.push('自动翻译: ' + (s.autoTranslate ? '开' : '关'));
      lines.push('接口: ' + (s.asrEndpoint || '(空)'));
      lines.push('Key: ' + (s.asrKey ? s.asrKey.slice(0, 6) + '…' + s.asrKey.slice(-4) : '(空)'));
      out.textContent = lines.join('\n') + '\n\n翻译测试中…';
      const TL = (s.targetLang || 'zh-CN').split('-')[0];
      const SRC = 'Сегодня мы изучали линейную алгебру.';

      // ① Google
      try {
        const t0 = Date.now();
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(TL)}&dt=t&q=${encodeURIComponent(SRC)}`;
        const r = await fetch(url);
        const j = await r.json();
        const tr = (j?.[0] || []).map(x => x?.[0] || '').join('').trim();
        lines.push(`\n① Google: OK ${Date.now() - t0}ms -> ${tr || '(空)'}`);
      } catch (e) { lines.push('\n① Google: 失败 ' + String(e.message || e)); }

      // ② MyMemory（国内可直连）
      try {
        const t0 = Date.now();
        const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(SRC)}&langpair=ru|${encodeURIComponent(TL)}`);
        const j = await r.json();
        lines.push(`\n② MyMemory: HTTP ${r.status} ${Date.now() - t0}ms -> ${(j?.responseData?.translatedText || '(空)').slice(0, 60)}`);
      } catch (e) { lines.push('\n② MyMemory: 失败 ' + String(e.message || e)); }

      // ③ 大模型兜底（和转写同一个 key）
      try {
        const t0 = Date.now();
        const base = (s.asrEndpoint || '').replace(/\/+$/, '');
        const r = await fetch(base + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.asrKey },
          body: JSON.stringify({
            model: s.translateModel || 'deepseek-ai/DeepSeek-V4-Flash',
            messages: [
              { role: 'system', content: `Translate into 简体中文. Output only the translation.` },
              { role: 'user', content: SRC },
            ],
            temperature: 0.2, max_tokens: 300, stream: false,
          }),
        });
        const txt = await r.text();
        let tr = '';
        try { tr = (JSON.parse(txt)?.choices?.[0]?.message?.content || '').trim(); } catch {}
        lines.push(`\n② 大模型: HTTP ${r.status} ${Date.now() - t0}ms -> ${tr || txt.slice(0, 100)}`);
      } catch (e) { lines.push('\n② 大模型: 失败 ' + String(e.message || e)); }

      // ③ 走真实函数（含缓存/兜底链）
      try {
        const t0 = Date.now();
        const tr = await translateText(SRC, s.targetLang || 'zh-CN', 'auto');
        lines.push(`\n③ translateText(): ${Date.now() - t0}ms -> ${tr || '(空)'}`);
      } catch (e) { lines.push('\n③ translateText 失败: ' + String(e.message || e)); }

      out.textContent = lines.join('\n');
    },
  });
  return el('div', { class: 'card', style: 'margin-top:16px' },
    el('div', { class: 'small', style: 'font-weight:640', text: '诊断（把这段结果发我）' }),
    btn, out);
}

function testButton(kind) {  const out = el('div', { class: 'tiny dim', style: 'margin-top:10px' });
  const btn = el('button', {
    class: 'btn ghost block', style: 'margin-top:14px', text: L.t('testConn'),
    onClick: async () => {
      const s = store.settings;
      out.textContent = '…';
      try {
        if (kind === 'ai') {
          if (!s.aiEndpoint || !s.aiKey) throw new Error('未填地址或 Key');
          const { llmChat } = await import('./ai.js?v=2.2.0');
          const r = await llmChat([{ role: 'user', content: 'ping' }], s);
          out.textContent = '✓ ' + r.slice(0, 60);
        } else {
          if (!s.asrEndpoint) throw new Error('未填地址');
          const res = await fetch(s.asrEndpoint.replace(/\/+$/, '') + '/models', { headers: s.asrKey ? { Authorization: 'Bearer ' + s.asrKey } : {} });
          out.textContent = res.ok ? '✓ 接口可达' : '✗ HTTP ' + res.status;
        }
      } catch (e) { out.textContent = '✗ ' + String(e.message || e).slice(0, 120); }
    },
  });
  return el('div', {}, btn, out);
}

/* ---------------- Pro (unlocked) ---------------- */
export async function pro() {
  const root = el('div', {});
  root.append(header({ title: 'Pro', back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  body.append(el('div', { class: 'hero-card', style: 'margin-top:10px' },
    el('div', { class: 'row', style: 'gap:8px' },
      el('span', { html: I.crown }),
      el('span', { class: 'badge', style: 'background:rgba(255,255,255,.18);color:#fff', text: 'PRO' })),
    el('div', { class: 't', style: 'margin-top:12px', text: L.t('proTitle') }),
    el('div', { class: 's', text: L.t('proSub') })));

  const feats = ['proFeature1', 'proFeature2', 'proFeature3', 'proFeature4', 'proFeature5', 'proFeature6'];
  const list = el('div', { class: 'list', style: 'margin-top:16px' });
  feats.forEach(k => list.append(el('div', { class: 'item' },
    el('div', { class: 'ico', html: I.check, style: 'color:var(--ok)' }),
    el('div', { class: 'grow' }, el('div', { class: 't', style: 'font-weight:520', text: L.t(k) })))));
  body.append(list);
  body.append(el('div', { class: 'card flat', style: 'margin-top:16px' },
    el('div', { class: 'small', text: L.isZh
      ? '原版按订阅收费（Free 每月 120 分钟 / AI 每天 5 条）。这个网页版不含任何计费与校验逻辑，上述权益全部直接可用。'
      : 'The original app metered minutes and AI messages. This build has no billing or entitlement checks at all.' })));
  body.append(el('button', { class: 'btn primary block', style: 'margin-top:16px', text: L.t('back') || '返回', onClick: () => nav('/me') }));
  return { node: root, title: 'Pro' };
}

/* ---------------- Team / Invite / Redeem ---------------- */
export async function team() {
  const root = el('div', {});
  root.append(header({ title: L.t('team'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  const t = store.data.team;
  if (!t) {
    body.append(el('div', { class: 'card flat center', style: 'margin-top:14px;padding:26px' },
      el('div', { html: I.users, style: 'display:grid;place-items:center;color:var(--text-2)' }),
      el('div', { class: 'small muted', style: 'margin-top:10px', text: L.t('teamEmpty') }),
      el('div', { class: 'tiny dim', style: 'margin-top:4px', text: '本地版本用邀请码模拟团队，不联网。' })));
    body.append(el('div', { class: 'stack', style: 'margin-top:14px' },
      el('button', {
        class: 'btn primary block', text: L.isZh ? '创建团队' : 'Create team',
        onClick: async () => {
          const name = await promptBox({ title: L.t('team'), placeholder: '团队名称' });
          if (!name) return;
          store.data.team = { name, code: 'LCS-' + uid('').slice(1, 6).toUpperCase(), members: [{ name: store.data.profile.name || 'Me', role: 'owner' }], createdAt: Date.now() };
          store.save(); rerender();
        },
      }),
      el('button', { class: 'btn ghost block', text: L.t('redeemBtn'), onClick: () => nav('/redeem') })));
  } else {
    body.append(el('div', { class: 'card', style: 'margin-top:14px' },
      el('div', { class: 'row between' },
        el('div', { class: 'grow' },
          el('div', { style: 'font-size:18px;font-weight:700', text: t.name }),
          el('div', { class: 'tiny dim', text: `${t.members?.length || 1} 名成员 · 创建于 ${fmtDate(t.createdAt)}` })),
        el('span', { class: 'badge pro', text: 'PRO' }))));
    const list = el('div', { class: 'list', style: 'margin-top:12px' });
    (t.members || []).forEach(m => list.append(el('div', { class: 'item' },
      el('div', { class: 'ico', html: I.user }),
      el('div', { class: 'grow' }, el('div', { class: 't', text: m.name }), el('div', { class: 's', text: m.role })),
      el('span', { class: 'badge ok', text: L.t('proTitle') }))));
    body.append(list);
    body.append(el('div', { class: 'row', style: 'gap:8px;margin-top:14px' },
      el('button', { class: 'btn grow', text: L.t('invite'), onClick: () => nav('/invite') }),
      el('button', {
        class: 'btn grow danger', text: '退出团队', onClick: async () => {
          if (await confirmBox({ title: '退出团队', message: t.name, danger: true, confirmLabel: '退出' })) {
            store.data.team = null; store.save(); rerender();
          }
        },
      })));
  }
  return { node: root, title: L.t('team') };
}

export async function invite() {
  const t = store.data.team;
  const root = el('div', {});
  root.append(header({ title: L.t('invite'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  if (!t) {
    body.append(el('div', { class: 'card flat center', style: 'margin-top:14px;padding:24px' },
      el('div', { class: 'small muted', text: '先创建团队，才有邀请码。' }),
      el('button', { class: 'btn primary', style: 'margin-top:12px', text: L.t('team'), onClick: () => nav('/team') })));
    return { node: root, title: L.t('invite') };
  }
  body.append(el('div', { class: 'card', style: 'margin-top:14px' },
    el('div', { class: 'tiny dim', text: L.t('inviteCode') }),
    el('div', { class: 'mono', style: 'font-size:28px;font-weight:700;letter-spacing:.08em;margin-top:6px', text: t.code })));
  body.append(el('div', { class: 'stack', style: 'margin-top:14px' },
    el('button', { class: 'btn primary block', text: L.t('copyCode'), onClick: () => copyText(t.code) }),
    el('button', { class: 'btn ghost block', text: L.t('shareVia'), onClick: () => shareText(`加入我的 皓月翻译 团队：${t.name}\n邀请码：${t.code}\n${location.href.split('#')[0]}`) })));
  body.append(el('div', { class: 'tiny dim', style: 'margin-top:14px', text: '邀请码只在本机生效（没有后端）。真实多人协作需要服务端账号体系。' }));
  return { node: root, title: L.t('invite') };
}

export async function redeem() {
  const root = el('div', {});
  root.append(header({ title: L.t('redeem'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  const input = el('input', { class: 'input', placeholder: 'LCS-XXXXX', style: 'margin-top:14px;text-transform:uppercase' });
  body.append(input, el('div', { class: 'tiny dim', style: 'margin-top:8px', text: L.t('redeemHint') }));
  body.append(el('button', {
    class: 'btn primary block', style: 'margin-top:14px', text: L.t('redeemBtn'),
    onClick: () => {
      const v = input.value.trim().toUpperCase();
      if (!v) return toast(L.t('needText'));
      store.data.team ||= { name: '皓月翻译 Team', code: v, members: [{ name: store.data.profile.name || 'Me', role: 'owner' }], createdAt: Date.now() };
      store.data.team.code = v;
      if (!store.data.team.members.some(m => m.role === 'member')) store.data.team.members.push({ name: 'Invited seat', role: 'member' });
      store.save(); toast('✓ 已激活'); setTimeout(() => nav('/team'), 500);
    },
  }));
  body.append(el('div', { class: 'card flat', style: 'margin-top:18px' },
    el('div', { class: 'small muted', text: '说明：原版兑换码走服务端校验，网页版没有账号体系，本地校验仅用于展示流程；所有功能本来就已经解锁。' })));
  return { node: root, title: L.t('redeem') };
}

/* ---------------- Voice ---------------- */
export async function voice() {
  const root = el('div', {});
  root.append(header({ title: L.t('myVoice'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  body.append(el('div', { class: 'card flat', style: 'margin-top:12px' },
    el('div', { class: 'small', text: L.t('voiceHint') })));

  const voices = (window.speechSynthesis?.getVoices?.() || []);
  const list = el('div', { class: 'list', style: 'margin-top:12px' });
  if (!voices.length) {
    list.append(el('div', { class: 'item' }, el('div', { class: 'grow' },
      el('div', { class: 't', text: '系统音色加载中…' }),
      el('div', { class: 's', text: 'iOS 需要先点一下页面才允许朗读' }))));
  }
  voices.filter(v => /zh|en/i.test(v.lang)).slice(0, 20).forEach(v => {
    list.append(el('div', { class: 'item' },
      el('div', { class: 'ico', html: I.headphones }),
      el('div', { class: 'grow' },
        el('div', { class: 't', text: v.name }),
        el('div', { class: 's', text: `${v.lang} · ${v.localService ? '本地' : '云端'}` })),
      el('button', {
        class: 'tiny dim', text: '试听', onClick: () => {
          if (!window.speechSynthesis) return toast('不支持朗读');
          const u = new SpeechSynthesisUtterance('这是 皓月翻译 的朗读效果，先试听一下。');
          u.voice = v; u.lang = v.lang; speechSynthesis.cancel(); speechSynthesis.speak(u);
        },
      })));
  });
  body.append(list);
  body.append(el('div', { class: 'card flat', style: 'margin-top:14px' },
    el('div', { class: 'small', style: 'font-weight:640', text: '我的声音（克隆）' }),
    el('div', { class: 'tiny dim', style: 'margin-top:4px', text: '需要 TTS 服务（CosyVoice / MiniMax / ElevenLabs 等）。在「设置 → AI 接口」填好兼容接口后可接入。当前用系统音色朗读。' })));
  return { node: root, title: L.t('myVoice') };
}

/* ---------------- Offline models ---------------- */
export async function models() {
  const s = store.settings;
  s.downloadedModels ||= [];
  const root = el('div', {});
  root.append(header({ title: L.t('offlineModels'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  body.append(el('div', { class: 'card flat', style: 'margin-top:12px' },
    el('div', { class: 'small', text: L.t('modelsHint') })));
  const list = el('div', { class: 'list', style: 'margin-top:12px' });
  [['tiny', '39 MB'], ['base', '74 MB'], ['small', '244 MB'], ['medium', '769 MB']].forEach(([name, size]) => {
    const done = s.downloadedModels.includes(name);
    const bar = el('div', { class: 'prog', style: 'margin-top:6px;display:none' }, el('i'));
    const btn = el('button', {
      class: 'chip' + (done ? ' on' : ''), text: done ? L.t('downloaded') : L.t('download'),
      onClick: async () => {
        if (done) { s.downloadedModels = s.downloadedModels.filter(x => x !== name); store.save(); rerender(); return; }
        bar.style.display = 'block';
        for (let i = 0; i <= 100; i += 10) {
          $('i', bar).style.width = i + '%';
          await new Promise(r => setTimeout(r, 120));
        }
        s.downloadedModels.push(name); store.save(); toast(L.t('downloaded')); rerender();
      },
    });
    list.append(el('div', { class: 'item' },
      el('div', { class: 'ico', html: I.download2 }),
      el('div', { class: 'grow' },
        el('div', { class: 't', text: 'whisper-' + name }),
        el('div', { class: 's', text: `${size} · ${name === 'tiny' ? '最快' : name === 'medium' ? '最准' : '平衡'}` }),
        bar),
      btn));
  });
  body.append(list);
  body.append(el('div', { class: 'tiny dim', style: 'margin-top:12px', text: '网页端实际转写由浏览器引擎或你配置的 Whisper 接口完成；这里的下载记录用于对齐原版的模型管理页。' }));
  return { node: root, title: L.t('offlineModels') };
}

/* ---------------- Privacy / About ---------------- */
export async function privacy() {
  const root = el('div', {});
  root.append(header({ title: L.t('privacy'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  body.append(el('div', { class: 'card', style: 'margin-top:12px' },
    el('div', { class: 'small', style: 'line-height:1.65', text: L.t('privacyBody') })));
  body.append(el('div', { class: 'list', style: 'margin-top:12px' },
    item({ icon: I.cloud, title: '数据存放', sub: 'IndexedDB（录音）+ localStorage（文字）' }),
    item({ icon: I.globe, title: '第三方请求', sub: '翻译走 Google/MyMemory；AI 仅在你填 Key 后发送文字' }),
    item({ icon: I.trash, title: L.t('clearData'), danger: true, onClick: clearAll })));
  return { node: root, title: L.t('privacy') };
}

export async function about() {
  const root = el('div', {});
  root.append(header({ title: L.t('about'), back: () => nav('/me') }));
  const body = el('div', { style: 'padding:0 18px 20px' });
  root.append(body);
  body.append(el('div', { class: 'center', style: 'padding:22px 0' },
    el('img', { src: 'logo.png', width: 72, height: 72, alt: '皓月翻译', style: 'border-radius:18px' }),
    el('div', { style: 'font-size:20px;font-weight:720;margin-top:10px', text: '皓月翻译' }),
    el('div', { class: 'tiny dim', text: 'v1.0 · 独立网页实现' })));
  body.append(el('div', { class: 'list', style: 'margin-top:10px' },
    item({ icon: I.crown, title: L.t('proTitle'), sub: '所有付费权益已解锁', onClick: () => nav('/pro') }),
    item({ icon: I.privacy, title: L.t('privacy'), onClick: () => nav('/privacy') }),
    item({ icon: I.info, title: '功能清单', onClick: () => sheet({
      title: '已实现',
      body: el('div', { class: 'stack sm small muted', style: 'line-height:1.7' },
        ['实时转录（浏览器引擎 / Whisper 接口 / 键盘听写）',
          '双语字幕 + 47 种翻译',
          'AI 纪要：大纲 / 要点 / 待办 / 关键词 / 时间轴',
          '会话详情：播放、搜索、导出 TXT/SRT/VTT/MD',
          '文件夹、回收站、全文搜索',
          'AI 对话（本地检索 / 兼容 OpenAI 接口）',
          '听写练习、翻译台、上传导入',
          'PWA：添加到主屏幕、离线打开'].map(t => el('div', { text: '· ' + t }))) }),
    })));
  body.append(el('div', { class: 'tiny dim center', style: 'margin-top:16px;line-height:1.6' },
    '这是独立实现的网页版，与原 App 无关联。', el('br'), '数据默认只在本机。'));
  return { node: root, title: L.t('about') };
}

/* ---------------- Auth (local profile) ---------------- */
export async function auth() {
  const root = el('div', {});
  root.append(header({ title: L.t('account'), back: () => nav('/me') }));
  const body = el('div', { class: 'auth' });
  root.append(body);
  body.append(el('div', { class: 'logo' }, el('span', { text: '皓月翻译' })));
  body.append(el('h1', { text: store.data.profile.name ? L.t('account') : L.t('signIn') }));
  body.append(el('div', { class: 'sub', text: '本地模式：不需要注册，数据只存在这台设备。' }));

  const name = el('input', { class: 'input', placeholder: L.t('yourName'), value: store.data.profile.name || '' });
  const email = el('input', { class: 'input', placeholder: L.t('email'), value: store.data.profile.email || '', style: 'margin-top:10px', type: 'email' });
  body.append(el('div', { class: 'field' }, el('label', { text: L.t('yourName') }), name),
    el('div', { class: 'field', style: 'margin-top:12px' }, el('label', { text: L.t('email') }), email));
  body.append(el('button', {
    class: 'btn primary block', style: 'margin-top:16px', text: L.t('saveSettings'),
    onClick: () => {
      store.data.profile.name = name.value.trim();
      store.data.profile.email = email.value.trim();
      store.save(); toast(L.t('saved')); nav('/me');
    },
  }));
  body.append(el('button', { class: 'btn ghost block', style: 'margin-top:10px', text: L.t('guest'), onClick: () => nav('/') }));
  return { node: root, title: L.t('account') };
}

function $(sel, root = document) { return root.querySelector(sel); }
