// 行囊图标：法宝、随身、符丹、附诀与打坐的修士，全部用 SVG 画（青冥画卷配色）
const INK = '#2b3a48';
const JADE = '#3f8a8c';
const SKY = '#7cc4d8';
const GOLD = '#c9a24a';
const RED = '#b8382e';
const WHITE = '#fafcfd';

const svg = (body: string) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
const S = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;

// 法宝按器类，色随品级变
const QI_TINT = ['#c9d3da', '#9fd3cf', '#8ec9e8', '#e8cf86', '#f0a48a'];

const ICONS: Record<string, (c: string) => string> = {
  剑: (c) => `<path d="M34 8 L40 8 L40 14 L20 34 L14 28 Z" fill="${c}" ${S}/><path d="M36 12 L18 30" stroke="${WHITE}" stroke-width="1.2"/><path d="M11 25 L23 37" ${S} stroke-width="2.6"/><path d="M14 34 L8 40" ${S} stroke-width="3"/><circle cx="7" cy="41" r="2" fill="${RED}" ${S}/>`,
  拳套: (c) => `<path d="M12 22 Q12 12 22 12 L32 12 Q38 12 38 18 L38 30 Q38 38 30 38 L20 38 Q12 38 12 30 Z" fill="${c}" ${S}/><path d="M19 12 L19 20 M25 12 L25 20 M31 12 L31 20" ${S}/><path d="M12 26 L20 26 Q24 26 24 30" ${S}/><rect x="16" y="36" width="18" height="5" rx="1.5" fill="${GOLD}" ${S}/>`,
  法印: (c) => `<rect x="11" y="18" width="26" height="22" rx="2" fill="${c}" ${S}/><path d="M18 18 L18 12 Q24 6 30 12 L30 18" fill="${WHITE}" ${S}/><path d="M26 22 L20 30 L25 30 L22 37 L29 28 L24 28 Z" fill="${GOLD}" ${S} stroke-width="1.1"/>`,
  戒: (c) => `<circle cx="24" cy="28" r="11" fill="none" ${S} stroke-width="5" stroke="${INK}"/><circle cx="24" cy="28" r="11" fill="none" stroke="${c}" stroke-width="3"/><path d="M18 15 L24 8 L30 15 L24 20 Z" fill="${SKY}" ${S}/>`,
  翎: (c) => `<path d="M38 8 Q18 12 12 36 Q30 32 38 8 Z" fill="${c}" ${S}/><path d="M38 8 Q24 22 9 41" ${S} fill="none"/><path d="M20 26 L26 27 M24 20 L30 21 M17 32 L22 33" stroke="${WHITE}" stroke-width="1.3"/>`,
  幡: (c) => `<path d="M14 6 L14 43" ${S} stroke-width="2.4"/><path d="M14 9 L36 9 L36 30 L30 36 L25 30 L20 36 L14 30 Z" fill="${c}" ${S}/><path d="M20 15 L30 15 M20 20 L30 20 M20 25 L28 25" stroke="${INK}" stroke-width="1.2" opacity="0.6"/><circle cx="14" cy="6" r="2.4" fill="${GOLD}" ${S}/>`,
  笔: (c) => `<path d="M36 8 L40 12 L22 30 L18 26 Z" fill="${c}" ${S}/><path d="M18 26 L22 30 L14 40 Q9 41 9 37 Z" fill="${INK}"/><path d="M34 10 L38 14" stroke="${GOLD}" stroke-width="2.2"/>`,
  // 随身
  robe: () => `<path d="M17 9 L24 14 L31 9 L40 15 L36 22 L33 20 L33 40 L15 40 L15 20 L12 22 L8 15 Z" fill="#dfe9ee" ${S}/><path d="M24 14 L20 24 M24 14 L28 24" ${S}/><path d="M15 27 L33 27" stroke="${JADE}" stroke-width="2"/>`,
  pendant: () => `<path d="M24 5 L24 12" ${S}/><circle cx="24" cy="21" r="9" fill="#a6d8c6" ${S}/><circle cx="24" cy="21" r="3" fill="${WHITE}" ${S}/><path d="M24 30 L24 34 M21 34 L27 34 L26 43 L22 43 Z" fill="${RED}" ${S}/>`,
  bead: () => `<circle cx="24" cy="25" r="13" fill="#e07a6e" ${S}/><ellipse cx="19" cy="20" rx="4" ry="2.6" fill="${WHITE}" opacity="0.75"/>`,
  bead2: () => `<circle cx="24" cy="25" r="13" fill="${SKY}" ${S}/><path d="M26 15 L20 26 L25 26 L22 35" stroke="${GOLD}" stroke-width="2" fill="none"/><ellipse cx="18" cy="19" rx="3.5" ry="2.2" fill="${WHITE}" opacity="0.8"/>`,
  talisman: () => `<path d="M16 6 L32 6 L32 42 L16 42 Z" fill="#f1d77c" ${S}/><path d="M20 12 L28 12 M24 12 L24 36 M20 18 Q24 22 28 18 M20 26 Q24 30 28 26 M21 34 L27 34" stroke="${RED}" stroke-width="1.6" fill="none"/>`,
  jade: () => `<path d="M24 8 Q38 12 36 26 Q34 40 24 40 Q14 40 12 26 Q10 12 24 8 Z" fill="#b8e0d2" ${S}/><path d="M18 20 Q24 16 30 20" stroke="${WHITE}" stroke-width="2" fill="none"/>`,
  mirror: () => `<circle cx="24" cy="22" r="13" fill="${GOLD}" ${S}/><circle cx="24" cy="22" r="9" fill="#d6eef5" ${S}/><path d="M20 18 L26 16" stroke="${WHITE}" stroke-width="2"/><path d="M21 35 L27 35 L28 42 L20 42 Z" fill="${RED}" ${S}/>`,
  bagua: () => `<path d="M24 8 L35 13 L40 24 L35 35 L24 40 L13 35 L8 24 L13 13 Z" fill="${GOLD}" ${S}/><circle cx="24" cy="24" r="9" fill="#d6eef5" ${S}/><path d="M24 15 A4.5 4.5 0 0 1 24 24 A4.5 4.5 0 0 0 24 33 A9 9 0 0 1 24 15" fill="${INK}"/>`,
  seal: () => `<rect x="12" y="22" width="24" height="18" rx="2" fill="#c9d8a8" ${S}/><path d="M17 22 L19 12 L29 12 L31 22 Z" fill="#9cbf8a" ${S}/><rect x="17" y="27" width="14" height="9" fill="none" stroke="${RED}" stroke-width="1.6"/>`,
  boot: () => `<path d="M16 8 L28 8 L28 28 L40 32 Q42 40 36 40 L12 40 Q10 40 12 32 Z" fill="#dfe9ee" ${S}/><path d="M8 42 Q14 36 20 42 Q26 36 32 42 Q38 36 42 42" stroke="${SKY}" stroke-width="2" fill="none"/>`,
  bell: () => `<path d="M24 6 L24 10" ${S}/><path d="M14 32 Q14 12 24 10 Q34 12 34 32 L37 36 L11 36 Z" fill="#b9a7cc" ${S}/><circle cx="24" cy="40" r="3" fill="${GOLD}" ${S}/>`,
  gourd: () => `<circle cx="24" cy="15" r="6.5" fill="#e0b85a" ${S}/><path d="M24 20 Q12 22 13 32 Q14 42 24 42 Q34 42 35 32 Q36 22 24 20 Z" fill="#e0b85a" ${S}/><path d="M24 8 L26 4" ${S}/><path d="M17 23 L31 23" stroke="${RED}" stroke-width="2"/>`,
  pill: () => `<circle cx="24" cy="26" r="11" fill="#f2b45e" ${S}/><circle cx="24" cy="26" r="6" fill="#f7d58e"/><path d="M14 13 Q24 7 34 13" stroke="${SKY}" stroke-width="1.6" fill="none" opacity="0.8"/><ellipse cx="20" cy="22" rx="3" ry="2" fill="${WHITE}" opacity="0.8"/>`,
  fire: () => `<path d="M16 6 L32 6 L32 42 L16 42 Z" fill="#f1d77c" ${S}/><path d="M24 14 Q31 22 28 30 Q26 35 24 35 Q19 35 19 29 Q19 24 22 22 Q22 26 25 26 Q27 20 24 14 Z" fill="${RED}"/>`,
  earth: () => `<path d="M16 6 L32 6 L32 42 L16 42 Z" fill="#e8d6a8" ${S}/><path d="M19 30 L24 22 L29 30 Z M20 34 L28 34" stroke="#7a5a2a" stroke-width="1.8" fill="none"/>`,
};

const ITEM_ICON: Record<string, string> = {
  xuanjia: 'robe', changchun: 'pendant', xueyin: 'bead', yinling: 'pendant', hushen: 'talisman', bilei: 'bead2', qingxin: 'jade',
  huxin: 'mirror', zhenyue: 'seal', tayun: 'boot', shihun: 'bell', juling: 'gourd',
  huichun: 'pill', leihuo: 'fire', dundi: 'earth', bagua: 'bagua', dingshen: 'talisman',
};

export const qiIcon = (qi: string, grade: number) => svg((ICONS[qi] ?? ICONS['剑'])(QI_TINT[Math.min(4, grade)]));
export const itemIcon = (id: string) => svg((ICONS[ITEM_ICON[id]] ?? ICONS.talisman)(''));
// 附诀：一枚玉符，中间写它的头一个字
export const fjIcon = (name: string, chain = false) =>
  svg(`<circle cx="24" cy="24" r="16" fill="${chain ? '#e9dcf2' : '#e2f2f0'}" ${S}/><circle cx="24" cy="24" r="12.5" fill="none" stroke="${chain ? '#7a5c8a' : JADE}" stroke-width="1.2" stroke-dasharray="3 2"/><text x="24" y="30.5" text-anchor="middle" font-size="17" font-family="brush, serif" fill="${INK}">${name[0]}</text>`);

// 打坐的修士：境界越高，身后的灵光越亮
export function sitterSvg(realm: number, inDao: boolean) {
  const glow = inDao ? 0.25 + realm * 0.1 : 0.08;
  const r = 40 + realm * 3;
  return `<svg viewBox="0 0 120 130" class="nb-sitter-svg" aria-hidden="true">
    <defs>
      <radialGradient id="nbAura"><stop offset="0" stop-color="#bfe8f4" stop-opacity="${glow + 0.3}"/><stop offset="0.6" stop-color="#7cc4d8" stop-opacity="${glow}"/><stop offset="1" stop-color="#7cc4d8" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="60" cy="66" rx="${r}" ry="${r + 6}" fill="url(#nbAura)"/>
    ${inDao ? `<g class="nb-wisps" fill="none" stroke="#7cc4d8" stroke-width="2" stroke-linecap="round" opacity="0.8"><path d="M24 92 Q16 70 28 56 Q22 72 34 82"/><path d="M96 92 Q104 70 92 56 Q98 72 86 82"/></g>` : ''}
    <path d="M14 112 Q22 100 36 104 Q44 94 60 98 Q76 94 84 104 Q98 100 106 112 Q96 120 60 118 Q24 120 14 112 Z" fill="#fafcfd" stroke="#a9c3c8" stroke-width="1.5"/>
    <path d="M24 106 Q60 116 96 106 L92 98 Q60 92 28 98 Z" fill="#eef5f8" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M42 60 Q60 52 78 60 L86 100 Q60 108 34 100 Z" fill="#fafcfd" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M60 58 L52 76 M60 58 L68 76" stroke="${JADE}" stroke-width="2.2" fill="none"/>
    <path d="M42 64 Q34 84 50 92 L70 92 Q86 84 78 64" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="60" cy="91" rx="10" ry="4" fill="#dfe9ee" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="60" cy="91" r="2.5" fill="${inDao ? '#7cc4d8' : '#c9d3da'}"/>
    <path d="M44 84 L76 84" stroke="${JADE}" stroke-width="2.4"/>
    <circle cx="60" cy="42" r="14" fill="#fbf1e6" stroke="${INK}" stroke-width="1.6"/>
    <path d="M46 40 Q48 26 60 26 Q72 26 74 40 Q68 32 60 33 Q52 32 46 40 Z" fill="${INK}"/>
    <circle cx="60" cy="22" r="5.5" fill="${INK}"/>
    <path d="M56 19 L64 25" stroke="${GOLD}" stroke-width="1.6"/>
    <path d="M52 44 Q55 46 57 44 M63 44 Q65 46 68 44" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    ${inDao && realm >= 2 ? `<circle cx="60" cy="36" r="1.6" fill="${RED}"/>` : ''}
  </svg>`;
}
