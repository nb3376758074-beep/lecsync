/* ============ LecSync Web 路 core: utils, i18n, store, icons ============ */
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
    ? { now: '鍒氬垰', m: '鍒嗛挓鍓?, h: '灏忔椂鍓?, d: '澶╁墠' }
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
  appName: 'LecSync', tagline: '璇惧爞褰曢煶 路 瀹炴椂杞綍 路 AI 绾',
  tabRecord: '褰曢煶', tabFolders: '鏂囦欢澶?, tabChat: 'AI 瀵硅瘽', tabProfile: '鎴戠殑',
  record: '褰曢煶', listening: '姝ｅ湪杞綍', paused: '宸叉殏鍋?, ready: '鍑嗗褰曢煶',
  tapToStart: '鐐逛竴涓嬪紑濮嬪綍闊?, tapToStop: '鐐逛竴涓嬬粨鏉熷苟淇濆瓨',
  startRecording: '寮€濮嬪綍闊?, stopAndSave: '缁撴潫骞朵繚瀛?, pause: '鏆傚仠', resume: '缁х画',
  mark: '鏍囪', marked: '宸叉爣璁?, assist: 'AI 鍔╂墜', fullscreenSub: '鍏ㄥ睆瀛楀箷',
  unlimited: '鏃犻檺鏃堕暱 路 宸茶В閿?, unlockedCard: 'Pro 鏉冪泭宸茶В閿?,
  autoSaved: '宸茶嚜鍔ㄤ繚瀛樺埌浼氳瘽', savedTo: '宸蹭繚瀛?,
  transcript: '杞綍', digest: '绾', docs: '鏂囦欢', chatTab: '瀵硅瘽',
  outline: '澶х翰', keyPoints: '瑕佺偣', actionItems: '寰呭姙浜嬮」', keywords: '鍏抽敭璇?,
  timeline: '閲嶇偣鏃跺埢', speakerNote: '鍙戣█瑕佺偣',
  summaryEmpty: '杩樻病鏈夌邯瑕侊紝鐐圭敓鎴愬嵆鍙?, genSummary: '鐢熸垚绾', regenSummary: '閲嶆柊鐢熸垚',
  transcriptEmpty: '杩樻病鏈夎浆褰曞唴瀹?,
  searchInSession: '鎼滅储杩欐浼氳瘽', searchAll: '鎼滅储浼氳瘽銆佽浆褰曘€佽瘧鏂?,
  export: '瀵煎嚭', exportAs: '瀵煎嚭涓?, copyText: '澶嶅埗鏂囨湰', shareText: '鍒嗕韩',
  delete: '鍒犻櫎', rename: '閲嶅懡鍚?, moveTo: '绉诲姩鍒?, duplicate: '鍒涘缓鍓湰',
  newFolder: '鏂板缓鏂囦欢澶?, folderName: '鏂囦欢澶瑰悕绉?, folders: '鏂囦欢澶?,
  noFolders: '杩樻病鏈夋枃浠跺す', folderEmpty: '杩欎釜鏂囦欢澶规槸绌虹殑',
  sessions: '浼氳瘽', session: '浼氳瘽', minutes: '鍒嗛挓', words: '瀛?,
  allSessions: '鍏ㄩ儴浼氳瘽', recent: '鏈€杩?, trash: '鍥炴敹绔?, restore: '杩樺師',
  trashEmpty: '鍥炴敹绔欐槸绌虹殑', moveToTrash: '绉诲埌鍥炴敹绔?,
  newChat: '鏂板璇?, chats: 'AI 瀵硅瘽', askAnything: '闂偣浠€涔堚€?,
  chatEmpty: '杩樻病鏈夊璇?, chatIntro: '閽堝浣犵殑褰曢煶鎻愰棶锛屾垜浼氬紩鐢ㄦ椂闂寸偣銆?,
  upload: '涓婁紶', uploadAudio: '涓婁紶闊宠棰?, uploadDoc: '涓婁紶鏂囨。',
  uploadHint: '鏀寔 mp3 / m4a / wav / mp4 / mov锛屽崟鏂囦欢 鈮?200 MB',
  importText: '绮樿创鏂囧瓧瀵煎叆', importPlaceholder: '鎶婂凡缁忓瓨鍦ㄧ殑杞綍绋跨矘璐村埌杩欓噷鈥?,
  importBtn: '瑙ｆ瀽骞跺鍏?,
  translating: '缈昏瘧涓€?, translate: '缈昏瘧', translateTo: '缈昏瘧鎴?, translateSrc: '婧愯瑷€',
  bilingual: '鍙岃瀛楀箷', showTranslation: '鏄剧ず璇戞枃', autoTranslate: '鑷姩缈昏瘧',
  dictation: '鍚啓缁冧範', dictationHint: '璺熺潃褰曢煶閫愬彞鎵撳瓧锛岀郴缁熶細瀹炴椂鍒ゅ垎',
  dictationStart: '寮€濮嬬粌涔?, dictationDone: '瀹屾垚', accuracy: '鍑嗙‘鐜?,
  dictationWords: '鑷畾涔夎瘝搴?, addWord: '娣诲姞璇嶇粍',
  settings: '璁剧疆', language: '鐣岄潰璇█', theme: '澶栬', themeAuto: '璺熼殢绯荤粺',
  themeLight: '娴呰壊', themeDark: '娣辫壊', subtitleSize: '瀛楀箷瀛楀彿', recognitionLang: '璇嗗埆璇█',
  targetLang: '缈昏瘧鐩爣', engine: '杞啓寮曟搸', engineBrowser: '娴忚鍣ㄥ疄鏃惰瘑鍒?,
  engineWhisper: 'Whisper 鎺ュ彛锛堣嚜濉?Key锛?, engineManual: '閿洏鍚啓',
  asrEndpoint: '杞啓鎺ュ彛鍦板潃', asrKey: '鎺ュ彛 Key', asrModel: '妯″瀷鍚?,
  aiEndpoint: 'AI 鎺ュ彛鍦板潃', aiKey: 'AI Key', aiModel: 'AI 妯″瀷',
  saveSettings: '淇濆瓨', saved: '宸蹭繚瀛?, testConn: '娴嬭瘯杩炴帴',
  dataExport: '瀵煎嚭鍏ㄩ儴鏁版嵁', dataImport: '瀵煎叆鏁版嵁', clearData: '娓呯┖鏈湴鏁版嵁',
  about: '鍏充簬', privacy: '闅愮涓庢暟鎹?, offlineModels: '绂荤嚎妯″瀷', myVoice: '鎴戠殑澹伴煶',
  sharedWithMe: '鍏变韩缁欐垜', team: '鍥㈤槦', invite: '閭€璇锋垚鍛?, redeem: '鍏戞崲鐮?,
  account: '璐﹀彿', signIn: '鐧诲綍', signUp: '娉ㄥ唽', email: '閭', password: '瀵嗙爜',
  continueWith: '鎴?, guest: '鐩存帴寮€濮嬶紙鏈湴妯″紡锛?, logout: '閫€鍑虹櫥褰?,
  proTitle: '鍏ㄩ儴鍔熻兘宸茶В閿?, proSub: '杩欎釜鐗堟湰涓嶅惈浠讳綍浠樿垂澧欙細鏃犻檺褰曢煶銆佹棤闄?AI銆佹棤闄愬鍑恒€?,
  proFeature1: '褰曢煶鏃堕暱涓嶉檺锛堝師 120 鍒嗛挓/鏈堬級',
  proFeature2: 'AI 瀵硅瘽涓嶉檺鏉℃暟锛堝師 5 鏉?澶╋級',
  proFeature3: '鍚屽０浼犺瘧 + 鍙岃瀛楀箷',
  proFeature4: '瀵煎嚭闄?AI 绾銆丼RT/VTT 鍙岃瀛楀箷',
  proFeature5: '浜戠鍚屾涓庡洟闃熷叡浜?,
  proFeature6: '璇煶鍏嬮殕鏈楄锛堟垜鐨勫０闊筹級',
  storage: '瀛樺偍鍗犵敤', files: '涓枃浠?, version: '鐗堟湰',
  firstRunTitle: '鎶婅鍫傝鐨勮瘽锛屽彉鎴愬彲鎼滅储鐨勬枃瀛?,
  firstRunBody: '瀹炴椂杞綍銆佸弻璇瓧骞曘€丄I 绾锛屼竴娆″綍闊冲叏閮ㄦ悶瀹氥€?,
  secondTitle: '褰曢煶姘镐笉璁鹃檺',
  secondBody: '鍏嶈垂鐗堝師鏈瘡鏈?120 鍒嗛挓銆傝繖涓€鐗堟妸闄愬埗鍘绘帀浜嗭細鎯冲綍澶氫箙褰曞涔呫€?,
  thirdTitle: '鎷胯捣灏辩敤锛屾棤闇€瀹夎',
  thirdBody: '鍦?iPhone 涓娿€屾坊鍔犲埌涓诲睆骞曘€嶏紝鍍?App 涓€鏍峰叏灞忎娇鐢ㄣ€?,
  next: '缁х画', gotIt: '寮€濮嬩娇鐢?, skip: '璺宠繃',
  iosTip: 'iPhone锛氱偣搴曢儴銆屽垎浜€嶁啋 娣诲姞鍒颁富灞忓箷锛屽彲鍏ㄥ睆浣跨敤',
  live: '瀹炴椂', recording: '褰曢煶涓?, processing: '澶勭悊涓?, done: '瀹屾垚',
  remove: '绉婚櫎', cancel: '鍙栨秷', confirm: '纭畾', ok: '濂?,
  yourName: '浣犵殑鍚嶅瓧', today: '浠婂ぉ',
  noSessions: '杩樻病鏈夊綍闊?, noSessionsSub: '鐐逛笂闈㈢殑绾㈣壊鎸夐挳寮€濮嬬涓€娆″綍闊?,
  quickActions: '蹇嵎鎿嶄綔', statMinutes: '褰曢煶鏃堕暱', statSessions: '浼氳瘽', statWords: '瀛楁暟',
  syncOn: '宸插悓姝?, syncOff: '浠呮湰鍦?, synced: '鎵€鏈夋暟鎹繚瀛樺湪杩欏彴璁惧',
  speaker: '鍙戣█浜?, playAll: '杩炵画鎾斁', pauseAll: '鏆傚仠鎾斁',
  srtHint: 'SRT / VTT 鍙鍏ュ壀杈戣蒋浠舵垨鎾斁鍣?, mdHint: 'Markdown 鍚邯瑕併€佸叧閿瘝涓庡叏鏂?,
  shareVia: '閫氳繃绯荤粺鍒嗕韩', copied: '宸插鍒?, nothingToCopy: '娌℃湁鍙鍒剁殑鍐呭',
  genDigestFor: '鐢熸垚绾锛?, digestNote: '鏈湴鎻愮偧锛屽彲鎺ュ叆澶фā鍨嬭幏寰楁洿寮烘憳瑕?,
  askThisQuestion: '灏辫繖娈甸棶 AI', relatedChats: '鐩稿叧瀵硅瘽',
  selectAll: '鍏ㄩ€?, selected: '宸查€夋嫨', items: '椤?,
  teamEmpty: '杩樻病鏈夊姞鍏ュ洟闃?, inviteCode: '閭€璇风爜', copyCode: '澶嶅埗閭€璇风爜',
  redeemHint: '杈撳叆鍏戞崲鐮佷互婵€娲诲洟闃熷腑浣?, redeemBtn: '鍏戞崲',
  voiceHint: '閫夋嫨鏈楄闊宠壊锛涙帴鍏?TTS 鍚庡彲鍏嬮殕浣犺嚜宸辩殑澹伴煶',
  modelsHint: '涓嬭浇绂荤嚎妯″瀷鍚庡彲鍦ㄦ棤缃戠幆澧冭浆褰曪紙缃戦〉鐗堜娇鐢ㄦ祻瑙堝櫒寮曟搸锛?,
  modelSize: '澶у皬', download: '涓嬭浇', downloaded: '宸蹭笅杞?,
  privacyBody: '鎵€鏈夊綍闊充笌杞綍榛樿鍙繚瀛樺湪鏈満娴忚鍣紙IndexedDB / localStorage锛夛紝涓嶄笂浼犳湇鍔″櫒銆傚紑鍚?AI 鎺ュ彛鍚庝粎鍙戦€佹枃瀛椼€?,
  clearWarn: '灏嗗垹闄ゆ湰鏈烘墍鏈変細璇濄€佹枃浠跺す涓庤缃紝鏃犳硶鎭㈠銆?,
  imported: '宸插鍏?, importFail: '瀵煎叆澶辫触锛氭牸寮忎笉瀵?,
  needText: '鍐呭涓虹┖', micDenied: '楹﹀厠椋庤鎷掔粷锛岃鍦ㄦ祻瑙堝櫒璁剧疆閲屽厑璁?,
  noSpeech: '杩欎釜娴忚鍣ㄤ笉鏀寔瀹炴椂璇嗗埆锛屽凡鍒囨崲鍒伴敭鐩樺惉鍐欐ā寮?,
  speechReady: '瀹炴椂璇嗗埆宸插氨缁?, recordingSaved: '褰曢煶宸蹭繚瀛?,
  selectLang: '閫夋嫨璇█', detectAuto: '鑷姩妫€娴?,
  exportStarted: '宸插紑濮嬩笅杞?, shared: '宸叉墦寮€鍒嗕韩',
  mins: '鍒嗛挓', goalToday: '浠婃棩鐩爣', quickStart: '蹇€熷紑濮?,
  newSessionTitle: '鏂板綍闊?, untitled: '鏈懡鍚嶄細璇?,
  autoTitle: '鑷姩鍛藉悕', sessionTitle: '浼氳瘽鍚嶇О',
  saving: '淇濆瓨涓€?, syncPending: '绂荤嚎锛屾仮澶嶇綉缁滃悗鑷姩鍚屾',
  aiThinking: '姝ｅ湪鎬濊€冣€?, aiLocal: '鏈湴瑙勫垯绾', aiModelOn: '宸叉帴鍏ュぇ妯″瀷',
  askPlaceholder: '閽堝杩欐褰曢煶鎻愰棶锛屼緥濡傘€岃€佸笀甯冪疆浜嗕粈涔堜綔涓氾紵銆?,
  cite: '寮曠敤', page: '绗?{n} 椤?, at: '鍦?,
};
const EN = {
  appName: 'LecSync', tagline: 'Record 路 Transcribe 路 Summarize',
  tabRecord: 'Record', tabFolders: 'Folders', tabChat: 'Chat', tabProfile: 'Me',
  record: 'Record', listening: 'Transcribing', paused: 'Paused', ready: 'Ready',
  tapToStart: 'Tap to start recording', tapToStop: 'Tap to stop & save',
  startRecording: 'Start recording', stopAndSave: 'Stop & save', pause: 'Pause', resume: 'Resume',
  mark: 'Mark', marked: 'Marked', assist: 'Live assist', fullscreenSub: 'Full screen',
  unlimited: 'Unlimited 路 unlocked', unlockedCard: 'Pro unlocked',
  autoSaved: 'Saved to session', savedTo: 'Saved',
  transcript: 'Transcript', digest: 'Digest', docs: 'Files', chatTab: 'Chat',
  outline: 'Outline', keyPoints: 'Key points', actionItems: 'Action items', keywords: 'Keywords',
  timeline: 'Highlights', speakerNote: 'Speaking notes',
  summaryEmpty: 'No digest yet 鈥?generate one', genSummary: 'Generate digest', regenSummary: 'Regenerate',
  transcriptEmpty: 'No transcript yet',
  searchInSession: 'Search this session', searchAll: 'Search sessions, transcripts, translations',
  export: 'Export', exportAs: 'Export as', copyText: 'Copy text', shareText: 'Share',
  delete: 'Delete', rename: 'Rename', moveTo: 'Move to', duplicate: 'Duplicate',
  newFolder: 'New folder', folderName: 'Folder name', folders: 'Folders',
  noFolders: 'No folders yet', folderEmpty: 'This folder is empty',
  sessions: 'sessions', session: 'session', minutes: 'min', words: 'words',
  allSessions: 'All sessions', recent: 'Recent', trash: 'Trash', restore: 'Restore',
  trashEmpty: 'Trash is empty', moveToTrash: 'Move to Trash',
  newChat: 'New chat', chats: 'Chats', askAnything: 'Ask anything鈥?,
  chatEmpty: 'No chats yet', chatIntro: 'Ask about your recordings; I cite the timestamps.',
  upload: 'Upload', uploadAudio: 'Upload audio', uploadDoc: 'Upload document',
  uploadHint: 'mp3 / m4a / wav / mp4 / mov, up to 200 MB',
  importText: 'Paste text', importPlaceholder: 'Paste an existing transcript here鈥?,
  importBtn: 'Parse & import',
  translating: 'Translating鈥?, translate: 'Translate', translateTo: 'Translate to', translateSrc: 'From',
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
  iosTip: 'iPhone: Share 鈫?Add to Home Screen for full screen use',
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
  needText: 'Nothing to import', micDenied: 'Microphone blocked 鈥?allow it in browser settings',
  noSpeech: 'Live recognition unavailable; switched to keyboard dictation',
  speechReady: 'Live recognition ready', recordingSaved: 'Recording saved',
  selectLang: 'Select language', detectAuto: 'Auto detect',
  exportStarted: 'Download started', shared: 'Share sheet opened',
  mins: 'min', goalToday: "Today's goal", quickStart: 'Quick start',
  newSessionTitle: 'New recording', untitled: 'Untitled session',
  autoTitle: 'Auto title', sessionTitle: 'Session title',
  saving: 'Saving鈥?, syncPending: 'Offline 鈥?will sync when back online',
  aiThinking: 'Thinking鈥?, aiLocal: 'Local digest', aiModelOn: 'LLM connected',
  askPlaceholder: 'Ask about this recording, e.g. "What was the homework?"',
  cite: 'cite', page: 'p. {n}', at: 'at',
};
export const APP_VER = '2.7.0';

export const LANGS = [
  ['zh-CN', '涓枃锛堢畝浣擄級', 'Chinese (Simplified)'], ['zh-TW', '涓枃锛堢箒楂旓級', 'Chinese (Traditional)'],
  ['en-US', 'English', 'English'], ['ja-JP', '鏃ユ湰瑾?, 'Japanese'], ['ko-KR', '頃滉淡鞏?, 'Korean'],
  ['ru-RU', '袪褍褋褋泻懈泄', 'Russian'], ['uk-UA', '校泻褉邪褩薪褋褜泻邪', 'Ukrainian'], ['de-DE', 'Deutsch', 'German'],
  ['fr-FR', 'Fran莽ais', 'French'], ['es-ES', 'Espa帽ol', 'Spanish'], ['pt-BR', 'Portugu锚s', 'Portuguese'],
  ['it-IT', 'Italiano', 'Italian'], ['nl-NL', 'Nederlands', 'Dutch'], ['pl-PL', 'Polski', 'Polish'],
  ['tr-TR', 'T眉rk莽e', 'Turkish'], ['ar-SA', '丕賱毓乇亘賷丞', 'Arabic'], ['he-IL', '注讘专讬转', 'Hebrew'],
  ['fa-IR', '賮丕乇爻蹖', 'Persian'], ['hi-IN', '啶灌た啶ㄠ啶︵', 'Hindi'], ['bn-IN', '唳唳傕Σ唳?, 'Bengali'],
  ['ta-IN', '喈む喈苦喁?, 'Tamil'], ['th-TH', '喙勦笚喔?, 'Thai'], ['vi-VN', 'Ti岷縩g Vi峄噒', 'Vietnamese'],
  ['id-ID', 'Bahasa Indonesia', 'Indonesian'], ['ms-MY', 'Bahasa Melayu', 'Malay'],
  ['fil-PH', 'Filipino', 'Filipino'], ['sv-SE', 'Svenska', 'Swedish'], ['no-NO', 'Norsk', 'Norwegian'],
  ['da-DK', 'Dansk', 'Danish'], ['fi-FI', 'Suomi', 'Finnish'], ['cs-CZ', '膶e拧tina', 'Czech'],
  ['sk-SK', 'Sloven膷ina', 'Slovak'], ['hu-HU', 'Magyar', 'Hungarian'], ['ro-RO', 'Rom芒n膬', 'Romanian'],
  ['bg-BG', '袘褗谢谐邪褉褋泻懈', 'Bulgarian'], ['el-GR', '螘位位畏谓喂魏维', 'Greek'], ['sr-RS', '小褉锌褋泻懈', 'Serbian'],
  ['hr-HR', 'Hrvatski', 'Croatian'], ['sl-SI', 'Sloven拧膷ina', 'Slovenian'], ['lt-LT', 'Lietuvi懦', 'Lithuanian'],
  ['lv-LV', 'Latvie拧u', 'Latvian'], ['et-EE', 'Eesti', 'Estonian'], ['ca-ES', 'Catal脿', 'Catalan'],
  ['eu-ES', 'Euskara', 'Basque'], ['gl-ES', 'Galego', 'Galician'], ['af-ZA', 'Afrikaans', 'Afrikaans'],
  ['sw-KE', 'Kiswahili', 'Swahili'], ['am-ET', '釆犪垱釄姏', 'Amharic'], ['ka-GE', '醿メ儛醿犪儣醿ａ儦醿?, 'Georgian'],
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
    engine: 'auto', asrEndpoint: 'https://api.siliconflow.cn/v1', asrKey: '', asrModel: 'FunAudioLLM/SenseVoiceSmall', localModel: 'whisper-base',
    twoWay: false, langA: 'zh-CN', langB: 'ru-RU',
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
    // 鐙珛鐨?ASR 閰嶇疆锛坰etup.html 鍐欏叆锛夛紝閬垮厤琚富 store 瑕嗙洊
    try {
      const k = localStorage.getItem('lcs.asrKey');
      if (k) db.settings.asrKey = k;
      const ep = localStorage.getItem('lcs.asrEndpoint');
      if (ep) db.settings.asrEndpoint = ep;
      const md = localStorage.getItem('lcs.asrModel');
      if (md) db.settings.asrModel = md;
    } catch {}
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
