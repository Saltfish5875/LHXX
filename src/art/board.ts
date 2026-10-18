// 旋转 45°、俯视 45°的正交投影。场景直立，地块按行列的深度排序。
import type { TileView } from '../game/board';

const STEP_X = 60;
const STEP_Y = STEP_X / Math.sqrt(2);
const TILE_HEIGHT = 154;

export function boardGeometry(size: number) {
  const side = size / 4 + 1;
  const width = side * STEP_X * 2;
  const height = (side - 1) * STEP_Y * 2 + TILE_HEIGHT;
  return { side, width, height, ratio: width / height };
}

export function tilePosition(size: number, slot: number) {
  const { side, width, height } = boardGeometry(size);
  const edge = side - 1;
  let row: number, col: number;
  if (slot <= edge) [row, col] = [0, slot];
  else if (slot <= edge * 2) [row, col] = [slot - edge, edge];
  else if (slot <= edge * 3) [row, col] = [edge, edge * 3 - slot];
  else [row, col] = [edge * 4 - slot, 0];
  const x = (col - row + edge) * STEP_X;
  const y = (col + row) * STEP_Y;
  return {
    style: `left:${(x / width) * 100}%;top:${(y / height) * 100}%;width:${120 / width * 100}%;z-index:${row + col + 2}`,
    tipStyle: `left:${(x + 60) / width * 100}%;top:${(y + 48) / height * 100}%`,
    x, y, row, col,
  };
}

const tree = (x: number, y: number, scale = 1, blossom = false) => `<g transform="translate(${x} ${y}) scale(${scale})">
  <path d="M0 0v-28m0 15-8-8m8 4 9-11" fill="none" stroke="#766f5a" stroke-width="2.5"/>
  ${blossom
    ? '<path d="M-13-26q-10-15 4-17 6-17 18-5 19-2 16 14 8 15-10 18-16 7-28-10" fill="#d8a1a0"/><circle cx="-7" cy="-36" r="4" fill="#efd0c3"/><circle cx="11" cy="-29" r="5" fill="#efd0c3"/>'
    : '<path d="m0-55-18 27h9l-15 18h20V-1H4v-9h20L9-28h9Z" fill="#4f8c82"/><path d="m0-55 0 45h24L9-28h9Z" fill="#2e6868" opacity=".65"/>'}
  </g>`;

const rock = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="m-17 0 4-15 13-8 16 11 3 13-19 9Z" fill="#b2c5c0"/><path d="M0-23 2-4 19 1 16-12Z" fill="#809d9d"/><path d="m-13-15 13-8-4 15" fill="#d7e0d5"/></g>`;

const house = (x = 60, y = 85, s = 1, roof = '#467b81') => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="m-25-27 24-15 28 17v25L2 15-25-1Z" fill="#f2ead3"/>
  <path d="M2-11 27-25V0L2 15Z" fill="#c4d5ca"/>
  <path d="m-35-29 29-24 43 24-31 19Z" fill="${roof}"/>
  <path d="m-35-29 31 11 41-11L6-10Z" fill="#2c5763" opacity=".7"/>
  <path d="m-6-53 43 24-8-13-31-17-11 4Z" fill="#82aaa3"/>
  <path d="m-17-17 9 5V5l-9-5Z" fill="#5b706b"/>
  <path d="m10-4 9-5v8l-9 5Z" fill="#edca79"/>
  <path d="m-31-26 25 9m4-33 32 18" fill="none" stroke="#acc7bb" stroke-width="1.3"/>
  </g>`;

const pavilion = (gold = false) => `<g>
  <path d="m25 91 35-22 36 22-36 24Z" fill="#a5bcb3"/>
  <path d="m33 67 27-17 27 17v24l-27 17-27-17Z" fill="#eae7d2"/>
  <path d="M60 74 87 58v33l-27 17Z" fill="#a7c3b7"/>
  <path d="M41 73v20m14-13v19m12-21v19m12-26v20" stroke="#63867e" stroke-width="3"/>
  <path d="m19 64 39-27 43 27-41 23Z" fill="${gold ? '#b99b59' : '#548a8b'}"/>
  <path d="m19 64 41 15 41-15-41 23Z" fill="#355f69"/>
  <path d="m31 43 28-24 30 24-29 18Z" fill="${gold ? '#d5bb78' : '#80aaa3'}"/>
  <path d="m31 43 29 11 29-11-29 18Z" fill="#46737b"/>
  <path d="M59 19V9m-4 4h8" stroke="#b99b59" stroke-width="2"/>
  </g>`;

const stall = (x: number, y: number, s: number, red = false) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="m-22-4 24-13 25 14-25 15Z" fill="#c2aa7c"/>
  <path d="M-22-4v-31M2 11v-31M27-3v-31" stroke="#826c52" stroke-width="2.5"/>
  <path d="m-28-33 25-17 37 20-30 16Z" fill="${red ? '#bb7770' : '#628e88'}"/>
  <path d="m-28-33 8 12 24 7 30-16-2-7-28 15Z" fill="${red ? '#dfaaa0' : '#97b8a4'}"/>
  <path d="m-8-44 28 16m-16-21 28 16" stroke="#ece1c8" stroke-width="4"/>
  <path d="m-16-9 9-4 8 4-9 5Z" fill="#e6c36d"/><path d="m7-8 8-4 7 4-8 5Z" fill="#d8e0ca"/>
  </g>`;

const book = () => `<g transform="translate(60 76)">
  <path d="m-38-10 18-18L0-20l20-8L38-10 0 18Z" fill="#c5ad77"/>
  <path d="m-34-14 14-20L0-24l20-10L34-14 0 10Z" fill="#faf3dc"/>
  <path d="M0-24v34m-25-33 18 9m-22-3 20 10m17-7 16-9M9-6l20-11" stroke="#82968a" stroke-width="2"/>
  <path d="m0 10 2 10 12-8" fill="#b9665e"/>
  </g>`;

const swords = () => `${rock(60, 87, 1.15)}<g stroke-linejoin="round">
  <path d="m45 79-8-47 5-8 5 8 3 46Z" fill="#e9f1dc" stroke="#759ba0"/>
  <path d="m34 40 17-2m-10-8-2-15" stroke="#b99951" stroke-width="3"/>
  <path d="m66 83 10-62 5-5 3 7-13 61Z" fill="#e1ede5" stroke="#709ca3"/>
  <path d="m71 35 18 4m-9-14 4-16" stroke="#b99951" stroke-width="3"/>
  <path d="m59 86-1-33 4-6 4 6-3 33Z" fill="#adcac5"/><path d="M54 61h16" stroke="#4c797c" stroke-width="3"/>
  </g>`;

const lotus = () => `<g transform="translate(60 78)">
  <ellipse cy="8" rx="32" ry="16" fill="#79b8b1" opacity=".3"/>
  <path d="M0 7q-31 3-31-18Q-9-16 0 7m0 0Q31 10 31-11 11-17 0 7" fill="#80b4a2"/>
  <path d="M0 4Q-27-9-19-30-1-25 0 4m0 0Q27-9 19-30 1-25 0 4" fill="#d6ac98"/>
  <path d="M0 4q-16-21 0-43Q16-17 0 4" fill="#f1d5b3"/>
  <circle cy="-10" r="5" fill="#e8bd63"/>
  <path d="M-30-36h6m-3-3v6m45-15h6m-3-3v6" stroke="#d1ac58" stroke-width="2"/>
  </g>`;

const portal = (broken = false) => `${rock(29, 91, .7)}${rock(88, 92, .8)}
  <path d="M38 94V42l22-14 23 14v52l-12-8V48L60 42l-11 7v38Z" fill="${broken ? '#9c9b96' : '#b9cbbb'}"/>
  <path d="m38 42 22-14 23 14-12 6-11-6-11 7Z" fill="#e8d6a0"/>
  <path d="M49 87V49l11-7 11 6v38l-11 8Z" fill="${broken ? '#6c6589' : '#6caaa5'}" opacity=".7"/>
  <path d="M59 49q-17 23 1 38m5-31q9 13-1 24" fill="none" stroke="#dfedcc" stroke-width="2"/>
  ${broken ? '<path d="m47 28 7-10 6 5-7 9m32 5 8 4-4 8-7-5" fill="#c6b692"/><path d="m62 39-7 19 11 8-10 25" fill="none" stroke="#e9cb8d" stroke-width="3"/>' : ''}`;

const ruin = () => `${rock(84, 91, .8)}
  <path d="m25 92 3-50 13-4 5 8-5 18 3 30-10 7Z" fill="#b7b9a5"/>
  <path d="m28 42 13-4 5 8-14 6Z" fill="#ded7b6"/>
  <path d="M69 91V51l12 5 4 31-8 10Z" fill="#91a59c"/>
  <path d="m23 40 20-13 20 10-9 7-15-5-11 7Z" fill="#9baf9e"/>
  <path d="m42 94 15-8 14 8-16 10Z" fill="#d2c9a8"/>
  <path d="m33 82 7-14m36 15-7-10m-17 20 5-11" stroke="#769d75" stroke-width="3"/>`;

const field = () => `<path d="m16 90 39-25 48 28-40 27Z" fill="#9fb68a"/>
  <path d="m26 91 37 21m-25-29 38 21m-26-29 38 21" stroke="#dde0b3" stroke-width="4"/>
  <path d="m32 89 1-12m11 19 1-13m11 19 1-13m-2-22 1-12m11 20 1-13m11 20 1-13" stroke="#568761" stroke-width="2.5"/>
  <path d="m28 80 5-3 5 6m1 3 5-3 5 6m13-20 5-3 5 6" fill="none" stroke="#d2cc7f" stroke-width="3"/>`;

const furnace = () => `<ellipse cx="60" cy="93" rx="30" ry="13" fill="#a7c4b1"/>
  <path d="m42 80-5 18m41-18 5 18" stroke="#6c766b" stroke-width="6"/>
  <path d="M36 60q-9 36 24 37 33-1 24-37Z" fill="#7f9a88"/>
  <ellipse cx="60" cy="60" rx="25" ry="11" fill="#d9c58d"/>
  <path d="m32 60 28-20 28 20Z" fill="#537a76"/>
  <path d="M60 41V29m-5 1h10M37 69q-18-10-15 4 1 12 15 9m46-13q18-10 15 4-1 12-15 9" fill="none" stroke="#a9945e" stroke-width="4"/>
  <path d="M57 85q-7-9 3-18 9 9 3 18" fill="#e6b966"/>
  <path d="M57 25q-13-12 1-21m10 24q12-11 5-17" fill="none" stroke="#91b7b1" stroke-width="3" opacity=".65"/>`;

function sceneArt(key: string): string {
  switch (key) {
    case 'start': return `<circle cx="61" cy="36" r="19" fill="#dfbf7e" opacity=".5"/>
      <path d="M31 96V42m58 54V42" stroke="#ab6960" stroke-width="8"/>
      <path d="m20 39 40-15 40 15-6 8-34-10-34 10Z" fill="#658a82"/>
      <path d="M36 53h48" stroke="#ab6960" stroke-width="5"/>
      <path d="M29 48v12m61-12v12" stroke="#ac8c52" stroke-width="2"/>
      <ellipse cx="29" cy="67" rx="7" ry="10" fill="#c87b65"/><ellipse cx="90" cy="67" rx="7" ry="10" fill="#c87b65"/>
      <path d="m37 99 23-14 23 14-23 15Z" fill="#e5d4a9"/>`;
    case 'home': return `${tree(88, 85, .67)}${house(53, 83, .83)}`;
    case 'neighbor': return `${house(77, 66, .62, '#a3a283')}${house(42, 88, .75)}${tree(94, 97, .38)}`;
    case 'school': return `${house(61, 65, .7)}<g transform="translate(0 18) scale(1 .9)">${book()}</g>`;
    case 'market': return `${stall(76, 68, .68)}${stall(40, 89, .85, true)}<path d="m80 91 11-7 10 6-10 7Z" fill="#bb9960"/><path d="m80 91 11 6v10l-11-6Zm11 6 10-7v10l-10 7Z" fill="#9f875d"/>`;
    case 'bazaar': return `${stall(78, 66, .7, true)}${stall(41, 90, .9)}<path d="m79 77 8-10 8 10-8 16Z" fill="#9dd3c9" stroke="#d6c692"/>`;
    case 'fair': return `${pavilion(true)}<path d="M23 65v12m74-12v12" stroke="#a68b60"/><ellipse cx="23" cy="80" rx="5" ry="8" fill="#c57a67"/><ellipse cx="97" cy="80" rx="5" ry="8" fill="#c57a67"/>`;
    case 'river': return `<path d="m7 96 26-18q20 15 31 0l17-11 30 29-28 19q-23-18-33-2l-6 13Z" fill="#86b9bd"/>
      <path d="m16 99 17-10q22 15 34-3m-19 31q17-18 37-11l14-8" fill="none" stroke="#dbebe0" stroke-width="2"/>
      <path d="M34 85q14-37 42-16v10Q47 61 34 94Z" fill="#c9bea1"/><path d="M34 83q16-26 42-15" fill="none" stroke="#8b937d" stroke-width="3"/>
      ${rock(88, 91, .5)}<path d="m22 91-4-21m5 18 4-23" stroke="#73936e" stroke-width="2"/>`;
    case 'road': return `<path d="m17 104 16-13 30-10 15-18 19 12-20 24-27 10-13 9Z" fill="#d9ccac"/>${tree(29, 82, .62)}
      <path d="M75 89V43m-17 5 33-6v12l-33 6Zm5 14 29-6v12l-29 6Z" fill="#b9aa81" stroke="#7f8d79" stroke-width="2"/>`;
    case 'cross': return `<path d="m18 106 29-24-22-15 18-9 20 15 23-15 17 13-26 16 18 15-18 13-17-17-24 20Z" fill="#d8c9a6"/>
      <path d="M61 83V32m-21 7 41-9v13l-41 9Zm10 19 38-9v12l-38 9Z" fill="#9eb4a0" stroke="#6d8c7c" stroke-width="2"/>`;
    case 'sickbed': return `${house(73, 66, .6, '#8b9b7a')}<path d="M25 79q0 28 23 29 21-1 21-28Z" fill="#b7c8ab"/><ellipse cx="47" cy="79" rx="22" ry="9" fill="#57776c"/><path d="m48 78 17-22" stroke="#bfab80" stroke-width="5"/><path d="M30 71q-4-21 13-25 4 18-13 25m1-6q-22-3-19-18 17-1 19 18" fill="#76a17f"/>`;
    case 'trace': return `${rock(60, 87, 1.5)}<path d="m37 68 18-41 24 44-23-8Z" fill="#91b7a7"/><path d="m55 27 1 36 23 8Z" fill="#5e9290"/><ellipse cx="60" cy="58" rx="37" ry="13" fill="none" stroke="#d5b66e" stroke-width="3"/><path d="m43 28 17-12 16 10-19 2-5 9Z" fill="#edf1de"/>`;
    case 'cave': return `<path d="m21 92 9-34 22-28 22 7 24 55-35 19Z" fill="#a9c5b3"/><path d="m52 30 4 31 7 50 35-19-24-55Z" fill="#719f99"/><path d="M44 96V77q13-31 27-4l5 23-17 10Z" fill="#3b686b"/><path d="m34 57 18-27 4 31-9-8Z" fill="#d4dfc4"/>${tree(91, 87, .46)}`;
    case 'quiet': return `${tree(25, 85, .7)}<path d="M85 91V32m10 65V46M80 49l11-8m-1 23 12-8" stroke="#759c7e" stroke-width="3"/><ellipse cx="58" cy="91" rx="23" ry="13" fill="#bfbb93"/><ellipse cx="58" cy="87" rx="23" ry="13" fill="#e7dab0"/><path d="M51 86q8-10 14 0m-20 3q14 9 28-1" fill="none" stroke="#b5ac80" stroke-width="2"/>`;
    case 'sect': return pavilion();
    case 'roam': return `${rock(38, 88, .8)}<path d="m40 84 21-59 30 63-28 18Z" fill="#91b6a4"/><path d="m61 25 2 81 28-18Z" fill="#5f9694"/><path d="m48 61 13-36 15 32-15-10Z" fill="#dce5cd"/><path d="M14 93q15-15 30-3 15-16 35-2 17-8 27 1" fill="none" stroke="#e7efdf" stroke-width="6"/>`;
    case 'fortune': return lotus();
    case 'karma': return `<ellipse cx="60" cy="93" rx="33" ry="12" fill="#8eb7a9" opacity=".35"/><path d="M36 85q-20-20 1-41 22-20 30 2m17 38q20-20-1-41-22-20-30 2" fill="none" stroke="#bca16d" stroke-width="6"/><path d="M38 60q22 37 45 0M58 68l-8 29m14-29 8 29" fill="none" stroke="#b96d65" stroke-width="3"/>`;
    case 'forest': return `${tree(64, 76, 1.07)}${tree(30, 94, .87)}${tree(89, 98, .77)}<path d="m47 99 4-19 9 9 9-9 7 20Z" fill="#3b5f5c"/><path d="m55 94 3 1m7 0 3-2" stroke="#e1b96b" stroke-width="2"/>`;
    case 'realm': return portal();
    case 'rift': return portal(true);
    case 'demon': return `<path d="m19 98 15-43 14 12 14-44 20 39 19 35-39 16Z" fill="#7b8391"/><path d="m62 23-2 43 17 32 24-1-19-35Z" fill="#4c6372"/><path d="m61 51-9 22 15 9-6 19" fill="none" stroke="#c19baf" stroke-width="3"/><path d="M17 83q12-9 20 1m43-37q11-10 20 0" fill="none" stroke="#a4a2b1" stroke-width="3"/>`;
    case 'gate': return `<path d="m22 100 38-23 38 23-38 23Z" fill="#c5cbb2"/><path d="M31 99V38m58 61V38" stroke="#a6bfb5" stroke-width="12"/><path d="m18 38 42-25 43 25-43 25Z" fill="#6e9991"/><path d="m18 38 42 17 43-17-43 25Z" fill="#426f77"/><path d="m29 21 31-17 32 17-32 19Z" fill="#b6a46d"/><path d="M49 93V59l11-7 12 7v34" fill="#a8d1bd" opacity=".65"/><path d="M60 62v25m-6-17h12" stroke="#eef0cd" stroke-width="2"/>`;
    case 'field': return field();
    case 'farm': return `${house(71, 64, .58, '#999b77')}<g transform="translate(3 20) scale(.8)">${field()}</g>`;
    case 'swords': return swords();
    case 'temple': return pavilion(true);
    case 'book': return `${tree(91, 87, .65)}${book()}`;
    case 'furnace': return furnace();
    case 'camp': return `<path d="m23 94 37-50 37 50-37 20Z" fill="#d8c99d"/><path d="M60 44v70l37-20Z" fill="#9fae92"/><path d="m47 107 13-32 13 32-13 7Z" fill="#536f6a"/><path d="M81 63V18l23 9-23 11" fill="#bb7970" stroke="#9a8d6a" stroke-width="2"/>`;
    case 'ruin': return ruin();
    case 'empty': return `${rock(83, 93, .55)}<path d="m26 93 31-20 29 18-29 21Z" fill="none" stroke="#a2b5a0" stroke-dasharray="4 3"/><path d="M56 80v22m-11-14 22 6" stroke="#7c9a89" stroke-width="2"/>`;
    case 'partner': return `${tree(88, 80, .7, true)}${house(48, 88, .7, '#a28e86')}`;
    case 'gift': return `<path d="m29 69 31-19 31 19v28l-31 19-31-19Z" fill="#d5c194"/><path d="m29 69 31 18 31-18-31-19Z" fill="#e7d7b1"/><path d="m60 87 31-18v28l-31 19Z" fill="#b9ab82"/><path d="m44 60 32 18v28M46 107V78l31-18" fill="none" stroke="#b86d63" stroke-width="5"/><path d="M60 68q-26-13-15-22 15-5 15 22 0-27 15-22 11 9-15 22" fill="none" stroke="#b86d63" stroke-width="3"/>`;
    case 'treasure': return `<ellipse cx="60" cy="97" rx="27" ry="12" fill="#7eac9b" opacity=".35"/><path d="m41 57 19-23 20 23-20 32Z" fill="#9ac9bd"/><path d="m60 34 0 55 20-32Z" fill="#548f90"/><path d="m41 57 19 5 20-5" fill="none" stroke="#dcead4" stroke-width="2"/><ellipse cx="60" cy="64" rx="35" ry="13" fill="none" stroke="#d2b575" stroke-width="2"/><path d="M60 18v8m31 7-5 7M26 48h8" stroke="#d2b575" stroke-width="2"/>`;
    case 'boat': return `<path d="m13 96 37-23 56 24-36 21Z" fill="#8ab6b5"/><path d="m26 87 25 12 44-12-22 23-22 3Z" fill="#ab9976"/><path d="M53 94V37m0 2 31 32-31 11" fill="#e5e0c8" stroke="#8f927e" stroke-width="2"/><path d="M25 91q-6-19 5-27 10 8 4 19l-4-3Z" fill="#cbded2" opacity=".8"/>`;
    default: return `${rock(78, 91, .7)}${tree(42, 90, .83)}`;
  }
}

const FATE_ART: Record<string, string> = { jianti: 'swords', fozi: 'temple', danxin: 'furnace', mozhong: 'demon', wenxin: 'book', jiangxing: 'camp', daotong: 'temple', fangu: 'farm' };
const HOLD_ART: Record<string, string> = { tian: 'field', shang: 'market', wu: 'camp', shu: 'book', zong: 'sect', dan: 'furnace', ling: 'field', jian: 'swords', si: 'temple' };
const CONSEQ_ART: Record<string, string> = { grudge: 'swords', partner: 'partner', slay: 'forest', rescue: 'gift', disciple: 'book', injured: 'quiet', treasure: 'treasure', ruined: 'ruin', killer: 'boat' };
const STRAY_ART: Record<string, string> = { wuguan: 'camp', danzong: 'furnace', jiange: 'swords', duzong: 'furnace', moku: 'demon', fosi: 'temple', zhengjian: 'swords', junying: 'camp', dufang: 'market' };

export function tileArtKey(t: TileView, stage: 'mortal' | 'cult'): string {
  switch (t.kind) {
    case 'start': return 'start';
    case 'fate': return FATE_ART[t.variant ?? 'fangu'] ?? 'farm';
    case 'market': return stage === 'cult' ? 'bazaar' : 'market';
    case 'oracle': return stage === 'cult' ? 'fortune' : 'fair';
    case 'hold': return HOLD_ART[t.variant ?? ''] ?? 'empty';
    case 'conseq': return CONSEQ_ART[t.variant ?? ''] ?? 'karma';
    case 'stray': return STRAY_ART[t.variant ?? ''] ?? 'cross';
    case 'dust': return 'partner';
    case 'ruin': return 'ruin';
    default: return t.loc ?? 'road';
  }
}

function eventArt(t: TileView) {
  if (t.tag === '劫') return '<g class="event-signal signal-danger"><path d="m97 28-13 18h10l-9 17 22-24H96l9-11Z" fill="#b85b50" stroke="#f5e3c8" stroke-width="1.5"/></g>';
  if (t.tag === '凶') return '<g class="event-signal"><path d="M94 32 106 54H82Z" fill="#5b6574"/><path d="M94 39v7m0 3v2" stroke="#f3e8d5" stroke-width="2"/></g>';
  if (t.tag === '缘' || t.kind === 'chain') return '<g class="event-signal signal-fate"><path d="M93 36q-13-13-16-1-1 9 16 17 17-8 16-17-3-12-16 1Z" fill="#75a898" stroke="#e3ebce" stroke-width="1.5"/></g>';
  if (t.tag === '引') return '<g class="event-signal"><path d="m85 25 18 7v24l-18-7Z" fill="#d1b471" stroke="#f6e2ae"/><path d="m90 35 8 3m-8 3 8 3" stroke="#8b7649" stroke-width="2"/></g>';
  if (t.tag === '故') return '<g class="event-signal"><path d="M94 25v7m0 21v6" stroke="#a390ad" stroke-width="2"/><ellipse cx="94" cy="43" rx="9" ry="12" fill="#a795b0"/><path d="M94 34v18" stroke="#ead6d8"/></g>';
  return '';
}

export function tileGraphic(t: TileView, stage: 'mortal' | 'cult'): string {
  const key = tileArtKey(t, stage);
  return `<svg class="tile-art art-${key}" viewBox="0 0 120 154" aria-hidden="true" focusable="false">
    <ellipse class="tile-shadow" cx="60" cy="112" rx="53" ry="31"/>
    <g class="tile-hit" stroke-linejoin="round">
      <path class="tile-edge-left" d="m3 98 57 40v8L3 106Z"/>
      <path class="tile-edge-right" d="m60 138 57-40v8l-57 40Z"/>
      <path class="tile-ground" d="m3 98 57-40 57 40-57 40Z"/>
      <path class="tile-inset" d="m10 98 50-35 50 35-50 35Z"/>
      <ellipse class="route-dot" cx="60" cy="126" rx="3" ry="2"/>
    </g>
    <g class="tile-prop" stroke-linejoin="round" stroke-linecap="round">${sceneArt(key)}</g>
    ${eventArt(t)}
    <g class="tile-pawn" transform="translate(88 94)">
      <ellipse class="pawn-ring" cy="3" rx="12" ry="7" fill="none" stroke="#bd6454" stroke-width="2"/>
      <path d="m-5-20-5 21Q0 7 10 1L5-20Z" fill="#faf3dc" stroke="#9caa9e"/>
      <path d="m-2-17 4 0 3 21H1Z" fill="#b9695a"/>
      <circle cy="-24" r="5" fill="#dcb996"/>
      <path d="m-10-25 10-8 10 8Z" fill="#425f68"/><path d="M-8-25H8" stroke="#d3bf89" stroke-width="2"/>
    </g>
  </svg>`;
}

export function boardBackdrop(size: number, name: string): string {
  const { width, height, side } = boardGeometry(size);
  const cx = width / 2;
  const cy = (side - 1) * STEP_Y + 98;
  const radius = Math.max(27, (side - 2) * 24);
  return `<svg class="board-landscape" viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <path d="M${cx - radius * 1.8} ${cy + 25}q${radius} ${-radius * .65} ${radius * 1.8} 0t${radius * 1.8} 0" fill="none" stroke="#a5c9c4" stroke-width="16" opacity=".13"/>
    <g transform="translate(${cx} ${cy}) scale(1 .7071)" fill="none" stroke="#96b6ad">
      <circle r="${radius}" stroke-width="1" opacity=".5"/><circle r="${radius - 6}" stroke-dasharray="2 7" opacity=".5"/>
      <path d="M${-radius - 13} 0H${-radius + 7}M${radius - 7} 0h20M0 ${-radius - 13}v20M0 ${radius - 7}v20" opacity=".7"/>
    </g>
    <text x="${cx}" y="${cy + 4}" class="map-name">${name}</text>
    <text x="${cx}" y="${cy + 22}" class="map-caption">一 步 一 流 年</text>
    <path d="m${cx - 7} ${cy - radius * .7071 - 7} 7-5 7 5-7 5Z" fill="#c5ae78" opacity=".65"/>
  </svg>`;
}
