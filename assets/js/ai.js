/* ============ ai: local digest extraction + LLM chat (own key) ============ */
import { store, fmtTs } from './core.js?v=2.0.0';

const STOP_ZH = new Set(('的 了 是 在 和 与 就 也 都 而 及 或 一个 这个 那个 我们 你们 他们 它 我 你 他 她 这 那 有 没有 不是 因为 所以 但是 如果 然后 可以 需要 进行 通过 对于 关于 已经 还是 以及 什么 怎么 这样 那样 一下 一些 现在 时候 问题 东西 大家 感觉 比较 非常 特别 可能 应该 知道 觉得 就是 还有 其实 这种 那种 方面 内容 部分 情况'.split(/\s+/)));
const STOP_EN = new Set(('the a an and or but if then that this these those i you he she it we they is are was were be been being to of in on at for with from by as not no yes so very just really about into over under than too also can could would should will shall may might must do does did done have has had having me my our your their its them us our i\'m it\'s don\'t doesn\'t'.split(/\s+/)));
const ACTION = /(作业|任务|提交|上交|截止|答题|deadline|due date|homework|assignment|submit|hand in|read chapter|预习|复习|备考|考试范围|考试时间|小测|论文|报告|小组|分组|务必|记得|别忘了|下周[一二三四五六日天]|下个月|明天[上下]?午?)/i;

function tokens(text) {
  const out = [];
  const zh = text.match(/[\u4e00-\u9fff]{2,4}/g) || [];
  const en = text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
  for (const w of zh) if (!STOP_ZH.has(w)) out.push(w);
  for (const w of en) if (!STOP_EN.has(w)) out.push(w);
  return out;
}

function scoreLine(line, i, n) {
  const t = line.text || '';
  let s = Math.min(1, t.length / 90);            // substance
  s += i < n * 0.15 ? 0.35 : 0;                  // intro statements
  s += /(总结|总之|重点|关键|注意|记住|核心|in summary|the key|important|remember|note that)/i.test(t) ? 0.7 : 0;
  s += /[0-9]{1,4}/.test(t) ? 0.15 : 0;
  s += ACTION.test(t) ? 0.6 : 0;
  s += line.mark ? 1 : 0;
  if (t.length < 12) s -= 0.4;
  return s;
}

export function localDigest(session) {
  const lines = (session.lines || []).filter(l => (l.text || '').trim());
  const n = lines.length || 1;
  const ranked = lines.map((l, i) => ({ l, s: scoreLine(l, i, n) })).sort((a, b) => b.s - a.s);

  // pick top sentences, skipping near-duplicates
  const picked = [];
  for (const cand of ranked) {
    if (picked.length >= Math.min(6, Math.max(3, Math.round(n / 8)))) break;
    if (picked.some(p => similar(p.l.text, cand.l.text) > 0.72)) continue;
    picked.push(cand);
  }
  const keyLines = picked.map(x => x.l).sort((a, b) => a.t - b.t);

  // outline: segment every ~6 lines / 3 minutes
  const outline = [];
  const seg = Math.max(4, Math.round(n / 5));
  for (let i = 0; i < lines.length; i += seg) {
    const chunk = lines.slice(i, i + seg);
    const best = chunk.map((l, j) => ({ l, s: scoreLine(l, j, chunk.length) })).sort((a, b) => b.s - a.s)[0];
    if (best) outline.push({ t: chunk[0].t, head: shortHead(best.l.text) });
  }

  const freq = new Map();
  for (const l of lines) for (const w of tokens(l.text)) freq.set(w, (freq.get(w) || 0) + 1);
  const keywords = [...freq.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);

  const actions = [];
  for (const l of lines) {
    if (!ACTION.test(l.text)) continue;
    const clean = strip(l.text.replace(/^(所以|然后|那么|好|ok|嗯|另外|最后)[，,\s]*/i, ''));
    if (clean.length < 8) continue;
    if (actions.some(a => similar(a.text, clean) > 0.6)) continue;
    actions.push({ t: l.t, text: clean.slice(0, 160) });
    if (actions.length >= 8) break;
  }

  const marks = lines.filter(l => l.mark);
  const timeline = [...marks, ...keyLines.filter(k => !k.mark).slice(0, 4)]
    .sort((a, b) => a.t - b.t).slice(0, 10)
    .map(l => ({ t: l.t, text: shortHead(l.text, 90) }));

  const minutes = buildMinutes(session, lines, outline, keyLines, actions, keywords);
  return {
    generatedAt: Date.now(), source: 'local',
    title: session.title || suggestTitle(lines),
    summary: minutes,
    outline, keyPoints: keyLines.map(l => ({ t: l.t, text: strip(l.text) })),
    actionItems: actions, keywords, timeline,
    duration: lines.length ? lines[lines.length - 1].t : (session.duration || 0),
    wordCount: lines.reduce((a, l) => a + (l.text || '').replace(/\s/g, '').length, 0),
  };
}

const strip = s => String(s || '').replace(/\s+/g, ' ').trim();
const shortHead = (s, n = 60) => { const t = strip(s); return t.length > n ? t.slice(0, n) + '…' : t; };

function buildMinutes(session, lines, outline, keyLines, actions, keywords) {
  if (!lines.length) return '';
  const title = session.title || suggestTitle(lines);
  const open = strip(lines[0].text).replace(/[。．.]+$/, '');
  const points = keyLines.slice(0, 4)
    .map(l => `· ${strip(l.text).replace(/[。．.]+$/, '')}`).join('\n');
  const todo = actions.length
    ? `\n\n待办：${strip(actions[0].text).replace(/[。．.]+$/, '')}`
    : '';
  const head = `本段录音围绕「${title}」展开。${open ? `开场提到：${open}。` : ''}`;
  return head + (points ? `\n\n主要内容：\n${points}` : '') + todo;
}

/* rough char-level overlap, for de-duplicating near-identical lines */
function similar(a, b) {
  const norm = t => String(t).replace(/[\s，。！？、,.!?;；:：""'']/g, '').toLowerCase();
  const A = norm(a), B = norm(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const setA = new Set(A), setB = new Set(B);
  let inter = 0;
  for (const ch of setA) if (setB.has(ch)) inter++;
  return inter / Math.max(setA.size, setB.size);
}

export function suggestTitle(lines) {
  const first = lines.find(l => (l.text || '').length > 8);
  if (!first) return '';
  return shortHead(first.text, 26).replace(/[，,。.、]+$/, '');
}

/* ---- LLM chat (OpenAI-compatible) ---- */
export function llmReady(s = store.settings) { return !!(s.aiEndpoint && s.aiKey); }

export async function llmChat(messages, s = store.settings) {
  const base = s.aiEndpoint.replace(/\/+$/, '');
  const url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.aiKey },
    body: JSON.stringify({ model: s.aiModel || 'gpt-4o-mini', messages, temperature: 0.3, max_tokens: 900 }),
  });
  if (!res.ok) throw new Error('llm ' + res.status + ' ' + (await res.text()).slice(0, 160));
  const j = await res.json();
  return j.choices?.[0]?.message?.content?.trim() || '';
}

function transcriptContext(session, maxChars = 7000) {
  const lines = (session.lines || []).filter(l => l.text);
  let out = '', total = 0;
  for (const l of lines) {
    const row = `[${fmtTs(l.t)}] ${l.text}\n`;
    if (total + row.length > maxChars) break;
    out += row; total += row.length;
  }
  return out;
}

export async function askAI(question, session, history = []) {
  const s = store.settings;
  if (llmReady(s)) {
    const sys = `You are 皓月翻译's study assistant. Answer in the user's language. Use the transcript only; cite timestamps like [12:30]. If the answer is not in the transcript, say so plainly.\n\nTRANSCRIPT:\n${transcriptContext(session)}`;
    const msgs = [{ role: 'system', content: sys },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: question }];
    return { text: await llmChat(msgs, s), source: 'llm' };
  }
  return { text: localAnswer(question, session), source: 'local' };
}

export function localAnswer(q, session) {
  const lines = (session.lines || []).filter(l => l.text);
  if (!lines.length) return '这段会话还没有转录内容。先录音或导入文字，我就能根据它回答。';
  const qTokens = [...new Set(tokens(q))];
  const isSummary = /(总结|摘要|概括|讲了什么|主要内容|summary|summarize|what.*about)/i.test(q);
  if (isSummary) {
    const d = session.digest || localDigest(session);
    return `**${d.title || '这段录音'}**\n\n${d.summary}\n\n要点：\n` +
      d.keyPoints.slice(0, 4).map(k => `· [${fmtTs(k.t)}] ${k.text}`).join('\n');
  }
  const scored = lines.map(l => {
    const t = (l.text + ' ' + (l.tr || '')).toLowerCase();
    let sc = 0;
    for (const tk of qTokens) if (t.includes(tk.toLowerCase())) sc += 2;
    if (l.mark) sc += 1;
    return { l, sc };
  }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 5);

  if (!scored.length) {
    const near = lines.slice(0, 3);
    return `转录里没找到和「${q}」直接相关的内容。可以换个说法，或者看看开头这几句：\n\n` +
      near.map(l => `· [${fmtTs(l.t)}] ${shortHead(l.text, 100)}`).join('\n');
  }
  return `根据转录，相关的内容有：\n\n` + scored.map(x =>
    `· [${fmtTs(x.l.t)}] ${strip(x.l.text)}${x.l.tr ? `\n  ${x.l.tr}` : ''}`).join('\n') +
    `\n\n（本地检索结果。在「设置 → AI 接口」填入 Key 后可得到大模型生成的回答。）`;
}

/* ---- export formats ---- */
export function toTxt(session) {
  return `# ${session.title || 'Untitled'}\n${new Date(session.createdAt).toLocaleString()}\n\n` +
    (session.lines || []).map(l => `[${fmtTs(l.t)}] ${l.text}${l.tr ? '\n           ' + l.tr : ''}`).join('\n') + '\n';
}
const srtTime = s => {
  const ms = Math.round((s % 1) * 1000), sec = Math.floor(s);
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${ss},${String(ms).padStart(3, '0')}`;
};
export function toSrt(session, bilingual = false) {
  const lines = session.lines || [];
  return lines.map((l, i) => {
    const start = l.t, end = lines[i + 1]?.t ?? l.t + 3;
    const body = bilingual && l.tr ? `${l.text}\n${l.tr}` : l.text;
    return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${body}\n`;
  }).join('\n');
}
export function toVtt(session, bilingual = false) {
  return 'WEBVTT\n\n' + (session.lines || []).map((l, i) => {
    const lines = session.lines, start = l.t, end = lines[i + 1]?.t ?? l.t + 3;
    const fmt = s => srtTime(s).replace(',', '.');
    const body = bilingual && l.tr ? `${l.text}\n${l.tr}` : l.text;
    return `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${body}\n`;
  }).join('\n');
}
export function toMarkdown(session) {
  const d = session.digest;
  const meta = `> ${new Date(session.createdAt).toLocaleString()} · ${Math.round((session.duration || 0) / 60)} min · ${session.lines?.length || 0} lines`;
  let out = `# ${session.title || 'Untitled session'}\n\n${meta}\n\n`;
  if (d) {
    out += `## 摘要\n\n${d.summary || ''}\n\n`;
    if (d.outline?.length) out += `## 大纲\n\n` + d.outline.map(o => `- [${fmtTs(o.t)}] ${o.head}`).join('\n') + '\n\n';
    if (d.keyPoints?.length) out += `## 要点\n\n` + d.keyPoints.map(k => `- [${fmtTs(k.t)}] ${k.text}`).join('\n') + '\n\n';
    if (d.actionItems?.length) out += `## 待办\n\n` + d.actionItems.map(a => `- [ ] ${a.text}  _(${fmtTs(a.t)})_`).join('\n') + '\n\n';
    if (d.keywords?.length) out += `## 关键词\n\n${d.keywords.map(k => '`' + k + '`').join(' ')}\n\n`;
    if (d.timeline?.length) out += `## 重点时刻\n\n` + d.timeline.map(t => `- ${fmtTs(t.t)} — ${t.text}`).join('\n') + '\n\n';
  }
  out += `## 全文\n\n` + (session.lines || []).map(l =>
    `**${fmtTs(l.t)}** ${l.text}${l.tr ? `\n\n> ${l.tr}` : ''}`).join('\n\n') + '\n';
  return out;
}
export function download(name, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const safeName = s => (s || 'lecsync').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60);
