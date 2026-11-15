/* ============ onboarding overlay ============ */
import { el, I, L, store, logoMark } from './core.js?v=1.6.2';

const ART = [
  `<svg viewBox="0 0 240 180" width="100%" style="max-width:300px">
    <rect x="30" y="26" width="180" height="128" rx="16" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".25"/>
    <path d="M48 74c8-2 11-14 17-14s8 12 14 12 8-16 14-16 8 6 12 8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <rect x="48" y="94" width="120" height="7" rx="3.5" fill="currentColor" opacity=".14"/>
    <rect x="48" y="108" width="86" height="7" rx="3.5" fill="currentColor" opacity=".14"/>
    <rect x="48" y="122" width="100" height="7" rx="3.5" fill="currentColor" opacity=".14"/>
  </svg>`,
  `<svg viewBox="0 0 240 180" width="100%" style="max-width:300px">
    <circle cx="120" cy="90" r="46" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".2"/>
    <circle cx="120" cy="90" r="30" fill="currentColor" opacity=".08"/>
    <path d="M120 56a9 9 0 0 0-9 9v18a9 9 0 0 0 18 0V65a9 9 0 0 0-9-9Z" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <path d="M104 84a16 16 0 0 0 32 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M120 100v10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M40 150c10-3 14-22 22-22s10 18 18 18 10-26 18-26 10 10 16 14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
  </svg>`,
  `<svg viewBox="0 0 240 180" width="100%" style="max-width:300px">
    <rect x="72" y="20" width="96" height="140" rx="18" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".35"/>
    <rect x="86" y="42" width="68" height="96" rx="8" fill="currentColor" opacity=".07"/>
    <path d="M96 92c6-1.5 8-9 12-9s6 8 10 8 6-11 10-11 6 4 9 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M120 20v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".4"/>
    <circle cx="120" cy="146" r="4" fill="currentColor" opacity=".3"/>
  </svg>`,
];

export function show() {
  const idx = { i: 0 };
  const host = el('div', { class: 'ob' });
  const brand = el('div', { class: 'row', style: 'gap:8px;align-items:center;color:var(--text);opacity:.9' },
    el('span', { html: logoMark(26), style: 'display:grid' }),
    el('span', { style: 'font-weight:700;letter-spacing:-.01em', text: 'LecSync' }));
  const art = el('div', { class: 'art', html: ART[0], style: 'max-height:44dvh;overflow:hidden' });
  const title = el('h2', { text: L.t('firstRunTitle') });
  const body = el('p', { text: L.t('firstRunBody') });
  const dots = el('div', { class: 'dots' }, ...[0, 1, 2].map(i => el('i', { class: i === 0 ? 'on' : '' })));
  const next = el('button', { class: 'btn primary block', text: L.t('next') });
  const skip = el('button', { class: 'btn ghost block', text: L.t('skip'), style: 'margin-top:8px' });

  const slides = [
    [L.t('firstRunTitle'), L.t('firstRunBody')],
    [L.t('secondTitle'), L.t('secondBody')],
    [L.t('thirdTitle'), L.t('thirdBody')],
  ];
  const paint = () => {
    art.innerHTML = ART[idx.i];
    title.textContent = slides[idx.i][0];
    body.textContent = slides[idx.i][1];
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === idx.i));
    next.textContent = idx.i === 2 ? L.t('gotIt') : L.t('next');
    skip.style.display = idx.i === 2 ? 'none' : '';
  };
  const finish = () => { store.settings.seenOnboarding = true; store.save(); host.remove(); };
  next.onclick = () => { if (idx.i === 2) return finish(); idx.i++; paint(); };
  skip.onclick = finish;
  host.append(brand, art, title, body, dots, next, skip);
  document.body.append(host);
  paint();
}
