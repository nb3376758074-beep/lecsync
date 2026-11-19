/* demo seed: ?demo=1 —— 载入一段真实的课堂录音数据，便于看效果 / 截图 / 验收 */
import { store } from './core.js?v=2.7.2';
import { localDigest } from './ai.js?v=2.7.2';

const SCRIPT = [
  ['好，我们开始上课。今天讲第三章，主题是线性变换和特征值。', 'Alright, let\'s start. Today is chapter three — linear transformations and eigenvalues.'],
  ['先回顾一下上节课的内容：矩阵乘法不满足交换律，AB 一般不等于 BA。', 'First a quick recap: matrix multiplication is not commutative, AB is generally not equal to BA.'],
  ['线性变换可以理解成从一个向量空间到另一个向量空间的映射，并且保持加法和数乘。', 'A linear transformation maps one vector space to another while preserving addition and scalar multiplication.'],
  ['举个例子，二维平面上的旋转就是一个线性变换，它保持原点不动。', 'For example, rotation in the plane is a linear transformation; it fixes the origin.'],
  ['如果 T(v) 等于 λv，并且 v 不是零向量，那么 λ 就是特征值，v 是对应的特征向量。', 'If T(v) equals λv and v is nonzero, then λ is an eigenvalue and v its eigenvector.'],
  ['注意，特征值可以是复数，即便矩阵里全是实数。', 'Note that eigenvalues can be complex even when the matrix is real.'],
  ['求特征值的标准做法是解 det(A 减 λI) 等于零，这个多项式叫特征多项式。', 'The standard method is solving det(A minus λI) equals zero; that polynomial is the characteristic polynomial.'],
  ['大家看这个 2x2 的例子，特征多项式是 λ² 减 5λ 加 6，所以特征值是 2 和 3。', 'Look at this 2x2 example: the characteristic polynomial is λ² − 5λ + 6, so the eigenvalues are 2 and 3.'],
  ['作业：把讲义第 42 页的 1 到 5 题做完，下周三之前提交到教学平台。', 'Homework: do problems 1 to 5 on page 42 of the handout and submit on the platform before next Wednesday.'],
  ['另外，期中考试范围是前三章，考试时间下个月 12 号，闭卷。', 'Also, the midterm covers chapters 1 to 3, on the 12th next month, closed book.'],
  ['最后提醒一句，特征向量只确定到常数倍，写答案的时候别漏了这一点。', 'One last reminder: eigenvectors are only determined up to a scalar multiple.'],
  ['好，今天到这里，有问题下课来找我。', 'That\'s all for today — come find me after class if you have questions.'],
];

export function seed() {
  if (store.data.sessions.some(s => s.id === 'demo1')) {
    store.settings.seenOnboarding = true; store.save(); return;
  }
  const lines = SCRIPT.map(([zh, en], i) => ({
    t: i * 23 + 4, text: zh, tr: en, mark: i === 8 || i === 9,
  }));
  const session = {
    id: 'demo1',
    title: '线性代数 · 第三章 线性变换与特征值',
    lines,
    duration: 328,
    lang: 'zh-CN', targetLang: 'en-US',
    folderId: 'fld-demo',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    docs: [{ name: '第三章讲义.pdf.txt', size: 18422, addedAt: Date.now() - 3600e3, text: '第三章 线性变换\n3.1 定义…\n3.2 特征值与特征向量…' }],
    chat: [
      { role: 'user', content: '老师布置了什么作业？', at: Date.now() - 3600e3 },
      { role: 'assistant', source: 'local', at: Date.now() - 3590e3,
        content: '根据转录，作业是：\n\n· [03:08] 把讲义第 42 页的 1 到 5 题做完，下周三之前提交到教学平台。\n· [03:31] 期中考试范围是前三章，考试时间下个月 12 号，闭卷。' },
    ],
  };
  const s2 = {
    id: 'demo2',
    title: '产品周会 · 3 月第 2 周',
    lines: [
      { t: 3, text: '先过一下上周的数据，日活涨了 8%，主要来自新渠道。', tr: 'Let\'s go over last week\'s numbers: DAU up 8%, mostly from the new channel.', mark: false },
      { t: 26, text: '下个版本的重点是把导出功能做完整，支持 SRT 和 Markdown。', tr: 'The next release focuses on finishing export: SRT and Markdown.', mark: true },
      { t: 52, text: '设计和研发对齐一下时间，周五之前给排期。', tr: 'Design and engineering should align and share the schedule before Friday.', mark: false },
    ],
    duration: 96, lang: 'zh-CN', targetLang: 'en-US', folderId: 'fld-demo',
    createdAt: Date.now() - 1000 * 60 * 60 * 30, docs: [], chat: [],
  };
  store.data.folders.push(
    { id: 'fld-demo', name: '课程', color: '#0b0b0c', createdAt: Date.now() - 86400e3 },
    { id: 'fld-work', name: '工作', color: '#0b0b0c', createdAt: Date.now() - 86400e3 },
  );
  store.data.sessions.unshift(s2, session);
  session.digest = localDigest(session);
  s2.digest = localDigest(s2);
  store.data.chats.push({
    id: 'chat-demo', title: '线性代数第三章重点', sessionId: 'demo1', createdAt: Date.now() - 3000e3,
    messages: [
      { role: 'user', content: '这一章最需要掌握什么？', at: Date.now() - 3000e3 },
      { role: 'assistant', source: 'local', at: Date.now() - 2990e3,
        content: '**线性代数 · 第三章**\n\n本章核心是线性变换与特征值：\n\n· [00:04] 线性变换保持加法与数乘，旋转是典型例子\n· [01:56] 特征值定义：T(v)=λv，v 非零\n· [03:08] 求法：解 det(A−λI)=0\n· [03:31] 作业与考试范围\n\n复习时先算熟 2×2 的特征多项式。' },
    ],
  });
  store.data.profile.name = 'YG';
  store.data.profile.email = 'yg@local';
  store.settings.seenOnboarding = true;
  store.save();
}

if (new URLSearchParams(location.search).get('demo') === '1') seed();
