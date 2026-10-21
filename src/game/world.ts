// 大世界生成：每世一张新地图。七步：母题 → 地理 → 势力 → 地点 → 人物 → 世界年表 → 挂载
// 只算数据，不碰画面；同一个种子总能生成同一张图（存档里只记种子和迷雾）
// 第一版只做「天门崩后」母题，乡里（凡人）与一州（修士）两层

export type SiteKind = 'base' | 'loc' | 'fate' | 'market' | 'oracle' | 'hold' | 'peak' | 'secret' | 'town' | 'sect' | 'village';
export type Zone = 'plain' | 'forest' | 'mountain' | 'water';

export interface Site {
  id: string;
  kind: SiteKind;
  loc?: string; // 对应的事件地点（LOCATIONS 的 id）
  name: string;
  icon: string;
  look: 'house' | 'town' | 'temple' | 'pavilion' | 'cave' | 'dock' | 'gate' | 'dark' | 'peak' | 'plot' | 'shrine' | 'secret' | 'road';
  x: number;
  y: number;
  hidden?: boolean; // 不上任何地图，只能走近了发现
}
export interface Peak { x: number; y: number; r: number; h: number; tone: number }
export interface Faction { name: string; kind: '正' | '魔' | '散'; site: string }
export interface Prodigy { name: string; faction: string; realm: string; trait: string }

export interface World {
  seed: number;
  layer: number;
  theme: string;
  w: number;
  h: number;
  cell: number;
  cols: number;
  rows: number;
  name: string;
  peaks: Peak[];
  rivers: { pts: [number, number][]; w: number }[];
  lakes: { x: number; y: number; rx: number; ry: number }[];
  forests: { x: number; y: number; r: number }[];
  roads: [number, number][][];
  sites: Site[];
  wild: { x: number; y: number; zone: Zone }[];
  factions: Faction[];
  prodigies: Prodigy[];
  chronicle: string[];
  intro: string;
}

// 种子随机数：与游戏本身的随机数分开，读档后地图不变
export function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LAYER_NAMES = ['乡里', '一州'];
export const LAYER_SIZE = [
  { w: 1800, h: 1400, cell: 40 },
  { w: 3600, h: 2800, cell: 60 },
];

// ---------------- 母题：天门崩后 ----------------
// 名字只从常用字里拼，尽量落在字体子集里
const ZHOU = ['青', '云', '澜', '楚', '沧', '岚', '溪', '燕', '越', '洛', '宁', '凉'];
const XIANG_A = ['柳', '杏', '石', '竹', '桃', '梅', '松', '枫', '白', '清'];
const XIANG_B = ['溪', '河', '塘', '桥', '湾', '坡', '岭', '口'];
const SECT_A = ['青冥', '落霞', '玄木', '紫霄', '归一', '太虚', '寒山', '流云', '天剑', '碧水', '万象', '长生'];
const SECT_B = ['剑宗', '宫', '谷', '门', '阁', '观', '派', '书院'];
const DEMON = ['血河', '幽冥', '墨潮', '噬魂'];
const SURNAME = ['顾', '沈', '陆', '萧', '叶', '苏', '林', '江', '温', '谢', '韩', '秦', '白', '宁'];
const GIVEN = ['长歌', '惊鸿', '无双', '清寒', '若水', '青衣', '玄策', '归鸿', '照夜', '星河', '明月', '寒舟', '知秋', '听雪'];
const TRAITS = ['剑心通明', '天生道体', '身负古魂', '一夜筑基', '饮过天门水', '前世是天门守将', '养着一头雷兽', '从不出第二剑'];
const TOWN_A = ['平', '安', '临', '望', '长', '新', '永', '东', '西', '南'];
const TOWN_B = ['安镇', '水镇', '川城', '阳城', '江城', '山镇'];

const CHRONICLE = [
  '天门崩落已有 {n} 年，残门的碎片至今还悬在北天。',
  '{s}与{t}为争一条灵脉，斗了三十年。',
  '{d}教在{z}州边上冒了头，专收走投无路的人。',
  '有人说天门后面什么也没有，说这话的人第二天就不见了。',
  '{z}州的灵气一年比一年稀，{s}已经开始收凡人做外门杂役。',
  '{p}在{s}的试剑台上连胜十九场，名动{z}州。',
  '一场大雨下了四十天，{x}的河道改了。',
];

function pickR<T>(r: () => number, a: T[]): T {
  return a[Math.floor(r() * a.length)];
}

export function generateWorld(seed: number, layer: number): World {
  const r = mulberry(seed * 7 + layer * 101 + 13);
  const { w, h, cell } = LAYER_SIZE[layer];
  const k = layer === 0 ? 1 : 2; // 一州的地物整体放大
  const zhou = pickR(r, ZHOU);
  const xiang = pickR(r, XIANG_A) + pickR(r, XIANG_B);
  const name = layer === 0 ? `${xiang}乡` : `${zhou}州`;
  const margin = 110 * k;

  // ---------- 地理：一条河、两三列山、几片林子、一两处湖 ----------
  const rivers: World['rivers'] = [];
  {
    const pts: [number, number][] = [];
    let x = w * (0.3 + r() * 0.4);
    const ph = r() * 6;
    for (let y = -40; y <= h + 40; y += 40 * k) {
      x += Math.sin(y / (260 * k) + ph) * 28 * k + (r() - 0.5) * 22 * k;
      x = Math.max(w * 0.15, Math.min(w * 0.85, x));
      pts.push([x, y]);
    }
    rivers.push({ pts, w: 26 * k });
  }
  const riverX = (y: number) => {
    const pts = rivers[0].pts;
    for (let i = 1; i < pts.length; i++) if (pts[i][1] >= y) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return x0 + ((x1 - x0) * (y - y0)) / Math.max(1, y1 - y0);
    }
    return pts[pts.length - 1][0];
  };
  const riverDist = (x: number, y: number) => Math.abs(x - riverX(y));

  const peaks: Peak[] = [];
  const ranges = 2 + Math.floor(r() * 2);
  for (let i = 0; i < ranges; i++) {
    let cx = 0;
    let cy = 0;
    for (let t = 0; t < 40; t++) {
      cx = margin + r() * (w - 2 * margin);
      cy = margin + r() * (h - 2 * margin);
      if (riverDist(cx, cy) > 260 * k) break;
    }
    const n = 7 + Math.floor(r() * 8);
    const ang = r() * Math.PI;
    for (let j = 0; j < n; j++) {
      const along = (j / n - 0.5) * 520 * k;
      const px = cx + Math.cos(ang) * along + (r() - 0.5) * 140 * k;
      const py = cy + Math.sin(ang) * along + (r() - 0.5) * 140 * k;
      if (riverDist(px, py) < 90 * k) continue;
      const pr = (36 + r() * 60) * k;
      peaks.push({ x: px, y: py, r: pr, h: pr * (1.1 + r() * 0.9), tone: r() });
    }
  }
  const forests: World['forests'] = [];
  const fcount = 2 + Math.floor(r() * 3);
  for (let i = 0; i < fcount; i++) {
    const cx = margin + r() * (w - 2 * margin);
    const cy = margin + r() * (h - 2 * margin);
    if (riverDist(cx, cy) < 80 * k) continue;
    // 乡里正中（家一带）留出空地
    if (layer === 0 && Math.hypot(cx - w / 2, cy - h / 2) < 380) continue;
    const n = 3 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) forests.push({ x: cx + (r() - 0.5) * 200 * k, y: cy + (r() - 0.5) * 160 * k, r: (50 + r() * 50) * k });
  }
  const lakes: World['lakes'] = [];
  const lcount = 1 + Math.floor(r() * 2);
  for (let i = 0; i < lcount; i++) {
    const y = margin + r() * (h - 2 * margin);
    const side = r() < 0.5 ? -1 : 1;
    lakes.push({ x: riverX(y) + side * (60 + r() * 60) * k, y, rx: (70 + r() * 60) * k, ry: (40 + r() * 30) * k });
  }

  const inForest = (x: number, y: number) => forests.some((f) => Math.hypot(f.x - x, f.y - y) < f.r);
  const nearPeak = (x: number, y: number) => peaks.some((p) => Math.hypot(p.x - x, p.y - y) < p.r * 1.25);
  const zoneOf = (x: number, y: number): Zone => (riverDist(x, y) < 50 * k || lakes.some((l) => Math.hypot((l.x - x) / l.rx, (l.y - y) / l.ry) < 1.2) ? 'water' : nearPeak(x, y) ? 'mountain' : inForest(x, y) ? 'forest' : 'plain');

  // ---------- 地点 ----------
  const sites: Site[] = [];
  const minGap = 150 * k;
  const free = (x: number, y: number, gap = minGap) => x > margin && y > margin && x < w - margin && y < h - margin && sites.every((s) => Math.hypot(s.x - x, s.y - y) > gap);
  // 在某处附近找一个落脚点；want 指定地貌
  const place = (near: { x: number; y: number } | null, dmin: number, dmax: number, want?: (x: number, y: number) => boolean, gap = minGap) => {
    for (let t = 0; t < 400; t++) {
      let x: number;
      let y: number;
      if (near) {
        const a = r() * Math.PI * 2;
        const d = dmin + r() * (dmax - dmin);
        x = near.x + Math.cos(a) * d;
        y = near.y + Math.sin(a) * d;
      } else {
        x = margin + r() * (w - 2 * margin);
        y = margin + r() * (h - 2 * margin);
      }
      const relax = t > 300;
      if (!free(x, y, relax ? gap * 0.6 : gap)) continue;
      if (!relax && riverDist(x, y) < 60 * k) continue;
      if (!relax && want && !want(x, y)) continue;
      return { x, y };
    }
    return { x: w / 2 + (r() - 0.5) * w * 0.6, y: h / 2 + (r() - 0.5) * h * 0.6 };
  };
  const add = (s: Omit<Site, 'x' | 'y'>, p: { x: number; y: number }) => {
    const site = { ...s, x: p.x, y: p.y };
    sites.push(site);
    return site;
  };
  const notPeak = (x: number, y: number) => !nearPeak(x, y);
  const factions: Faction[] = [];

  if (layer === 0) {
    const home = add({ id: 'home', kind: 'base', loc: 'home', name: '家', icon: '宅', look: 'house' }, place({ x: w / 2, y: h / 2 }, 0, 260, (x, y) => notPeak(x, y) && !inForest(x, y)));
    add({ id: 'fate', kind: 'fate', name: '祖祠', icon: '祠', look: 'shrine' }, place(home, 130, 220, notPeak, 110));
    add({ id: 'neighbor', kind: 'loc', loc: 'neighbor', name: '邻里', icon: '邻', look: 'house' }, place(home, 150, 260, notPeak, 120));
    add({ id: 'hold-a', kind: 'hold', name: '东头的地', icon: '地', look: 'plot' }, place(home, 160, 300, notPeak, 120));
    add({ id: 'hold-b', kind: 'hold', name: '西头的地', icon: '地', look: 'plot' }, place(home, 160, 320, notPeak, 120));
    add({ id: 'school', kind: 'loc', loc: 'school', name: '学堂', icon: '学', look: 'house' }, place(home, 220, 380, notPeak));
    const town = add({ id: 'market', kind: 'market', loc: 'market', name: pickR(r, TOWN_A) + pickR(r, TOWN_B), icon: '市', look: 'town' }, place(home, 420, 640, notPeak));
    add({ id: 'fair', kind: 'oracle', loc: 'fair', name: '山神庙', icon: '庙', look: 'temple' }, place(home, 360, 620, notPeak));
    // 河畔：贴着河
    {
      let p = { x: 0, y: 0 };
      for (let t = 0; t < 60; t++) {
        const y = margin + r() * (h - 2 * margin);
        const x = riverX(y) + (r() < 0.5 ? -1 : 1) * 70;
        if (free(x, y)) {
          p = { x, y };
          break;
        }
        p = { x, y };
      }
      add({ id: 'river', kind: 'loc', loc: 'river', name: '渡口', icon: '河', look: 'dock' }, p);
    }
    // 官道：靠在地图边上
    {
      const side = r() < 0.5 ? margin + 20 : w - margin - 20;
      add({ id: 'road', kind: 'loc', loc: 'road', name: '官道驿亭', icon: '道', look: 'road' }, { x: side, y: town.y + (r() - 0.5) * 200 });
    }
    // 仙踪：山里，离家远
    const far = peaks.slice().sort((a, b) => Math.hypot(b.x - home.x, b.y - home.y) - Math.hypot(a.x - home.x, a.y - home.y))[0];
    add({ id: 'trace', kind: 'loc', loc: 'trace', name: '云深处', icon: '仙', look: 'peak' }, place(far ?? null, far ? far.r * 0.9 : 0, far ? far.r * 1.8 : 0, undefined, 120));
  } else {
    const range = peaks.length ? pickR(r, peaks) : { x: w / 2, y: h / 2, r: 80 };
    const cave = add({ id: 'cave', kind: 'base', loc: 'cave', name: '洞府', icon: '府', look: 'cave' }, place(range, range.r * 1.2, range.r * 2.4, undefined, 200));
    add({ id: 'quiet', kind: 'loc', loc: 'quiet', name: '静室', icon: '静', look: 'house' }, place(cave, 200, 320, undefined, 160));
    add({ id: 'fate', kind: 'fate', name: '本命台', icon: '命', look: 'shrine' }, place(cave, 220, 380, undefined, 160));
    const bazaar = add({ id: 'bazaar', kind: 'market', loc: 'bazaar', name: pickR(r, TOWN_A) + '仙坊', icon: '坊', look: 'town' }, place({ x: w / 2, y: h / 2 }, 0, 700, notPeak));
    add({ id: 'oracle', kind: 'oracle', name: '天机阁', icon: '卦', look: 'temple' }, place(bazaar, 300, 600, notPeak));
    add({ id: 'hold-a', kind: 'hold', name: '药园', icon: '园', look: 'plot' }, place(cave, 300, 520, notPeak, 180));
    add({ id: 'hold-b', kind: 'hold', name: '坊中铺面', icon: '铺', look: 'plot' }, place(bazaar, 240, 420, notPeak, 180));
    add({ id: 'cross', kind: 'loc', loc: 'cross', name: '三岔古道', icon: '路', look: 'road' }, place(bazaar, 600, 1000, notPeak));
    // 三家宗门：第一家是你的师门（若入了宗门）
    const used = new Set<string>();
    for (let i = 0; i < 3; i++) {
      let nm = '';
      do nm = pickR(r, SECT_A) + pickR(r, SECT_B);
      while (used.has(nm));
      used.add(nm);
      const s = add({ id: i === 0 ? 'sect' : `sect-${i}`, kind: i === 0 ? 'loc' : 'sect', loc: i === 0 ? 'sect' : undefined, name: nm, icon: '宗', look: 'pavilion' }, place(null, 0, 0, (x, y) => !inForest(x, y), 380));
      factions.push({ name: nm, kind: '正', site: s.id });
    }
    const big = forests.length ? forests.slice().sort((a, b) => b.r - a.r)[0] : null;
    add({ id: 'forest', kind: 'loc', loc: 'forest', name: '妖林', icon: '妖', look: 'dark' }, big ? { x: big.x, y: big.y } : place(null, 0, 0));
    const far = peaks.slice().sort((a, b) => Math.hypot(b.x - cave.x, b.y - cave.y) - Math.hypot(a.x - cave.x, a.y - cave.y))[0];
    add({ id: 'realm', kind: 'loc', loc: 'realm', name: '古秘境', icon: '秘', look: 'gate' }, place(far ?? null, far ? far.r : 0, far ? far.r * 2 : 0, undefined, 200));
    const dm = pickR(r, DEMON);
    const corner = { x: r() < 0.5 ? margin * 1.6 : w - margin * 1.6, y: h - margin * 1.6 };
    add({ id: 'demon', kind: 'loc', loc: 'demon', name: `${dm}魔域`, icon: '魔', look: 'dark' }, place(corner, 0, 260, undefined, 200));
    factions.push({ name: `${dm}教`, kind: '魔', site: 'demon' });
    add({ id: 'rift', kind: 'loc', loc: 'rift', name: '画外裂隙', icon: '隙', look: 'dark' }, place(null, 0, 0, undefined, 300));
    add({ id: 'gate', kind: 'loc', loc: 'gate', name: '天门前庭', icon: '门', look: 'gate' }, place({ x: w / 2, y: margin * 1.4 }, 0, 400, undefined, 200));
    add({ id: 'village', kind: 'village', name: `${xiang}乡`, icon: '乡', look: 'house' }, place(cave, 700, 1200, notPeak, 250));
    for (let i = 0; i < 2; i++) add({ id: `town-${i}`, kind: 'town', name: pickR(r, TOWN_A) + pickR(r, TOWN_B), icon: '城', look: 'town' }, place(null, 0, 0, notPeak, 450));
  }
  // 望点：挑几座高峰
  const tall = peaks.slice().sort((a, b) => b.h - a.h);
  const nPeak = layer === 0 ? 2 : 3;
  let pi = 0;
  for (const p of tall) {
    if (pi >= nPeak) break;
    const at = { x: p.x, y: p.y + p.r * 0.35 };
    if (!free(at.x, at.y, 120 * k)) continue;
    add({ id: `peak-${pi}`, kind: 'peak', name: pi === 0 ? '望仙台' : pi === 1 ? '鹰嘴岩' : '观云峰', icon: '望', look: 'peak' }, at);
    pi += 1;
  }
  // 隐秘之地：不上任何地图
  const nSecret = layer === 0 ? 1 : 2;
  for (let i = 0; i < nSecret; i++) {
    add({ id: `secret-${i}`, kind: 'secret', name: i === 0 ? '无名古洞' : '荒草下的石阶', icon: '隐', look: 'secret', hidden: true }, place(null, 0, 0, (x, y) => zoneOf(x, y) !== 'plain' && zoneOf(x, y) !== 'water', 200 * k));
  }

  // ---------- 道路：把村镇宗门连起来（最小生成树） ----------
  const hubs = sites.filter((s) => ['base', 'market', 'oracle', 'town', 'sect', 'village', 'fate'].includes(s.kind) || ['school', 'neighbor', 'road', 'river', 'cross', 'quiet', 'sect'].includes(s.id));
  const roads: World['roads'] = [];
  const inTree = [hubs[0]];
  const rest = hubs.slice(1);
  while (rest.length) {
    let best = { d: Infinity, a: hubs[0], bi: 0 };
    for (const a of inTree) rest.forEach((b, bi) => {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < best.d) best = { d, a, bi };
    });
    const b = rest.splice(best.bi, 1)[0];
    inTree.push(b);
    const a = best.a;
    const pts: [number, number][] = [[a.x, a.y]];
    const n = Math.max(2, Math.round(best.d / (90 * k)));
    const nx = -(b.y - a.y) / best.d;
    const ny = (b.x - a.x) / best.d;
    const bend = (r() - 0.5) * best.d * 0.25;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const s = Math.sin(t * Math.PI) * bend + (r() - 0.5) * 14 * k;
      pts.push([a.x + (b.x - a.x) * t + nx * s, a.y + (b.y - a.y) * t + ny * s]);
    }
    pts.push([b.x, b.y]);
    roads.push(pts);
  }

  // ---------- 野外落点：散修奇遇、机缘、妖兽在这些地方出没 ----------
  const wild: World['wild'] = [];
  for (let t = 0; t < 900 && wild.length < 70; t++) {
    const x = margin + r() * (w - 2 * margin);
    const y = margin + r() * (h - 2 * margin);
    if (sites.some((s) => Math.hypot(s.x - x, s.y - y) < 110 * k)) continue;
    if (wild.some((p) => Math.hypot(p.x - x, p.y - y) < 90 * k)) continue;
    const zone = zoneOf(x, y);
    if (zone === 'water' && riverDist(x, y) < 30 * k) continue;
    wild.push({ x, y, zone });
  }

  // ---------- 人物：天骄 ----------
  const prodigies: Prodigy[] = [];
  const nP = 3 + Math.floor(r() * 3);
  const usedN = new Set<string>();
  for (let i = 0; i < nP; i++) {
    let nm = '';
    do nm = pickR(r, SURNAME) + pickR(r, GIVEN);
    while (usedN.has(nm));
    usedN.add(nm);
    const fac = factions.length ? pickR(r, factions).name : '散修';
    prodigies.push({ name: nm, faction: fac, realm: pickR(r, ['炼气', '筑基', '筑基', '金丹']), trait: pickR(r, TRAITS) });
  }

  // ---------- 世界年表 ----------
  const sects = factions.filter((f) => f.kind === '正').map((f) => f.name);
  const fill = (s: string) =>
    s
      .replace('{n}', String(300 + Math.floor(r() * 900)))
      .replace('{s}', sects[0] ?? '山上的仙门')
      .replace('{t}', sects[1] ?? '另一家仙门')
      .replace('{d}', factions.find((f) => f.kind === '魔')?.name.replace('教', '') ?? pickR(r, DEMON))
      .replace(/\{z\}/g, zhou)
      .replace('{p}', prodigies[0]?.name ?? '一位少年')
      .replace('{x}', name);
  const chronicle = [fill(CHRONICLE[0]), ...[...CHRONICLE.slice(1)].sort(() => r() - 0.5).slice(0, 3).map(fill)];
  const intro =
    layer === 0
      ? `这一世，你生在${zhou}州${name}。天门崩落已久，山那边偶尔有仙人御剑飞过。`
      : `你走出${xiang}乡，眼前是整整一个${name}：${sects.join('、')}三家仙门，${factions.find((f) => f.kind === '魔')?.name ?? '魔教'}盘踞在边上。`;

  return { seed, layer, theme: '天门崩后', w, h, cell, cols: Math.ceil(w / cell), rows: Math.ceil(h / cell), name, peaks, rivers, lakes, forests, roads, sites, wild, factions, prodigies, chronicle, intro };
}

// 某个事件地点在这张图上的落脚处
export function siteForLoc(world: World, loc: string): Site | undefined {
  return world.sites.find((s) => s.loc === loc) ?? (loc === 'sickbed' ? world.sites.find((s) => s.id === 'home') : undefined);
}
