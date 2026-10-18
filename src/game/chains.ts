// 因果链与新收获（系统设计案附录「事件关联与因果链」、内容库「事件库扩充」）
// 一条链四拍：起拍是一条普通抉择，选了开链的选项才开；之后每隔 2～4 圈刷一个「缘」格，
// 停上去走下一拍；「缘」格出现了没去算错过一次，错过两次断链。结拍按缘分分上中下三档。
import type { Game } from './engine';
import type { ChainOp, ChainState, Effect, Gain, LifeState, Option, PetKind } from './types';
import type { LifeEvent } from '../data/events';
import { LOC_BY_ID } from '../data/events';
import { ChainBeat, ChainDef, ChainEnding, ChainOption, PET_NAMES, PET_NOFIGHT, needOk } from '../data/chain-types';
import { CHAINS_A } from '../data/chains-a';
import { CHAINS_B } from '../data/chains-b';
import { CHAINS_C } from '../data/chains-c';
import { ENC_MORTAL } from '../data/encounters-mortal';
import { ENC_CULT_A } from '../data/encounters-cult-a';
import { ENC_CULT_B } from '../data/encounters-cult-b';
import { chance, pick, randInt } from './rng';
import { trailChip, trailClose, trailHere, trailHint, trailMark, trailOpen, trailRef, trailThread, trailTop } from './trail';

export const CHAINS: ChainDef[] = [...CHAINS_A, ...CHAINS_B, ...CHAINS_C];
export const CHAIN_BY_ID: Record<string, ChainDef> = Object.fromEntries(CHAINS.map((c) => [c.id, c]));
export const BEAT_LABELS = ['起', '承', '转', '结'];
export const MAX_CHAINS = 3; // 同时进行的链（不含引子、阿蘅）
export const MAX_ALLIES = 2; // 不必请援、自己跟着参战的伙伴（灵宠、鬼伴、化身……）

// 链内效果没写 id 的，起拍里补上这条链的 id
function fillId(e: Effect | undefined, id: string): Effect | undefined {
  if (!e) return e;
  const out: Effect = { ...e };
  if (out.chain && !out.chain.id) out.chain = { ...out.chain, id };
  if (out.battle) out.battle = { ...out.battle, win: fillId(out.battle.win, id), lose: fillId(out.battle.lose, id) };
  if (out.echo?.eff) out.echo = { ...out.echo, eff: fillId(out.echo.eff, id) };
  return out;
}
function fillOpt(o: ChainOption, id: string): Option {
  const n = o.need;
  return {
    ...o,
    eff: fillId(o.eff, id),
    roll: o.roll && { ...o.roll, ok: fillId(o.roll.ok, id)!, fail: fillId(o.roll.fail, id)! },
    chance: o.chance && { ...o.chance, ok: fillId(o.chance.ok, id)!, fail: fillId(o.chance.fail, id)! },
    when: n || o.when ? (L, M) => needOk(n, L) && (!o.when || o.when(L, M)) : undefined,
  };
}

const stageOk = (d: ChainDef, L: LifeState) => d.stage === 'any' || (d.stage === 'cult') === L.inDao;
const locsOf = (b: ChainBeat): string[] => (Array.isArray(b.locs) ? b.locs : []);

// 起拍做成普通抉择，和别的抉择一起抽（每世一次，最近两世见过的降权）
export const CHAIN_STARTS: LifeEvent[] = CHAINS.map((d) => ({
  id: d.id,
  locs: Array.isArray(d.start.locs) ? d.start.locs : [],
  anyLoc: !Array.isArray(d.start.locs),
  kind: 'choice' as const,
  text: d.start.text,
  title: `缘起 · ${d.name}`,
  weight: d.weight ?? 1.5,
  options: d.start.options.map((o) => fillOpt(o, d.id)),
  // 起拍没写条件的，凡人期要等到十岁（小孩子去斩妖、谈婚论嫁都不像话）
  when: (L: LifeState, M) => stageOk(d, L) && !(L.chains ?? []).some((c) => c.id === d.id) && (d.when ? d.when(L, M) : L.inDao || L.age >= 10),
}));
export const NEW_ENCOUNTERS: LifeEvent[] = [...ENC_MORTAL, ...ENC_CULT_A, ...ENC_CULT_B];

const chainOf = (L: LifeState, id: string) => (L.chains ?? []).find((c) => c.id === id);
export const activeChains = (L: LifeState) => (L.chains ?? []).filter((c) => !c.end);
const lapNo = (g: Game) => g.L.board?.lap ?? 0;
const gap = () => randInt(2, 4);

// ================= 开链、推进、断链 =================
export async function chainOp(g: Game, op: ChainOp) {
  const L = g.L;
  const id = op.id ?? g.curChain;
  if (!id || !CHAIN_BY_ID[id]) return;
  if (op.op === 'start' || op.op === 'skip') {
    if (chainOf(L, id)) return; // 每世一次
    if (!(await makeRoom(g, id))) return;
    const st: ChainState = { id, beat: op.op === 'skip' ? 2 : 1, yuan: op.op === 'skip' ? 1 : 0, marks: {}, due: lapNo(g) + gap(), misses: 0 };
    (L.chains ??= []).push(st);
    g.log(`缘起：「${CHAIN_BY_ID[id].name}」。`, 'fate');
    if (op.op === 'start') trailThread(g, id, `「${CHAIN_BY_ID[id].name}」`);
    else trailMark(g, { kind: 'chain', title: `缘起 · ${CHAIN_BY_ID[id].name}`, thread: id, threadName: `「${CHAIN_BY_ID[id].name}」`, beat: '承', past: id === 'YG04' ? ['signin'] : undefined });
  }
  const st = chainOf(L, id);
  if (!st || st.end) return;
  if (op.yuan) st.yuan = Math.max(0, Math.min(6, st.yuan + op.yuan));
  if (op.mark) st.marks[op.mark] = (st.marks[op.mark] ?? 0) + 1;
  if (op.unmark) delete st.marks[op.unmark];
  if (op.op === 'break') breakChain(g, st, '你放下了');
}

// 同时最多三条：第四条要开时，放下一条（算断链），或者不接这段缘
async function makeRoom(g: Game, id: string): Promise<boolean> {
  const act = activeChains(g.L);
  if (act.length < MAX_CHAINS) return true;
  const opts = [...act.map((c) => ({ label: `放下「${CHAIN_BY_ID[c.id].name}」`, desc: `已走到第 ${c.beat} 拍` })), { label: `不接「${CHAIN_BY_ID[id].name}」` }];
  const i = await g.choose({ title: '缘多难顾', text: `手上已有三段未了的缘。要接「${CHAIN_BY_ID[id].name}」，就得放下一段。`, options: opts, style: 'event', key: 'chainRoom', autoPick: opts.length - 1 });
  if (i >= act.length) return false;
  breakChain(g, act[i], '缘多难顾');
  return true;
}

export function breakChain(g: Game, st: ChainState, why: string) {
  const L = g.L;
  if (st.end) return;
  st.end = 'broken';
  st.onBoard = false;
  const d = CHAIN_BY_ID[st.id];
  g.log(`「${d.name}」断了（${why}）。`, 'fate');
  trailMark(g, { kind: 'chain', title: `「${d.name}」断了`, text: why, thread: st.id, threadName: `「${d.name}」`, beat: '断' });
  // 断链留个余波：有过几分缘的，留一位「诺」故人
  if (st.yuan >= 2 && chance(0.5)) (L.acqNew ??= []).push({ role: d.name, relation: 'vow', src: 'chain', node: trailHere(g) });
}

const tierOf = (y: number): ChainEnding['tier'] => (y >= 4 ? 'top' : y >= 2 ? 'mid' : 'low');
function pickEnding(d: ChainDef, st: ChainState, L: LifeState): ChainEnding | undefined {
  const es = d.end.endings ?? [];
  const special = es.find((e) => e.need && needOk(e.need, L, st.marks, st.yuan));
  if (special) return special;
  const t = tierOf(st.yuan);
  return es.find((e) => !e.need && e.tier === t) ?? es.find((e) => !e.need) ?? es[es.length - 1];
}

// 停在「缘」格：走这条链的下一拍
export async function chainBeat(g: Game, id: string, loc: string, fought: { v: boolean }) {
  const L = g.L;
  const st = chainOf(L, id);
  const d = CHAIN_BY_ID[id];
  if (!st || st.end || !d) return g.log('那段缘已经散了。');
  st.onBoard = false;
  const n = st.beat; // 1、2 = 中间拍，3 = 结拍
  const beat: ChainBeat = n >= 3 ? d.end : d.beats[n - 1];
  let text = beat.textIf?.find((x) => needOk(x.need, L, st.marks, st.yuan))?.text ?? beat.text;
  let opts: ChainOption[] = beat.options;
  let ending: ChainEnding | undefined;
  if (n >= 3 && d.end.endings?.length) {
    ending = pickEnding(d, st, L);
    if (ending) {
      text = `${text}\n\n${ending.text}`;
      opts = ending.options ?? [{ label: ending.label ?? '收下', eff: ending.eff }];
    }
  }
  let ok = opts.filter((o) => needOk(o.need, L, st.marks, st.yuan) && (!o.when || o.when(L, g.M)));
  if (!ok.length) ok = opts.filter((o) => !o.need);
  if (!ok.length) ok = [{ label: '随缘' }];
  const title = `缘 · ${d.name}（${BEAT_LABELS[n]}）`;
  const needs = [...beat.options.map((o) => o.need), ...(beat.textIf ?? []).map((x) => x.need), ...(n >= 3 ? (d.end.endings ?? []).map((e) => e.need) : [])];
  const flags = needs.flatMap((x) => (x?.flag ? [x.flag] : []));
  const tid = trailOpen(g, { kind: 'chain', title: `缘 · ${d.name}`, loc, text, thread: id, threadName: `「${d.name}」`, beat: BEAT_LABELS[n], flags });
  try {
    await beatBody(g, st, d, n, beat, ok, title, text, loc, fought, ending);
  } finally {
    trailClose(g, tid);
  }
}

async function beatBody(g: Game, st: ChainState, d: ChainDef, n: number, beat: ChainBeat, ok: ChainOption[], title: string, text: string, loc: string, fought: { v: boolean }, ending: ChainEnding | undefined) {
  const L = g.L;
  const id = st.id;
  const i = await g.askOpts(title, text, ok, loc, true, 'chain');
  const o = ok[i];
  g.log(`【${d.name}·${BEAT_LABELS[n]}】${text.replace(/\n+/g, '')}你选择了「${o.label}」。`, 'fate', { loc });
  const prev = g.curChain;
  g.curChain = id;
  try {
    await g.applyOption(o, loc, fought);
  } finally {
    g.curChain = prev;
  }
  if (g.dead() || st.end) return;
  st.beat = n + 1;
  st.due = lapNo(g) + (beat.locs === 'same' || d.beats.some((b) => b.locs === 'same') ? 1 : gap());
  if (st.beat >= 4) finishChain(g, st, ending?.tier ?? tierOf(st.yuan));
}

function finishChain(g: Game, st: ChainState, tier: NonNullable<ChainState['end']>) {
  const L = g.L;
  const M = g.M;
  const d = CHAIN_BY_ID[st.id];
  st.end = tier;
  const name = { top: '上档', mid: '中档', low: '下档', broken: '' }[tier];
  g.log(`「${d.name}」了结（${name}）。`, 'fate');
  trailChip(g, `了结·${name}`);
  g.highlight(`了结「${d.name}」`, tier === 'top' ? 60 : tier === 'mid' ? 35 : 15, 'chain');
  if (tier === 'top' && !(M.chainsDone ??= []).includes(st.id)) {
    M.chainsDone.push(st.id);
    L.insightExtra = (L.insightExtra ?? 0) + 20;
    g.log('头一回走到上档，宿慧 +20。', 'fate');
  }
}

// ================= 棋盘上的「缘」格 =================
// 岁首刷格前调用：「缘」格一直留到去了为止；连着 MISS_LIMIT 圈没去，这段缘就断了。
// 返回这一圈要新放的「缘」格
export const MISS_LIMIT = 5;
export function chainTilesDue(g: Game, flowTiles: { kind: string; ref?: string; ttl: number; slot: number; loc?: string }[]): { kind: 'chain'; ref: string; loc: string; ttl: number; slot?: number }[] {
  const L = g.L;
  const lap = lapNo(g);
  const visited = L.board?.visited ?? [];
  // 棋盘换过（入道换盘、长大加格）时，「缘」格可能已经不在了：以盘面为准
  const stage = L.inDao ? 'cult' : 'mortal';
  for (const st of activeChains(L)) st.onBoard = flowTiles.some((t) => t.kind === 'chain' && t.ref === st.id && t.ttl > 0 && LOC_BY_ID[t.loc ?? '']?.stage === stage);
  for (const t of flowTiles) {
    if (t.kind !== 'chain' || t.ttl <= 0 || visited.includes(t.slot)) continue;
    const st = chainOf(L, t.ref!);
    if (!st || st.end || !st.onBoard) continue;
    st.misses += 1;
    if (st.misses >= MISS_LIMIT) breakChain(g, st, `${MISS_LIMIT} 圈没去`);
    else if (st.misses === MISS_LIMIT - 1) g.log(`「${CHAIN_BY_ID[st.id].name}」的缘格还在那里，再不去就要散了。`);
  }
  const out: { kind: 'chain'; ref: string; loc: string; ttl: number; slot?: number }[] = [];
  for (const st of activeChains(L)) {
    if (st.onBoard || lap < st.due || out.length >= 2) continue;
    const d = CHAIN_BY_ID[st.id];
    const beat = st.beat >= 3 ? d.end : d.beats[st.beat - 1];
    if (beat.when && !beat.when(L, g.M)) continue;
    const avail = g.availableLocs().map((l) => l.id);
    const want = locsOf(beat).filter((x) => avail.includes(x));
    const loc = want.length ? pick(want) : pick(avail.filter((x) => LOC_BY_ID[x].stage === (L.inDao ? 'cult' : 'mortal')).length ? avail.filter((x) => LOC_BY_ID[x].stage === (L.inDao ? 'cult' : 'mortal')) : avail);
    if (!loc) continue;
    st.onBoard = true;
    const same = beat.locs === 'same';
    st.misses = 0;
    out.push({ kind: 'chain', ref: st.id, loc, ttl: 99, slot: same ? st.slot : undefined });
  }
  return out;
}

export function chainTileFace(g: Game, ref: string, loc?: string) {
  const st = chainOf(g.L, ref);
  const d = CHAIN_BY_ID[ref];
  if (!d || !st) return { name: '缘', icon: '缘', hint: '' };
  return { name: d.name, icon: '缘', hint: `${LOC_BY_ID[loc ?? '']?.name ?? ''}·缘（${BEAT_LABELS[Math.min(3, st.beat)]}）` };
}
export const chainTileStale = (g: Game, ref?: string) => {
  const st = ref ? chainOf(g.L, ref) : undefined;
  return !st || !!st.end;
};

// ================= 灵宠 =================
export function givePet(g: Game, p: { kind: PetKind; adult?: boolean; name?: string }) {
  const L = g.L;
  const name = p.name ?? PET_NAMES[p.kind];
  if (L.pet) {
    if (p.adult && L.pet.kind === p.kind && !L.pet.adult) {
      L.pet.adult = true;
      L.pet.lv = Math.min(5, L.pet.lv + 1);
      g.log(`${name}长大了。`, 'milestone');
    } else g.log(`你身边已经有${L.pet.name}了。${name}看了你一会儿，走了。`);
    return;
  }
  if (L.talents.includes('cat') && p.kind === 'lynx') return g.log('灵猫冲它炸了毛。它走了。');
  L.pet = { kind: p.kind, lv: p.adult ? 2 : 1, adult: !!p.adult, name };
  g.log(`${name}跟了你${p.adult ? '' : '（幼崽）'}。`, 'milestone');
  g.highlight(`收了灵宠${name}`, p.adult ? 45 : 25, 'pet');
  if (p.kind === 'turtle') L.lifeBonus += 15;
  if (p.kind === 'crow') L.lifeBonus += 2;
}
// 进一个大境界，灵宠 +1 级（最多 5 级）
export function petRealmUp(g: Game) {
  const p = g.L.pet;
  if (p && p.lv < 5) p.lv += 1;
}

// ================= 其它收获 =================
export function giveGain(g: Game, gn: Gain) {
  const L = g.L;
  const M = g.M;
  if (gn.meta === 'clan') {
    M.clan = { name: gn.name, life: M.lives };
    trailRef(g, 'clan');
    g.log(`立下「${gn.name}」。往后的轮回里，你可能投生在本族。`, 'milestone');
    g.highlight(`立「${gn.name}」`, 50, 'gain');
    return;
  }
  if (gn.meta === 'shrine') {
    (M.shrines ??= []).push({ name: gn.name, life: M.lives });
    g.log(`你将受「${gn.name}」香火。往后路过此地，劫难里的敌人弱一些。`, 'milestone');
    g.highlight(`受封「${gn.name}」`, 55, 'gain');
    return;
  }
  if (gn.meta === 'nemesis') {
    M.nemesis = { name: gn.name, wins: M.nemesis?.wins ?? 0, life: M.lives };
    trailRef(g, 'nemesis');
    g.log(`「${gn.name}」记住你了。往后每一世，他都会来找你。`, 'fate');
    return;
  }
  if (gn.meta === 'signin') {
    M.signin = Math.max(M.signin ?? 0, gn.lv ?? 3);
    trailRef(g, 'signin');
    g.log('碑扶起来了。下一世，你一开局就会遇见它。', 'fate');
    return;
  }
  const gs = (L.gains ??= []);
  // 随身前辈、洞天、葫芦、商会、化身一世一件（新的顶掉旧的）；其余按名字各算一件
  const single = ['elder', 'dongtian', 'gourd', 'guild', 'clone'].includes(gn.id);
  const same = gs.findIndex((x) => x.id === gn.id && (single || x.name === gn.name));
  if (same >= 0) {
    if ((gn.lv ?? 1) < (gs[same].lv ?? 1)) return;
    gs.splice(same, 1);
  }
  gs.push({ ...gn });
  g.log(`得「${gn.name}」${gn.desc ? `：${gn.desc}` : ''}。`, 'milestone');
  g.highlight(`得「${gn.name}」`, gn.ally || gn.id === 'elder' || gn.id === 'dongtian' ? 40 : 20, 'gain');
}

export const gainSum = (L: LifeState, k: 'dmg' | 'roll' | 'xp' | 'price') => (L.gains ?? []).reduce((a, x) => a + (x[k] ?? 0), 0);

// 不必请援、自己跟着参战的伙伴：灵宠、鬼伴、化身、首徒……（至多两位）
export function freeAllies(L: LifeState): { id: string; name: string; lamp: number }[] {
  const out: { id: string; name: string; lamp: number }[] = [];
  if (L.pet && !PET_NOFIGHT.includes(L.pet.kind) && L.inDao) out.push({ id: 'pet', name: L.pet.name, lamp: L.pet.lv * 2 });
  for (const x of L.gains ?? []) if (x.ally) out.push({ id: 'ally', name: x.name, lamp: 2 + (x.lv ?? 0) });
  return out.slice(0, MAX_ALLIES);
}

// 判定加成：随身前辈、本命字……；红鲤让气运判定 +1
export function rollBonus(L: LifeState, attr: string) {
  return gainSum(L, 'roll') + (L.pet?.kind === 'carp' && attr === 'luck' ? 1 : 0);
}

// ================= 岁首：余波兑现、收获的每圈收益 =================
export async function chainLapStart(g: Game) {
  const L = g.L;
  const M = g.M;
  const lap = lapNo(g);
  // 下一世开局的签到碑
  if (M.signin && !chainOf(L, 'YG04') && CHAIN_BY_ID.YG04 && lap >= 1) {
    M.signin = 0;
    await chainOp(g, { id: 'YG04', op: 'skip' });
  }
  const due = (L.echoes ?? []).filter((e) => e.due <= lap);
  if (due.length) {
    L.echoes = (L.echoes ?? []).filter((e) => e.due > lap);
    const fought = { v: false };
    for (const e of due) {
      trailHint(g, e.src, '余波');
      const tid = trailOpen(g, { kind: 'echo', title: '余波', text: e.text });
      try {
        g.log(`余波：${e.text}`, 'fate');
        if (e.eff) await g.apply(e.eff, L.inDao ? 'cross' : 'home', fought);
      } finally {
        trailClose(g, tid);
      }
      if (g.dead()) return;
    }
  }
  const got: Effect = {};
  for (const x of L.gains ?? []) {
    if (!x.lap) continue;
    for (const [k, v] of Object.entries(x.lap)) if (typeof v === 'number') (got as Record<string, number>)[k] = ((got as Record<string, number>)[k] ?? 0) + v;
  }
  if (L.pet?.kind === 'rat' && lap % 3 === 0) got.stones = (got.stones ?? 0) + 10 + 10 * L.realm;
  if (Object.keys(got).length) {
    const parts: string[] = [];
    if (got.stones) parts.push(`灵石 +${got.stones}`);
    if (got.xpPct) parts.push(`修为 +${got.xpPct}%`);
    if (got.merit) parts.push(`功德 +${got.merit}`);
    if (got.life) parts.push(`寿元 +${got.life}`);
    await g.apply(got, L.inDao ? 'cave' : 'home', { v: false });
    if (parts.length) g.log(`身边的收获：${parts.join('，')}。`);
  }
}

// 余波：几圈后兑现一次
export function addEcho(g: Game, e: NonNullable<Effect['echo']>) {
  (g.L.echoes ??= []).push({ text: e.text, eff: e.eff, due: lapNo(g) + (e.laps ?? gap()), src: trailTop(g) });
}

// 跨世：家族、宿敌
export function clanBirth(g: Game) {
  const M = g.M;
  const L = g.L;
  if (!M.clan || !chance(0.2)) return;
  L.attrs.fam = Math.min(12, L.attrs.fam + 2);
  L.flags.clanBorn = 1;
  g.log(`你投生在「${M.clan.name}」。族谱上写着一个你很熟的名字。`, 'fate');
  const r = M.trailRefs?.clan;
  if (r) trailHint(g, r.id, '前世', r.life); // 连到这一世的出生
}
export const NEMESIS_EVENT: LifeEvent = {
  id: 'NEMESIS',
  locs: ['roam', 'sect', 'cross', 'demon'],
  kind: 'choice',
  text: '宿敌又找来了。他比你高半个境界，笑着说：「这一世，你还是来晚了。」',
  weight: 3,
  when: (L, M) => L.inDao && !!M.nemesis && M.nemesis.life < M.lives,
  options: [
    { label: '应战', desc: '斗法：宿敌（精英 ×2），胜则宿慧 +20', eff: { battle: { kind: 'duel', title: '宿敌', elites: 2, win: { insight: 20, flag: 'nemesisWin', text: '他倒在地上，又笑了：「下一世。」' }, lose: { injure: 1 } } } },
    { label: '避开', desc: '这一世不跟他打' },
  ],
};

// 事件留下的世内标记对劫难强弱的影响（夜里的劫、秘境的咒、魔域的和约……）
const ENEMY_FLAGS: { flag: string; mul: number; loc?: string }[] = [
  { flag: 'night_harm', mul: 1.1 },
  { flag: 'harm_up', mul: 1.05 },
  { flag: 'realmCursed', mul: 1.15, loc: 'realm' },
  { flag: 'soloRealm', mul: 1.1, loc: 'realm' },
  { flag: 'realmEase', mul: 0.9, loc: 'realm' },
  { flag: 'gateEase', mul: 0.9, loc: 'gate' },
  { flag: 'inkResist', mul: 0.9 },
  { flag: 'demon_truce', mul: 0.7, loc: 'demon' },
  { flag: 'beastTruce', mul: 0.9, loc: 'forest' },
  { flag: 'truce', mul: 0.9, loc: 'realm' },
  { flag: 'wolf_kin', mul: 0.8, loc: 'forest' },
  { flag: 'wolf_grudge', mul: 1.2, loc: 'forest' },
];
export function flagEnemyMul(L: LifeState, loc: string): number {
  let m = 1;
  for (const f of ENEMY_FLAGS) if (f.flag in L.flags && (!f.loc || f.loc === loc)) m *= f.mul;
  return m;
}
