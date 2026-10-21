// 大世界探索：每年在地图上走动，「动则流时」。
// 每年的事件仍由命途（原棋盘）的流年格生成，只是不再排成一圈，而是落到地图上的地点和野外
import type { Game } from './engine';
import type { CardTag, ExploreState, LifeState, Tendency, Tile, TileKind } from './types';
import { REALMS } from '../data/core';
import { ensureBoard, newYearBoard, endLap, land, maxStops, signText, tileFace } from './board';
import { chainLapStart } from './chains';
import { chance, pick, rand } from './rng';
import { World, Site, Zone, generateWorld, siteForLoc } from './world';

export const YEAR_DAYS = 360;
export const DAYS_PER_SEC = 2; // 走一秒 = 两天
export const EVENT_DAYS = 15; // 进一处地方办事
export const MOB_DAYS = 3;
export const PEAK_DAYS = 5;

export type PointKind = 'mark' | 'base' | 'market' | 'peak' | 'secret' | 'mob';
export interface ExplorePoint {
  id: string;
  kind: PointKind;
  x: number;
  y: number;
  name: string;
  icon: string;
  hint: string;
  tag?: CardTag;
  tileKind?: TileKind;
  slot?: number;
  site?: string; // 落在哪个地点上（野外的为空）
  story?: boolean; // 引子、故人、因果链这类：雾里也露个「？」
  hidden?: boolean; // 隐秘之地：走近才发现
  done?: boolean;
  mob?: { power: number };
}
export interface ExploreView {
  world: World;
  E: ExploreState;
  points: ExplorePoint[];
  stopsLeft: number;
  maxStops: number;
  step: number;
  age: number;
  inDao: boolean;
  realm: number;
  speed: number; // 每秒走多远
  reveal: number; // 神识范围
  sign: string;
  lap: number;
  fresh: boolean; // 这张图刚生成
}
export type ExploreAction = { kind: 'enter'; id: string } | { kind: 'end'; rest?: boolean };

// ---------------- 世界缓存 ----------------
const cache = new Map<string, World>();
export function worldOf(E: ExploreState): World {
  const key = `${E.seed}:${E.layer}`;
  let w = cache.get(key);
  if (!w) {
    w = generateWorld(E.seed, E.layer);
    cache.set(key, w);
    if (cache.size > 6) cache.delete(cache.keys().next().value!);
  }
  return w;
}

export const layerOf = (L: LifeState) => (L.inDao ? 1 : 0);
// 遁速：境界越高走得越快（一州那么大，筑基之后才走得开）
export function speedOf(L: LifeState) {
  if (!L.inDao) return 120;
  return 170 * [1, 1, 1.3, 1.8, 2.4, 3][L.realm];
}
export function revealOf(L: LifeState) {
  return L.inDao ? 230 + L.realm * 40 : 170;
}

// ---------------- 迷雾 ----------------
export function fogAt(E: ExploreState, w: World, x: number, y: number) {
  const cx = Math.floor(x / w.cell);
  const cy = Math.floor(y / w.cell);
  if (cx < 0 || cy < 0 || cx >= w.cols || cy >= w.rows) return 0;
  return E.fog[cy * w.cols + cx] ?? 0;
}
// 把一圈格子揭开到 state（只升不降）；返回新揭开的格数
export function reveal(E: ExploreState, w: World, x: number, y: number, r: number, state: 1 | 2) {
  let n = 0;
  const c = w.cell;
  const x0 = Math.max(0, Math.floor((x - r) / c));
  const x1 = Math.min(w.cols - 1, Math.floor((x + r) / c));
  const y0 = Math.max(0, Math.floor((y - r) / c));
  const y1 = Math.min(w.rows - 1, Math.floor((y + r) / c));
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const dx = (cx + 0.5) * c - x;
      const dy = (cy + 0.5) * c - y;
      if (dx * dx + dy * dy > r * r) continue;
      const i = cy * w.cols + cx;
      if ((E.fog[i] ?? 0) < state) {
        E.fog[i] = state;
        n += 1;
      }
    }
  }
  return n;
}
export function exploredRatio(E: ExploreState) {
  let n = 0;
  for (const f of E.fog) if (f === 2) n += 1;
  return n / Math.max(1, E.fog.length);
}

// ---------------- 本世世界 ----------------
export function ensureExplore(g: Game): { E: ExploreState; world: World; fresh: boolean } {
  const L = g.L;
  const layer = layerOf(L);
  let E = L.explore;
  let fresh = false;
  if (!E || E.layer !== layer) {
    const seed = E?.seed ?? Math.floor(rand() * 1e9);
    const tmp: ExploreState = { seed, layer, px: 0, py: 0, fog: [], day: 0, found: [], ratioPaid: [] };
    const world = worldOf(tmp);
    const base = world.sites.find((s) => s.kind === 'base')!;
    tmp.px = base.x;
    tmp.py = base.y + 40;
    tmp.fog = new Array(world.cols * world.rows).fill(0);
    // 家门口一带是熟的；再远一点，听人说过
    reveal(tmp, world, base.x, base.y, layer ? 760 : 480, 1);
    reveal(tmp, world, tmp.px, tmp.py, revealOf(L) * 1.4, 2);
    E = L.explore = tmp;
    fresh = true;
    g.log(world.intro, 'fate');
    g.log(`【${world.theme}】${world.chronicle[0]}`, 'fate');
  }
  return { E, world: worldOf(E), fresh };
}

// 世事变迁：每年一两句世界在变
function worldNews(world: World, age: number): string | null {
  if (!world.prodigies.length) return null;
  const p = world.prodigies[(age * 7) % world.prodigies.length];
  const lines = [
    `听说${p.faction}的${p.name}${p.trait}，已是${p.realm}修为。`,
    `${p.name}下山历练，在${world.name}一带出没。`,
    ...world.chronicle.slice(1),
  ];
  return lines[(age * 13) % lines.length];
}

// ---------------- 这一年的落点 ----------------
const WILD_ZONE: Record<string, Zone[]> = {
  roam: ['plain', 'forest', 'mountain'],
  fortune: ['mountain', 'forest'],
  karma: ['plain', 'water'],
  conseq: ['plain'],
  stray: ['plain', 'forest'],
  dust: ['plain', 'water'],
  ruin: ['mountain', 'forest'],
  chain: ['plain', 'forest', 'water'],
};
const MOB_NAMES = ['赤眼狼妖', '墨鳞蛇', '山魈', '独角兕', '噬灵鼠群', '鬼面枭', '铁背熊妖', '白骨蝠'];

function buildPoints(g: Game, world: World, E: ExploreState): ExplorePoint[] {
  const L = g.L;
  const B = L.board!;
  const used = new Set<number>();
  const pts: ExplorePoint[] = [];
  const atSite: Record<string, number> = {};
  const base0 = world.sites.find((s) => s.kind === 'base')!;
  const wildAt = (zones: Zone[], awayFromBase = 0) => {
    let cands = world.wild.map((p, i) => ({ p, i })).filter((x) => !used.has(x.i) && zones.includes(x.p.zone) && Math.hypot(x.p.x - base0.x, x.p.y - base0.y) >= awayFromBase);
    if (!cands.length) cands = world.wild.map((p, i) => ({ p, i })).filter((x) => !used.has(x.i));
    if (!cands.length) return { x: E.px + 120, y: E.py };
    const c = pick(cands);
    used.add(c.i);
    return { x: c.p.x, y: c.p.y };
  };
  const onSite = (s: Site) => {
    // 同一处地方有好几件事：围着地点摆开
    const n = (atSite[s.id] = (atSite[s.id] ?? 0) + 1) - 1;
    if (n === 0) return { x: s.x, y: s.y - 6 };
    const a = -Math.PI / 2 + n * 1.9;
    return { x: s.x + Math.cos(a) * 34, y: s.y + Math.sin(a) * 26 };
  };
  const holdSites = world.sites.filter((s) => s.kind === 'hold');
  const holdSlots = B.tiles.filter((t) => t.kind === 'hold').map((t) => t.slot);
  const seen = new Set<string>();
  // 有标签的先摆：同一处地点有好几格时，只留最要紧的那一格
  const order = B.tiles.slice().sort((a, b) => Number((a.tag ?? '平') === '平') - Number((b.tag ?? '平') === '平'));
  for (const t of order) {
    // 凡人幼年地点不够，命途里会有重复的地点：地图上只摆一处
    if (t.kind === 'loc' && t.loc) {
      if (seen.has(t.loc)) continue;
      seen.add(t.loc);
    }
    let site: Site | undefined;
    switch (t.kind) {
      case 'start':
        site = world.sites.find((s) => s.kind === 'base');
        break;
      case 'fate':
        site = world.sites.find((s) => s.kind === 'fate');
        break;
      case 'market':
        site = world.sites.find((s) => s.kind === 'market');
        break;
      case 'oracle':
        site = world.sites.find((s) => s.kind === 'oracle');
        break;
      case 'hold':
        site = holdSites[holdSlots.indexOf(t.slot)] ?? holdSites[0];
        break;
      case 'loc':
        if (!t.loc) continue;
        site = siteForLoc(world, t.loc);
        break;
      case 'chain':
        if (t.ttl <= 0 && !t.ref) continue;
        site = t.loc ? siteForLoc(world, t.loc) : undefined;
        break;
      default:
        if (t.ttl <= 0) continue;
    }
    const pos = site ? onSite(site) : wildAt(WILD_ZONE[t.kind === 'loc' ? t.loc! : t.kind] ?? ['plain']);
    const f = tileFace(g, t);
    pts.push({
      id: 't' + t.slot,
      kind: 'mark',
      x: pos.x,
      y: pos.y,
      name: f.name,
      icon: f.icon,
      hint: f.hint,
      tag: t.tag,
      tileKind: t.kind,
      slot: t.slot,
      site: site?.id,
      story: t.tag === '引' || t.tag === '故' || t.kind === 'chain' || t.kind === 'ruin' || t.kind === 'dust',
    });
  }
  const base = world.sites.find((s) => s.kind === 'base')!;
  pts.push({ id: 'base', kind: 'base', x: base.x + 30, y: base.y + 22, name: L.inDao ? '闭关' : '回家歇着', icon: L.inDao ? '关' : '歇', hint: L.inDao ? '闭关到岁末，或长闭关' : '歇到岁末，气血回满', site: base.id });
  const mk = world.sites.find((s) => s.kind === 'market');
  if (mk) pts.push({ id: 'market', kind: 'market', x: mk.x - 30, y: mk.y + 22, name: L.inDao ? '买图' : '打听', icon: L.inDao ? '图' : '听', hint: L.inDao ? '买一张州图残卷，揭开一片迷雾' : '向货郎打听远处的地方', site: mk.id });
  for (const s of world.sites) {
    if (s.kind === 'peak' && !E.found.includes(s.id)) pts.push({ id: s.id, kind: 'peak', x: s.x, y: s.y, name: `登${s.name}`, icon: '望', hint: '登高望远，揭开一大片迷雾', site: s.id });
    if (s.kind === 'secret' && !E.found.includes(s.id)) pts.push({ id: s.id, kind: 'secret', x: s.x, y: s.y, name: s.name, icon: '隐', hint: '', site: s.id, hidden: true });
  }
  // 妖兽：修士才会碰上，看得见，可以绕开
  if (L.inDao) {
    const n = 2 + Math.min(3, L.realm);
    for (let i = 0; i < n; i++) {
      const p = wildAt(['forest', 'mountain'], 450);
      pts.push({ id: 'mob' + i, kind: 'mob', x: p.x, y: p.y, name: pick(MOB_NAMES), icon: '妖', hint: '撞上就在原地画圈开战', mob: { power: L.realm } });
    }
  }
  return pts;
}

// ---------------- 一年 ----------------
export async function exploreYear(g: Game) {
  ensureBoard(g);
  newYearBoard(g);
  await chainLapStart(g);
  if (g.dead()) return;
  const L = g.L;
  const B = L.board!;
  B.pos = 0;
  B.stops = 0;
  B.visited = [];
  g.fairBonus = 0;
  const { E, world, fresh } = ensureExplore(g);
  E.day = 0;
  if (!fresh && chance(0.35)) {
    const n = worldNews(world, L.age);
    if (n) g.log(`【世事】${n}`, 'fate');
  }
  if ((E.seclude ?? 0) > 0) {
    E.seclude! -= 1;
    secludeGain(g, 1);
    g.log(E.seclude ? `闭关中，洞府外的日子一年年过去。（还要 ${E.seclude} 轮）` : '你出关了。洞府外的草木换了一茬。');
    endLap(g, false);
    return;
  }
  const points = buildPoints(g, world, E);
  const max = maxStops(B.tiles.length);
  let fought = false;
  for (;;) {
    if (E.day >= YEAR_DAYS) break;
    const act = await g.io.explore({ world, E, points, stopsLeft: max - B.stops, maxStops: max, step: g.step, age: L.age, inDao: L.inDao, realm: L.realm, speed: speedOf(L), reveal: revealOf(L), sign: signText(g), lap: B.lap, fresh });
    if (act.kind === 'end') {
      if (act.rest) g.log(L.inDao ? '余下的日子你哪儿也没去，静静打坐到岁末。' : '余下的日子平平淡淡地过去了。');
      break;
    }
    const p = points.find((x) => x.id === act.id);
    if (!p || p.done) continue;
    if (p.kind === 'mark') {
      if (B.stops >= max) continue;
      const t: Tile = B.tiles[p.slot!];
      B.stops += 1;
      B.visited.push(t.slot);
      p.done = true;
      E.day += EVENT_DAYS;
      const hit = await land(g, t);
      fought = hit || fought;
      if (g.L !== L) return; // 掌天瓶回溯过：状态已经换了
      if (t.tag === '缘' && chance(0.2)) mapPiece(g, world, E, '事后你在怀里摸到一张旧图，上面画着一片你没去过的地方。');
    } else if (p.kind === 'base') {
      if (await baseRest(g, E)) break;
    } else if (p.kind === 'market') {
      await marketMap(g, world, E);
    } else if (p.kind === 'peak') {
      p.done = true;
      E.found.push(p.id);
      E.day += PEAK_DAYS;
      reveal(E, world, p.x, p.y, L.inDao ? 1000 : 640, 1);
      reveal(E, world, p.x, p.y, revealOf(L) * 1.6, 2);
      g.log(`你登上${p.name.replace(/^登/, '')}，${world.name}的山川大半落在眼底。`);
    } else if (p.kind === 'secret') {
      p.done = true;
      E.found.push(p.id);
      secretGain(g, p);
    } else if (p.kind === 'mob') {
      p.done = true;
      E.day += MOB_DAYS;
      fought = true;
      await g.fight({ kind: 'beast', title: p.name, loc: 'forest', reward: 0.6 });
    }
    g.io.refresh();
    if (g.dead()) return;
    g.checkPages();
    g.checkWish();
    g.updateSchool();
    ratioReward(g, world, E);
  }
  ratioReward(g, world, E);
  endLap(g, fought);
}

// 回家歇着 / 闭关；返回 true 表示这一年到此为止
async function baseRest(g: Game, E: ExploreState): Promise<boolean> {
  const L = g.L;
  if (!L.inDao) {
    const i = await g.ask('回家', '娘在灶间忙活，屋里飘着饭香。', ['在家歇到岁末（气血回满）', '再出去走走'], 'event', false, 'retreat');
    if (i !== 0) return false;
    L.hp = L.maxHp;
    g.log('你在家里歇到了岁末。');
    return true;
  }
  const s = g.step;
  const i = await g.ask('闭关', `洞府里灵气氤氲。闭关时外面的日子照样过，事情不会等你。`, ['闭关到岁末（修为小涨，气血回满）', `闭关 ${3 * s} 年`, `闭关 ${10 * s} 年`, '再出去走走'], 'event', false, 'retreat');
  if (i === 3) return false;
  const left = Math.max(0, (YEAR_DAYS - E.day) / YEAR_DAYS);
  secludeGain(g, left);
  if (i === 1) E.seclude = 2;
  if (i === 2) E.seclude = 9;
  g.log(i === 0 ? '你闭关到岁末。' : `你封了洞府，要闭关 ${i === 1 ? 3 * s : 10 * s} 年。`);
  return true;
}
function secludeGain(g: Game, k: number) {
  const L = g.L;
  L.hp = L.maxHp;
  if (!L.inDao || L.stall) return;
  L.xp += g.need() * 0.04 * k;
  if (g.capped()) L.xp = Math.min(L.xp, g.need());
}

async function marketMap(g: Game, world: World, E: ExploreState) {
  const L = g.L;
  if (!L.inDao) {
    if (E.asked === L.age) return void g.log('货郎摆摆手：今年的新鲜事都跟你说过了。');
    const i = await g.ask('打听', '货郎挑着担子，什么地方都去过。', ['听他说说远处的地方', '算了'], 'event', false, 'market');
    if (i !== 0) return;
    E.asked = L.age;
    const far = world.sites.filter((s) => !s.hidden && fogAt(E, world, s.x, s.y) === 0);
    if (!far.length) return void g.log('货郎说的地方，你都去过了。');
    const s = pick(far);
    reveal(E, world, s.x, s.y, 220, 1);
    g.log(`货郎说起${s.name}，你记下了它在哪儿。`);
    return;
  }
  if (E.mapBought === L.age) return void g.log('坊里卖图的摊子收了，说明年再来。');
  const cost = 20 + 10 * L.realm;
  const i = await g.ask('买图', `摊主摊开一卷${world.name}残图：「${cost} 灵石，不讲价。真假自辨。」`, [{ label: `买下（${cost} 灵石）`, disabled: L.stones < cost }, '不买'], 'event', false, 'market');
  if (i !== 0) return;
  L.stones -= cost;
  E.mapBought = L.age;
  if (chance(0.15)) return void g.log('你按图走了几步就发现不对：这是一张假图。');
  mapPiece(g, world, E, '你买下一卷残图，一片迷雾在心里散开了。');
}

// 得到一张地图：揭开一片还在雾里的地方（有图未至）
function mapPiece(g: Game, world: World, E: ExploreState, text: string) {
  const cands = world.sites.filter((s) => !s.hidden && fogAt(E, world, s.x, s.y) === 0);
  const s = cands.length ? pick(cands) : pick(world.sites.filter((x) => !x.hidden));
  reveal(E, world, s.x, s.y, E.layer ? 720 : 420, 1);
  g.log(text + `（${s.name}一带）`);
}

function secretGain(g: Game, p: ExplorePoint) {
  const L = g.L;
  if (L.inDao) {
    const st = 20 + 30 * L.realm;
    L.stones += st;
    if (!L.stall) {
      L.xp += g.need() * 0.06;
      if (g.capped()) L.xp = Math.min(L.xp, g.need());
    }
    g.log(`你在${p.name}里发现前人坐化的蒲团，灵石 +${st}，修为大涨。这地方不在任何一张图上。`, 'fate');
  } else {
    L.lifeBonus += 3;
    L.hp = L.maxHp;
    g.log(`你在${p.name}里喝到一眼清泉，浑身轻快（寿元 +3）。这地方不在任何一张图上。`, 'fate');
  }
  g.highlight(`寻到${p.name}`, 25, 'secret');
}

// 探明度奖励：三成、六成、九成
function ratioReward(g: Game, world: World, E: ExploreState) {
  const L = g.L;
  const r = exploredRatio(E);
  for (const th of [30, 60, 90]) {
    if (r * 100 < th || E.ratioPaid.includes(th + E.layer * 1000)) continue;
    E.ratioPaid.push(th + E.layer * 1000);
    if (L.inDao) {
      L.stones += 10 * th / 10;
      g.log(`${world.name}已探明${th / 10}成，路熟了，灵石 +${th}。`);
    } else {
      L.lifeBonus += 1;
      g.log(`${world.name}你已走遍${th / 10}成，脚力见长（寿元 +1）。`);
    }
  }
}

// ---------------- 自动寻路（模拟与自动模式） ----------------
export function autoTarget(v: ExploreView, tend: Tendency): ExplorePoint | null {
  const { E, world } = v;
  if (v.stopsLeft <= 0) return null;
  let best: ExplorePoint | null = null;
  let bestS = -Infinity;
  for (const p of v.points) {
    if (p.done || p.kind !== 'mark') continue;
    if (!p.story && fogAt(E, world, p.x, p.y) === 0) continue;
    let s = 1;
    if (p.tag === '劫') s += tend === 'war' ? 2 : tend === 'safe' ? -3 : -0.5;
    if (p.tag === '凶') s += tend === 'safe' ? -4 : -1;
    if (p.tag === '缘') s += tend === 'chance' ? 3 : 1.5;
    if (p.tag === '引' || p.tag === '故') s += 3;
    if (p.tileKind === 'chain') s += 2.5;
    if (p.tileKind === 'fate' || p.tileKind === 'hold') s += 1;
    s -= Math.hypot(p.x - E.px, p.y - E.py) / 900;
    if (s > bestS) {
      bestS = s;
      best = p;
    }
  }
  return bestS > -1.5 ? best : null;
}
// 无界面：直接「走」过去，按距离扣日子
export function autoStep(v: ExploreView, tend: Tendency): ExploreAction {
  const p = autoTarget(v, tend);
  if (!p) return { kind: 'end' };
  const d = Math.hypot(p.x - v.E.px, p.y - v.E.py);
  v.E.day += (d / v.speed) * DAYS_PER_SEC;
  v.E.px = p.x;
  v.E.py = p.y;
  reveal(v.E, v.world, p.x, p.y, v.reveal, 2);
  if (v.E.day >= YEAR_DAYS) return { kind: 'end' };
  return { kind: 'enter', id: p.id };
}

export const realmName = (r: number) => REALMS[r]?.name ?? '';
