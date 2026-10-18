// 命途棋盘：一圈十二格，掷骰走格（系统设计案「命途棋盘」「遗泽」）
// 一圈 = 一个岁首到下一个岁首（修士按境界一圈数年）。停在哪格，结算哪格。
import type { Game } from './engine';
import type { Card, CardTag, Effect, Holding, Legacy, LifeState, Option, Tendency, Tile, TileKind } from './types';
import { LOC_BY_ID, LifeEvent } from '../data/events';
import { FATE_BY_ID, FATE_EVENTS } from '../data/fate';
import { ERA_BY_ID, HOOK_BY_ID, eraIndex } from '../data/faces';
import { SCHOOL_NAMES, School, TALENT_BY_ID } from '../data/core';
import {
  BOARD_STAGES, CONSEQ, CORNER_LOCS, FATE_TILES, HOLDINGS, HOLD_COST_CULT, HOLD_COST_MORTAL, ORACLE_SIGNS,
  RUINS, RUIN_FAIL, RUIN_FORM_MULT, RUIN_FORM_NAMES, RUIN_GREET, RUIN_LAYERS, RUIN_REALM_COEF, RUIN_REVIVE, STRAYS,
  boardLayout, boardStageOf, tileMonth,
} from '../data/board';
import { chance, pick, randInt, shuffle, weighted } from './rng';
import { layerUp, retreat } from './cult';
import { chainBeat, chainLapStart, chainTileFace, chainTileStale, chainTilesDue } from './chains';
import { trailClose, trailHere, trailHint, trailMark, trailOpen, trailRef } from './trail';

const STOP = 0; // 「止」面
const DUN = 7; // 「遁」面
const JIE = -1; // 劫气积聚年：第一颗骰的 1 变「劫」
const RUIN_LAYER_W = [1, 2, 4];

export interface TileView {
  slot: number;
  kind: TileKind;
  name: string;
  icon: string;
  tag?: CardTag;
  hint: string;
  ttl: number;
  lv?: number;
  month: string;
  peek?: string;
  visited: boolean;
  loc?: string;
  canPeek: boolean;
}
export interface RollView {
  sign: string;
  gathered: boolean;
  stage: 'mortal' | 'cult';
  tiles: TileView[];
  pos: number;
  dice: number[]; // 只有一颗；0 = 止，7 = 遁，-1 = 劫
  targets: number[]; // 骰子落到的格；= size 表示越过岁首，本圈结束
  size: number; // 棋盘格数 12/16/20/24
  stageName: string;
  stops: number;
  maxStops: number;
  rerolls: number; // 改命（每圈）：窥命用
  again: number; // 再摇（每世）
  canRewind: boolean;
  ruyi: number;
  lap: number;
  years: number;
  nudge: boolean; // 龙驹：这一圈还能把点数拨 ±1
}
export type RollAction = { action: 'go'; die: number } | { action: 'ruyi'; value: number } | { action: 'reroll' } | { action: 'peek'; slot: number } | { action: 'rewind' } | { action: 'nudge'; d: 1 | -1 };

export const faceName = (f: number) => (f === STOP ? '止' : f === DUN ? '遁' : f === JIE ? '劫' : String(f));

const stageOf = (L: LifeState): 'mortal' | 'cult' => (L.inDao ? 'cult' : 'mortal');

// ================= 建盘 =================
export function ensureBoard(g: Game) {
  const L = g.L;
  L.holdings ??= [];
  L.fateTile ??= { lv: 0, dusty: 0 };
  L.conseqNext ??= [];
  L.ruinVisits ??= {};
  L.ruinVault ??= [];
  L.ruinCleared ??= [];
  if (!L.dice) {
    const extra = L.talents.filter((t) => TALENT_BY_ID[t]?.flags?.includes('extraCard')).length;
    L.dice = { n: 1, again: AGAIN_BASE + extra * 2, stopFace: false, dunFace: false, ruyi: 0 };
  }
  // 旧档：多出来的骰子折成再摇次数
  if (L.dice.again === undefined) {
    L.dice.again = AGAIN_BASE + (L.dice.n - 1) * 2;
    L.dice.n = 1;
  }
  if (L.flags.againPending) {
    L.dice.again += L.flags.againPending;
    delete L.flags.againPending;
  }
  if (L.board) return;
  L.board = { tiles: makeTiles(BOARD_STAGES[boardStageOf(L)].size), pos: 0, lap: 0, stops: 0, visited: [], seenLoc: {}, gathered: false, stage: stageOf(L) };
}

function makeTiles(n: number): Tile[] {
  const Y = boardLayout(n);
  const tiles: Tile[] = [];
  for (let s = 0; s < n; s++) tiles.push({ slot: s, kind: 'loc', ttl: 0 });
  tiles[Y.start] = { slot: Y.start, kind: 'start', ttl: 99 };
  tiles[Y.fate] = { slot: Y.fate, kind: 'fate', ttl: 99 };
  tiles[Y.holdA] = { slot: Y.holdA, kind: 'hold', ttl: 99 };
  tiles[Y.market] = { slot: Y.market, kind: 'market', ttl: 99 };
  tiles[Y.oracle] = { slot: Y.oracle, kind: 'oracle', ttl: 99 };
  tiles[Y.holdB] = { slot: Y.holdB, kind: 'hold', ttl: 99 };
  return tiles;
}

// 年龄、境界上去了：棋盘扩一档。旧的流年格带过去，产业跟着搬
function growBoard(g: Game, n: number) {
  const L = g.L;
  const B = L.board!;
  const oldN = B.tiles.length;
  const O = boardLayout(oldN);
  const Y = boardLayout(n);
  const tiles = makeTiles(n);
  O.flow.forEach((s, i) => {
    const t = B.tiles[s];
    const ns = Y.flow[i];
    if (ns !== undefined && t.ttl > 0) tiles[ns] = { ...t, slot: ns };
  });
  for (const h of L.holdings ?? []) h.slot = h.slot === O.holdA ? Y.holdA : Y.holdB;
  B.tiles = tiles;
  const st = BOARD_STAGES.find((x) => x.size === n)!;
  if (st.text) g.log(st.text, 'milestone');
}

// ================= 岁首 =================
function newYearBoard(g: Game) {
  const L = g.L;
  const B = L.board!;
  harvest(g);
  let full = B.lap === 0;
  if (B.stage !== stageOf(L)) {
    full = true;
    flipStage(g);
  }
  const size = BOARD_STAGES[boardStageOf(L)].size;
  if (size > B.tiles.length) growBoard(g, size);
  refreshTiles(g, full);
  markTags(g);
  g.log(signText(g), 'fate');
}

// 入道：棋盘换成修士的样子
function flipStage(g: Game) {
  const L = g.L;
  const B = L.board!;
  B.stage = stageOf(L);
  if (!L.inDao) return;
  if (L.route === 'sect' && !L.flags.sectAgain) {
    L.flags.sectAgain = 1;
    gainAgain(g, 2, '入了宗门，师父教你一句口诀：落子之前，还可以再问一次天。');
  }
  for (const h of L.holdings!) {
    if (h.type === 'wu' && h.lv >= 5) {
      h.type = 'zong';
      h.lv = 2;
      h.name = h.name.replace(/武馆|馆|堂|镖局/, '') + '宗';
      g.log(`你的武馆开宗立派，成了「${h.name}」。`, 'milestone');
    }
  }
}

function available(g: Game) {
  const used = new Set(g.L.board!.tiles.filter((t) => t.loc).map((t) => t.loc!));
  return g.availableLocs().filter((l) => !CORNER_LOCS.includes(l.id) && !used.has(l.id));
}

function refreshTiles(g: Game, full: boolean) {
  const L = g.L;
  const M = g.M;
  const B = L.board!;
  const flow = boardLayout(B.tiles.length).flow.map((s) => B.tiles[s]);
  for (const t of flow) t.ttl -= 1;
  const isHook = (t: Tile) => t.kind === 'loc' && t.tag === '引';
  const stage = stageOf(L);
  // 不再成立的格子必须换掉：凡俗地点入道后、地点不再开放、引子已了
  const stale = (t: Tile) => {
    if (t.kind === 'loc' && t.loc) {
      const d = LOC_BY_ID[t.loc];
      if (isHook(t)) return !L.hook || !!L.hook.outcome;
      if (t.tag === '故') return t.ttl <= 0;
      return d.stage !== stage || !g.availableLocs().some((l) => l.id === t.loc);
    }
    if (t.kind === 'stray') return !!STRAYS[t.ref!]?.mortalOnly && L.inDao;
    if (t.kind === 'chain') return chainTileStale(g, t.ref) || (!!t.loc && LOC_BY_ID[t.loc].stage !== stage);
    return false;
  };
  // 待放的新格（按优先级）
  const add: Omit<Tile, 'slot'>[] = [];
  // 因果链的「缘」格：到期没去的先记一次错过，再放这一圈到期的
  const pinned: Tile[] = [];
  for (const ct of chainTilesDue(g, flow)) {
    const { slot, ...rest } = ct;
    const st = flow.find((t) => t.slot === slot);
    if (slot != null && st && !(st.kind === 'chain' && st.ttl > 0) && !isHook(st)) pinned.push({ slot, ...rest });
    else add.push(rest);
  }
  const has = (k: TileKind, ref?: string) => flow.some((t) => t.kind === k && (!ref || t.ref === ref) && t.ttl > 0 && !stale(t));
  const h = L.hook;
  if (h && !h.outcome && h.beat < 3 && L.age >= h.due && !flow.some(isHook)) {
    add.push({ kind: 'loc', loc: HOOK_BY_ID[h.id].beats[h.beat].loc, tag: '引', ttl: 99 });
  }
  const tags = [...new Set(L.conseqNext ?? [])].filter((k) => CONSEQ[k] && !has('conseq', k));
  for (const k of shuffle(tags).slice(0, 2)) add.push({ kind: 'conseq', ref: k, ttl: 2 });
  L.conseqNext = [];
  if (L.nextLoc) {
    if (available(g).some((l) => l.id === L.nextLoc)) add.push({ kind: 'loc', loc: L.nextLoc, ttl: 2 });
    L.nextLoc = null;
  }
  const love = readyLove(g);
  if (love && !has('dust')) add.push({ kind: 'dust', ref: love.id, ttl: 3 });
  const strays = (FATE_TILES[L.fate ?? 'fangu']?.strays ?? []).filter((s) => !(STRAYS[s].mortalOnly && L.inDao) && !(L.flags['stray_' + s] >= 2));
  if (strays.length && !has('stray') && L.age >= 10 && chance(0.15)) add.push({ kind: 'stray', ref: pick(strays), ttl: 3 });
  const ruins = (M.legacies ?? []).filter((x) => !flow.some((t) => t.kind === 'ruin' && t.ref === x.id && t.ttl > 0));
  if (ruins.length && !has('ruin') && L.age >= 8) {
    const p = B.forceRuin ? 1 : L.flags.ruinFirst ? 0.04 : 0.3;
    L.flags.ruinFirst = 1;
    if (chance(p)) add.push({ kind: 'ruin', ref: weighted(ruins, (x) => x.lv + (x.keep ? 2 : 0))!.id, ttl: 3 });
    B.forceRuin = false;
  }
  if ((L.acqCards ?? 0) < 2 && chance(0.08)) {
    const a = g.reunionCandidate();
    if (a) {
      const locs = (L.inDao ? ['roam', 'cross', 'quiet', 'karma'] : ['neighbor', 'home', 'river']).filter((x) => available(g).some((l) => l.id === x));
      if (locs.length) add.push({ kind: 'loc', loc: pick(locs), tag: '故', ref: a.id, ttl: 3 });
    }
  }
  // 换哪几格：先换失效、到期的，再随机，凑够 2～4 格（新境界整盘换）
  const keep = (t: Tile) => (isHook(t) || (t.kind === 'chain' && t.ttl > 0) || pinned.some((p) => p.slot === t.slot)) && !stale(t);
  const order = shuffle(flow.filter((t) => !keep(t))).sort((a, b) => {
    const sa = stale(a) || a.ttl <= 0 ? 0 : 1;
    const sb = stale(b) || b.ttl <= 0 ? 0 : 1;
    return sa - sb || a.ttl - b.ttl;
  });
  const must = order.filter((t) => stale(t) || t.ttl <= 0).length;
  const n = Math.min(order.length, full ? order.length : Math.max(must, add.length, randInt(2, 4)));
  const slots = order.slice(0, n).map((t) => t.slot);
  for (const t of flow) if (slots.includes(t.slot)) B.tiles[t.slot] = { slot: t.slot, kind: 'loc', ttl: 0 }; // 先腾空，免得新地点和旧地点撞名
  // 签到碑：固定在同一格
  for (const p of pinned) B.tiles[p.slot] = p;
  for (const s of slots) {
    const nt = add.shift();
    if (nt) {
      B.tiles[s] = { slot: s, ...nt };
      continue;
    }
    const pool = available(g);
    const related = g.relatedLocs();
    const l = weighted(pool, (x) => x.weight * (related.includes(x.id) ? 2 : 1) * g.locMult(x.id) / (1 + 0.5 * (B.seenLoc[x.id] ?? 0)));
    if (!l) {
      // 地点不够（凡人幼年）：允许重复
      const any = weighted(g.availableLocs().filter((x) => !CORNER_LOCS.includes(x.id)), (x) => x.weight);
      B.tiles[s] = { slot: s, kind: 'loc', loc: any?.id ?? (L.inDao ? 'quiet' : 'neighbor'), ttl: 1 };
      continue;
    }
    B.seenLoc[l.id] = (B.seenLoc[l.id] ?? 0) + 1;
    B.tiles[s] = { slot: s, kind: 'loc', loc: l.id, ttl: randInt(2, 4) };
  }
  // 新放的「缘」格尽量挪到岁首后头六格里：头一掷就够得着（签到碑除外，它认准一格）
  const flowSlots = boardLayout(B.tiles.length).flow;
  for (const s of slots) {
    const t = B.tiles[s];
    if (t.kind !== 'chain' || s <= 6 || pinned.some((p) => p.slot === s)) continue;
    const near = flowSlots.filter((x) => x >= 1 && x <= 6 && B.tiles[x].kind === 'loc' && (!B.tiles[x].tag || B.tiles[x].tag === '平' || B.tiles[x].tag === '缘'));
    if (!near.length) continue;
    const x = pick(near);
    const other = B.tiles[x];
    B.tiles[x] = { ...t, slot: x };
    B.tiles[s] = { ...other, slot: s };
  }
}

// 流年签：每个岁首重新标劫、凶、缘
function markTags(g: Game) {
  const L = g.L;
  const B = L.board!;
  B.gathered = L.inDao && L.calm >= 8;
  const era = ERA_BY_ID[L.era ?? 'E1'];
  // 棋盘再大，平常年份的劫格也就两三处
  const maxJie = B.tiles.length >= 20 ? 3 : 2;
  let jie = 0;
  for (const t of shuffleTiles(B.tiles)) {
    if (t.kind === 'hold') {
      t.tag = holdingAt(L, t.slot) && chance(B.gathered ? 0.3 : 0.04) ? '劫' : undefined;
      continue;
    }
    if (t.kind !== 'loc' || !t.loc || t.tag === '引' || t.tag === '故') continue;
    const d = LOC_BY_ID[t.loc];
    t.peeked = undefined;
    if (d.danger && L.inDao) t.tag = B.gathered || (jie < maxJie && chance(0.35 + (era?.calamityBoost ?? 0))) ? '劫' : '平';
    if (t.tag === '劫') jie += 1;
    else if (d.fatal && !L.inDao) t.tag = !L.flags.xiongPing && !B.tiles.some((x) => x.tag === '凶') && chance(0.1) ? '凶' : '平';
    else if (d.chance) t.tag = chance(L.attrs.luck >= 7 ? 0.8 : 0.6) ? '缘' : '平';
    else t.tag = !B.gathered && chance(0.08 + L.attrs.luck * 0.01) ? '缘' : '平';
  }
}

const shuffleTiles = (ts: Tile[]) => shuffle(ts);

export function signText(g: Game): string {
  const B = g.L.board!;
  if (B.gathered) return '流年：劫气积聚，诸地皆有劫';
  const nm = (tag: CardTag) => B.tiles.filter((t) => t.kind === 'loc' && t.tag === tag).map((t) => tileFace(g, t).name);
  const parts: string[] = [];
  const j = nm('劫');
  const x = nm('凶');
  const y = nm('缘');
  if (j.length) parts.push(`${j.join('、')}有劫`);
  if (x.length) parts.push(`${x.join('、')}有凶`);
  if (y.length) parts.push(`${y.join('、')}有缘`);
  return parts.length ? '流年：' + parts.join('，') : '流年：四方平静';
}

// ================= 产业收成 =================
export function holdingAt(L: LifeState, slot: number): Holding | undefined {
  return L.holdings?.find((h) => h.slot === slot);
}

function holdYield(g: Game, h: Holding): Effect {
  const L = g.L;
  const lv = h.lv;
  let m = h.idle >= 3 ? 0.5 : 1;
  if (L.flags.bounty) m *= 1.3;
  const r = (v: number) => Math.round(v * m);
  switch (h.type) {
    case 'tian': return { stones: r(6 * lv * (h.branch === 0 ? 1.5 : 1)) };
    case 'shang': return { stones: r(10 * lv * (h.branch === 1 ? 2 : 1)) };
    case 'wu': return { stones: r(4 * lv) };
    case 'shu': return { stones: r(3 * lv) };
    case 'zong': return { stones: r(8 * lv) };
    case 'dan': {
      const x = (0.6 + (h.branch === 1 ? 0.3 : 0)) * lv * (L.flags.danMaster ? 1.5 : 1);
      return { xpPct: Math.round(x * m * 10) / 10, life: h.branch === 0 ? r(lv) : 0 };
    }
    case 'ling': return { stones: r(12 * lv * (h.branch === 0 ? 2 : 1)) };
    case 'jian': return { stones: h.branch === 1 ? r(15 * lv) : 0 };
    case 'si': return { merit: r(3 * lv) };
  }
  return {};
}

function harvest(g: Game) {
  const L = g.L;
  const got = { stones: 0, merit: 0, xp: 0, life: 0 };
  for (const h of L.holdings ?? []) {
    const y = holdYield(g, h);
    got.stones += y.stones ?? 0;
    got.merit += y.merit ?? 0;
    got.life += y.life ?? 0;
    if (y.xpPct && L.inDao && !L.stall) {
      got.xp += y.xpPct;
      L.xp += (g.need() * y.xpPct) / 100;
      if (g.capped()) L.xp = Math.min(L.xp, g.need());
    }
    if (h.type === 'jian') {
      h.forge = (h.forge ?? 0) + h.lv;
      if (h.forge >= 8 && L.inDao) {
        h.forge -= 8;
        g.upgradeRandomSkill(`${h.name}养剑`);
      }
    }
    h.idle += 1;
  }
  L.stones += got.stones;
  L.merit += got.merit;
  L.lifeBonus += got.life;
  const parts: string[] = [];
  if (got.stones) parts.push(`${L.inDao ? '灵石' : '银两'} +${got.stones}`);
  if (got.merit) parts.push(`功德 +${got.merit}`);
  if (got.xp) parts.push(`修为 +${Math.round(got.xp)}%`);
  if (got.life) parts.push(`寿元 +${got.life}`);
  if (parts.length) g.log(`产业收成：${parts.join('，')}。`);
}

// ================= 掷骰 =================
function rollDice(g: Game): number[] {
  const L = g.L;
  const D = L.dice!;
  let v = randInt(1, 6);
  if (v === 1 && D.stopFace) v = STOP;
  else if (v === 1 && L.board!.gathered) v = JIE;
  if (v === 6 && D.dunFace) v = DUN;
  return [v];
}

// 再摇次数：开局 1 次，事件、天机格、宗门可得，死了就没了
export const AGAIN_BASE = 1;
export function gainAgain(g: Game, n: number, text?: string) {
  const D = g.L.dice;
  if (!D) return;
  D.again = (D.again ?? 0) + n;
  g.log(`${text ? text + '（' : ''}再摇 +${n}${text ? '）' : ''}`, 'fate');
}

interface Dest {
  slot: number; // 落点（= 格数表示越过岁首）
  stop?: boolean;
}
function dest(g: Game, pos: number, face: number): Dest {
  const B = g.L.board!;
  const n = B.tiles.length;
  if (face === STOP) return { slot: pos, stop: true };
  if (face === DUN) {
    for (let s = pos + 1; s < n; s++) {
      const t = B.tiles[s];
      if (t.tag === '缘' || t.tag === '引' || t.tag === '故' || t.kind === 'ruin' || t.kind === 'chain') return { slot: s };
    }
    return { slot: Math.min(n, pos + 6) };
  }
  if (face === JIE) {
    for (let s = pos + 1; s < n; s++) if (B.tiles[s].tag === '劫') return { slot: s };
    return { slot: pos + 1 };
  }
  return { slot: Math.min(n, pos + face) };
}

export function canRewind(g: Game) {
  const L = g.L;
  return g.hasPage(17) && !L.rewindUsed && !!g.prevSnapshot && !g.battleSinceSnap && L.board!.stops === 0;
}

function view(g: Game, dice: number[]): RollView {
  const L = g.L;
  const B = L.board!;
  return {
    sign: signText(g),
    gathered: B.gathered,
    stage: stageOf(L),
    tiles: B.tiles.map((t) => tileView(g, t)),
    pos: B.pos,
    dice,
    targets: dice.map((d) => dest(g, B.pos, d).slot),
    stops: B.stops,
    maxStops: maxStops(B.tiles.length),
    size: B.tiles.length,
    stageName: BOARD_STAGES.find((x) => x.size === B.tiles.length)?.name ?? '',
    rerolls: g.rerolls,
    again: L.dice!.again ?? 0,
    canRewind: canRewind(g),
    ruyi: L.dice!.ruyi,
    lap: B.lap,
    years: g.step,
    nudge: L.pet?.kind === 'horse' && L.nudgeLap !== B.lap && dice[0] >= 1 && dice[0] <= 6,
  };
}

const maxStops = (n: number) => BOARD_STAGES.find((x) => x.size === n)?.maxStops ?? 5;

// ================= 一圈 =================
export async function boardLap(g: Game) {
  ensureBoard(g);
  newYearBoard(g);
  await chainLapStart(g);
  if (g.dead()) return;
  let L = g.L;
  let B = L.board!;
  B.pos = 0;
  B.stops = 0;
  B.visited = [];
  g.rerolls = g.rerollCount() + (L.flags.tipOff ? 1 : 0);
  delete L.flags.tipOff;
  g.fairBonus = 0;
  let fought = false;
  let badLuck = g.tflag('badLuck');
  let dice = rollDice(g);
  for (;;) {
    if (B.stops >= maxStops(B.tiles.length)) {
      g.log('这一年东奔西走，停了太多处，岁末匆匆，没顾上修行。');
      L.flags.busyLap = 1;
      break;
    }
    const act = await g.io.roll(view(g, dice));
    if (act.action === 'rewind' && canRewind(g)) {
      await g.rewind();
      return;
    }
    if (act.action === 'reroll' && (L.dice!.again ?? 0) > 0) {
      L.dice!.again! -= 1;
      L.rerollsUsed += 1;
      dice = rollDice(g);
      // 霉运缠身：每圈第一次再摇，骰子必指向劫或凶
      if (badLuck) {
        badLuck = false;
        for (let s = B.pos + 1; s <= Math.min(B.tiles.length - 1, B.pos + 6); s++) {
          if (B.tiles[s].tag === '劫' || B.tiles[s].tag === '凶') {
            dice[0] = s - B.pos;
            break;
          }
        }
      }
      continue;
    }
    if (act.action === 'nudge') {
      // 龙驹：每圈一次，点数 ±1
      if (L.pet?.kind === 'horse' && L.nudgeLap !== B.lap && dice[0] >= 1 && dice[0] <= 6) {
        L.nudgeLap = B.lap;
        dice = [Math.max(1, Math.min(6, dice[0] + act.d))];
        g.log(`${L.pet.name}换了个步子：${dice[0]} 点。`);
      }
      continue;
    }
    if (act.action === 'peek' && g.rerolls > 0) {
      const t = B.tiles[act.slot];
      if (!t || !canPeek(g, t)) continue;
      g.rerolls -= 1;
      L.rerollsUsed += 1;
      t.peeked = g.pickEvent(cardOf(t))?.id ?? 'nothing';
      continue;
    }
    let face: number;
    if (act.action === 'ruyi' && L.dice!.ruyi > 0) {
      L.dice!.ruyi -= 1;
      face = Math.max(1, Math.min(6, Math.round(act.value)));
      g.log(`如意骰落定：${face} 点。`);
    } else if (act.action === 'go' && dice[act.die] !== undefined) face = dice[act.die];
    else continue;
    const d = dest(g, B.pos, face);
    if (d.stop) {
      g.log(L.inDao ? '你掷出了「止」：这一圈不再出门，闭关到岁末。' : '你掷出了「止」：这一年就在家里歇着。');
      L.hp = Math.min(L.maxHp, L.hp + L.maxHp * 0.2);
      if (L.inDao && !L.stall) L.xp = Math.min(g.capped() ? g.need() : Infinity, L.xp + g.need() * 0.02);
      break;
    }
    // 劫格拦路：经过（没停下）的劫格，可能把你拦下
    let to = d.slot;
    if (face !== DUN) {
      for (let s = B.pos + 1; s < Math.min(B.tiles.length, to); s++) {
        if (B.tiles[s].tag === '劫' && chance(B.gathered ? 0.1 : 0.02)) {
          g.log(`路过${tileFace(g, B.tiles[s]).name}，劫气拦住了你的去路。`, 'battle');
          to = s;
          break;
        }
      }
    }
    if (to >= B.tiles.length) {
      if (to === B.tiles.length && landsOnStart(B.pos, face, B.tiles.length)) {
        B.pos = 0;
        B.stops += 1;
        fought = (await landStart(g)) || fought;
      }
      break;
    }
    B.pos = to;
    B.stops += 1;
    B.visited.push(to);
    const hit = await land(g, B.tiles[to]);
    fought = hit || fought;
    // 积聚的劫气一战即散：前面的劫格回到平常
    if (hit && B.gathered && g.L === L) {
      B.gathered = false;
      for (const t of B.tiles) if (t.slot > B.pos && t.kind === 'loc' && t.tag === '劫') t.tag = '平';
      g.log('一战过后，积聚的劫气散了。', 'fate');
    }
    if (g.L !== L) {
      // 掌天瓶回溯过：状态已经换了
      L = g.L;
      B = L.board!;
    }
    g.io.refresh();
    if (g.dead()) return;
    g.checkPages();
    g.checkWish();
    g.updateSchool();
    dice = rollDice(g);
  }
  endLap(g, fought);
}

// 正好走满一圈 = 停在岁首
function landsOnStart(pos: number, face: number, n: number) {
  return face !== DUN && face !== JIE && pos + face === n;
}

function endLap(g: Game, fought: boolean) {
  const L = g.L;
  const B = L.board!;
  B.lap += 1;
  if (L.inDao) L.calm = fought ? 0 : L.calm + 1;
  const ft = L.fateTile!;
  if (ft.dusty > 0) ft.dusty = Math.max(0, ft.dusty - (L.flags.calmHeart ? 2 : 1));
  // 引子格没去：顺延
  const h = L.hook;
  const hookTile = B.tiles.find((t) => t.kind === 'loc' && t.tag === '引');
  if (h && !h.outcome && hookTile && !B.visited.includes(hookTile.slot)) {
    h.deferred += 1;
    if (h.deferred > 6) {
      void g.hookEnd('open', '顺延太久');
      hookTile.tag = '平';
      hookTile.ttl = 0;
    }
  }
  // 杀伐太重：冤魂渡口
  if ((L.flags.lapKills0 ?? 0) && L.kills - L.flags.lapKills0 >= 400) (L.conseqNext ??= []).push('killer');
  L.flags.lapKills0 = Math.max(1, L.kills);
}

// ================= 落格 =================
function cardOf(t: Tile): Card {
  return { loc: t.loc ?? 'home', tag: t.tag ?? '平', peeked: t.peeked, acq: t.tag === '故' ? t.ref : undefined };
}
function canPeek(g: Game, t: Tile) {
  return t.kind === 'loc' && !!t.loc && !t.peeked && t.tag !== '引' && t.tag !== '故' && !!g.L;
}

async function land(g: Game, t: Tile): Promise<boolean> {
  const L = g.L;
  const fought = { v: false };
  switch (t.kind) {
    case 'start':
      return landStart(g);
    case 'fate':
      await landFate(g, fought);
      break;
    case 'market':
      if (L.inDao && L.marketCd === 0) await g.market();
      else fought.v = await g.goTo({ loc: L.inDao ? 'bazaar' : 'market', tag: '平' });
      break;
    case 'oracle':
      await landOracle(g);
      break;
    case 'hold':
      await landHold(g, t, fought);
      break;
    case 'loc': {
      const c = cardOf(t);
      fought.v = await g.goTo(c);
      if (t.tag === '引' || t.tag === '故') {
        t.tag = '平';
        t.ttl = 0;
      }
      t.peeked = undefined;
      break;
    }
    case 'conseq':
      await landConseq(g, t, fought);
      t.ttl = 0;
      break;
    case 'stray':
      await landStray(g, t, fought);
      t.ttl = 0;
      break;
    case 'dust': {
      const ev = FATE_EVENTS.find((e) => e.id === t.ref);
      if (ev && !L.choicesDone.includes(ev.id) && (!ev.when || ev.when(L, g.M))) await g.runEvent(ev, L.inDao ? 'cross' : 'neighbor', fought, '尘缘');
      else g.log('你又路过那个屋檐。檐下没有人。');
      t.ttl = 0;
      break;
    }
    case 'ruin': {
      const lg = (g.M.legacies ?? []).find((x) => x.id === t.ref);
      const tid = trailOpen(g, { kind: 'ruin', title: lg ? ruinName(lg, ruinForm(g, lg)) : '遗迹', loc: 'realm', text: lg ? `第 ${lg.life} 世留下的${HOLDINGS[lg.type].name}` : undefined, thread: lg ? `legacy:${lg.id}` : undefined, threadName: lg ? `遗泽${lg.name}` : undefined });
      try {
        await landRuin(g, t, fought);
      } finally {
        trailClose(g, tid);
      }
      t.ttl = 0;
      break;
    }
    case 'chain': {
      const ref = t.ref!;
      t.ttl = 0;
      const loc = t.loc ?? (L.inDao ? 'cross' : 'neighbor');
      await chainBeat(g, ref, loc, fought);
      // 签到碑：记住这一格，下一拍还在这里
      const st = g.L.chains?.find((c) => c.id === ref);
      if (st) st.slot = t.slot;
      break;
    }
  }
  return fought.v;
}

async function landStart(g: Game): Promise<boolean> {
  const L = g.L;
  L.hp = L.maxHp;
  if (L.inDao && !L.stall) {
    L.xp += g.need() * 0.05;
    if (g.capped()) L.xp = Math.min(L.xp, g.need());
  }
  g.log(L.inDao ? '你正好在岁首回到洞府，闭关小半年，气血回满。' : '你正好在岁首回到家里，吃了一顿团圆饭。');
  return g.goTo({ loc: L.inDao ? 'cave' : 'home', tag: '平' });
}

// ---------- 本命格 ----------
async function landFate(g: Game, fought: { v: boolean }) {
  const L = g.L;
  const ft = L.fateTile!;
  const def = FATE_TILES[L.fate ?? 'fangu'];
  const fd = FATE_BY_ID[L.fate ?? 'fangu'];
  if (ft.dusty > 0) {
    g.log(`${def.name}落了一层灰。你在里面坐了一会儿，什么也没想起来。（本命格蒙尘，还要 ${ft.dusty} 圈）`);
    return;
  }
  const lv0 = ft.lv;
  ft.lv = Math.min(5, ft.lv + 1);
  const gain = ft.lv > lv0 ? 4 : 2;
  const parts: string[] = [];
  if (fd.paths.length) {
    for (const s of fd.paths) L.school[s] += fd.paths.length > 1 ? gain - 1 : gain;
    parts.push(`${fd.paths.map((s) => SCHOOL_NAMES[s]).join('、')}道途 +${fd.paths.length > 1 ? gain - 1 : gain}`);
  } else if (L.fate === 'daotong') {
    const top = g.topSchool();
    L.school[top] += gain - 1;
    parts.push(`${SCHOOL_NAMES[top]}道途 +${gain - 1}`);
  } else if (L.inDao) {
    L.xp += g.need() * 0.05;
    if (g.capped()) L.xp = Math.min(L.xp, g.need());
    parts.push('修为 +5%');
  } else {
    L.stones += 5;
    parts.push('银两 +5');
  }
  g.log(`回到本命格「${def.name}」（${ft.lv} 级）：${parts.join('，')}。`);
  if (def.extra) await g.apply(def.extra, L.inDao ? 'cave' : 'home', fought);
  const loc = L.inDao ? 'cave' : 'home';
  if (ft.lv >= 3 && !L.flags.fateLv3) {
    L.flags.fateLv3 = 1;
    const e = def.lv3;
    if (e.options) await g.runEvent({ id: `B-${L.fate}-3`, locs: [], kind: 'choice', text: e.text, options: e.options, repeat: true }, loc, fought, `本命 · ${e.title}`);
    else {
      g.log(`【${e.title}】${e.text}`, 'fate');
      if (e.eff) await g.apply(e.eff, loc, fought);
    }
    if (L.fate === 'fangu') L.xpMul = (L.xpMul ?? 1) + 0.04;
    if (L.flags.fullVow && !L.flags.fullVowMul) {
      L.flags.fullVowMul = 1;
      L.xpMul = (L.xpMul ?? 1) * 1.1;
    }
  }
  if (ft.lv >= 5 && !L.flags.fateLv5 && !g.dead()) {
    L.flags.fateLv5 = 1;
    const e = def.lv5;
    g.log(`【${e.title}】${e.text}`, 'fate');
    await g.apply(e.eff, loc, fought);
    if (e.special === 'xpMul') L.xpMul = (L.xpMul ?? 1) * 1.1;
    if (e.special === 'demonBloom') {
      if (L.flags.indulge) {
        L.school.demon += 15;
        if (L.inDao) g.addSkill('ink');
        g.log('魔种开花：魔修道途 +15，得百鬼幡。', 'fate');
      } else {
        L.merit += 20;
        L.flags.heartDown = (L.flags.heartDown ?? 0) + 1;
        g.log('魔种被你磨成了一颗安静的石子：功德 +20，心魔更弱。', 'fate');
      }
    }
    g.highlight(`本命格「${def.name}」修到了顶`, 40, 'fateTile');
  }
  // 修炼与法宝：本命格可闭关练功、温习功法谱
  if (L.inDao && !g.dead()) {
    L.xinde = (L.xinde ?? 0) + 1;
    g.log('坐定片刻，心得 +1。');
    await retreat(g);
  }
}

// ---------- 天机格 ----------
async function landOracle(g: Game) {
  const L = g.L;
  const D = L.dice!;
  const unit = L.inDao ? '灵石' : '银两';
  const items: { label: string; disabled?: boolean; fn: () => void; auto: number }[] = [];
  items.push({ label: '求签｜改命 +1', fn: () => { g.rerolls += 1; g.log(pick(ORACLE_SIGNS), 'fate'); }, auto: 1 });
  // 骰签越请越贵：本世每请一支，价钱加一倍
  const c2 = (L.inDao ? 60 : 30) * (1 + (L.flags.againBought ?? 0));
  items.push({ label: `请一支骰签｜${unit} ${c2}：本世再摇 +2`, disabled: L.stones < c2, fn: () => { L.stones -= c2; L.flags.againBought = (L.flags.againBought ?? 0) + 1; gainAgain(g, 2, '签上只有一个字：再。'); }, auto: (D.again ?? 0) < 2 ? 5 : 2 });
  if (L.inDao && !D.stopFace) items.push({ label: '刻骰面｜灵石 80：一点刻成「止」，六点刻成「遁」', disabled: L.stones < 80, fn: () => { L.stones -= 80; D.stopFace = true; D.dunFace = true; g.log('骰子上多了两个字：止、遁。', 'fate'); }, auto: 3 });
  const lg = g.M.legacies ?? [];
  const cf = L.inDao ? 40 : 20;
  if (lg.length && !L.board!.tiles.some((t) => t.kind === 'ruin' && t.ttl > 0)) items.push({ label: `寻故地｜${unit} ${cf}：下个岁首，前世的产业会出现在路上`, disabled: L.stones < cf, fn: () => { L.stones -= cf; L.board!.forceRuin = true; g.log('卦象指向一处你没去过、却觉得眼熟的地方。', 'fate'); }, auto: 0 });
  let best = 0;
  items.forEach((it, i) => {
    if (!it.disabled && it.auto > items[best].auto) best = i;
  });
  const i = await g.choose({
    title: L.inDao ? '天机格' : '庙会',
    text: L.inDao ? `天机阁的老人在摇签筒。你有灵石 ${L.stones}，本世还能再摇 ${D.again ?? 0} 次。` : `庙会上有人摆摊算命，也卖骰签。你有银两 ${L.stones}，本世还能再摇 ${D.again ?? 0} 次。`,
    options: [...items.map((it) => { const [label, desc] = it.label.split('｜'); return { label, desc, disabled: it.disabled }; }), { label: '离开' }],
    key: 'oracle',
    autoPick: best,
  });
  if (i < items.length) items[i].fn();
  if (!L.inDao) g.fairBonus += 1;
}

// ---------- 产业格 ----------
const costOf = (L: LifeState, type: string, lv: number) => {
  const table = HOLDINGS[type].stage === 'mortal' ? HOLD_COST_MORTAL : HOLD_COST_CULT;
  return table[Math.min(4, lv)];
};

async function landHold(g: Game, t: Tile, fought: { v: boolean }) {
  const L = g.L;
  const h = holdingAt(L, t.slot);
  if (!h) return build(g, t.slot);
  h.idle = 0;
  const def = HOLDINGS[h.type];
  const loc = L.inDao ? 'cave' : 'home';
  if (t.tag === '劫') {
    t.tag = undefined;
    return guardHolding(g, h, fought);
  }
  const unit = L.inDao ? '灵石' : '银两';
  const opts: { label: string; desc?: string; disabled?: boolean }[] = [];
  const up = h.lv < 5 ? costOf(L, h.type, h.lv) : 0;
  opts.push(h.lv < 5 ? { label: `扩建到 ${h.lv + 1} 级`, desc: `${unit} ${up}${h.lv + 1 === 3 ? '；3 级选一条路' : h.lv + 1 === 5 ? `；${def.lv5}` : ''}`, disabled: L.stones < up } : { label: '已到顶', disabled: true });
  const y = holdYield(g, { ...h, idle: 0 });
  opts.push({ label: '照看一圈', desc: `立刻收一份：${yieldLine(L, y)}` });
  opts.push({ label: '变卖', desc: `收回 ${Math.round(h.spent * 0.3)}，格子空出来` });
  opts.push({ label: '离开' });
  const auto = h.lv < 5 && L.stones >= up * 1.2 ? 0 : 1;
  const i = await g.choose({ title: `${def.name} · ${h.name}（${h.lv} 级）`, text: `${def.yieldText}。你有${unit} ${L.stones}。`, options: opts, key: 'hold', autoPick: auto });
  if (i === 0 && h.lv < 5 && L.stones >= up) {
    L.stones -= up;
    h.spent += up;
    h.lv += 1;
    g.log(`${h.name}扩建到 ${h.lv} 级。`);
    await levelUp(g, h, loc, fought);
  } else if (i === 1) {
    await g.apply(y, loc, fought);
    g.log(`你在${h.name}忙了一阵：${yieldLine(L, y)}。`);
  } else if (i === 2) {
    const back = Math.round(h.spent * 0.3);
    L.stones += back;
    L.holdings = L.holdings!.filter((x) => x !== h);
    g.log(`你把${h.name}卖了，收回 ${back}。`);
  }
}

function yieldLine(L: LifeState, y: Effect) {
  const p: string[] = [];
  if (y.stones) p.push(`${L.inDao ? '灵石' : '银两'} +${y.stones}`);
  if (y.merit) p.push(`功德 +${y.merit}`);
  if (y.xpPct) p.push(`修为 +${y.xpPct}%`);
  if (y.life) p.push(`寿元 +${y.life}`);
  return p.join('，') || '暂无收成';
}

async function levelUp(g: Game, h: Holding, loc: string, fought: { v: boolean }) {
  const L = g.L;
  const def = HOLDINGS[h.type];
  if (h.lv === 2 || h.lv === 4) {
    if (h.type === 'wu') L.attrs.gen = Math.min(12, L.attrs.gen + 1);
    if (h.type === 'shu') L.attrs.wu = Math.min(12, L.attrs.wu + 1);
    if (h.type === 'zong') L.favor = Math.min(5, L.favor + 1);
  }
  if (h.type === 'zong' && h.lv >= 3) L.disciples = Math.max(L.disciples, 1);
  if (h.lv === 3 && h.branch === undefined) {
    const auto = def.branches.findIndex((b) => b.eff?.school && Object.keys(b.eff.school).includes(L.schoolCur ?? g.topSchool()));
    const i = await g.choose({ title: `${h.name} · 选一条路`, text: `${h.name}到了三级，往后怎么经营？`, options: def.branches.map((b) => ({ label: b.label, desc: b.desc })), key: 'holdBranch', autoPick: Math.max(0, auto) });
    h.branch = i;
    const b = def.branches[i];
    g.log(`${h.name}走了「${b.label}」的路子。`);
    if (b.eff) await g.apply(b.eff, loc, fought);
  }
  if (h.lv === 5) {
    g.log(`${h.name}到了顶：${def.lv5}`, 'milestone');
    g.highlight(`把${h.name}经营到了顶`, 45, 'holding');
    switch (h.type) {
      case 'tian': L.lifeBonus += 10; break;
      case 'shang': L.stones += 200; break;
      case 'shu': L.insightExtra = (L.insightExtra ?? 0) + 20; break;
      case 'zong': L.favor = Math.min(5, L.favor + 2); break;
      case 'dan': L.lifeBonus += 30; break;
      case 'ling': g.trace('cave_heaven'); break;
      case 'jian': for (const s of L.skills) layerUp(g, s, '剑冢养剑'); break;
      case 'si': L.insightExtra = (L.insightExtra ?? 0) + 50; break;
    }
  }
}

async function guardHolding(g: Game, h: Holding, fought: { v: boolean }) {
  const L = g.L;
  const def = HOLDINGS[h.type];
  const loc = L.inDao ? 'realm' : 'road';
  const pay = (L.inDao ? 15 : 10) * h.lv;
  const lose = () => {
    h.lv -= 1;
    if (h.lv <= 0) {
      L.holdings = L.holdings!.filter((x) => x !== h);
      (L.conseqNext ??= []).push('ruined');
      g.log(`${h.name}没守住，只剩一片瓦砾。`, 'battle');
    } else g.log(`${h.name}被砸了一半，降到 ${h.lv} 级。`, 'battle');
  };
  const opts = [L.inDao ? '迎战｜胜则灵石 +' + 20 * h.lv : '据理力争｜家境判定', `破财消灾｜${L.inDao ? '灵石' : '银两'} -${pay}`, '不理｜产业降一级'];
  const i = await g.ask(`守业 · ${h.name}`, def.guard, opts, 'event', false, 'guard');
  if (i === 0) {
    if (L.inDao) {
      fought.v = true;
      const res = await g.fight({ kind: h.type === 'ling' ? 'beast' : 'duel', title: `守${h.name}`, loc, prep: true });
      if (g.dead()) return;
      if (res?.win) {
        L.stones += 20 * h.lv;
        g.log(`${h.name}守住了。`);
      } else lose();
    } else {
      const ok = chance(Math.max(0.15, Math.min(0.9, 0.5 + (L.attrs.fam - 5) * 0.12)));
      g.log(`（家境判定${ok ? '成功' : '失败'}）`);
      if (ok) g.log('对方理亏，灰溜溜地走了。');
      else lose();
    }
  } else if (i === 1 && L.stones >= pay) {
    L.stones -= pay;
    g.log('你破财消灾。');
  } else lose();
}

async function build(g: Game, slot: number) {
  const L = g.L;
  const stage = stageOf(L);
  const fd = FATE_BY_ID[L.fate ?? 'fangu'];
  const owned = new Set((L.holdings ?? []).map((h) => h.type));
  let types = Object.keys(HOLDINGS).filter((k) => HOLDINGS[k].stage === stage && !owned.has(k) && HOLDINGS[k].can(L));
  const pref = types.filter((k) => HOLDINGS[k].school && fd.paths.includes(HOLDINGS[k].school!));
  types = [...pref, ...shuffle(types.filter((k) => !pref.includes(k)))].slice(0, 3);
  let mul = L.fate === 'fangu' ? 0.8 : 1;
  if (L.flags.rebuildHalf) mul *= 0.5;
  const unit = L.inDao ? '灵石' : '银两';
  const opts: { label: string; desc?: string; disabled?: boolean }[] = [];
  const acts: (() => Promise<void>)[] = [];
  for (const k of types) {
    const d = HOLDINGS[k];
    const cost = Math.round(costOf(L, k, 0) * mul);
    opts.push({ label: `置办${d.name}`, desc: `${unit} ${cost}；${d.yieldText}`, disabled: L.stones < cost });
    acts.push(async () => {
      L.stones -= cost;
      const name = pick(d.names);
      const trail = trailMark(g, { kind: 'hold', title: `置办${d.name}「${name}」`, loc: L.inDao ? 'sect' : 'home' });
      L.holdings!.push({ slot, type: k, lv: 1, idle: 0, spent: cost, name, trail });
      delete L.flags.rebuildHalf;
      g.log(`你置办了${d.name}「${name}」。`, 'milestone');
    });
  }
  // 重振：本世通关过秘库的前世产业
  for (const id of L.ruinCleared ?? []) {
    const lg = (g.M.legacies ?? []).find((x) => x.id === id);
    if (!lg || owned.has(lg.type)) continue;
    if (HOLDINGS[lg.type].stage === 'cult' && !L.inDao) continue;
    const cost = Math.round(costOf(L, lg.type, 1) * 0.5 * mul);
    opts.push({ label: `重振${lg.name}`, desc: `${unit} ${cost}；直接从 2 级起步`, disabled: L.stones < cost });
    acts.push(async () => {
      L.stones -= cost;
      const trail = trailMark(g, { kind: 'hold', title: `重振${lg.name}`, thread: `legacy:${lg.id}`, threadName: `遗泽${lg.name}` });
      L.holdings!.push({ slot, type: lg.type, lv: 2, branch: lg.branch, idle: 0, spent: cost, name: lg.name, trail });
      g.M.legacies = (g.M.legacies ?? []).filter((x) => x !== lg);
      L.ruinCleared = L.ruinCleared!.filter((x) => x !== id);
      g.log(RUIN_REVIVE.replace('{名}', lg.name), 'milestone');
      g.highlight(`重振前世的${lg.name}`, 55, 'revive');
    });
  }
  if (!opts.length) {
    g.log('这块地空着，眼下没有合适的营生。');
    return;
  }
  let auto = opts.length;
  opts.forEach((o, i) => {
    if (auto === opts.length && !o.disabled) auto = i;
  });
  const i = await g.choose({ title: '产业格 · 空地', text: `这块地空着。置下产业，往后每个岁首都有收成；常来照看，收成更好。你有${unit} ${L.stones}。`, options: [...opts, { label: '离开' }], key: 'build', autoPick: auto });
  if (i < acts.length && !opts[i].disabled) await acts[i]();
}

// ---------- 后果格 ----------
async function landConseq(g: Game, t: Tile, fought: { v: boolean }) {
  const L = g.L;
  const def = CONSEQ[t.ref!];
  if (!def) return;
  const loc = L.inDao ? 'cave' : 'home';
  const src = L.trail?.cqSrc[t.ref!];
  if (def.battle) {
    if (!L.inDao) {
      g.log('村外的林子里有东西转了一圈，又走了。');
      return;
    }
    g.log(def.text, 'battle');
    fought.v = true;
    trailHint(g, src, '旧事');
    await g.fight({ kind: 'beast', title: def.name, loc: 'forest', prep: true, reward: 1.3 });
    return;
  }
  const ev: LifeEvent = { id: `Q-${t.ref}`, locs: [], kind: 'choice', text: def.text, options: def.options, repeat: true };
  trailHint(g, src, '旧事');
  await g.runEvent(ev, loc, fought, def.name);
  if (L.flags.allUpOne) {
    delete L.flags.allUpOne;
    g.upgradeRandomSkill('镇住了法宝');
  }
}

// ---------- 歧路格 ----------
async function landStray(g: Game, t: Tile, fought: { v: boolean }) {
  const L = g.L;
  const def = STRAYS[t.ref!];
  if (!def) return;
  L.flags['stray_' + t.ref] = (L.flags['stray_' + t.ref] ?? 0) + 1;
  const fd = FATE_BY_ID[L.fate ?? 'fangu'];
  const opts: Option[] = [];
  if (def.school) {
    const names = Object.keys(def.school).map((s) => SCHOOL_NAMES[s as School]).join('、');
    opts.push({ label: '入门习艺', desc: `${names}道途 +8，修为 +5%；本命格蒙尘三圈`, eff: { school: def.school, xpPct: 5, flag: 'strayJoin', text: '你在那里学了一阵，进境确实快。' } });
  }
  const own = fd.paths[0] ?? g.topSchool();
  opts.push({ label: '婉拒', desc: `守本心：${SCHOOL_NAMES[own]}道途 +2`, eff: { school: { [own]: 2 }, text: '你谢过对方，回去了。' } });
  opts.push(def.third);
  await g.runEvent({ id: `S-${t.ref}`, locs: [], kind: 'choice', text: def.text, options: opts, repeat: true }, L.inDao ? 'roam' : 'road', fought, `歧路 · ${def.name}`);
  const ft = L.fateTile!;
  if (L.flags.strayJoin) {
    delete L.flags.strayJoin;
    ft.dusty = Math.max(ft.dusty, 3);
  }
  if (L.flags.dustyFate) {
    delete L.flags.dustyFate;
    ft.dusty = Math.max(ft.dusty, 2);
  }
}

// 尘缘格：佛子、道童的阿蘅一线到了下一步
function readyLove(g: Game): LifeEvent | undefined {
  const L = g.L;
  if (L.fate !== 'fozi' && L.fate !== 'daotong') return undefined;
  return FATE_EVENTS.find((e) => e.id.startsWith(`V-${L.fate}-`) && !L.choicesDone.includes(e.id) && (!e.when || e.when(L, g.M)));
}

// ================= 遗泽：前世产业的遗迹 =================
export function ruinForm(g: Game, lg: Legacy): number {
  const d = Math.abs(eraIndex(g.L.era ?? 'E1') - eraIndex(lg.era));
  return d === 0 ? 0 : d <= 2 ? 1 : 2;
}
export function ruinName(lg: Legacy, form: number) {
  return RUINS[lg.type].forms[form].replace('{名}', lg.name);
}

function scaleEff(e: Effect, k: number): Effect {
  const r = (v?: number) => (v ? Math.max(1, Math.round(v * k)) : undefined);
  return { stones: r(e.stones), merit: r(e.merit), xpPct: e.xpPct ? Math.round(e.xpPct * k * 10) / 10 : undefined, life: r(e.life), hpMax: r(e.hpMax) };
}

async function landRuin(g: Game, t: Tile, fought: { v: boolean }) {
  const L = g.L;
  const M = g.M;
  const lg = (M.legacies ?? []).find((x) => x.id === t.ref);
  if (!lg) return;
  const def = RUINS[lg.type];
  const form = ruinForm(g, lg);
  const name = ruinName(lg, form);
  const visits = ((L.ruinVisits ??= {})[lg.id] ?? 0) + 1;
  L.ruinVisits[lg.id] = visits;
  const deplete = Math.max(0.4, Math.pow(0.8, visits - 1)) * (lg.keep ? 1.3 : 1);
  const priv = lg.lv - 2; // 旧主特权 1～3 重
  const coef = RUIN_REALM_COEF[L.realm] ?? 1;
  const intro = `${RUIN_FORM_NAMES[form]} · ${name}。${pick(RUIN_GREET[form])}\n\n这是你第${lg.life}世置下的${HOLDINGS[lg.type].name}（${lg.lv} 级）。旧主特权 ${priv} 重：判定更容易，收获更多。${visits > 1 ? `\n本世第 ${visits} 次进来，能拿的少了些。` : ''}${lg.keep ? '\n上一世你把秘藏留给了后人，这里的东西攒得更多。' : ''}`;
  const go = await g.choose({ title: `遗泽 · ${name}`, text: intro, options: [{ label: '进去看看', desc: `${RUIN_LAYERS[0]}：${def.check.title}` }, { label: '改日再来' }], key: 'ruin', autoPick: L.hp >= L.maxHp * 0.5 ? 0 : 1 });
  if (go !== 0) return;
  g.trace('legacy_ruin');
  const loc = 'realm';
  for (let layer = 0; layer < 3; layer++) {
    let ok: boolean;
    if (L.inDao && def.check.battle && layer === 2) {
      fought.v = true;
      const res = await g.fight({ kind: lg.type === 'zong' || lg.type === 'jian' ? 'duel' : 'beast', title: `${RUIN_LAYERS[layer]} · ${def.check.title}`, loc, elites: layer, prep: true });
      if (g.dead()) return;
      if (!res) {
        g.log('你退了出来。');
        return;
      }
      ok = res.win;
    } else {
      const v = L.attrs[def.check.attr] + priv;
      const dc = 5 + layer + form;
      ok = chance(Math.max(0.15, Math.min(0.95, 0.5 + (v - dc) * 0.12)));
      g.log(`（${RUIN_LAYERS[layer]} · ${def.check.title}：${ok ? '过了' : '没过'}）`);
    }
    const k = RUIN_LAYER_W[layer] * RUIN_FORM_MULT[form] * coef * deplete * (1 + 0.1 * (priv - 1)) * (ok ? 1 : 0.5);
    const gain = scaleEff(def.base, k);
    await g.apply(gain, loc, fought);
    g.log(`${RUIN_LAYERS[layer]}所得：${yieldLine(L, gain) || '一点旧物'}${gain.hpMax ? `，气血上限 +${gain.hpMax}` : ''}。`);
    if (!ok) {
      L.hp = Math.max(1, L.hp - L.maxHp * 0.15);
      g.log(pick(RUIN_FAIL));
      return;
    }
    if (layer === 2) {
      if (!L.ruinCleared!.includes(lg.id)) L.ruinCleared!.push(lg.id);
      if (!L.ruinVault!.includes(lg.id)) {
        const i = await g.choose({ title: `秘库 · ${def.vault.name}`, text: `秘库的门开了。${def.vault.name}还在原处。\n取走它，这一世就是你的；留着，下一世再来时这里会攒下更多。`, options: [{ label: '取走', desc: def.vault.name }, { label: '留给后人', desc: '下次进来收获 ×1.3' }], key: 'vault', autoPick: 0 });
        if (i === 0) {
          L.ruinVault!.push(lg.id);
          lg.keep = false;
          await g.apply(def.vault.eff, loc, fought);
          if (def.vault.special === 'treasure') {
            const miss = (['sword', 'orbit', 'thunder', 'fire', 'frost'] as const).filter((s) => !L.skills.some((x) => x.id === s));
            if (L.inDao && miss.length) g.addSkill(pick([...miss]));
            else g.upgradeRandomSkill('镇山之宝');
          }
          if (def.vault.special === 'upgrade') g.upgradeRandomSkill('前世本命剑');
          g.highlight(`在${name}取回前世的${def.vault.name}`, 50, 'ruin');
        } else {
          lg.keep = true;
          g.log('你把门重新关上了。');
        }
      }
      if (!(L.holdings ?? []).some((h) => h.type === lg.type)) g.log('秘库走通了。往后在空着的产业格，你可以把它重振起来。');
      return;
    }
    const more = await g.choose({ title: `遗泽 · ${name}`, text: `${RUIN_LAYERS[layer]}走完了。再往里是${RUIN_LAYERS[layer + 1]}（收获 ×${RUIN_LAYER_W[layer + 1]}），也更难。`, options: [{ label: '继续深入', desc: def.check.title }, { label: '见好就收' }], key: 'ruinDeeper', autoPick: L.hp >= L.maxHp * 0.6 ? 0 : 1 });
    if (more !== 0) return;
  }
}

// 死后：三级以上的产业留作遗泽
export function recordLegacies(g: Game) {
  const L = g.L;
  const M = g.M;
  const list = (M.legacies ??= []);
  for (const h of L.holdings ?? []) {
    if (h.lv < 3) continue;
    list.push({ id: `${L.lifeNo}-${h.type}`, type: h.type, lv: h.lv, branch: h.branch, era: L.era ?? 'E1', name: h.name, life: L.lifeNo });
    trailRef(g, `legacy:${L.lifeNo}-${h.type}`, h.trail ?? trailHere(g));
    L.insightExtra = (L.insightExtra ?? 0) + h.lv * 10;
    g.log(`${h.name}（${h.lv} 级）留在了这一卷画里。`, 'fate');
  }
  M.legacies = list.sort((a, b) => b.lv - a.lv || b.life - a.life).slice(0, 6);
}

// ================= 格子外观 =================
function tileFace(g: Game, t: Tile): { name: string; icon: string; hint: string } {
  const L = g.L;
  switch (t.kind) {
    case 'start':
      return { name: '岁首', icon: '岁', hint: L.inDao ? '正好走到：闭关回血' : '正好走到：团圆、回血' };
    case 'fate': {
      const d = FATE_TILES[L.fate ?? 'fangu'];
      return { name: d.name, icon: d.icon, hint: L.fateTile!.dusty ? `蒙尘 ${L.fateTile!.dusty} 圈` : '本命道途 +4' };
    }
    case 'market':
      return L.inDao ? { name: '坊市', icon: '坊', hint: L.marketCd ? '交易与见闻' : '坊市开张' } : { name: '市集', icon: '市', hint: '赌坊与市井' };
    case 'oracle':
      return L.inDao ? { name: '天机', icon: '卦', hint: '求签、添骰' } : { name: '庙会', icon: '庙', hint: '求签、买骰' };
    case 'hold': {
      const h = holdingAt(L, t.slot);
      if (!h) return { name: '空地', icon: '地', hint: '可置产业' };
      return { name: h.name, icon: HOLDINGS[h.type].icon, hint: t.tag === '劫' ? '有人上门' : `${HOLDINGS[h.type].name} ${h.lv} 级${h.idle >= 3 ? '·荒' : ''}` };
    }
    case 'conseq': {
      const d = CONSEQ[t.ref!];
      return { name: d.name, icon: d.icon, hint: '旧事找上门' };
    }
    case 'stray': {
      const d = STRAYS[t.ref!];
      return { name: d.name, icon: d.icon, hint: '歧路：别家来招' };
    }
    case 'dust':
      return { name: '尘缘', icon: '缘', hint: '阿蘅' };
    case 'ruin': {
      const lg = (g.M.legacies ?? []).find((x) => x.id === t.ref);
      if (!lg) return { name: '荒地', icon: '荒', hint: '' };
      const form = ruinForm(g, lg);
      return { name: ruinName(lg, form), icon: '遗', hint: `前世${HOLDINGS[lg.type].name}·${RUIN_FORM_NAMES[form]}` };
    }
    case 'chain':
      return chainTileFace(g, t.ref!, t.loc);
    case 'loc': {
      if (!t.loc) return { name: '荒路', icon: '·', hint: '' };
      const c = cardOf(t);
      return g.cardFace(c);
    }
  }
}

function tileView(g: Game, t: Tile): TileView {
  const L = g.L;
  const f = tileFace(g, t);
  const lv = t.kind === 'fate' ? L.fateTile!.lv : t.kind === 'hold' ? holdingAt(L, t.slot)?.lv : undefined;
  let peek: string | undefined;
  if (t.kind === 'loc' && t.peeked) peek = g.peekLabel(cardOf(t));
  return {
    slot: t.slot,
    kind: t.kind,
    name: f.name,
    icon: f.icon,
    tag: t.tag,
    hint: f.hint,
    ttl: t.ttl,
    lv,
    month: tileMonth(t.slot, L.board!.tiles.length),
    peek,
    visited: L.board!.visited.includes(t.slot),
    loc: t.loc,
    canPeek: canPeek(g, t),
  };
}

// 画面用的地点
export function tileSceneLoc(v: TileView, stage: 'mortal' | 'cult'): string {
  if (v.loc) return v.loc;
  const c = stage === 'cult';
  return { start: c ? 'cave' : 'home', fate: c ? 'cave' : 'home', market: c ? 'bazaar' : 'market', oracle: c ? 'cross' : 'fair', hold: c ? 'sect' : 'home', conseq: c ? 'cave' : 'home', stray: c ? 'roam' : 'road', dust: c ? 'cross' : 'neighbor', ruin: 'realm', chain: c ? 'karma' : 'neighbor', loc: 'home' }[v.kind];
}

// ================= 自动驾驶（界面「自动」与模拟脚本共用） =================
const TAG_SCORE: Record<Tendency, Record<string, number>> = {
  safe: { 平: 1.5, 缘: 1.5, 劫: -3, 凶: -5, 引: 3, 故: 3 },
  chance: { 平: 1, 缘: 3, 劫: -1, 凶: -3, 引: 3.5, 故: 3.5 },
  war: { 平: 0.5, 缘: 1.5, 劫: 3, 凶: -2, 引: 2.5, 故: 2.5 },
};
export function tileScore(v: RollView, slot: number, tend: Tendency, L: LifeState): number {
  if (slot >= v.size) return 0.3;
  if (slot === v.pos) return L.hp < L.maxHp * 0.35 ? 2 : 0.2; // 止
  const t = v.tiles[slot];
  const low = L.hp < L.maxHp * 0.35;
  switch (t.kind) {
    case 'start': return low ? 2.5 : 1;
    case 'fate': return t.hint.startsWith('蒙尘') ? 0 : 2;
    case 'market': return 0.8;
    case 'oracle': return L.dice && (L.dice.again ?? 0) < 2 ? 1.8 : 1;
    case 'hold': return t.tag === '劫' ? (tend === 'war' ? 1 : -1) : t.lv === 5 ? 0.4 : t.lv ? 1.2 : L.stones >= 40 ? 1.4 : 0.3;
    case 'conseq': return 1;
    case 'stray': return -0.5;
    case 'dust': return 1.5;
    case 'ruin': return low ? -1 : tend === 'safe' ? 1.5 : 2.5;
    case 'chain': return 3.5;
    case 'loc': {
      let s = TAG_SCORE[tend][t.tag ?? '平'] ?? 0;
      if (low && t.tag === '劫') s -= 4;
      if (t.peek === '平淡无事') s -= 0.8;
      return s;
    }
  }
  return 0;
}
export function autoDie(v: RollView, tend: Tendency, L: LifeState, rnd: () => number): number {
  let best = 0;
  let bs = -99;
  v.targets.forEach((slot, i) => {
    const s = tileScore(v, slot, tend, L) + rnd() * 0.1;
    if (s > bs) {
      bs = s;
      best = i;
    }
  });
  return best;
}
// 自动模式要不要再摇：落点太差、还有次数时摇
export function autoAgain(v: RollView, tend: Tendency, L: LifeState): boolean {
  if (v.again <= 0) return false;
  const s = tileScore(v, v.targets[0], tend, L);
  return s < 0 || (v.again >= 3 && s < 0.5);
}
// 自动模式要不要让龙驹拨点数：±1 的落点明显更好时拨
export function autoNudge(v: RollView, tend: Tendency, L: LifeState): 0 | 1 | -1 {
  if (!v.nudge) return 0;
  const d = v.dice[0];
  const at = (x: number) => (x < 1 || x > 6 ? -99 : tileScore(v, Math.min(v.size, v.pos + x), tend, L));
  const base = tileScore(v, v.targets[0], tend, L);
  const up = at(d + 1);
  const down = at(d - 1);
  if (Math.max(up, down) < base + 1) return 0;
  return up >= down ? 1 : -1;
}
