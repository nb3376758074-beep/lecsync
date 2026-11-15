/* ============ LecSync Web · core: utils, i18n, store, icons ============ */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
};
export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
export const fmtTs = sec => fmtClock(sec); // transcript timestamp mm:ss
export function fmtDur(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60 ? (sec % 60) + 's' : '');
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}
export function fmtAgo(ts, lang = 'zh') {
  const d = (Date.now() - ts) / 1000;
  const t = lang === 'zh'
    ? { now: '刚刚', m: '分钟前', h: '小时前', d: '天前' }
    : { now: 'just now', m: 'm ago', h: 'h ago', d: 'd ago' };
  if (d < 60) return t.now;
  if (d < 3600) return Math.floor(d / 60) + t.m;
  if (d < 86400) return Math.floor(d / 3600) + t.h;
  if (d < 86400 * 30) return Math.floor(d / 86400) + t.d;
  return new Date(ts).toLocaleDateString();
}
export const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
export const fmtDateTime = ts => new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export function bytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return (n / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + u[i];
}
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export function toast(msg, ms = 2200) {
  let host = $('#toasts');
  if (!host) { host = el('div', { id: 'toasts' }); document.body.append(host); }
  const n = el('div', { class: 'toast', text: msg });
  host.append(n);
  setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity .2s'; setTimeout(() => n.remove(), 220); }, ms);
}

/* ---------------- icons (inline, 24px grid) ---------------- */
const S = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
export const I = {
  mic: S('<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/>'),
  square: S('<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>'),
  pause: S('<rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/>'),
  play: S('<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>'),
  folder: S('<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2c.5 0 1 .2 1.4.6l1 1a2 2 0 0 0 1.4.6h4.9A2.5 2.5 0 0 1 21 9.7v6.8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"/>'),
  chat: S('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-3.2-.6L4 21l1.3-3.7A8.3 8.3 0 0 1 3 11.5C3 7.1 7 3.6 12 3.6s9 3.5 9 7.9Z"/>'),
  user: S('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  search: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  back: S('<path d="M15 5l-7 7 7 7"/>'),
  chevron: S('<path d="m9 5 7 7-7 7"/>'),
  chevronDown: S('<path d="m5 9 7 7 7-7"/>'),
  close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  more: S('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
  share: S('<path d="M12 15V4"/><path d="m8 8 4-4 4 4"/><path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14"/>'),
  download: S('<path d="M12 4v11"/><path d="m8 11 4 4 4-4"/><path d="M5 19h14"/>'),
  trash: S('<path d="M4 7h16"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7"/>'),
  edit: S('<path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="m14.5 5.5 4 4"/>'),
  settings: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z"/>'),
  sparkle: S('<path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11l5.6-2L12 3.5Z"/>'),
  globe: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.2 2.4 3.3 5.4 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.4-3.3-8.5S9.8 5.9 12 3.5Z"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  file: S('<path d="M7 3.5h6.5L19 9v10.5A1.5 1.5 0 0 1 17.5 21h-10A1.5 1.5 0 0 1 6 19.5v-14A1.5 1.5 0 0 1 7.5 4Z"/><path d="M13 3.5V9h5.2"/>'),
  txt: S('<path d="M6 4.5h12v15H6z"/><path d="M9 9h6M9 12.5h6M9 16h3.5"/>'),
  upload: S('<path d="M12 20V9"/><path d="m8 12 4-4 4 4"/><path d="M5 5h14"/>'),
  check: S('<path d="m5 12.5 4.5 4.5L19 7"/>'),
  star: S('<path d="m12 4 2.5 5.2 5.5.7-4 3.9 1 5.6L12 16.7 6.9 19.4l1-5.6-4-3.9 5.5-.7L12 4Z"/>'),
  lock: S('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  crown: S('<path d="M4 18h16"/><path d="M5 15.5 4 7l4.5 3.5L12 5l3.5 5.5L20 7l-1 8.5H5Z"/>'),
  wave: S('<path d="M3 12h2l2-5 3 10 3-13 3 16 2-8h3"/>'),
  cloud: S('<path d="M7.5 18.5A3.5 3.5 0 0 1 7 11.6a5.5 5.5 0 0 1 10.6 1.3 3.3 3.3 0 0 1-.6 5.6H7.5Z"/>'),
  download2: S('<path d="M12 4v10"/><path d="m7.5 10.5 4.5 4 4.5-4"/><path d="M5 20h14"/>'),
  headphones: S('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h2.5a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 6.5 20H6a2 2 0 0 1-2-2v-4Z"/><path d="M20 14h-2.5a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 1.5 1.5h.5a2 2 0 0 0 2-2v-4Z"/>'),
  copy: S('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5v8a1.5 1.5 0 0 0 1.5 1.5H7"/>'),
  send: S('<path d="M4.5 12 20 4.5 15 20l-3.5-6-7-1.9Z"/>'),
  arrowUp: S('<path d="M12 19V6"/><path d="m6 12 6-6 6 6"/>'),
  users: S('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M16 5.3a3.2 3.2 0 0 1 0 6.2"/><path d="M17.5 14.4A5.6 5.6 0 0 1 21 19.5"/>'),
  gift: S('<rect x="3.5" y="8.5" width="17" height="5" rx="1"/><path d="M5 13.5V20h14v-6.5"/><path d="M12 8.5V20"/><path d="M12 8.5S10.5 4 8 4a2.2 2.2 0 0 0 0 4.5h4Zm0 0S13.5 4 16 4a2.2 2.2 0 0 1 0 4.5h-4Z"/>'),
  archive: S('<rect x="3.5" y="4.5" width="17" height="4" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5"/><path d="M10 12h4"/>'),
  bell: S('<path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 3h15L18 15Z"/><path d="M10 21h4"/>'),
  moon: S('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7.5 7.5 0 1 0 10.5 10.5Z"/>'),
  type: S('<path d="M5 6h14"/><path d="M12 6v13"/><path d="M8.5 19h7"/>'),
  translate: S('<path d="M4 5h9"/><path d="M8.5 5c0 5-2 8-4.5 10"/><path d="M5.5 10c1.5 3 3.5 4.6 6 5.5"/><path d="m13 19 4-10 4 10"/><path d="M14.7 15.5h4.6"/>'),
  dictation: S('<path d="M6 4.5h12"/><path d="M6 9h12"/><path d="M6 13.5h8"/><path d="M6 18h5"/><circle cx="18" cy="16" r="2.5"/>'),
  doc: S('<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h4"/>'),
  refresh: S('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>'),
  bolt: S('<path d="M13 3 5 13.5h5L10 21l8-10.5h-5L13 3Z"/>'),
  grid: S('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  expand: S('<path d="M4 9V4h5"/><path d="M20 15v5h-5"/><path d="M15 4h5v5"/><path d="M9 20H4v-5"/>'),
  link: S('<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.2-1.2"/>'),
  info: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none"/>'),
  logout: S('<path d="M15 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H15"/><path d="M13 12h7"/><path d="m17 8 4 4-4 4"/>'),
  key: S('<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20"/><path d="M17 12v3"/><path d="M20 12v2.5"/>'),
};
export const logoMark = (size = 40) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none">
<path d="M4 34c6-2 8-10 12-10s6 8 10 8 6-12 10-12 6 4 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
<path d="M6 22c6-2 8-8 11-8s6 6 9 6 6-9 9-9 5 3 7 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".45"/></svg>`;

/* ---------------- i18n ---------------- */
const ZH = {
  appName: 'LecSync', tagline: '课堂录音 · 实时转录 · AI 纪要',
  tabRecord: '录音', tabFolders: '文件夹', tabChat: 'AI 对话', tabProfile: '我的',
  record: '录音', listening: '正在转录', paused: '已暂停', ready: '准备录音',
  tapToStart: '点一下开始录音', tapToStop: '点一下结束并保存',
  startRecording: '开始录音', stopAndSave: '结束并保存', pause: '暂停', resume: '继续',
  mark: '标记', marked: '已标记', assist: 'AI 助手', fullscreenSub: '全屏字幕',
  unlimited: '无限时长 · 已解锁', unlockedCard: 'Pro 权益已解锁',
  autoSaved: '已自动保存到会话', savedTo: '已保存',
  transcript: '转录', digest: '纪要', docs: '文件', chatTab: '对话',
  outline: '大纲', keyPoints: '要点', actionItems: '待办事项', keywords: '关键词',
  timeline: '重点时刻', speakerNote: '发言要点',
  summaryEmpty: '还没有纪要，点生成即可', genSummary: '生成纪要', regenSummary: '重新生成',
  transcriptEmpty: '还没有转录内容',
  searchInSession: '搜索这段会话', searchAll: '搜索会话、转录、译文',
  export: '导出', exportAs: '导出为', copyText: '复制文本', shareText: '分享',
  delete: '删除', rename: '重命名', moveTo: '移动到', duplicate: '创建副本',
  newFolder: '新建文件夹', folderName: '文件夹名称', folders: '文件夹',
  noFolders: '还没有文件夹', folderEmpty: '这个文件夹是空的',
  sessions: '会话', session: '会话', minutes: '分钟', words: '字',
  allSessions: '全部会话', recent: '最近', trash: '回收站', restore: '还原',
  trashEmpty: '回收站是空的', moveToTrash: '移到回收站',
  newChat: '新对话', chats: 'AI 对话', askAnything: '问点什么…',
  chatEmpty: '还没有对话', chatIntro: '针对你的录音提问，我会引用时间点。',
  upload: '上传', uploadAudio: '上传音视频', uploadDoc: '上传文档',
  uploadHint: '支持 mp3 / m4a / wav / mp4 / mov，单文件 ≤ 200 MB',
  importText: '粘贴文字导入', importPlaceholder: '把已经存在的转录稿粘贴到这里…',
  importBtn: '解析并导入',
  translating: '翻译中…', translate: '翻译', translateTo: '翻译成', translateSrc: '源语言',
  bilingual: '双语字幕', showTranslation: '显示译文', autoTranslate: '自动翻译',
  dictation: '听写练习', dictationHint: '跟着录音逐句打字，系统会实时判分',
  dictationStart: '开始练习', dictationDone: '完成', accuracy: '准确率',
  dictationWords: '自定义词库', addWord: '添加词组',
  settings: '设置', language: '界面语言', theme: '外观', themeAuto: '跟随系统',
  themeLight: '浅色', themeDark: '深色', subtitleSize: '字幕字号', recognitionLang: '识别语言',
  targetLang: '翻译目标', engine: '转写引擎', engineBrowser: '浏览器实时识别',
  engineWhisper: 'Whisper 接口（自填 Key）', engineManual: '键盘听写',
  asrEndpoint: '转写接口地址', asrKey: '接口 Key', asrModel: '模型名',
  aiEndpoint: 'AI 接口地址', aiKey: 'AI Key', aiModel: 'AI 模型',
  saveSettings: '保存', saved: '已保存', testConn: '测试连接',
  dataExport: '导出全部数据', dataImport: '导入数据', clearData: '清空本地数据',
  about: '关于', privacy: '隐私与数据', offlineModels: '离线模型', myVoice: '我的声音',
  sharedWithMe: '共享给我', team: '团队', invite: '邀请成员', redeem: '兑换码',
  account: '账号', signIn: '登录', signUp: '注册', email: '邮箱', password: '密码',
  continueWith: '或', guest: '直接开始（本地模式）', logout: '退出登录',
  proTitle: '全部功能已解锁', proSub: '这个版本不含任何付费墙：无限录音、无限 AI、无限导出。',
  proFeature1: '录音时长不限（原 120 分钟/月）',
  proFeature2: 'AI 对话不限条数（原 5 条/天）',
  proFeature3: '同声传译 + 双语字幕',
  proFeature4: '导出附 AI 纪要、SRT/VTT 双语字幕',
  proFeature5: '云端同步与团队共享',
  proFeature6: '语音克隆朗读（我的声音）',
  storage: '存储占用', files: '个文件', version: '版本',
  firstRunTitle: '把课堂讲的话，变成可搜索的文字',
  firstRunBody: '实时转录、双语字幕、AI 纪要，一次录音全部搞定。',
  secondTitle: '录音永不设限',
  secondBody: '免费版原本每月 120 分钟。这一版把限制去掉了：想录多久录多久。',
  thirdTitle: '拿起就用，无需安装',
  thirdBody: '在 iPhone 上「添加到主屏幕」，像 App 一样全屏使用。',
  next: '继续', gotIt: '开始使用', skip: '跳过',
  iosTip: 'iPhone：点底部「分享」→ 添加到主屏幕，可全屏使用',
  live: '实时', recording: '录音中', processing: '处理中', done: '完成',
  remove: '移除', cancel: '取消', confirm: '确定', ok: '好',
  yourName: '你的名字', today: '今天',
  noSessions: '还没有录音', noSessionsSub: '点上面的红色按钮开始第一次录音',
  quickActions: '快捷操作', statMinutes: '录音时长', statSessions: '会话', statWords: '字数',
  syncOn: '已同步', syncOff: '仅本地', synced: '所有数据保存在这台设备',
  speaker: '发言人', playAll: '连续播放', pauseAll: '暂停播放',
  srtHint: 'SRT / VTT 可导入剪辑软件或播放器', mdHint: 'Markdown 含纪要、关键词与全文',
  shareVia: '通过系统分享', copied: '已复制', nothingToCopy: '没有可复制的内容',
  genDigestFor: '生成纪要：', digestNote: '本地提炼，可接入大模型获得更强摘要',
  askThisQuestion: '就这段问 AI', relatedChats: '相关对话',
  selectAll: '全选', selected: '已选择', items: '项',
  teamEmpty: '还没有加入团队', inviteCode: '邀请码', copyCode: '复制邀请码',
  redeemHint: '输入兑换码以激活团队席位', redeemBtn: '兑换',
  voiceHint: '选择朗读音色；接入 TTS 后可克隆你自己的声音',
  modelsHint: '下载离线模型后可在无网环境转录（网页版使用浏览器引擎）',
  modelSize: '大小', download: '下载', downloaded: '已下载',
  privacyBody: '所有录音与转录默认只保存在本机浏览器（IndexedDB / localStorage），不上传服务器。开启 AI 接口后仅发送文字。',
  clearWarn: '将删除本机所有会话、文件夹与设置，无法恢复。',
  imported: '已导入', importFail: '导入失败：格式不对',
  needText: '内容为空', micDenied: '麦克风被拒绝，请在浏览器设置里允许',
  noSpeech: '这个浏览器不支持实时识别，已切换到键盘听写模式',
  speechReady: '实时识别已就绪', recordingSaved: '录音已保存',
  selectLang: '选择语言', detectAuto: '自动检测',
  exportStarted: '已开始下载', shared: '已打开分享',
  mins: '分钟', goalToday: '今日目标', quickStart: '快速开始',
  newSessionTitle: '新录音', untitled: '未命名会话',
  autoTitle: '自动命名', sessionTitle: '会话名称',
  saving: '保存中…', syncPending: '离线，恢复网络后自动同步',
  aiThinking: '正在思考…', aiLocal: '本地规则纪要', aiModelOn: '已接入大模型',
  askPlaceholder: '针对这段录音提问，例如「老师布置了什么作业？」',
  cite: '引用', page: '第 {n} 页', at: '在',
};
const EN = {
  appName: 'LecSync', tagline: 'Record · Transcribe · Summarize',
  tabRecord: 'Record', tabFolders: 'Folders', tabChat: 'Chat', tabProfile: 'Me',
  record: 'Record', listening: 'Transcribing', paused: 'Paused', ready: 'Ready',
  tapToStart: 'Tap to start recording', tapToStop: 'Tap to stop & save',
  startRecording: 'Start recording', stopAndSave: 'Stop & save', pause: 'Pause', resume: 'Resume',
  mark: 'Mark', marked: 'Marked', assist: 'Live assist', fullscreenSub: 'Full screen',
  unlimited: 'Unlimited · unlocked', unlockedCard: 'Pro unlocked',
  autoSaved: 'Saved to session', savedTo: 'Saved',
  transcript: 'Transcript', digest: 'Digest', docs: 'Files', chatTab: 'Chat',
  outline: 'Outline', keyPoints: 'Key points', actionItems: 'Action items', keywords: 'Keywords',
  timeline: 'Highlights', speakerNote: 'Speaking notes',
  summaryEmpty: 'No digest yet — generate one', genSummary: 'Generate digest', regenSummary: 'Regenerate',
  transcriptEmpty: 'No transcript yet',
  searchInSession: 'Search this session', searchAll: 'Search sessions, transcripts, translations',
  export: 'Export', exportAs: 'Export as', copyText: 'Copy text', shareText: 'Share',
  delete: 'Delete', rename: 'Rename', moveTo: 'Move to', duplicate: 'Duplicate',
  newFolder: 'New folder', folderName: 'Folder name', folders: 'Folders',
  noFolders: 'No folders yet', folderEmpty: 'This folder is empty',
  sessions: 'sessions', session: 'session', minutes: 'min', words: 'words',
  allSessions: 'All sessions', recent: 'Recent', trash: 'Trash', restore: 'Restore',
  trashEmpty: 'Trash is empty', moveToTrash: 'Move to Trash',
  newChat: 'New chat', chats: 'Chats', askAnything: 'Ask anything…',
  chatEmpty: 'No chats yet', chatIntro: 'Ask about your recordings; I cite the timestamps.',
  upload: 'Upload', uploadAudio: 'Upload audio', uploadDoc: 'Upload document',
  uploadHint: 'mp3 / m4a / wav / mp4 / mov, up to 200 MB',
  importText: 'Paste text', importPlaceholder: 'Paste an existing transcript here…',
  importBtn: 'Parse & import',
  translating: 'Translating…', translate: 'Translate', translateTo: 'Translate to', translateSrc: 'From',
  bilingual: 'Bilingual captions', showTranslation: 'Show translation', autoTranslate: 'Auto-translate',
  dictation: 'Dictation practice', dictationHint: 'Type each line as it plays; scored live',
  dictationStart: 'Start practice', dictationDone: 'Done', accuracy: 'Accuracy',
  dictationWords: 'Custom words', addWord: 'Add phrase',
  settings: 'Settings', language: 'App language', theme: 'Appearance', themeAuto: 'System',
  themeLight: 'Light', themeDark: 'Dark', subtitleSize: 'Caption size', recognitionLang: 'Recognition language',
  targetLang: 'Translate to', engine: 'Transcription engine', engineBrowser: 'Browser live recognition',
  engineWhisper: 'Whisper endpoint (own key)', engineManual: 'Keyboard dictation',
  asrEndpoint: 'ASR endpoint', asrKey: 'API key', asrModel: 'Model',
  aiEndpoint: 'AI endpoint', aiKey: 'AI key', aiModel: 'AI model',
  saveSettings: 'Save', saved: 'Saved', testConn: 'Test',
  dataExport: 'Export all data', dataImport: 'Import data', clearData: 'Clear local data',
  about: 'About', privacy: 'Privacy & data', offlineModels: 'Offline models', myVoice: 'My voice',
  sharedWithMe: 'Shared with me', team: 'Team', invite: 'Invite', redeem: 'Redeem code',
  account: 'Account', signIn: 'Sign in', signUp: 'Sign up', email: 'Email', password: 'Password',
  continueWith: 'or', guest: 'Continue locally (no account)', logout: 'Sign out',
  proTitle: 'Everything unlocked', proSub: 'No paywall in this build: unlimited recording, AI and exports.',
  proFeature1: 'Unlimited recording (was 120 min/month)',
  proFeature2: 'Unlimited AI questions (was 5/day)',
  proFeature3: 'Simultaneous interpretation + bilingual captions',
  proFeature4: 'Export with AI digest, bilingual SRT/VTT',
  proFeature5: 'Cloud sync & team sharing',
  proFeature6: 'Voice cloning read-aloud',
  storage: 'Storage', files: 'files', version: 'Version',
  firstRunTitle: 'Turn lectures into searchable text',
  firstRunBody: 'Live transcript, bilingual captions and an AI digest from one recording.',
  secondTitle: 'Record without limits',
  secondBody: 'The free plan capped you at 120 min/month. This build removes it.',
  thirdTitle: 'Nothing to install',
  thirdBody: 'On iPhone add to Home Screen and use it full screen like an app.',
  next: 'Continue', gotIt: "Let's go", skip: 'Skip',
  iosTip: 'iPhone: Share → Add to Home Screen for full screen use',
  live: 'Live', recording: 'Recording', processing: 'Processing', done: 'Done',
  remove: 'Remove', cancel: 'Cancel', confirm: 'Confirm', ok: 'OK',
  yourName: 'Your name', today: 'Today',
  noSessions: 'No recordings yet', noSessionsSub: 'Tap the red button to record your first one',
  quickActions: 'Quick actions', statMinutes: 'Minutes', statSessions: 'Sessions', statWords: 'Words',
  syncOn: 'Synced', syncOff: 'Local only', synced: 'Everything stays on this device',
  speaker: 'Speaker', playAll: 'Play all', pauseAll: 'Pause',
  srtHint: 'SRT / VTT can be imported into editors and players', mdHint: 'Markdown with digest, keywords and full text',
  shareVia: 'Share sheet', copied: 'Copied', nothingToCopy: 'Nothing to copy',
  genDigestFor: 'Digest for', digestNote: 'Extracted locally; add an LLM key for stronger summaries',
  askThisQuestion: 'Ask AI about this', relatedChats: 'Related chats',
  selectAll: 'Select all', selected: 'selected', items: 'items',
  teamEmpty: 'Not in a team yet', inviteCode: 'Invite code', copyCode: 'Copy code',
  redeemHint: 'Enter a code to activate a team seat', redeemBtn: 'Redeem',
  voiceHint: 'Pick a read-aloud voice; connect TTS to clone your own',
  modelsHint: 'Download offline models to transcribe without network (web uses browser engine)',
  modelSize: 'Size', download: 'Download', downloaded: 'Downloaded',
  privacyBody: 'Recordings and transcripts stay in this browser (IndexedDB / localStorage). Only text is sent when an AI endpoint is configured.',
  clearWarn: 'This deletes every session, folder and setting on this device. It cannot be undone.',
  imported: 'Imported', importFail: 'Import failed: bad format',
  needText: 'Nothing to import', micDenied: 'Microphone blocked — allow it in browser settings',
  noSpeech: 'Live recognition unavailable; switched to keyboard dictation',
  speechReady: 'Live recognition ready', recordingSaved: 'Recording saved',
  selectLang: 'Select language', detectAuto: 'Auto detect',
  exportStarted: 'Download started', shared: 'Share sheet opened',
  mins: 'min', goalToday: "Today's goal", quickStart: 'Quick start',
  newSessionTitle: 'New recording', untitled: 'Untitled session',
  autoTitle: 'Auto title', sessionTitle: 'Session title',
  saving: 'Saving…', syncPending: 'Offline — will sync when back online',
  aiThinking: 'Thinking…', aiLocal: 'Local digest', aiModelOn: 'LLM connected',
  askPlaceholder: 'Ask about this recording, e.g. "What was the homework?"',
  cite: 'cite', page: 'p. {n}', at: 'at',
};
export const LANGS = [
  ['zh-CN', '中文（简体）', 'Chinese (Simplified)'], ['zh-TW', '中文（繁體）', 'Chinese (Traditional)'],
  ['en-US', 'English', 'English'], ['ja-JP', '日本語', 'Japanese'], ['ko-KR', '한국어', 'Korean'],
  ['ru-RU', 'Русский', 'Russian'], ['uk-UA', 'Українська', 'Ukrainian'], ['de-DE', 'Deutsch', 'German'],
  ['fr-FR', 'Français', 'French'], ['es-ES', 'Español', 'Spanish'], ['pt-BR', 'Português', 'Portuguese'],
  ['it-IT', 'Italiano', 'Italian'], ['nl-NL', 'Nederlands', 'Dutch'], ['pl-PL', 'Polski', 'Polish'],
  ['tr-TR', 'Türkçe', 'Turkish'], ['ar-SA', 'العربية', 'Arabic'], ['he-IL', 'עברית', 'Hebrew'],
  ['fa-IR', 'فارسی', 'Persian'], ['hi-IN', 'हिन्दी', 'Hindi'], ['bn-IN', 'বাংলা', 'Bengali'],
  ['ta-IN', 'தமிழ்', 'Tamil'], ['th-TH', 'ไทย', 'Thai'], ['vi-VN', 'Tiếng Việt', 'Vietnamese'],
  ['id-ID', 'Bahasa Indonesia', 'Indonesian'], ['ms-MY', 'Bahasa Melayu', 'Malay'],
  ['fil-PH', 'Filipino', 'Filipino'], ['sv-SE', 'Svenska', 'Swedish'], ['no-NO', 'Norsk', 'Norwegian'],
  ['da-DK', 'Dansk', 'Danish'], ['fi-FI', 'Suomi', 'Finnish'], ['cs-CZ', 'Čeština', 'Czech'],
  ['sk-SK', 'Slovenčina', 'Slovak'], ['hu-HU', 'Magyar', 'Hungarian'], ['ro-RO', 'Română', 'Romanian'],
  ['bg-BG', 'Български', 'Bulgarian'], ['el-GR', 'Ελληνικά', 'Greek'], ['sr-RS', 'Српски', 'Serbian'],
  ['hr-HR', 'Hrvatski', 'Croatian'], ['sl-SI', 'Slovenščina', 'Slovenian'], ['lt-LT', 'Lietuvių', 'Lithuanian'],
  ['lv-LV', 'Latviešu', 'Latvian'], ['et-EE', 'Eesti', 'Estonian'], ['ca-ES', 'Català', 'Catalan'],
  ['eu-ES', 'Euskara', 'Basque'], ['gl-ES', 'Galego', 'Galician'], ['af-ZA', 'Afrikaans', 'Afrikaans'],
  ['sw-KE', 'Kiswahili', 'Swahili'], ['am-ET', 'አማርኛ', 'Amharic'], ['ka-GE', 'ქართული', 'Georgian'],
];
export const langName = (code, uiLang = 'zh') => {
  const hit = LANGS.find(l => l[0] === code);
  return hit ? hit[uiLang === 'zh' ? 1 : 2] : code;
};
export const L = (() => {
  let lang = 'zh';
  const set = l => { lang = l === 'en' ? 'en' : 'zh'; };
  const t = (k, vars) => {
    let s = (lang === 'zh' ? ZH : EN)[k] ?? ZH[k] ?? k;
    if (vars) for (const [kk, vv] of Object.entries(vars)) s = s.replaceAll('{' + kk + '}', vv);
    return s;
  };
  return { t, set, get lang() { return lang; }, get isZh() { return lang === 'zh'; } };
})();

/* ---------------- store ---------------- */
const KEY = 'lecsync.web.v1';
const DEFAULTS = {
  version: 1,
  profile: { name: '', email: '', avatar: '', plan: 'pro', joined: Date.now() },
  settings: {
    uiLang: 'zh', theme: 'auto', subtitleSize: 20, recognitionLang: 'zh-CN', targetLang: 'en-US',
    autoTranslate: true, bilingual: true, autoDigest: true,
    engine: 'auto', asrEndpoint: 'https://api.siliconflow.cn/v1', asrKey: '', asrModel: 'FunAudioLLM/SenseVoiceSmall',
    aiEndpoint: '', aiKey: '', aiModel: 'gpt-4o-mini',
    seenOnboarding: false, unmarkTips: {},
  },
  sessions: [], folders: [], chats: [], trash: [], team: null,
  plan: { tier: 'pro', unlocked: true, since: Date.now(), source: 'free-build' },
};
let db = null;
const subs = new Set();
function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? merge(DEFAULTS, JSON.parse(raw)) : structuredClone(DEFAULTS);
  } catch { db = structuredClone(DEFAULTS); }
  return db;
}
function merge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object' && over && typeof over === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
    return out;
  }
  return over === undefined ? base : over;
}
export const store = {
  get data() { return load(); },
  get settings() { return load().settings; },
  get sessions() { return load().sessions.filter(s => !s.deletedAt); },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('save failed', e); }
    subs.forEach(fn => { try { fn(db); } catch {} });
  },
  sub(fn) { subs.add(fn); return () => subs.delete(fn); },
  reset() { db = structuredClone(DEFAULTS); this.save(); },
  import(json) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    if (!obj || !Array.isArray(obj.sessions)) throw new Error('bad');
    db = merge(DEFAULTS, obj); this.save();
  },
  /* sessions */
  addSession(s) {
    s.id ||= uid('ses'); s.createdAt ||= Date.now(); s.updatedAt = Date.now();
    load().sessions.unshift(s); this.save(); return s;
  },
  getSession(id) { return load().sessions.find(s => s.id === id); },
  updateSession(id, patch) {
    const s = this.getSession(id); if (!s) return null;
    Object.assign(s, patch, { updatedAt: Date.now() }); this.save(); return s;
  },
  deleteSession(id) {
    const d = load(); const i = d.sessions.findIndex(s => s.id === id);
    if (i < 0) return;
    const [s] = d.sessions.splice(i, 1);
    s.deletedAt = Date.now(); d.trash.unshift(s); this.save();
  },
  restoreSession(id) {
    const d = load(); const i = d.trash.findIndex(s => s.id === id); if (i < 0) return;
    const [s] = d.trash.splice(i, 1); delete s.deletedAt; d.sessions.unshift(s); this.save();
  },
  purgeSession(id) { const d = load(); d.trash = d.trash.filter(s => s.id !== id); this.save(); },
  /* folders */
  addFolder(name, color) {
    const f = { id: uid('fld'), name: name || 'Folder', color: color || '#0b0b0c', createdAt: Date.now() };
    load().folders.push(f); this.save(); return f;
  },
  updateFolder(id, patch) { const f = load().folders.find(x => x.id === id); if (f) Object.assign(f, patch); this.save(); return f; },
  deleteFolder(id) {
    const d = load(); d.folders = d.folders.filter(f => f.id !== id);
    d.sessions.forEach(s => { if (s.folderId === id) s.folderId = null; }); this.save();
  },
  /* chats */
  addChat(c) { c.id ||= uid('cht'); c.createdAt ||= Date.now(); load().chats.unshift(c); this.save(); return c; },
  getChat(id) { return load().chats.find(c => c.id === id); },
  updateChat(id, patch) { const c = this.getChat(id); if (c) Object.assign(c, patch, { updatedAt: Date.now() }); this.save(); return c; },
  deleteChat(id) { const d = load(); d.chats = d.chats.filter(c => c.id !== id); this.save(); },
};

/* ---------------- audio blob store (IndexedDB) ---------------- */
let idb = null;
const withTimeout = (p, ms = 1500, fallback = null) =>
  Promise.race([p, new Promise(r => setTimeout(() => r(fallback), ms))]);
function openIdb() {
  if (idb) return idb;
  idb = withTimeout(new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no-idb'));
    const r = indexedDB.open('lecsync-audio', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('idb-blocked'));
  }), 2000, null);
  return idb;
}
export const audioStore = {
  async put(id, blob) {
    try {
      const d = await openIdb(); if (!d) return;
      return await withTimeout(new Promise((res, rej) => {
        const tx = d.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').put(blob, id);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      }), 4000);
    } catch (e) { console.warn('[audio] put failed', e); }
  },
  async get(id) {
    try {
      const d = await openIdb(); if (!d) return null;
      return await withTimeout(new Promise((res, rej) => {
        const tx = d.transaction('blobs', 'readonly');
        const q = tx.objectStore('blobs').get(id);
        q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error);
      }), 2000, null);
    } catch { return null; }
  },
  async del(id) {
    try {
      const d = await openIdb(); if (!d) return;
      await withTimeout(new Promise(res => {
        const tx = d.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').delete(id); tx.oncomplete = res;
      }), 1500);
    } catch {}
  },
  async size() {
    try {
      const d = await openIdb(); if (!d) return 0;
      return await withTimeout(new Promise(res => {
        let n = 0;
        const q = d.transaction('blobs', 'readonly').objectStore('blobs').openCursor();
        q.onsuccess = e => { const c = e.target.result; if (c) { n += c.value?.size || 0; c.continue(); } else res(n); };
        q.onerror = () => res(0);
      }), 1200, 0);
    } catch { return 0; }
  },
};
