import { C } from './palette';
// 场景卡的主体物件和行动卡图标，全部用 SVG 画（青冥画卷配色）。
// 主体叠在地点画面的右侧：妖兽的眼睛、发光灵草、摊位、打坐的人、宝光、人物剪影。
import type { Subject } from '../game/cards';

const INK = C.ink;
const LINE = C.line;
const JADE = C.stoneGreen;
const SKY = C.jade;
const GLOW = '#c5ddd0';
const GOLD = C.gold;
const RED = C.cinnabar;
const WHITE = C.paper;
const S = `stroke="${INK}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"`;
const L = `stroke="${LINE}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- 行动卡图标（48×48） ----------
const ICONS: Record<string, string> = {
  hand: `<path d="M10 34 Q16 26 22 27 L32 18 Q35 16 36.5 18.5 Q37.5 20.5 35 22.5 L30 27 L39 21 Q42 19 43 22 Q43.5 24 41 25.5 L31 33 Q26 39 18 39 L10 39 Z" fill="#fbf1e6" ${S}/><path d="M6 33 L12 33 L12 42 L6 42" fill="#dfe9ee" ${S}/><circle cx="37" cy="10" r="3" fill="${GLOW}" opacity="0.9"/><path d="M37 4 L37 6 M37 14 L37 16 M31 10 L33 10 M41 10 L43 10" stroke="${JADE}" stroke-width="1.4" stroke-linecap="round"/>`,
  sword: `<path d="M34 6 L42 6 L42 14 L20 36 L12 28 Z" fill="${SKY}" ${S}/><path d="M38 10 L17 31" stroke="${WHITE}" stroke-width="1.3"/><path d="M9 25 L23 39" ${S} stroke-width="3"/><path d="M13 35 L6 42" ${S} stroke-width="3.4"/><path d="M30 4 Q44 2 45 18" stroke="${GLOW}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>`,
  foot: `<g fill="#cfdfe4" ${S}><ellipse cx="17" cy="33" rx="5" ry="7.5" transform="rotate(-12 17 33)"/><ellipse cx="31" cy="17" rx="5" ry="7.5" transform="rotate(-12 31 17)"/></g><g fill="${INK}"><circle cx="13" cy="23.5" r="1.6"/><circle cx="17" cy="22.5" r="1.6"/><circle cx="21" cy="23.5" r="1.4"/><circle cx="27" cy="7.5" r="1.6"/><circle cx="31" cy="6.5" r="1.6"/><circle cx="35" cy="7.5" r="1.4"/></g><path d="M6 44 Q22 38 44 42" stroke="${SKY}" stroke-width="1.25" fill="none" stroke-dasharray="3 3"/>`,
  coin: `<circle cx="20" cy="27" r="12" fill="#ead08a" ${S}/><rect x="16.5" y="23.5" width="7" height="7" fill="${WHITE}" ${S}/><path d="M30 8 L38 14 L34 24 L26 24 L22 14 Z" fill="${GLOW}" ${S}/><path d="M26 24 L30 8 L34 24 M22 14 L38 14" stroke="${JADE}" stroke-width="1" fill="none"/><circle cx="36" cy="35" r="7" fill="#ead08a" ${S}/>`,
  lotus: `<circle cx="24" cy="20" r="14" fill="none" stroke="${SKY}" stroke-width="1.25" stroke-dasharray="2 3"/><path d="M24 40 Q14 36 10 26 Q18 26 24 32 Q30 26 38 26 Q34 36 24 40 Z" fill="#f4c9cf" ${S}/><path d="M24 36 Q18 28 24 16 Q30 28 24 36 Z" fill="#fbe3e6" ${S}/><path d="M8 42 L40 42" stroke="${JADE}" stroke-width="2" stroke-linecap="round"/>`,
  heart: `<path d="M24 40 Q8 30 8 19 Q8 11 16 11 Q21 11 24 16 Q27 11 32 11 Q40 11 40 19 Q40 30 24 40 Z" fill="#f1b2a9" ${S}/><path d="M16 17 Q14 19 15 23" stroke="${WHITE}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 22 L24 30 M20 26 L28 26" stroke="${WHITE}" stroke-width="2.4" stroke-linecap="round"/>`,
  gift: `<rect x="9" y="20" width="30" height="20" rx="2" fill="#e6d5ef" ${S}/><rect x="7" y="14" width="34" height="7" rx="1.5" fill="#d3bfe2" ${S}/><path d="M24 14 L24 40" stroke="${RED}" stroke-width="3"/><path d="M24 14 Q16 4 13 10 Q12 14 24 14 Q36 14 35 10 Q32 4 24 14" fill="none" stroke="${RED}" stroke-width="1.8"/>`,
  talk: `<path d="M6 10 Q6 6 10 6 L34 6 Q38 6 38 10 L38 24 Q38 28 34 28 L18 28 L10 35 L12 28 L10 28 Q6 28 6 24 Z" fill="#e2f2f0" ${S}/><path d="M13 14 L31 14 M13 20 L26 20" stroke="${JADE}" stroke-width="1.8" stroke-linecap="round"/><path d="M26 32 L40 32 Q43 32 43 35 L43 40 Q43 43 40 43 L38 43 L39 46 L34 43 L26 43 Q23 43 23 40 L23 35" fill="${WHITE}" ${S}/>`,
  eye: `<path d="M4 24 Q24 6 44 24 Q24 42 4 24 Z" fill="${WHITE}" ${S}/><circle cx="24" cy="24" r="8" fill="${SKY}" ${S}/><circle cx="24" cy="24" r="3.4" fill="${INK}"/><circle cx="26.5" cy="21.5" r="1.4" fill="${WHITE}"/>`,
  no: `<circle cx="24" cy="24" r="17" fill="#f3e3e1" ${S}/><path d="M13 35 L35 13" stroke="${RED}" stroke-width="3" stroke-linecap="round"/><path d="M17 22 L17 30 Q17 33 20 33 L28 33 Q31 33 31 30 L31 20" stroke="${INK}" stroke-width="1.4" fill="none" opacity="0.5"/>`,
};

// 行动卡图标；没有专门的图标时，用动作名的第一个字盖一枚印
export function actionIconSvg(name: string, label: string) {
  const body = ICONS[name];
  if (body) return `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  const ch = [...label.replace(/^[「『（(]/, '')][0] ?? '择';
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="4" fill="#fbecea" stroke="${RED}" stroke-width="2"/><rect x="11.5" y="11.5" width="25" height="25" rx="2" fill="none" stroke="${RED}" stroke-width="1" opacity="0.6"/><text x="24" y="32" text-anchor="middle" font-size="20" font-family="brush, serif" fill="${RED}">${ch.replace(/[&<>]/g, '')}</text></svg>`;
}

// ---------- 场景主体（viewBox 160×120，画在画面右下） ----------
const SUBJECTS: Record<Exclude<Subject, null>, string> = {
  // 战斗：灌木与山石后面，一双琥珀色的眼睛；地上有爪痕，身边飘着墨气
  battle: `
    <g class="sj-ink" opacity="0.55"><path d="M20 70 Q30 52 46 60 Q40 44 58 46" stroke="#1c232c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M128 64 Q140 50 150 58" stroke="#1c232c" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
    <path d="M40 104 Q44 62 80 52 Q118 44 132 78 Q142 96 140 108 Z" fill="#24414a" ${L}/>
    <path d="M60 104 Q62 76 84 70 Q110 66 118 92 L120 108 Z" fill="#183038"/>
    <g class="sj-eyes"><path d="M74 82 Q80 76 88 81 Q81 86 74 82 Z" fill="#f2c45a"/><path d="M98 81 Q106 76 112 82 Q105 86 98 81 Z" fill="#f2c45a"/><path d="M81 79 L81 84 M105 79 L105 84" stroke="#1c232c" stroke-width="2"/></g>
    <path d="M30 108 Q50 96 74 104 Q96 96 120 104 Q140 98 156 108 L156 120 L30 120 Z" fill="#9cc8bf" ${L}/>
    <g stroke="${RED}" stroke-width="2.2" stroke-linecap="round" opacity="0.85"><path d="M118 112 L132 100"/><path d="M124 114 L138 102"/><path d="M130 116 L144 104"/></g>`,
  // 采集：崖边一株发光的灵草，光点往上飘
  gather: `
    <path d="M44 120 L52 96 Q70 84 96 90 Q124 84 150 96 L156 120 Z" fill="#8fc9b8" ${L}/>
    <path d="M52 96 Q70 100 96 98 Q120 100 150 96" stroke="${LINE}" stroke-width="1.2" fill="none" opacity="0.5"/>
    <ellipse class="sj-glow" cx="100" cy="66" rx="30" ry="28" fill="url(#sjGlow)"/>
    <path d="M100 96 Q98 76 100 56" stroke="${JADE}" stroke-width="2.4" fill="none"/>
    <path d="M100 82 Q84 78 80 66 Q94 66 100 80 Z M100 76 Q116 72 120 60 Q106 60 100 74 Z" fill="#7fd6b6" ${L}/>
    <path d="M100 58 Q90 46 94 36 Q100 44 100 56 Q100 44 106 36 Q110 46 100 58 Z" fill="${GLOW}" ${L}/>
    <circle cx="100" cy="44" r="3.4" fill="${WHITE}"/>
    <g class="sj-motes" fill="${GLOW}"><circle cx="86" cy="48" r="2"/><circle cx="114" cy="40" r="1.6"/><circle cx="104" cy="28" r="1.8"/><circle cx="92" cy="34" r="1.3"/></g>`,
  // 交易：小摊，布幌子，一杆秤和一摞灵石
  trade: `
    <path d="M54 52 L148 52 L140 66 L62 66 Z" fill="#e0a9a0" ${S}/>
    <path d="M62 66 Q74 72 86 66 Q98 72 110 66 Q122 72 134 66" fill="none" stroke="${RED}" stroke-width="1.25"/>
    <path d="M64 66 L64 110 M138 66 L138 110" ${S} stroke-width="2.2"/>
    <rect x="56" y="92" width="90" height="18" rx="2" fill="#d9c6a2" ${S}/>
    <path d="M78 74 L78 90 M66 78 L90 78" ${S}/><path d="M66 78 L62 86 L70 86 Z M90 78 L86 86 L94 86 Z" fill="#ead08a" ${S}/>
    <g class="sj-coins"><path d="M112 80 L120 74 L128 80 L124 90 L116 90 Z" fill="${GLOW}" ${S}/><path d="M126 86 L132 82 L138 86 L135 92 L129 92 Z" fill="#a8e4dc" ${S}/></g>
    <path d="M100 56 L100 46" ${S}/><rect x="93" y="26" width="14" height="20" fill="${WHITE}" ${S}/><text x="100" y="41" text-anchor="middle" font-size="12" font-family="brush, serif" fill="${RED}">市</text>`,
  // 修炼：蒲团上打坐的人，灵气一圈圈汇过来
  cultivate: `
    <g class="sj-rings" fill="none" stroke="${SKY}" stroke-width="1.25"><circle cx="100" cy="74" r="26" opacity="0.7"/><circle cx="100" cy="74" r="38" opacity="0.4"/></g>
    <ellipse cx="100" cy="108" rx="34" ry="7" fill="#dfe9ee" ${S}/>
    <path d="M78 104 Q100 112 122 104 L118 94 Q100 88 82 94 Z" fill="#eef5f8" ${S}/>
    <path d="M86 64 Q100 58 114 64 L120 98 Q100 104 80 98 Z" fill="${WHITE}" ${S}/>
    <path d="M100 62 L94 76 M100 62 L106 76" stroke="${JADE}" stroke-width="2" fill="none"/>
    <circle cx="100" cy="50" r="10" fill="#fbf1e6" ${S}/><path d="M90 48 Q92 38 100 38 Q108 38 110 48 Q104 42 100 43 Q96 42 90 48 Z" fill="${INK}"/><circle cx="100" cy="34" r="4" fill="${INK}"/>
    <path d="M94 52 Q96 53 98 52 M102 52 Q104 53 106 52" stroke="${INK}" stroke-width="1.2" fill="none"/>
    <g class="sj-motes" fill="${SKY}"><circle cx="66" cy="60" r="2"/><circle cx="136" cy="56" r="2"/><circle cx="70" cy="90" r="1.5"/><circle cx="132" cy="86" r="1.5"/></g>`,
  // 奇遇：山石里露出一只玉匣，宝光冲天
  encounter: `
    <path class="sj-beam" d="M92 92 L78 8 L122 8 L108 92 Z" fill="url(#sjBeam)"/>
    <path d="M44 120 Q52 92 74 92 Q100 82 126 92 Q148 92 156 120 Z" fill="#9cc8bf" ${L}/>
    <path d="M80 98 L120 98 L116 82 L84 82 Z" fill="#c4e7de" ${S}/>
    <path d="M82 82 L84 72 L116 72 L118 82 Z" fill="#a8dccf" ${S}/>
    <rect x="96" y="78" width="8" height="8" rx="1" fill="${GOLD}" ${S}/>
    <g class="sj-motes" fill="${GOLD}"><circle cx="86" cy="54" r="2"/><circle cx="112" cy="44" r="1.8"/><circle cx="100" cy="30" r="2"/><circle cx="118" cy="62" r="1.4"/></g>`,
  // 人物：一位白衣人站在云边，衣袂轻摆
  person: `
    <ellipse cx="102" cy="112" rx="26" ry="5" fill="#cfe2ee"/>
    <g class="sj-sway"><path d="M90 58 Q102 52 114 58 L124 110 Q102 116 80 110 Z" fill="${WHITE}" ${S}/>
    <path d="M102 56 L96 72 M102 56 L108 72" stroke="${JADE}" stroke-width="2" fill="none"/>
    <path d="M84 84 L120 84" stroke="${JADE}" stroke-width="2.2"/>
    <path d="M124 92 Q138 96 144 90" stroke="${SKY}" stroke-width="2" fill="none" stroke-linecap="round"/></g>
    <circle cx="102" cy="44" r="11" fill="#fbf1e6" ${S}/>
    <path d="M91 42 Q93 31 102 31 Q111 31 113 42 Q107 36 102 37 Q97 36 91 42 Z" fill="${INK}"/><circle cx="102" cy="28" r="4.4" fill="${INK}"/>`,
};

export function subjectSvg(s: Subject) {
  if (!s) return '';
  return `<svg class="sj sj-${s}" viewBox="0 0 160 120" aria-hidden="true">
    <defs>
      <radialGradient id="sjGlow"><stop offset="0" stop-color="${GLOW}" stop-opacity="0.85"/><stop offset="1" stop-color="${GLOW}" stop-opacity="0"/></radialGradient>
      <linearGradient id="sjBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.95"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>
    </defs>${SUBJECTS[s]}</svg>`;
}

export const SUBJECT_NAMES: Record<Exclude<Subject, null>, string> = { battle: '凶', gather: '采', trade: '市', cultivate: '修', encounter: '奇', person: '人' };
