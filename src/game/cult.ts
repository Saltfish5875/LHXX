// 修炼与法宝：功法（品阶 × 层数）、法宝（功法型 / 被动 / 主动）、附诀、功法谱、轮回身份与轮回碑
import { SCHOOL_NAMES } from '../data/core';
import {
  ACHIEVEMENTS, ACTIVE_MAX, BOOK_DISCOUNT, CLOSE_COST, CLOSE_GRADE_MUL, FJ_SLOTS, FUJUE, FUJUE_IDS, GF_CAP, GF_GRADES, GF_MIN_QI, GF_MUL,
  GONGFA, IDENTITIES, IDENTITY_BY_ID, ITEMS, LAYER_NAMES, OPEN_IDENTITIES, PASSIVE_MAX, QI_GRADES, QI_MUL, QI_NAMES, QI_PRICE, QI_SPIRITS,
  REALM_CAP, SLOTS_BY_REALM, TIER_NAMES, TIER_W, TOP_TIER_CAP, Tier,
} from '../data/cult';
import type { BattleActive, BattleGong, BattleResult, BattleSpec } from '../battle/spec';
import type { CultMeta, LifeState, MetaState, Skill, SkillId, Treasure } from './types';
import type { Game } from './engine';
import { chance, pick, randInt, weighted } from './rng';

// ---------------- 基础 ----------------
export function metaCult(M: MetaState): CultMeta {
  M.cult ??= { book: {}, mortalStreak: 0, saves: 0, newAch: [] };
  M.cult.newAch ??= [];
  return M.cult;
}

// 旧存档：法宝阶数 → 黄阶功法 + 一件凡器
export function ensureCult(L: LifeState) {
  L.bag ??= [];
  L.fjBag ??= [];
  L.load ??= { gong: {}, passive: [], active: [], chain: null };
  L.xinde ??= 0;
  L.uid ??= 1;
  for (const s of L.skills) {
    s.grade ??= GONGFA[s.id].grade0;
    if (L.inDao && !L.bag.some((t) => t.kind === 'gong' && t.key === s.id)) L.bag.push(makeTreasure(L, 'gong', s.id, GF_MIN_QI[s.grade]));
  }
  if (L.skills.length && !L.skills.some((s) => s.bm)) L.skills[0].bm = true;
}

export function makeTreasure(L: LifeState, kind: Treasure['kind'], key: string, grade = 0): Treasure {
  const t: Treasure = { uid: (L.uid = (L.uid ?? 1) + 1), kind, key, grade, name: '' };
  if (kind === 'gong') {
    const qi = GONGFA[key as SkillId].qi;
    t.name = QI_NAMES[qi][Math.min(4, grade)];
    t.fj = [];
    if (grade >= 2) t.spirit = pick(QI_SPIRITS);
  } else {
    const it = ITEMS[key];
    t.name = it.name;
    if (it.uses) t.uses = it.uses;
    if (it.breaks) t.uses = it.breaks;
  }
  return t;
}

export const gongName = (s: Skill) => `${GONGFA[s.id].name}`;
export const gradeName = (s: Skill) => GF_GRADES[s.grade ?? 0];
export const qiLabel = (t: Treasure) => (t.kind === 'gong' ? `${QI_GRADES[t.grade]}「${t.name}」` : `「${t.name}」`);
export const slotCount = (L: LifeState) => SLOTS_BY_REALM[Math.max(0, L.realm)];

export function layerCap(L: LifeState, s: Skill) {
  let cap = Math.min(REALM_CAP[Math.max(0, L.realm)], GF_CAP[s.grade ?? 0]);
  const sch = GONGFA[s.id].school;
  if (L.daoji) {
    if (s.bm && sch === L.daoji) cap += 1;
    else if (sch !== L.daoji && L.realm >= 3) cap -= 1;
  }
  return Math.max(1, Math.min(5, cap));
}

// 当前给某门功法用的法宝：手选优先，否则同器类里品级最高的
export function qiFor(L: LifeState, id: SkillId): Treasure | undefined {
  const bag = L.bag ?? [];
  const sel = L.load?.gong[id];
  const t = bag.find((x) => x.uid === sel && x.kind === 'gong' && x.key === id);
  if (t) return t;
  return bag.filter((x) => x.kind === 'gong' && x.key === id).sort((a, b) => b.grade - a.grade)[0];
}

// 本世能施展的功法：倍率 = 品阶 × 法宝 ×（器不承法 0.7）×（器灵 1.08）× 天阶圆满绝技
export function battleGong(L: LifeState): { gong: BattleGong[]; idle: string[] } {
  const gong: BattleGong[] = [];
  const idle: string[] = [];
  for (const s of L.skills) {
    const t = qiFor(L, s.id);
    const g = s.grade ?? 0;
    if (!t) {
      idle.push(gongName(s));
      continue;
    }
    const weak = t.grade < GF_MIN_QI[g];
    let mul = GF_MUL[g] * QI_MUL[t.grade] * (weak ? 0.7 : 1) * (t.spirit ? 1.08 : 1);
    if (g === 3 && s.lvl >= 5) mul *= 1.25;
    gong.push({ id: s.id, lvl: s.lvl, mul, fj: [...(t.fj ?? [])], name: GONGFA[s.id].name.replace(/[《》]/g, ''), weak });
  }
  return { gong, idle };
}

export function loadoutSpec(g: Game): Pick<BattleSpec, 'gong' | 'idle' | 'passives' | 'actives' | 'chain' | 'amulet' | 'enemyMul'> {
  const L = g.L;
  ensureCult(L);
  const { gong, idle } = battleGong(L);
  const bag = L.bag!;
  const passives = L.load!.passive.map((u) => bag.find((t) => t.uid === u)).filter((t): t is Treasure => !!t && t.kind === 'passive');
  const actives: BattleActive[] = L.load!.active
    .map((u) => bag.find((t) => t.uid === u))
    .filter((t): t is Treasure => !!t && t.kind === 'active')
    .map((t) => ({ uid: t.uid, id: t.key, uses: t.uses ?? 0, recharge: !!ITEMS[t.key].cells }));
  const amulet = passives.find((t) => t.key === 'hushen')?.uses ?? 0;
  return { gong, idle, passives: passives.map((t) => t.key), actives, chain: L.load!.chain ?? null, amulet, enemyMul: enemyMul(g.M) };
}

// ---------------- 自动配装（只填空位，不动玩家的手选） ----------------
const PASSIVE_PREF = ['hushen', 'xuanjia', 'zhenyue', 'huxin', 'changchun', 'xueyin', 'shihun', 'tayun', 'juling', 'bilei', 'qingxin', 'yinling'];
export function autoEquip(L: LifeState) {
  ensureCult(L);
  const bag = L.bag!;
  const ld = L.load!;
  ld.passive = ld.passive.filter((u) => bag.some((t) => t.uid === u));
  ld.active = ld.active.filter((u) => bag.some((t) => t.uid === u && (t.uses ?? 1) > 0));
  for (const s of L.skills) {
    const cur = bag.find((t) => t.uid === ld.gong[s.id]);
    const best = bag.filter((t) => t.kind === 'gong' && t.key === s.id).sort((a, b) => b.grade - a.grade)[0];
    if (!cur || (best && best.grade > cur.grade && !(cur.fj ?? []).length)) {
      if (best) ld.gong[s.id] = best.uid;
    }
  }
  const ps = bag.filter((t) => t.kind === 'passive' && !ld.passive.includes(t.uid)).sort((a, b) => PASSIVE_PREF.indexOf(a.key) - PASSIVE_PREF.indexOf(b.key));
  while (ld.passive.length < PASSIVE_MAX && ps.length) ld.passive.push(ps.shift()!.uid);
  const as = bag.filter((t) => t.kind === 'active' && !ld.active.includes(t.uid) && (t.uses ?? 1) > 0);
  while (ld.active.length < ACTIVE_MAX && as.length) ld.active.push(as.shift()!.uid);
  // 附诀：挂到层数最高、还有空位的功法法宝上
  const fjb = L.fjBag!;
  while (fjb.length) {
    const tgt = L.skills
      .map((s) => ({ s, t: qiFor(L, s.id) }))
      .filter((x) => x.t && (x.t.fj ?? []).length < FJ_SLOTS[x.t.grade] && !(x.t.fj ?? []).includes(fjb[0]))
      .sort((a, b) => b.s.lvl - a.s.lvl)[0];
    if (!tgt) break;
    (tgt.t!.fj ??= []).push(fjb.shift()!);
  }
  if (!ld.chain || !L.skills.some((s) => s.id === ld.chain)) {
    const holder = L.skills.find((s) => qiFor(L, s.id)?.fj?.includes('yinlei'));
    const other = L.skills.filter((s) => s !== holder).sort((a, b) => b.lvl - a.lvl)[0];
    ld.chain = other?.id ?? null;
  }
}

// ---------------- 得功法 / 法宝 / 附诀 ----------------
// 学一门功法：已会则 +1 层；功法位满了先记下，年初再取舍
export function learnGong(g: Game, id: SkillId, opts: { grade?: number; qi?: number; quiet?: boolean } = {}) {
  const L = g.L;
  ensureCult(L);
  const s = L.skills.find((x) => x.id === id);
  if (s) {
    layerUp(g, s, '再得此法');
    giveQi(g, id, opts.qi ?? 0, true);
    return;
  }
  if (L.skills.length >= slotCount(L)) {
    L.flags['pendGong_' + id] = opts.grade ?? GONGFA[id].grade0;
    giveQi(g, id, opts.qi ?? 0, true);
    return;
  }
  addGong(g, id, opts.grade ?? GONGFA[id].grade0, opts.quiet);
  giveQi(g, id, opts.qi ?? 0, true);
}

function addGong(g: Game, id: SkillId, grade: number, quiet = false) {
  const L = g.L;
  const s: Skill = { id, lvl: 1, grade };
  if (!L.skills.length) s.bm = true;
  L.skills.push(s);
  L.school[GONGFA[id].school] += 5;
  if (!quiet) g.log(`习得${GF_GRADES[grade]}功法${GONGFA[id].name}（一层）。`);
  // 功法谱：前世挂在这门功法上的附诀回到手里
  const be = metaCult(g.M).book[id];
  if (be?.fj.length && !L.flags['bookFj_' + id]) {
    L.flags['bookFj_' + id] = 1;
    for (const f of be.fj) grantFujue(g, f, true);
    g.log(`功法谱上记着前世的附诀：${be.fj.map((f) => FUJUE[f].name).join('、')}，你又想起来了。`);
  }
  autoEquip(L);
}

// 年初：功法位满时的取舍
export async function resolvePending(g: Game) {
  const L = g.L;
  for (const k of Object.keys(L.flags)) {
    if (!k.startsWith('pendGong_')) continue;
    const id = k.slice(9) as SkillId;
    const grade = L.flags[k];
    delete L.flags[k];
    if (L.skills.some((s) => s.id === id)) continue;
    if (L.skills.length < slotCount(L)) {
      addGong(g, id, grade);
      continue;
    }
    const drop = L.skills.filter((s) => !s.bm);
    const opts = drop.map((s) => ({ label: `散去${gongName(s)}`, desc: `${GF_GRADES[s.grade ?? 0]} · ${LAYER_NAMES[s.lvl]}` }));
    const i = await g.choose({
      title: '取舍',
      text: `你得了${GF_GRADES[grade]}${GONGFA[id].name}，可功法位已满（${slotCount(L)} 门）。散去一门，或放下新功法化作心得。`,
      options: [...opts, { label: '放下新功法', desc: '心得 +2' }],
      style: 'event',
      key: 'gongSwap',
      autoPick: drop.length && drop.some((s) => s.lvl <= 1 && (s.grade ?? 0) < grade) ? drop.findIndex((s) => s.lvl <= 1 && (s.grade ?? 0) < grade) : opts.length,
    });
    if (i < drop.length) {
      L.skills.splice(L.skills.indexOf(drop[i]), 1);
      g.log(`你散去了${gongName(drop[i])}。`);
      addGong(g, id, grade);
    } else {
      L.xinde = (L.xinde ?? 0) + 2;
      g.log(`你放下了${GONGFA[id].name}，只记下几分心得。`);
    }
  }
}

export function giveQi(g: Game, id: SkillId, grade: number, onlyIfNone = false) {
  const L = g.L;
  ensureCult(L);
  if (!L.inDao) return;
  const has = L.bag!.filter((t) => t.kind === 'gong' && t.key === id);
  if (onlyIfNone && has.some((t) => t.grade >= grade)) return;
  const t = makeTreasure(L, 'gong', id, grade);
  L.bag!.push(t);
  g.log(`得${QI_GRADES[grade]}「${t.name}」${t.spirit ? `（器灵·${t.spirit}）` : ''}。`);
  autoEquip(L);
}

export function grantItem(g: Game, key: string) {
  const L = g.L;
  ensureCult(L);
  const it = ITEMS[key];
  if (!it) return;
  // 消耗型叠在一起
  const same = L.bag!.find((t) => t.key === key && t.kind === 'active' && it.uses);
  if (same) same.uses = (same.uses ?? 0) + (it.uses ?? 1);
  else L.bag!.push(makeTreasure(L, it.kind, key));
  g.log(`得${it.kind === 'passive' ? '护身法宝' : '法宝'}「${it.name}」：${it.desc}。`);
  autoEquip(L);
}

export function grantFujue(g: Game, id?: string, quiet = false) {
  const L = g.L;
  ensureCult(L);
  let f = id;
  if (!f) {
    const pool = FUJUE_IDS.filter((x) => !(FUJUE[x].chain && L.chainGot));
    f = pick(pool);
  }
  if (FUJUE[f].chain) {
    if (L.chainGot) {
      L.xinde = (L.xinde ?? 0) + 1;
      if (!quiet) g.log('又一枚引雷诀，可连锁一世只容一枚。你把它化成了心得。');
      return;
    }
    L.chainGot = true;
  }
  L.fjBag!.push(f);
  if (!quiet) g.log(`得附诀「${FUJUE[f].name}」：${FUJUE[f].desc}。`);
  autoEquip(L);
}

// 层数 +1（受境界、品阶与道基限制）；到顶时化作心得
export function layerUp(g: Game, s: Skill, reason: string): boolean {
  const L = g.L;
  const cap = layerCap(L, s);
  if (s.lvl >= cap) {
    L.xinde = (L.xinde ?? 0) + 1;
    g.log(`${reason}：${gongName(s)}已到此境上限（${LAYER_NAMES[cap]}），化作心得 +1。`);
    return false;
  }
  s.lvl += 1;
  g.log(`${reason}：${gongName(s)}练到${LAYER_NAMES[s.lvl]}。`);
  onLayer(g, s);
  return true;
}

function onLayer(g: Game, s: Skill) {
  if (s.id === 'art' && s.lvl >= 5) g.gainPage(13);
}

// 功法残页：一门功法升一品（每门一世一次）
export async function upgradeGrade(g: Game, auto = false): Promise<boolean> {
  const L = g.L;
  const can = L.skills.filter((s) => !s.up && (s.grade ?? 0) < 3);
  if (!can.length) {
    L.xinde = (L.xinde ?? 0) + 2;
    g.log('残页上的功法你都参透了，化作心得 +2。');
    return false;
  }
  let s = can.sort((a, b) => b.lvl - a.lvl)[0];
  if (!auto && can.length > 1) {
    const i = await g.choose({ title: '功法残页', text: '残页能补全一门功法，让它升一品。', options: can.map((x) => ({ label: gongName(x), desc: `${gradeName(x)} → ${GF_GRADES[(x.grade ?? 0) + 1]}` })), style: 'event', key: 'canye', autoPick: 0 });
    s = can[i] ?? s;
  }
  s.grade = (s.grade ?? 0) + 1;
  s.up = true;
  g.log(`残页补全：${gongName(s)}升为${gradeName(s)}。`, 'milestone');
  return true;
}

// ---------------- 闭关（本命格） ----------------
export function closeCost(g: Game, s: Skill) {
  const to = s.lvl + 1;
  const c = CLOSE_COST[to];
  if (!c) return null;
  const be = metaCult(g.M).book[s.id];
  let n = be?.reach[to] ?? 0;
  if (g.L.identity === 'S18') n += 1;
  const disc = BOOK_DISCOUNT[Math.min(4, n)];
  const gm = CLOSE_GRADE_MUL[s.grade ?? 0];
  return { xd: Math.max(1, Math.round(c.xd * gm * disc)), st: Math.round(c.st * gm * disc), yr: Math.max(1, Math.round(c.yr * disc)), disc };
}

export async function retreat(g: Game) {
  const L = g.L;
  ensureCult(L);
  if (!L.inDao) return;
  for (;;) {
    const rows = L.skills.map((s) => {
      const cap = layerCap(L, s);
      const c = s.lvl < cap ? closeCost(g, s) : null;
      const ok = !!c && (L.xinde ?? 0) >= c.xd && L.stones >= c.st;
      return { s, c, ok, label: c ? `闭关 · ${gongName(s)} → ${LAYER_NAMES[s.lvl + 1]}` : `${gongName(s)} 已到上限（${LAYER_NAMES[cap]}）`, desc: c ? `心得 ${c.xd}，灵石 ${c.st}，${c.yr} 年${c.disc < 1 ? `（功法谱 ${Math.round(c.disc * 100)}%）` : ''}` : '突破境界或升品后才能再练' };
    });
    const book = metaCult(g.M).book;
    const review = (Object.keys(book) as SkillId[]).filter((id) => !L.skills.some((s) => s.id === id) && L.skills.length < slotCount(L));
    const digest = { label: '参悟心得', desc: '心得 6 → 修为 +8%，1 年', disabled: (L.xinde ?? 0) < 6 || !!L.stall };
    const opts = [...rows.map((r) => ({ label: r.label, desc: r.desc, disabled: !r.ok })), ...review.map((id) => ({ label: `温习 · ${GONGFA[id].name}`, desc: `功法谱：重学一层，1 年（${GF_GRADES[book[id]!.grade]}）` })), digest];
    let autoI = rows.findIndex((r) => r.ok);
    if (autoI < 0 && review.length) autoI = rows.length;
    if (autoI < 0 && (L.xinde ?? 0) >= 12 && !digest.disabled) autoI = opts.length - 1;
    const i = await g.choose({
      title: '本命格 · 闭关',
      text: `心得 ${L.xinde ?? 0} · 灵石 ${L.stones}\n功法位 ${L.skills.length}/${slotCount(L)}；层数上限随境界与品阶而定。`,
      options: [...opts, { label: '出关' }],
      style: 'event',
      key: 'retreat',
      autoPick: autoI >= 0 ? autoI : opts.length,
    });
    if (i >= opts.length) return;
    if (i === opts.length - 1) {
      L.xinde = (L.xinde ?? 0) - 6;
      L.age += 1;
      L.xp += g.need() * 0.08;
      if (g.capped()) L.xp = Math.min(L.xp, g.need());
      g.log('你把心得一条条理顺，修为 +8%。');
    } else if (i < rows.length) {
      const r = rows[i];
      if (!r.c) return;
      L.xinde = (L.xinde ?? 0) - r.c.xd;
      L.stones -= r.c.st;
      L.age += r.c.yr;
      r.s.lvl += 1;
      g.log(`你闭关 ${r.c.yr} 年，${gongName(r.s)}练到${LAYER_NAMES[r.s.lvl]}。`, 'milestone');
      onLayer(g, r.s);
    } else {
      const id = review[i - rows.length];
      L.age += 1;
      addGong(g, id, book[id]!.grade, true);
      giveQi(g, id, 0, true);
      g.log(`你翻开功法谱温习一年，重拾${GF_GRADES[book[id]!.grade]}${GONGFA[id].name}（一层）。`, 'milestone');
    }
    g.io.refresh();
    if (L.age >= g.lifespan()) return;
  }
}

// ---------------- 坊市货架 ----------------
export interface ShopItem {
  label: string;
  desc?: string;
  cost: number;
  fn: () => void | Promise<void>;
  score: number; // 自动 / 模拟的购买意愿
}
export function shopItems(g: Game): ShopItem[] {
  const L = g.L;
  ensureCult(L);
  const M = g.M;
  const out: ShopItem[] = [];
  const seed = L.flags.shopSeed ?? (L.flags.shopSeed = randInt(1, 1e6));
  let x = seed;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const n = 2 + (M.achievements.includes('A07') ? 1 : 0);
  // 功法型法宝：配本世功法，品级随境界
  for (let k = 0; k < n; k++) {
    if (r() < 0.6 && L.skills.length) {
      const s = L.skills[Math.floor(r() * L.skills.length)];
      const cur = qiFor(L, s.id)?.grade ?? -1;
      const grade = Math.min(4, Math.max(0, Math.min(L.realm, cur + 1 + (r() < 0.2 ? 1 : 0))));
      const name = QI_NAMES[GONGFA[s.id].qi][grade];
      out.push({ label: `${QI_GRADES[grade]}「${name}」`, desc: `${GONGFA[s.id].name}所用；附诀位 ${FJ_SLOTS[grade]}`, cost: QI_PRICE[grade], fn: () => giveQi(g, s.id, grade), score: grade > cur ? 3 + grade : 0 });
    } else {
      const keys = Object.keys(ITEMS);
      const key = keys[Math.floor(r() * keys.length)];
      const it = ITEMS[key];
      const owned = L.bag!.some((t) => t.key === key) && !it.uses;
      out.push({ label: `「${it.name}」`, desc: it.desc, cost: it.price, fn: () => grantItem(g, key), score: owned ? 0 : it.uses ? 2 : 2.5 });
    }
  }
  const fjN = 1 + (M.achievements.includes('A26') ? 1 : 0);
  for (let k = 0; k < fjN; k++) {
    const pool = FUJUE_IDS.filter((f) => !(FUJUE[f].chain && L.chainGot));
    const f = pool[Math.floor(r() * pool.length)];
    out.push({ label: `附诀「${FUJUE[f].name}」`, desc: FUJUE[f].desc, cost: 120 + 30 * L.realm, fn: () => grantFujue(g, f), score: L.skills.some((s) => (qiFor(L, s.id)?.grade ?? 0) >= 1) ? 3 : 0.5 });
  }
  if (r() < 0.3) out.push({ label: '功法残页', desc: '一门功法升一品（每门一世一次）', cost: 220, fn: async () => void (await upgradeGrade(g)), score: 4 });
  return out;
}
export const rotateShop = (L: LifeState) => delete L.flags.shopSeed;

// ---------------- 功法谱 / 底蕴 ----------------
export function dizhun(M: MetaState) {
  return Object.values(metaCult(M).book).reduce((a, b) => a + (b?.best ?? 0), 0);
}
export const enemyMul = (M: MetaState) => Math.min(1.5, 1 + dizhun(M) * 0.01);

export function bookEntries(M: MetaState) {
  return Object.values(metaCult(M).book).reduce((a, b) => a + (b?.grades.length ?? 0), 0);
}

// ---------------- 战后 ----------------
export function afterBattleCult(g: Game, spec: BattleSpec, res: BattleResult, boss: boolean): string[] {
  const L = g.L;
  ensureCult(L);
  const lines: string[] = [];
  // 消耗型主动法宝与护身符的次数跨战斗保留
  for (const [uid, left] of Object.entries(res.activeLeft ?? {})) {
    const t = L.bag!.find((x) => x.uid === Number(uid));
    if (t) t.uses = left;
  }
  L.bag = L.bag!.filter((t) => t.kind !== 'active' || ITEMS[t.key].cells || (t.uses ?? 0) > 0);
  if (res.amuletUsed) {
    const t = L.bag.find((x) => x.key === 'hushen');
    if (t) {
      t.uses = (t.uses ?? 3) - 1;
      if (t.uses <= 0) {
        L.bag = L.bag.filter((x) => x !== t);
        lines.push('护身符碎了。');
      }
    }
  }
  if (res.saves) {
    L.saves = (L.saves ?? 0) + res.saves;
    metaCult(g.M).saves += res.saves;
  }
  if (res.win) {
    const xd = boss || spec.kind === 'trial' ? 3 : 1;
    L.xinde = (L.xinde ?? 0) + xd;
    lines.push(`心得 +${xd}`);
    // 斗法与首领战有机会缴获法宝
    if ((spec.kind === 'duel' || boss) && chance(0.35)) {
      if (chance(0.5) && L.skills.length) {
        const s = pick(L.skills);
        const cur = qiFor(L, s.id)?.grade ?? 0;
        giveQi(g, s.id, Math.min(4, Math.max(cur, Math.min(L.realm - 1, cur + (chance(0.4) ? 1 : 0)))));
      } else grantItem(g, pick(Object.keys(ITEMS)));
    }
  }
  const by = Object.entries(res.dmgBy ?? {}).filter(([, v]) => v > 0);
  const tot = by.reduce((a, [, v]) => a + v, 0);
  if (tot > 0) {
    const nm = (k: string) => (GONGFA[k as SkillId] ? GONGFA[k as SkillId].name : k);
    lines.push('出力 ' + by.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${nm(k)} ${Math.round((v / tot) * 100)}%`).join('，'));
  }
  const procs = Object.entries(res.procs ?? {});
  if (procs.length) lines.push('触发 ' + procs.map(([k, v]) => `${FUJUE[k]?.name ?? k} ${v}`).join('，'));
  autoEquip(L);
  return lines;
}

// ---------------- 轮回身份 ----------------
export function tierBonus(M: MetaState): number[] {
  const b = [0, 0, 0, 0];
  for (const a of ACHIEVEMENTS) if (M.achievements.includes(a.id) && a.tier) for (const [t, v] of Object.entries(a.tier)) b[Number(t)] += v as number;
  return b;
}
export function identityOpen(M: MetaState, id: string) {
  const d = IDENTITY_BY_ID[id];
  if (!d) return false;
  if (OPEN_IDENTITIES.includes(id)) return true;
  if (d.ach && M.achievements.includes(d.ach)) return true;
  // 旧存档在轮回盘买过的出身
  if (id === 'S05' && M.unlocks.includes('inkOrphan')) return true;
  if (id === 'S11' && M.unlocks.includes('dragon')) return true;
  if (id === 'S12' && M.unlocks.includes('painter')) return true;
  return false;
}

export function drawIdentity(g: Game) {
  const L = g.L;
  const M = g.M;
  const fam = L.attrs.fam;
  const bonus = tierBonus(M);
  const w = TIER_W.map((base, t) => {
    let v = base + bonus[t];
    if (t >= 1) v *= 1 + 0.05 * fam;
    if (t === 3) v = Math.min(TOP_TIER_CAP, v);
    return v;
  });
  const tiers = [0, 1, 2, 3].filter((t) => w[t] > 0 && IDENTITIES.some((d) => d.tier === t && identityOpen(M, d.id)));
  const tier = weighted(tiers, (t) => w[t]) ?? 0;
  const pool = IDENTITIES.filter((d) => d.tier === tier && identityOpen(M, d.id));
  const id = weighted(pool, (d) => (d.legend ? 0.6 : 1))!;
  L.identity = id.id;
  L.tier = tier;
  return id;
}

// 身份开局：灵石、法器、宗门功法与产业
export function applyIdentity(g: Game) {
  const L = g.L;
  const M = g.M;
  const d = IDENTITY_BY_ID[L.identity ?? 'S01'];
  const tier = d.tier as Tier;
  if (tier === 0) L.stones = randInt(0, 10) + (M.achievements.includes('A03') ? 30 : 0);
  else if (tier === 1) L.stones = randInt(60, 150);
  else if (tier === 2) L.stones = randInt(40, 90);
  else L.stones = randInt(150, 300);
  switch (d.id) {
    case 'S01': L.attrs.gen += 1; break;
    case 'S02': L.attrs.luck += 1; break;
    case 'S03': case 'S07': L.attrs.wu += 1; break;
    case 'S06': L.stones += 40; break;
    case 'S08': L.attrs.gen += 1; break;
    case 'S09': L.flags.extraCall = 1; break;
    case 'S10': L.stones += 200; break;
    case 'S16': L.school.sword += 20; break;
    case 'S17': L.favor = Math.min(3, L.favor + 2); break;
    case 'S20': L.stones += 300; break;
    case 'S21': L.school.demon += 30; break;
  }
  // 小富：一件法器（入道后可用）；宗门：一门黄阶功法；顶级：灵器 + 玄阶功法
  const sectGong: SkillId = d.id === 'S16' ? 'sword' : d.id === 'S21' ? 'ink' : pick(['sword', 'orbit', 'thunder', 'fire', 'frost'] as SkillId[]);
  if (tier === 1) L.flags.startQi = 1;
  if (tier >= 2) {
    L.flags['pendStart_' + sectGong] = tier === 3 || d.id === 'S15' ? 1 : 0;
    L.flags.sectCall = 1;
    L.flags.noNoRoot = 1;
  }
  if (tier === 3) L.flags.startQi = 2;
  if (tier >= 2) L.flags.startHold = tier === 3 ? 3 : 1;
  if (d.legend) {
    L.legend = d.legend;
    if (!M.discoveries.includes(d.legend)) M.discoveries.push(d.legend);
    g.applyLegend(d.legend);
  }
}

// 入道：身份给的功法与法器落袋
export function startKit(g: Game) {
  const L = g.L;
  for (const k of Object.keys(L.flags)) {
    if (!k.startsWith('pendStart_')) continue;
    const id = k.slice(10) as SkillId;
    const grade = L.flags[k];
    delete L.flags[k];
    if (!L.skills.some((s) => s.id === id) && L.skills.length < slotCount(L)) {
      L.skills.push({ id, lvl: 1, grade });
      g.log(`你带着出身里的${GF_GRADES[grade]}${GONGFA[id].name}入道。`);
    }
  }
  if (L.flags.startQi) {
    const grade = L.flags.startQi;
    delete L.flags.startQi;
    const s = L.skills.find((x) => !x.bm) ?? L.skills[0];
    if (s) giveQi(g, s.id, grade);
  }
}

// ---------------- 结算：功法谱与轮回碑 ----------------
export function settleBook(g: Game) {
  const L = g.L;
  const C = metaCult(g.M);
  for (const s of L.skills) {
    const be = (C.book[s.id] ??= { grade: 0, best: 0, reach: [0, 0, 0, 0, 0, 0], fj: [], grades: [] });
    be.grade = Math.max(be.grade, s.grade ?? 0);
    be.best = Math.max(be.best, s.lvl);
    for (let k = 1; k <= s.lvl; k++) be.reach[k] = (be.reach[k] ?? 0) + 1;
    if (!be.grades.includes(s.grade ?? 0)) be.grades.push(s.grade ?? 0);
    be.fj = [...(qiFor(L, s.id)?.fj ?? [])].slice(0, 3);
  }
  // 灵器以上进遗泽池：留作遗迹秘库的名字
  const fine = (L.bag ?? []).filter((t) => t.kind === 'gong' && t.grade >= 2);
  if (fine.length) L.flags.fineQi = fine.length;
}

export function checkAchievements(g: Game): string[] {
  const L = g.L;
  const M = g.M;
  const C = metaCult(M);
  const tier = L.tier ?? 0;
  if (tier === 0) C.mortalStreak += 1;
  else C.mortalStreak = 0;
  const lv = (id: SkillId) => L.skills.find((s) => s.id === id)?.lvl ?? 0;
  const knocked = L.ended === '叩门' || !!L.flags.lordBeaten;
  const cond: Record<string, boolean> = {
    A01: tier === 0 && L.realm >= 2,
    A02: L.identity === 'S04' && L.realm >= 3,
    A03: C.mortalStreak >= 3,
    A04: tier === 0 && knocked,
    A05: tier === 1 && (L.deathCause === '寿终正寝' || L.deathCause === '大限坐化'),
    A06: (L.maxStones ?? L.stones) >= 3000,
    A07: (L.marketSpent ?? 0) >= 1500,
    A08: !!L.flags.tourneyWin,
    A09: (L.holdings ?? []).some((h) => h.type === 'zong' && h.lv >= 5),
    A10: tier === 2 && L.route === 'sect' && L.realm >= 3,
    A11: (L.acqMet?.length ?? 0) >= 3,
    A12: bookEntries(M) >= 12,
    A13: lv('sword') >= 5,
    A14: !!L.flags.lordBeaten,
    A15: !!L.hook && ['Y04', 'Y14'].includes(L.hook.id) && L.hook.outcome === 'done',
    A16: L.school.demon >= 150 && L.realm >= 3,
    A17: L.realm >= 5,
    A18: L.traces.some((t) => t.tag === 'sword_tomb') && lv('sword') >= 4,
    A19: M.saga.lamps.danzun >= 3,
    A20: L.identity === 'S05' && L.realm >= 3,
    A21: M.saga.lamps.fox >= 3,
    A22: lv('art') >= 5,
    A23: !L.inDao && L.age >= 100,
    A24: C.saves >= 3,
    A25: (L.bag ?? []).some((t) => t.kind === 'gong' && t.grade >= 4),
    A26: (L.bag ?? []).some((t) => (t.fj ?? []).length >= 3),
    A27: M.lives >= 10,
    A28: !!L.flags.chiyiFought && (L.board?.seenLoc?.demon ?? 0) > 0,
    A29: !!L.flags.foxRiver || M.discoveries.includes('H2'),
    A30: M.saga.pages.includes(13) || L.pagesGot.includes(13),
  };
  const got: string[] = [];
  for (const a of ACHIEVEMENTS) if (cond[a.id] && !M.achievements.includes(a.id)) {
    M.achievements.push(a.id);
    got.push(a.id);
  }
  return got;
}

// ---------------- 给界面的说明 ----------------
export function identityLine(L: LifeState) {
  const d = IDENTITY_BY_ID[L.identity ?? ''];
  return d ? `${TIER_NAMES[d.tier]} · ${d.name}` : L.origin;
}
export function gongLine(L: LifeState, s: Skill) {
  const t = qiFor(L, s.id);
  const cap = layerCap(L, s);
  const g = s.grade ?? 0;
  const qi = t ? `${QI_GRADES[t.grade]}「${t.name}」${t.grade < GF_MIN_QI[g] ? '·器不承法' : ''}` : '无器可御';
  return { name: gongName(s), grade: GF_GRADES[g], layer: LAYER_NAMES[s.lvl], cap: LAYER_NAMES[cap], qi, fj: (t?.fj ?? []).map((f) => FUJUE[f].name), slots: t ? FJ_SLOTS[t.grade] : 0, school: SCHOOL_NAMES[GONGFA[s.id].school] };
}
