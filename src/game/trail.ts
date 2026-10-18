// 经历图谱：把这一世经历过的事记成节点，并自动连上因果。
// 只记真正发生过的事；没触发的不进图谱。死后保留上一世的，供复盘。
//
// 连线有五种来历：
//   承  同一条线索的前后两拍（因果链、引子、伙伴、故人）
//   因  这件事出现或可选，是因为前面某件事留下的世内标记
//   引发 一件事当场引出的另一件事（抉择里打起来的仗、了结时的收获）
//   余波 几圈之后兑现的余波
//   旧事 某圈做过的事，在下个岁首长成的后果格
//   前世 跨世的牵连：故人、遗泽、伙伴、前世遗憾、宿敌、家族、签到碑
//
// 跨世连线靠轮回数据里的 trailRefs：某件事会在后世回来时，先把「它在第几世的哪个节点」记下，
// 后世开节点时按同一个键连回去。最近 8 世的图谱留在轮回数据里，供「轮回」长卷复盘。
import type { Game } from './engine';
import type { LifeState, MetaState, TrailKind, TrailLink, TrailNode, TrailState } from './types';
import type { LifeEvent } from '../data/events';
import { LOC_BY_ID } from '../data/events';
import { ATTR_NAMES, AttrKey, REALMS } from '../data/core';

const MAX_NODES = 400;
const MAX_PAST = 8;
// 这些线索跨世延续：同一个键在后世再出现，就连回前世那一拍
export const CROSS_THREAD = /^(bond|acq|legacy):/;
const MAX_LINES = 6;

// 这些世内标记只是记账，不算「因」
const BOOKKEEPING = /^(lifeGot|lapKills0|hpMax|pend|againPending|newLampShown|fortuneYear|wardUsed|allUpOne|strayJoin|dustyFate|stray_)/;

interface Snap {
  stones: number;
  merit: number;
  xp: number;
  need: number;
  realm: number;
  injuries: number;
  life: number;
  attrs: Record<AttrKey, number>;
  flags: Record<string, number>;
  cq: number;
  gains: string[];
  skills: string[];
  pet: string | null;
  partner: boolean;
  disciples: number;
  kills: number;
}

interface Open {
  id: number;
  snap: Snap;
}

const stacks = new WeakMap<Game, Open[]>();
const pending = new WeakMap<Game, TrailLink[]>();
const stackOf = (g: Game) => {
  let s = stacks.get(g);
  if (!s) stacks.set(g, (s = []));
  return s;
};

export function trailOf(L: LifeState): TrailState {
  return (L.trail ??= { nodes: [], flagSrc: {}, cqSrc: {}, last: {} });
}

function snap(g: Game): Snap {
  const L = g.L;
  return {
    stones: L.stones,
    merit: L.merit,
    xp: L.xp,
    need: Math.max(1, g.need()),
    realm: L.realm,
    injuries: L.injuries,
    life: L.lifeBonus,
    attrs: { ...L.attrs },
    flags: { ...L.flags },
    cq: (L.conseqNext ?? []).length,
    gains: (L.gains ?? []).map((x) => x.name),
    skills: L.skills.map((s) => s.id),
    pet: L.pet?.name ?? null,
    partner: L.partner,
    disciples: L.disciples,
    kills: L.kills,
  };
}

function addLink(n: TrailNode, from: number | undefined, why: TrailLink['why'], life?: number) {
  if (from == null) return;
  if (life != null) {
    if (!n.links.some((l) => l.from === from && l.life === life)) n.links.push({ from, why, life });
    return;
  }
  if (from === n.id || from > n.id) return;
  if (n.links.some((l) => l.from === from && l.life == null)) return;
  n.links.push({ from, why });
}

// 最近的节点（当前打开的，没有就是最后一个）
export function trailHere(g: Game): number | undefined {
  return trailTop(g) ?? g.L?.trail?.nodes[g.L.trail.nodes.length - 1]?.id;
}

// 记下「这件事会在后世回来」：键 → 本世的某个节点
export function trailRef(g: Game, key: string, id = trailHere(g)) {
  if (id == null || !g.L) return;
  (g.M.trailRefs ??= {})[key] = { life: g.L.lifeNo, id };
}

export interface OpenInfo {
  kind: TrailKind;
  title: string;
  loc?: string;
  text?: string;
  thread?: string; // 线索 id：链 id、hook:Y08、bond:fox、acq:<id>
  threadName?: string;
  beat?: string;
  ev?: LifeEvent; // 用来找「因」：重放它的出现条件，看读了哪些标记
  flags?: string[]; // 直接写明会读的标记（因果链的拍）
  past?: string[]; // 连回前世的键（trailRefs）
}

// 开一个节点；返回 id，结束时交给 trailClose
export function trailOpen(g: Game, info: OpenInfo): number {
  const L = g.L;
  const T = trailOf(L);
  const st = stackOf(g);
  const n: TrailNode = {
    id: T.nodes.length ? T.nodes[T.nodes.length - 1].id + 1 : 1,
    age: L.age,
    kind: info.kind,
    title: info.title,
    loc: info.loc,
    text: info.text ? clip(info.text, 160) : undefined,
    thread: info.thread,
    threadName: info.threadName,
    beat: info.beat,
    lines: [],
    chips: [],
    links: [],
  };
  if (st.length) addLink(n, st[st.length - 1].id, '引发');
  if (info.thread) addLink(n, T.last[info.thread], '承');
  // 跨世：同一条线索这一世头一回出现，连回前世最后一拍；以及写明的前世牵连
  const refs = g.M.trailRefs ?? {};
  const past = [...(info.past ?? []), ...(info.thread && CROSS_THREAD.test(info.thread) && T.last[info.thread] == null ? [info.thread] : [])];
  for (const k of past) {
    const r = refs[k];
    if (r && r.life !== L.lifeNo) addLink(n, r.id, '前世', r.life);
  }
  for (const l of pending.get(g) ?? []) addLink(n, l.from, l.why, l.life);
  pending.delete(g);
  if (info.ev) for (const k of flagsRead(g, info.ev)) addLink(n, T.flagSrc[k], '因');
  for (const k of info.flags ?? []) if (k in L.flags) addLink(n, T.flagSrc[k], '因');
  // 渡劫之后的突破，连到那一场天劫
  const prev = T.nodes[T.nodes.length - 1];
  if (info.kind === 'realm' && info.title.startsWith('突破') && prev?.kind === 'battle' && prev.age === L.age) addLink(n, prev.id, '引发');
  if (info.thread) T.last[info.thread] = n.id;
  T.nodes.push(n);
  if (T.nodes.length > MAX_NODES) {
    // 太长时先丢没有连线的流水
    const i = T.nodes.findIndex((x) => x.kind === 'flavor' && !x.links.length && !T.nodes.some((y) => y.links.some((l) => l.from === x.id)));
    T.nodes.splice(i >= 0 ? i : 0, 1);
  }
  st.push({ id: n.id, snap: snap(g) });
  return n.id;
}

export function trailClose(g: Game, id: number, extra: string[] = []) {
  const st = stackOf(g);
  const i = st.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [{ snap: s0 }] = st.splice(i, st.length - i);
  const parent = st[st.length - 1];
  const L = g.L;
  const T = trailOf(L);
  const n = T.nodes.find((x) => x.id === id);
  if (!n) return;
  const s1 = snap(g);
  n.chips.push(...extra, ...diffChips(s0, s1));
  // 外层节点不再重复记这一段的得失
  if (parent) absorb(parent.snap, s0, s1);
  // 这件事留下的标记、后果，记在它名下
  for (const [k, v] of Object.entries(L.flags)) if (!BOOKKEEPING.test(k) && (s0.flags[k] ?? -1) !== v && !((T.flagSrc[k] ?? 0) > id)) T.flagSrc[k] = id;
  const cq = L.conseqNext ?? [];
  for (const tag of cq.slice(s0.cq)) if (!((T.cqSrc[tag] ?? 0) > id)) T.cqSrc[tag] = id;
}

// 当场记一个不需要开合的节点（入道、突破、死亡、断链……）
export function trailMark(g: Game, info: OpenInfo & { chips?: string[]; from?: number; why?: TrailLink['why'] }) {
  const id = trailOpen(g, info);
  const n = trailOf(g.L).nodes.find((x) => x.id === id);
  if (n && info.from) addLink(n, info.from, info.why ?? '引发');
  trailClose(g, id, info.chips ?? []);
  return id;
}

// 下一个打开的节点要连到 from（后果格、余波用）
export function trailHint(g: Game, from: number | undefined, why: TrailLink['why'], life?: number) {
  if (from == null) return;
  const arr = pending.get(g) ?? [];
  arr.push({ from, why, life });
  pending.set(g, arr);
}

// 当前节点（最里层）
export const trailTop = (g: Game): number | undefined => {
  const st = stackOf(g);
  return st.length ? st[st.length - 1].id : undefined;
};

// 把当前节点归进一条线索（开链的那一次抉择，事前不知道它会开链）
export function trailThread(g: Game, thread: string, threadName: string) {
  const id = trailTop(g);
  if (id == null) return;
  const T = trailOf(g.L);
  const n = T.nodes.find((x) => x.id === id);
  if (!n || n.thread) return;
  n.thread = thread;
  n.threadName = threadName;
  n.beat = n.beat ?? '起';
  T.last[thread] = id;
}

// 新的一世：清掉还没合上的节点
export function trailReset(g: Game) {
  stacks.set(g, []);
  pending.delete(g);
}

// 记下这件事里你选了什么
export function trailPick(g: Game, label: string) {
  const id = trailTop(g);
  const n = id != null ? g.L.trail?.nodes.find((x) => x.id === id) : undefined;
  if (n && !n.pick && label) n.pick = label;
}

// 当前节点追加一条结果（了结档位、断链……）
export function trailChip(g: Game, chip: string) {
  const id = trailTop(g);
  const n = id != null ? trailOf(g.L).nodes.find((x) => x.id === id) : undefined;
  if (n && !n.chips.includes(chip)) n.chips.push(chip);
}

// 日志写进当前节点（结果文字）
export function trailLine(g: Game, text: string) {
  const id = trailTop(g);
  if (id == null || !g.L?.trail) return;
  const n = g.L.trail.nodes.find((x) => x.id === id);
  if (!n || n.lines.length >= MAX_LINES) return;
  const t = clip(text, 120);
  if (/^(心得|出力)/.test(t) || /你选择了?「/.test(t)) return;
  if (!t || n.lines.includes(t)) return;
  // 事件原文和「你选择了」那一句已经记过了
  if (n.text && t.startsWith(n.text.slice(0, 12))) return;
  n.lines.push(t);
}

// 死后：这一世的图谱存进轮回数据（最近 8 世），跨世线索的最后一拍记进 trailRefs
export function trailArchive(M: MetaState, L: LifeState) {
  trailMigrate(M);
  if (!L.trail?.nodes.length) return;
  const nodes = L.trail.nodes;
  const last = nodes[nodes.length - 1];
  const refs = (M.trailRefs ??= {});
  for (const [k, id] of Object.entries(L.trail.last)) if (CROSS_THREAD.test(k)) refs[k] = { life: L.lifeNo, id };
  const past = (M.pastTrails ??= []).filter((x) => x.life !== L.lifeNo);
  past.unshift({ life: L.lifeNo, era: L.era, age: L.age, end: last?.kind === 'death' ? last.title : undefined, nodes });
  M.pastTrails = past.slice(0, MAX_PAST);
  // 已经不在册的前世，牵连也不必再记
  const keep = new Set(M.pastTrails.map((x) => x.life));
  for (const [k, r] of Object.entries(refs)) if (!keep.has(r.life) && r.life !== L.lifeNo) delete refs[k];
}

// 旧存档只有上一世的 lastTrail
export function trailMigrate(M: MetaState) {
  if (!M.lastTrail) return;
  const lt = M.lastTrail;
  delete M.lastTrail;
  if (!(M.pastTrails ??= []).some((x) => x.life === lt.life)) M.pastTrails.push({ life: lt.life, era: lt.era, nodes: lt.nodes });
}

// 重放事件的出现条件和选项条件，记下读到了哪些已有的标记
function flagsRead(g: Game, ev: LifeEvent): string[] {
  const L = g.L;
  const real = L.flags;
  const read = new Set<string>();
  const spy = new Proxy(real, {
    has(t, k) {
      if (typeof k === 'string' && k in t) read.add(k);
      return Reflect.has(t, k);
    },
    get(t, k) {
      if (typeof k === 'string' && k in t) read.add(k);
      return Reflect.get(t, k);
    },
  });
  L.flags = spy;
  try {
    ev.when?.(L, g.M);
    for (const o of ev.options ?? []) o.when?.(L, g.M);
  } catch {
    // 条件函数出错就不找「因」了
  } finally {
    L.flags = real;
  }
  return [...read].filter((k) => !BOOKKEEPING.test(k));
}

function absorb(p: Snap, a: Snap, b: Snap) {
  p.stones += b.stones - a.stones;
  p.merit += b.merit - a.merit;
  if (b.realm === a.realm && p.realm === a.realm) p.xp += b.xp - a.xp;
  p.injuries += b.injuries - a.injuries;
  p.life += b.life - a.life;
  p.kills += b.kills - a.kills;
  for (const k of Object.keys(p.attrs) as AttrKey[]) p.attrs[k] += b.attrs[k] - a.attrs[k];
  for (const x of b.gains) if (!a.gains.includes(x) && !p.gains.includes(x)) p.gains.push(x);
  for (const x of b.skills) if (!a.skills.includes(x) && !p.skills.includes(x)) p.skills.push(x);
  if (b.pet !== a.pet) p.pet = b.pet;
  if (b.partner !== a.partner) p.partner = b.partner;
  p.disciples += b.disciples - a.disciples;
  p.realm = Math.max(p.realm, b.realm);
}

function clip(s: string, n: number) {
  const t = s.replace(/\s+/g, '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function diffChips(a: Snap, b: Snap): string[] {
  const out: string[] = [];
  const num = (name: string, d: number) => {
    if (d) out.push(`${name} ${d > 0 ? '+' : ''}${d}`);
  };
  if (b.realm > a.realm) out.push(`入${REALMS[b.realm].name}`);
  for (const k of Object.keys(a.attrs) as AttrKey[]) num(ATTR_NAMES[k], b.attrs[k] - a.attrs[k]);
  num('灵石', Math.round(b.stones - a.stones));
  num('功德', Math.round(b.merit - a.merit));
  if (b.realm === a.realm && b.xp > a.xp) {
    const p = Math.round(((b.xp - a.xp) / a.need) * 100);
    if (p > 0) out.push(`修为 +${p}%`);
  }
  num('寿元', b.life - a.life);
  if (b.injuries > a.injuries) out.push(`伤 +${b.injuries - a.injuries}`);
  if (b.kills - a.kills >= 10) out.push(`斩妖 ${b.kills - a.kills}`);
  if (b.pet && b.pet !== a.pet) out.push(`灵宠 ${b.pet}`);
  if (b.partner && !a.partner) out.push('结为道侣');
  if (b.disciples > a.disciples) out.push('收徒');
  for (const x of b.gains) if (!a.gains.includes(x)) out.push(`得 ${x}`);
  for (const x of b.skills) if (!a.skills.includes(x)) out.push('新功法');
  return out.slice(0, 8);
}

export const TRAIL_KIND_NAMES: Record<TrailKind, string> = {
  birth: '出生',
  choice: '抉择',
  flavor: '流水',
  chain: '因果链',
  hook: '引子',
  acq: '故人',
  bond: '伙伴',
  battle: '劫难',
  realm: '境界',
  echo: '余波',
  wish: '心愿',
  ruin: '遗迹',
  death: '终局',
  hold: '产业',
};

export const locName = (loc?: string) => (loc ? LOC_BY_ID[loc]?.name ?? '' : '');
