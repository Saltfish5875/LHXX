// 人生层 + 轮回层：一圈命途棋盘（岁首 → 掷骰走格 → 停下结算），死后回到轮回井
import { ATTR_NAMES, AttrKey, CN_NUM, REALMS, REALM_SCORE, ROOTS, SCHOOL_NAMES, School, TALENTS, TALENT_BY_ID, Talent, GRADE_WEIGHT, cnAge, gradeOf, originOf } from '../data/core';
import { COMPANION_NAMES, COMPANION_QUOTE, CompanionId, ENDINGS, HIDDEN, LEGENDS, MUTATORS, Mutator, OPENING, PAGES, REGRETS, SILU_DAILY, SILU_TRIGGER, VOLUME_NAMES, WISHES, WishDef } from '../data/content';
import { BATTLE_TITLES, CHOICES, ENCOUNTERS, FLAVORS, LOCATIONS, LOC_BY_ID, LifeEvent, LocationDef, NOTHING_CULT, NOTHING_MORTAL } from '../data/events';
import { BOND_EVENTS, BondEvent } from '../data/companions';
import { DEAD_END_TEXT, FATES, FATE_BY_ID, FATE_EVENTS, FLAVORS_MORE, NOTHING_CULT_MORE, NOTHING_MORTAL_MORE, ON_THE_WAY_CULT, ON_THE_WAY_MORTAL, RETIRE_LINES, TURN_EVENTS } from '../data/fate';
import { ACQ_GONE, ACQ_NICK, ACQ_SHAPE_NAMES, ACQ_TEXT, AcqShape, ERAS, ERA_BY_ID, FACES_SILU, HOOKS, HOOK_BY_ID, HookDef, IDENTITY_CHOICES, RELATION_NAMES, eraIndex, faceKinds } from '../data/faces';
import type { BattleSpec, BattleResult, PartnerSpec, Boss } from '../battle/spec';
import type { Acquaintance, BattleKind, Card, CardTag, Effect, LifeState, LogEntry, MetaState, Option, Skill, SkillId, Tendency } from './types';

const BEAT_NAMES = ['起', '转', '结'];
// 普通事件池里的身世抉择（只经「引」卡出现的除外）
const POOL_IDENTITY = IDENTITY_CHOICES.filter((e) => !e.hookOnly && e.options && e.options.length);
const ALL_CHOICES: LifeEvent[] = [...CHOICES, ...POOL_IDENTITY, ...NEW_ENCOUNTERS, ...CHAIN_STARTS, NEMESIS_EVENT];
const ALL_FLAVORS: LifeEvent[] = [...FLAVORS, ...FLAVORS_MORE];
const ALL_NOTHING_MORTAL = [...NOTHING_MORTAL, ...NOTHING_MORTAL_MORE];
const ALL_NOTHING_CULT = [...NOTHING_CULT, ...NOTHING_CULT_MORE];
const LOOKUP: LifeEvent[] = [...ALL_CHOICES, ...ALL_FLAVORS, ...ENCOUNTERS, ...FATE_EVENTS, ...TURN_EVENTS];
import { chance, pick, rand, randInt, weighted } from './rng';
import { RollAction, RollView, boardLap, recordLegacies } from './board';
import { UNLOCKS, WHEEL, hasPage, lampOf, saveLife, saveMeta, wheelPrice } from './meta';
import { afterBattleCult, applyIdentity, autoEquip, checkAchievements, drawIdentity, ensureCult, giveQi, grantFujue, grantItem, layerCap, layerUp, learnGong, loadoutSpec, metaCult, resolvePending, rotateShop, settleBook, shopItems, startKit, upgradeGrade } from './cult';
import { estDps } from '../battle/sim';
import { CHAIN_STARTS, NEMESIS_EVENT, flagEnemyMul, NEW_ENCOUNTERS, addEcho, chainOp, clanBirth, freeAllies, gainSum, giveGain, givePet, petRealmUp, rollBonus } from './chains';
import { trailArchive, trailChip, trailClose, trailHere, trailHint, trailLine, trailMark, trailOpen, trailPick, trailRef, trailReset, trailTop } from './trail';
import { ACHIEVEMENTS, GONGFA, IDENTITY_BY_ID, ITEMS, LAYER_NAMES, TIER_NAMES } from '../data/cult';

export interface PromptOption {
  label: string;
  desc?: string;
  disabled?: boolean;
}
export interface Prompt {
  title: string;
  text: string;
  options: PromptOption[];
  style?: 'event' | 'milestone' | 'battle' | 'well' | 'page' | 'ending' | 'epitaph' | 'legend';
  key?: string; // 自动模式用于判断是否暂停
  important?: boolean;
  autoPick?: number; // 自动模式 / 模拟脚本的默认选择（棋盘经营类提示）
}

export interface IO {
  choose(p: Prompt): Promise<number>;
  roll(v: RollView): Promise<RollAction>;
  battle(spec: BattleSpec): Promise<BattleResult>;
  pickTalents(cands: Talent[], heritage: string | null): Promise<string[]>;
  allocate(points: number, base: Record<AttrKey, number>, origins: string[]): Promise<{ attrs: Record<AttrKey, number>; origin: string | null }>;
  log(e: LogEntry): void;
  refresh(): void;
  pace(): Promise<void>;
  clearLog(): void;
}

const SKILL_NAMES: Record<SkillId, string> = Object.fromEntries(Object.values(GONGFA).map((g) => [g.id, g.name])) as Record<SkillId, string>;
export const skillName = (id: SkillId) => SKILL_NAMES[id];
const SKILL_SCHOOL: Record<SkillId, School> = Object.fromEntries(Object.values(GONGFA).map((g) => [g.id, g.school])) as Record<SkillId, School>;

// 战斗里功法的整体倍率（取代旧的战中升级，见 npm run sim 校准）
export const BATTLE_POWER = 1.1;

const FATAL_DEATHS = ['溺水早夭', '死于匪患', '死于瘟疫'];

export class Game {
  L!: LifeState;
  M: MetaState;
  io: IO;
  sim = false;
  curChain: string | null = null; // 正在走的因果链（链拍里的效果默认作用于它）
  private snapshot: string | null = null;
  prevSnapshot: string | null = null;
  battleSinceSnap = false;
  fairBonus = 0;
  rerolls = 0;
  pendingWish: string | null = null;

  constructor(meta: MetaState, io: IO) {
    this.M = meta;
    this.io = io;
  }

  // ================= 工具 =================
  get realm() {
    return REALMS[this.L.realm];
  }
  get step() {
    const s = this.L.inDao ? REALMS[this.L.realm].step : 1;
    return this.L.retired ? s * 2 : s;
  }
  has(t: string) {
    return this.L.talents.includes(t);
  }
  tflag(f: string) {
    return this.L.talents.some((t) => TALENT_BY_ID[t]?.flags?.includes(f));
  }
  lamp(c: CompanionId) {
    return lampOf(this.M, this.L, c);
  }
  hasPage(n: number) {
    return hasPage(this.M, this.L, n);
  }
  trace(tag: string) {
    if (!this.L.traces.some((t) => t.tag === tag)) this.L.traces.push({ tag, realm: this.L.realm });
    else this.L.traces.find((t) => t.tag === tag)!.realm = this.L.realm;
  }
  hasTrace(tag: string) {
    return this.L.traces.some((t) => t.tag === tag);
  }
  log(text: string, kind: LogEntry['kind'] = 'normal', extra: Partial<LogEntry> = {}) {
    const e: LogEntry = { age: this.L.age, text, kind, ...extra };
    this.L.log.push(e);
    this.io.log(e);
    trailLine(this, text);
  }
  highlight(text: string, score: number, type: string) {
    this.L.log.push({ age: this.L.age, text: '', kind: 'normal', hl: `${cnAge(this.L.age)}岁，${text}`, score, hlType: type });
  }

  lifespan(): number {
    const L = this.L;
    const g = L.attrs.gen;
    let base = L.inDao ? REALMS[L.realm].lifeBase + g * 2 : 48 + g * 3;
    let rate = 1 + 0.05 * (this.M.wheel.longevity ?? 0);
    if (this.tflag('longLife')) rate += 0.25;
    let extra = L.lifeBonus;
    if (!L.inDao) {
      for (const t of L.talents) extra += TALENT_BY_ID[t]?.life ?? 0;
      if (L.legend === 'L07') extra += 40;
      if (L.origin === '龙族血脉') extra -= 10;
    } else {
      if (this.has('jealous')) extra -= 15;
    }
    return Math.round(base * rate + extra);
  }

  xpNeed() {
    return REALMS[Math.min(5, this.L.realm + 1)]?.need ?? 4200;
  }
  need() {
    return this.L.inDao ? REALMS[this.L.realm].need : 0;
  }

  // ================= 开局 =================
  async newLife() {
    const M = this.M;
    M.lives += 1;
    this.io.clearLog();
    trailReset(this);
    const L: LifeState = {
      lifeNo: M.lives,
      age: 0,
      realm: 0,
      inDao: false,
      xp: 0,
      hp: 100,
      maxHp: 100,
      attrs: { gen: 0, wu: 0, luck: 0, fam: 0 },
      talents: [],
      origin: '',
      root: 'unknown',
      rootFailed: false,
      route: null,
      stones: 0,
      merit: 0,
      kills: 0,
      lifeBonus: 0,
      injuries: 0,
      traces: [],
      flags: {},
      school: { sword: 0, body: 0, alchemy: 0, demon: 0, rune: 0 },
      schoolCur: null,
      skills: [],
      favor: 0,
      inspire: 1,
      disciples: 0,
      partner: false,
      wish: null,
      log: [],
      pagesGot: [],
      bonds: {},
      companionsMet: [],
      injuredUntil: {},
      calm: 0,
      rerollsUsed: 0,
      battleKinds: [],
      battlesWon: 0,
      usedHelp: false,
      usedFormation: false,
      nextLoc: null,
      bans: {},
      choicesDone: [],
      deathCause: null,
      deathLoc: null,
      ended: null,
      legend: null,
      firstRealmBattle: [],
      hold: 0,
      rewindUsed: false,
      regretsActive: [],
      regretFixed: false,
      phoenixUsed: false,
      epitaphSpecial: null,
      homeVisits: 0,
      caveVisits: 0,
      mortalVisitsAfterSpirit: 0,
      marketCd: 0,
      era: 'E1',
      hook: null,
      acqMet: [],
      acqNew: [],
      acqResolved: [],
      acqCards: 0,
      insightExtra: 0,
      fate: 'fangu',
      daoji: null,
      cap: null,
      stall: null,
      retired: false,
      xpMul: 1,
      turnAt: null,
      turned: 0,
      seen: {},
    };
    this.L = L;
    if (M.lives === 1 && !this.sim) {
      await this.io.choose({ title: '青冥画卷', text: OPENING, options: [{ label: '落笔为人' }], style: 'legend' });
    }

    // 天赋 10 选 3（宿慧「前尘回响」每级 +1）
    const n = 10 + (M.wheel.echo ?? 0);
    const pool = TALENTS.slice();
    const cands: Talent[] = [];
    if (M.heritage && TALENT_BY_ID[M.heritage]) cands.push(TALENT_BY_ID[M.heritage]);
    while (cands.length < n && pool.length) {
      const t = weighted(pool.filter((p) => !cands.includes(p)), (p) => GRADE_WEIGHT[p.grade]);
      if (!t) break;
      cands.push(t);
    }
    L.talents = await this.io.pickTalents(cands, M.heritage);

    // 属性 20 点
    const base: Record<AttrKey, number> = { gen: 0, wu: 0, luck: 0, fam: 0 };
    for (const t of L.talents) for (const [k, v] of Object.entries(TALENT_BY_ID[t].attr ?? {})) base[k as AttrKey] += v as number;
    const { attrs } = await this.io.allocate(20 + (M.wheel.attr ?? 0), base, []);
    L.attrs = attrs;
    const nb = M.nextBonus ?? {};
    if (nb.fam) L.attrs.fam = Math.min(12, L.attrs.fam + nb.fam);
    clanBirth(this); // 前世立的家族：20% 投生本族
    // 轮回身份：按档位权重随机（家境与轮回碑加成）
    const idf = drawIdentity(this);
    L.origin = idf.origin ?? originOf(L.attrs.fam, this.tflag('orphan'));
    if (idf.tier === 0 && this.tflag('orphan')) L.origin = '山野孤儿';
    applyIdentity(this);
    if (this.tflag('stones60')) L.stones += 60;
    if (L.origin === '墨门遗孤') L.school.demon += 20;
    if (L.origin === '龙族血脉') L.attrs.gen += 3;
    if (L.origin === '画中仙裔') {
      L.school.rune += 20;
      L.inspire += 1;
    }
    for (const t of L.talents) {
      const s = TALENT_BY_ID[t].school;
      if (s) L.school[s] += 15;
    }
    // 命格：随天赋流派加权
    const fate = weighted(FATES, (f) => f.w(L))!;
    L.fate = fate.id;
    for (const s of fate.paths) L.school[s] += fate.paths.length > 1 ? 4 : 6;
    if (fate.id === 'fangu') L.xpMul = 0.92;
    (M.fates ??= []).includes(fate.id) || M.fates.push(fate.id);
    if (this.tflag('favor')) L.favor += 1;
    for (const c of ['fox', 'chiyi', 'danzun', 'bottle'] as CompanionId[]) if (this.M.saga.lamps[c] >= 2) L.favor += 1;
    L.favor = Math.min(L.favor, 3);
    L.maxHp = this.calcMaxHp();
    L.hp = L.maxHp;

    // 心愿（第三次死亡后解锁）
    if (this.pendingWish) {
      L.wish = { id: this.pendingWish, progress: 0, done: false };
      this.pendingWish = null;
    }
    // 遗憾在本世生效
    L.regretsActive = M.regrets.map((r) => ({ type: r.type, ref: r.ref }));

    // 传奇开局
    const lg = LEGENDS.filter((l) => l.talents.every((t) => L.talents.includes(t)) && this.legendExtraOk(l.extra));
    if (L.legend) {
      const l = LEGENDS.find((x) => x.id === L.legend);
      if (l) await this.io.choose({ title: `传奇出身 · ${l.name}`, text: `${l.text}\n\n${l.effect}`, options: [{ label: '开卷' }], style: 'legend', important: true });
    } else if (lg.length) {
      const l = lg.sort((a, b) => (b.extra ? 1 : 0) - (a.extra ? 1 : 0))[0];
      L.legend = l.id;
      if (!M.discoveries.includes(l.id)) M.discoveries.push(l.id);
      this.applyLegend(l.id);
      await this.io.choose({ title: `传奇开局 · ${l.name}`, text: `${l.text}\n\n${l.effect}`, options: [{ label: '开卷' }], style: 'legend', important: true });
    }

    // 一人千面：年代与引子
    if (nb.fortune) L.flags.fortuneLife = 1;
    if (nb.reroll) L.flags.rerollPlus = nb.reroll;
    if (nb.rerollOnce) this.fairBonus += nb.rerollOnce;
    const chooseHook = !!nb.chooseHook || (M.wheel.choose ?? 0) > 0;
    M.nextBonus = {};
    const eras = ERAS.filter((e) => e.unlock(M) && e.id !== M.lastEra);
    L.era = pick(eras.length ? eras : ERAS.filter((e) => e.unlock(M))).id;
    await this.pickHook(chooseHook);

    const talentNames = L.talents.map((t) => TALENT_BY_ID[t].name).join('、');
    this.log(`画卷 · ${ERA_BY_ID[L.era].name}：${ERA_BY_ID[L.era].open}`, 'fate');
    const idd = IDENTITY_BY_ID[L.identity ?? ''];
    this.log(`你出生在${L.origin}${idd && idd.name !== L.origin ? `，身份「${idd.name}」（${TIER_NAMES[idd.tier]}：${idd.desc}）` : ''}。天赋：${talentNames}。`, 'milestone');
    this.log(`命格「${fate.name}」：${fate.birth}（${fate.short}）`, 'fate');
    if (L.hook) {
      const h = HOOK_BY_ID[L.hook.id];
      this.log(`本世引子：「${h.name}」${h.start.birth ? '——' + h.start.birth : ''}`, 'fate');
    }
    if (L.wish) this.log(`本世心愿：「${this.wishDef(L.wish.id)?.name}」——${this.wishDef(L.wish.id)?.cond}`, 'wish');
    if (this.M.saga.endings.includes('T') && L.lifeNo > 0 && !L.flags.newLampShown) {
      this.log('你出生那夜，砚池边多了一盏新灯。提灯的人还很小，看不见东西，但她在笑。', 'fate');
      L.flags.newLampShown = 1;
    }
    trailMark(this, { kind: 'birth', title: `出生 · ${L.origin}`, text: `${ERA_BY_ID[L.era].name}。天赋：${talentNames}。命格「${fate.name}」。${L.hook ? `引子「${HOOK_BY_ID[L.hook.id].name}」。` : ''}${L.flags.clanBorn && M.clan ? `投生在「${M.clan.name}」。` : ''}` });
    this.io.refresh();
    this.takeSnapshot();
  }

  legendExtraOk(extra?: string) {
    if (!extra) return true;
    if (extra === 'swordTomb') return this.M.discoveries.includes('swordTomb');
    if (extra === 'danzun3') return this.M.saga.lamps.danzun >= 3;
    if (extra === 'fox3') return this.M.saga.lamps.fox >= 3;
    return false;
  }

  applyLegend(id: string) {
    const L = this.L;
    switch (id) {
      case 'L01':
        L.flags.forceGoodRoot = 1;
        L.lifeBonus -= 20;
        break;
      case 'L02':
        L.school.sword += 30;
        this.trace('sword_tomb');
        L.flags.swordStart = 1;
        break;
      case 'L03':
        L.school.alchemy += 30;
        break;
      case 'L04':
        L.school.demon += 40;
        break;
      case 'L06':
        L.school.rune += 30;
        L.inspire += 1;
        break;
      case 'L07':
        L.flags.noRootTest = 1;
        break;
    }
  }

  calcMaxHp() {
    const L = this.L;
    let hp = 100 + L.attrs.gen * 6 + L.realm * 20 + (L.flags.hpMax ?? 0);
    if (this.tflag('bodyHp')) hp *= 1.3;
    if (L.schoolCur === 'body') hp *= 1.15;
    return Math.round(hp);
  }

  // ================= 主循环 =================
  async runLife(resume = false) {
    if (!resume) await this.newLife();
    else {
      // 旧存档缺少一人千面字段时补默认值
      const L = this.L;
      L.era ??= 'E1';
      L.hook ??= null;
      L.acqMet ??= [];
      L.acqNew ??= [];
      L.acqResolved ??= [];
      L.acqCards ??= 0;
      L.insightExtra ??= 0;
      L.fate ??= 'fangu';
      L.daoji ??= L.realm >= 2 ? this.topSchool() : null;
      L.cap ??= null;
      L.stall ??= null;
      L.xpMul ??= 1;
      L.turnAt ??= null;
      L.turned ??= 0;
      L.seen ??= {};
      ensureCult(L);
      this.io.clearLog();
      for (const e of this.L.log) if (e.text) this.io.log(e);
      this.io.refresh();
      this.takeSnapshot();
    }
    while (!this.L.deathCause && !this.L.ended) {
      await this.year();
      this.io.refresh();
      if (!this.L.deathCause && !this.L.ended) {
        this.takeSnapshot();
        if (!this.sim) saveLife(this.L);
        await this.io.pace();
      }
    }
    saveLife(null);
    await this.well();
    saveMeta(this.M);
  }

  takeSnapshot() {
    this.prevSnapshot = this.snapshot;
    this.snapshot = JSON.stringify(this.L);
    this.battleSinceSnap = false;
  }

  async year() {
    const L = this.L;
    const step = this.step;
    L.age += step;
    if (L.hold > 0) L.hold -= 1;
    if (L.marketCd > 0) L.marketCd -= 1;
    for (const k of Object.keys(L.bans)) {
      L.bans[k] -= step;
      if (L.bans[k] <= 0) delete L.bans[k];
    }
    // 修为、回血、暗伤
    if (L.inDao) {
      const root = ROOTS.find((r) => r.id === L.root);
      let g = REALMS[L.realm].need * 0.034 * (root?.speed || 0.75) * (1 + (L.attrs.wu - 5) * 0.08);
      if (L.route === 'sect') g *= 1.1;
      if (this.tflag('lateBloomer') && L.age >= 30) g *= 1.4;
      if (L.injuries > 0) g *= 0.5;
      g *= L.xpMul ?? 1;
      if (L.flags.busyLap) g *= 0.7; // 上一圈停得太多，没顾上修行
      if ((L.bag ?? []).some((t) => t.key === 'yinling' && L.load?.passive.includes(t.uid))) g *= 1.1; // 引灵佩
      if (L.stall) g = 0; // 道心蒙尘
      L.xp += g;
      if (this.capped()) L.xp = Math.min(L.xp, this.need());
    }
    delete L.flags.busyLap;
    L.hp = Math.min(L.maxHp, L.hp + L.maxHp * (L.injuries > 0 ? 0.2 : 0.6));
    if (L.injuries > 0) L.injuries -= 1;

    // 寿元检查
    if (L.age >= this.lifespan()) {
      if (!L.inDao && L.age >= 120) return this.endHidden('H1');
      return this.die(L.inDao ? '大限坐化' : L.age >= 60 ? '寿终正寝' : '积劳成疾');
    }
    L.flags.spanLeft = this.lifespan() - L.age;
    if (L.flags.fateKnown && L.flags.spanLeft === 1) L.nextLoc = 'cross';

    await this.milestones();
    if (this.dead()) return;

    if (L.inDao && L.xp >= REALMS[L.realm].need && L.hold === 0) {
      if (this.blocked()) await this.deadEnd();
      else await this.bottleneck();
      if (this.dead()) return;
    }
    // 转机
    if (L.turnAt != null && L.age >= L.turnAt) {
      if (this.blocked()) await this.turningPoint();
      else L.turnAt = null;
      if (this.dead()) return;
    }

    this.checkPages();
    this.checkWish();
    this.updateSchool();
    if (L.retired) {
      if (chance(0.5)) this.log(pick(RETIRE_LINES));
      return;
    }
    if (L.age <= 5) {
      if (L.age === 3) this.log(pick(['你学会了走路，跌跌撞撞追着鸡跑。', '你会喊爹娘了。']));
      return;
    }

    if (L.inDao) await resolvePending(this);
    L.maxStones = Math.max(L.maxStones ?? 0, L.stones);
    await boardLap(this);
    if (this.dead()) return;
    this.checkPages();
    this.checkWish();
    this.updateSchool();
  }

  dead() {
    return !!this.L.deathCause || !!this.L.ended;
  }

  // ================= 里程碑 =================
  async milestones() {
    const L = this.L;
    if (L.age === 1) {
      const i = await this.ask('抓周', '满周岁，桌上摆了一圈物件。', ['木剑', '毛笔', '药碾', '拳套', '墨锭'], 'milestone');
      const s: School[] = ['sword', 'rune', 'alchemy', 'body', 'demon'];
      L.school[s[i]] += 5;
      this.log(`抓周时你抓住了${['木剑', '毛笔', '药碾', '拳套', '墨锭'][i]}。`, 'milestone');
      if (L.legend === 'L01') {
        this.enterDaoSilent();
      }
    }
    if (L.age === 6 && L.root === 'unknown') {
      if (L.flags.noRootTest) {
        L.root = 'none';
        this.log('家里没让你测灵根。老槐树下，你跟着祖父种地。');
      } else await this.rootTest();
    }
    // 洗髓奇缘
    if (!L.inDao && L.root === 'none' && L.age >= 10 && L.age <= 40 && !L.flags.noRootTest && chance(0.03 + L.attrs.luck * 0.003)) {
      const i = await this.ask('洗髓奇缘', '一位游方道人说你骨中有墨，愿以秘法为你洗髓。', ['受洗', '谢绝'], 'milestone', true);
      if (i === 0) {
        L.root = 'mixed';
        L.rootFailed = true;
        this.log('一场大汗之后，你的身体轻了许多。你有了灵根。', 'milestone');
      }
    }
    // 仙缘
    if (!L.inDao && L.root !== 'none' && L.root !== 'unknown') {
      let p = 0;
      if (L.age >= 8 && L.age <= 20) p = 0.08 + L.attrs.luck * 0.012 + (this.M.wheel.affinity ?? 0) * 0.04;
      else if (L.age <= 50) p = 0.015 + L.attrs.luck * 0.003;
      if (L.flags.declined) p *= 0.3;
      if (L.flags.extraCall) {
        p = Math.max(p * 1.5, 0.12);
        delete L.flags.extraCall;
      }
      const forced = (this.tflag('call6') && L.age === 6) || (this.tflag('call12') && L.age === 12) || ((L.origin === '修仙世家' || L.flags.sectCall) && L.age === 8) || L.flags.forceCall;
      if (forced || chance(p)) await this.immortalCall();
    }
    // 本世同行者相遇（命灯决定）
    if (L.age === 6 && this.lamp('fox') >= 6 && !L.companionsMet.includes('fox')) {
      L.companionsMet.push('fox');
      this.log('邻家搬来一个小女孩，总盯着你看。', 'companion');
    }
    if (L.age === 6 && L.legend === 'L05' && !L.companionsMet.includes('fox')) {
      L.companionsMet.push('fox');
      this.log('邻家搬来一个小女孩，总盯着你看。', 'companion');
    }
  }

  async rootTest() {
    const L = this.L;
    let r;
    if (this.tflag('noRoot') || L.legend === 'L04') r = ROOTS[0];
    else if (this.tflag('goodRoot') || L.flags.forceGoodRoot) r = ROOTS[6];
    else {
      const aff = this.M.wheel.affinity ?? 0;
      r = weighted(ROOTS, (x) => (x.id === 'none' ? Math.max(2, 18 - L.attrs.luck - aff * 3 - (this.tflag('noNoRoot') || L.flags.noNoRoot ? 99 : 0)) : x.w + (x.speed >= 1.2 ? L.attrs.luck * 0.4 : 0)))!;
    }
    L.root = r.id;
    if (r.id === 'none') {
      L.rootFailed = true;
      this.log('六岁测灵根，测灵石一点光也没亮。你是无灵根。', 'milestone');
    } else this.log(`六岁测灵根，测灵石亮起——${r.name}。`, 'milestone');
  }

  async immortalCall() {
    const L = this.L;
    delete L.flags.forceCall;
    const i = await this.ask('仙缘', '一位仙师路过，看中了你的根骨。', ['拜入宗门（修炼 +10%，可参加宗门大比）', '随散修云游（灵石 +30，奇遇更多）', '婉拒（留在凡间）'], 'milestone', true);
    if (i === 2) {
      L.flags.declined = 1;
      this.log('你婉拒了仙师，留在凡间。', 'milestone');
      return;
    }
    L.route = i === 0 ? 'sect' : 'rogue';
    if (i === 1) L.stones += 30;
    await this.enterDao();
  }

  enterDaoSilent() {
    const L = this.L;
    L.inDao = true;
    L.realm = 1;
    L.route = 'rogue';
    if (L.root === 'unknown') L.root = 'innate';
    L.skills = [{ id: 'sword', lvl: 1, grade: 0, bm: true }];
    ensureCult(L);
    this.log('你一岁时便引气入体，练气一层。', 'milestone');
    trailMark(this, { kind: 'realm', title: '踏上仙途', text: '一岁引气入体' });
    startKit(this);
    L.maxHp = this.calcMaxHp();
    L.hp = L.maxHp;
  }

  async enterDao() {
    const L = this.L;
    L.inDao = true;
    L.realm = 1;
    L.xp = 0;
    if (L.rootFailed) this.gainPage(3);
    // 择本命
    const opts: SkillId[] = ['sword', 'orbit', 'thunder', 'fire'];
    const cur = this.topSchool();
    if (cur === 'demon') opts[3] = 'ink';
    const i = await this.ask('择本命', '入道第一件事，是选一门本命功法。本命功法与道基相合时，层数上限 +1。', opts.map((s) => `${SKILL_NAMES[s]}（${SCHOOL_NAMES[SKILL_SCHOOL[s]]}，配${GONGFA[s].qi}）｜${GONGFA[s].desc}`), 'milestone');
    const bm = opts[i];
    L.skills = L.skills.filter((s) => s.id !== bm);
    L.skills.unshift({ id: bm, lvl: L.flags.swordStart && bm === 'sword' ? 2 : 1, grade: GONGFA[bm].grade0, bm: true });
    for (const s of L.skills.slice(1)) delete s.bm;
    L.school[SKILL_SCHOOL[bm]] += 5;
    ensureCult(L);
    L.maxHp = this.calcMaxHp();
    L.hp = L.maxHp;
    this.log(`${cnAge(L.age)}岁，你${L.route === 'sect' ? '拜入宗门' : '随散修云游'}，踏上仙途，本命功法${SKILL_NAMES[bm]}，本命法宝凡器「${L.bag!.find((t) => t.key === bm)?.name ?? ''}」。`, 'milestone', { hl: '', score: 0 });
    startKit(this);
    autoEquip(L);
    this.highlight('踏上仙途', 40, 'dao');
    trailMark(this, { kind: 'realm', title: '踏上仙途', text: `${L.route === 'sect' ? '拜入宗门' : '随散修云游'}，本命功法${SKILL_NAMES[bm]}` });
    // 入门试炼
    await this.fight({ kind: 'beast', title: '入门试炼', loc: 'trial0', tutorial: true });
  }

  topSchool(): School {
    const s = this.L.school;
    return (Object.keys(s) as School[]).sort((a, b) => s[b] - s[a])[0];
  }

  updateSchool() {
    const L = this.L;
    const top = this.topSchool();
    if (L.school[top] < 40) return;
    if (!L.schoolCur) {
      L.schoolCur = top;
      this.log(`你的道路渐渐清晰：本世流派为「${SCHOOL_NAMES[top]}」。`, 'milestone');
      this.checkTianming();
    } else if (top !== L.schoolCur && L.school[top] > L.school[L.schoolCur] + 20) {
      L.schoolCur = top;
      this.log(`你的道路转向了「${SCHOOL_NAMES[top]}」。`, 'milestone');
    }
  }

  checkTianming() {
    const L = this.L;
    const ss = L.talents.map((t) => TALENT_BY_ID[t].school).filter(Boolean);
    if (ss.length === 3 && ss.every((s) => s === ss[0]) && !L.flags.tianming) {
      L.flags.tianming = 1;
      this.log(`天命：三项天赋同属${SCHOOL_NAMES[ss[0]!]}，你生来就是这条路上的人。`, 'fate');
    }
  }

  // ================= 命途分岔与修为尽头 =================
  capped() {
    const L = this.L;
    return L.inDao && L.cap != null && L.realm >= L.cap;
  }
  blocked() {
    return this.capped() || (this.L.inDao && !!this.L.stall);
  }

  // 筑基时铸道基：只能在「当前最高的道途」与「本命道途」之间选；本命落后太多就选不了
  async castDaoji() {
    const L = this.L;
    const f = FATE_BY_ID[L.fate ?? 'fangu'];
    const top = this.topSchool();
    const paths = f.paths;
    const best = paths.length ? paths.slice().sort((a, b) => L.school[b] - L.school[a])[0] : null;
    const fits = (s: School) => paths.includes(s);
    const opts: PromptOption[] = [];
    const keys: School[] = [];
    let pick0: School = top;
    if (paths.length) {
      opts.push({ label: `以${SCHOOL_NAMES[top]}铸基`, desc: `道途 ${L.school[top]}；${fits(top) ? '本命相合：修炼 ×1.25' : `与「${f.name}」不合：此世恐止步金丹`}` });
      keys.push(top);
      if (best && best !== top) {
        const gap = L.school[top] - L.school[best];
        const ok = gap <= 10;
        opts.push({ label: `逆势以${SCHOOL_NAMES[best]}铸基`, desc: ok ? '本命相合：修炼 ×1.25；代价：折寿 15 年，气血上限 -10' : `道途已偏：${SCHOOL_NAMES[best]} ${L.school[best]}，落后 ${gap}（需在 10 以内）`, disabled: !ok });
        keys.push(best);
      }
      const i = opts.length > 1 ? await this.choose({ title: '铸道基', text: `筑基之时，要把这些年走过的路铸成道基。道基一成，此世便只能沿着它走。\n\n命格「${f.name}」：${f.short}`, options: opts, style: 'milestone', key: 'daoji', important: true }) : 0;
      pick0 = keys[i] ?? top;
      if (pick0 !== top) {
        L.lifeBonus -= 15;
        L.flags.hpMax = (L.flags.hpMax ?? 0) - 10;
        L.maxHp = this.calcMaxHp();
        L.hp = Math.min(L.hp, L.maxHp);
        L.school[pick0] = Math.max(L.school[pick0], L.school[top] + 5);
      }
    }
    L.daoji = pick0;
    L.schoolCur = pick0;
    if (!paths.length) {
      this.log(`道基铸成：${SCHOOL_NAMES[pick0]}。`, 'milestone');
    } else if (fits(pick0)) {
      L.xpMul = (L.xpMul ?? 1) * 1.25;
      this.log(`道基铸成：${SCHOOL_NAMES[pick0]}。与「${f.name}」相合，修行一日千里。`, 'milestone');
      this.highlight(`${f.name}铸${SCHOOL_NAMES[pick0]}道基`, 45, 'daoji');
    } else {
      L.cap = 3;
      L.capReason = 'daoji';
      this.log(`道基铸成：${SCHOOL_NAMES[pick0]}。可经脉里隐隐作痛——与「${f.name}」不合，此世修为恐怕过不了金丹。`, 'fate');
    }
  }

  // 被困住以后，转机会不会来、什么时候来
  scheduleTurn(p: number) {
    const L = this.L;
    if (L.turnAt != null || (L.turned ?? 0) >= 2) return;
    if (chance(p + L.attrs.luck * 0.015 + (L.merit >= 150 ? 0.05 : 0) + (L.flags.baopu ? 0.15 : 0))) L.turnAt = L.age + this.step * randInt(3, 12);
  }

  async deadEnd() {
    const L = this.L;
    L.xp = Math.min(L.xp, this.need());
    if (L.flags.deadEndShown) return;
    L.flags.deadEndShown = Math.max(1, L.age);
    L.flags.blockedAt ??= Math.max(1, L.age);
    const f = FATE_BY_ID[L.fate ?? 'fangu'];
    const text = L.stall ? DEAD_END_TEXT.stall : L.capReason === 'daoji' ? f.deadEnd : DEAD_END_TEXT[L.capReason ?? ''] ?? DEAD_END_TEXT.stall;
    this.log(`修为尽头：此世止于${REALMS[L.realm].name}。`, 'fate');
    this.highlight(`止步${REALMS[L.realm].name}`, 30 + 10 * L.realm, 'deadEnd');
    this.scheduleTurn(0.25);
    const i = await this.ask('修为尽头', `${text}\n\n这一世的修行，走到头了。`, ['安度余生｜岁月流逝加快，转机仍可能到来', '入世再寻｜照常过日子，等一个转机'], 'milestone', true, 'deadEnd');
    if (i === 0) {
      L.retired = true;
      this.log('你封了洞府，不再闭关。', 'milestone');
    }
  }

  async turningPoint() {
    const L = this.L;
    L.turnAt = null;
    L.turned = (L.turned ?? 0) + 1;
    const ok = TURN_EVENTS.filter((e) => !L.choicesDone.includes(e.id) && (!e.when || e.when(L, this.M)));
    if (!ok.length) return;
    if (L.retired) this.log('岁月静好之中，转机来了。', 'fate');
    await this.runEvent(pick(ok), L.inDao ? 'cave' : 'home', { v: false }, '转机');
    if (this.dead()) return;
    if (!this.blocked()) {
      if (L.retired) this.log('你推开封了多年的洞府门。', 'milestone');
      L.retired = false;
      L.flags.turnedOk = 1;
      this.log('前路重开。', 'fate');
    } else this.scheduleTurn(0.2);
  }

  async applyFate(f: NonNullable<Effect['fate']>) {
    const L = this.L;
    if (f.tag) L.flags[f.tag] = Math.max(1, L.age);
    if (f.capHere && L.inDao) {
      L.cap = L.realm;
      L.capReason = f.breakVow ?? 'event';
      this.log(`此世修为，止于${REALMS[L.realm].name}。`, 'fate');
    } else if (f.breakVow && L.inDao) {
      L.stall = f.breakVow;
      L.flags.blockedAt ??= Math.max(1, L.age);
      this.log('道心蒙尘：修为停滞，劫雷不应。', 'fate');
      this.scheduleTurn(0.3);
    }
    if (f.lift) {
      if (L.cap != null) L.cap = f.lift >= 99 ? null : L.cap + f.lift;
      if (L.cap == null) L.capReason = undefined;
      delete L.flags.deadEndShown;
    }
    if (f.clearStall && L.stall) {
      L.stall = null;
      delete L.flags.deadEndShown;
      this.log('道心复明。', 'fate');
    }
    if (f.xpMul) L.xpMul = (L.xpMul ?? 1) * f.xpMul;
    if (f.retire) L.retired = true;
    if (f.recast && L.inDao) {
      L.realm = 2;
      L.xp = 0;
      L.cap = null;
      L.capReason = undefined;
      L.daoji = null;
      L.retired = false;
      delete L.flags.deadEndShown;
      const fd = FATE_BY_ID[L.fate ?? 'fangu'];
      if (fd.paths.length) L.school[fd.paths[0]] += 30;
      if (L.xpMul && L.xpMul < 1) L.xpMul = 1;
      L.maxHp = this.calcMaxHp();
      L.hp = Math.min(L.hp, L.maxHp);
      this.log('你跌回了筑基。', 'milestone');
      await this.castDaoji();
    }
  }

  // ================= 瓶颈与渡劫 =================
  async bottleneck() {
    const L = this.L;
    const R = REALMS[L.realm];
    const isAscend = L.realm === 5;
    const title = isAscend ? '飞升天门劫' : `瓶颈 · ${R.trial}`;
    const text = isAscend
      ? this.M.saga.volume >= 3
        ? '化神圆满。天门在画卷尽头等你，门前站着一个人。'
        : '化神圆满。卷首的天门若隐若现，可三千年来无人走过去。'
      : `修为圆满，${R.trial}（${R.strikes} 道劫雷）在头顶聚集。`;
    const i = await this.ask(title, text, ['引动天劫 · 问道（败则身死）', '引动天劫 · 逍遥（败则修为减半、折寿一成）', '压境沉淀（三回合后再说）'], 'battle', true);
    if (i === 2) {
      L.hold = 3;
      this.log('你压住境界，沉淀三回合。');
      return;
    }
    const mode = i === 0 ? 'ask' : 'free';
    const res = await this.fight({ kind: 'trial', title: R.trial, loc: 'trial', mode });
    if (!res) return;
    if (res.win) await this.breakthrough();
  }

  async breakthrough() {
    const L = this.L;
    if (L.realm === 5) return; // 化神的劫在 fight 里处理（叩门 / 劫主）
    L.realm += 1;
    L.xp = 0;
    if (L.hook && !L.hook.outcome && L.hook.beat === 1) L.hook.due = Math.min(L.hook.due, L.age);
    L.maxHp = this.calcMaxHp();
    L.hp = L.maxHp;
    petRealmUp(this);
    const name = REALMS[L.realm].name;
    this.log(`渡劫成功，突破${name}！寿元大增。`, 'milestone');
    trailMark(this, { kind: 'realm', title: `突破${name}` });
    if (L.realm === 2 && !L.daoji) await this.castDaoji();
    this.highlight(`渡${REALMS[L.realm - 1].trial}`, 60 + 10 * L.realm, 'realm');
    if (L.realm === 2) this.gainPage(4);
    if (L.realm === 3) this.gainPage(11);
    if (L.realm === 4) {
      this.gainPage(15);
      if (L.kills === 0) this.gainPage(20);
      this.trace('heart_demon');
    }
    if (L.realm === 5 && L.partner && L.wish?.id === 'W39') this.completeWish();
    // 突破：本命功法 +1 层；渡劫所悟：自选一门 +1 层
    const bm = L.skills.find((s) => s.bm);
    if (bm) layerUp(this, bm, '突破');
    const can = L.skills.filter((s) => s.lvl < layerCap(L, s));
    if (can.length) {
      const j = can.length > 1 ? await this.choose({ title: '渡劫所悟', text: '劫雷里看清了一点东西。把它用在哪门功法上？', options: can.map((s) => ({ label: SKILL_NAMES[s.id], desc: `${LAYER_NAMES[s.lvl]} → ${LAYER_NAMES[s.lvl + 1]}` })), style: 'milestone', key: 'trialInsight', autoPick: 0 }) : 0;
      layerUp(this, can[j] ?? can[0], '渡劫所悟');
    } else L.xinde = (L.xinde ?? 0) + 2;
    // 宗门传诀 / 散修机缘
    if (L.route === 'sect') {
      this.log('宗门按境界赐下一枚附诀。');
      grantFujue(this);
    } else if (chance(0.5)) grantFujue(this);
    if (L.skills.length < this.slots()) {
      const fresh = (['sword', 'orbit', 'thunder', 'fire', 'frost'] as SkillId[]).filter((x) => !L.skills.some((s) => s.id === x));
      if (fresh.length) {
        const pool = fresh.sort(() => rand() - 0.5).slice(0, 2);
        const k = await this.choose({ title: L.route === 'sect' ? '宗门传功' : '散修机缘', text: `${REALMS[L.realm].name}之后多了一个功法位。挑一门功法（附一件凡器）。`, options: [...pool.map((x) => ({ label: SKILL_NAMES[x], desc: `${SCHOOL_NAMES[SKILL_SCHOOL[x]]} · ${GONGFA[x].desc}` })), { label: '暂且空着' }], style: 'milestone', key: 'newGong', autoPick: 0 });
        if (k < pool.length) learnGong(this, pool[k]);
      }
    }
  }

  slots() {
    return [2, 2, 3, 4, 4, 4][Math.max(0, this.L.realm)];
  }

  // 顿悟：随机一门未到上限的功法 +1 层，都到顶则化作心得
  upgradeRandomSkill(reason: string) {
    const L = this.L;
    const up = L.skills.filter((s) => s.lvl < layerCap(L, s));
    if (!up.length) {
      if (L.skills.length) {
        L.xinde = (L.xinde ?? 0) + 1;
        this.log(`${reason}：功法都到了此境上限，化作心得 +1。`);
      }
      return;
    }
    layerUp(this, pick(up), reason);
  }

  // 得一门功法（附凡器）；已会则 +1 层
  addSkill(id: SkillId) {
    learnGong(this, id);
  }

  // ================= 地点（命途棋盘的流年格） =================
  availableLocs(): LocationDef[] {
    const L = this.L;
    const stage = L.inDao ? 'cult' : 'mortal';
    return LOCATIONS.filter((l) => l.stage === stage && (!l.avail || l.avail(L, this.M)) && !L.bans[l.id] && (l.id !== 'demon' || this.M.unlocks.includes('demon')));
  }

  // 年代与本世加成对地点权重的倍率
  locMult(loc: string) {
    const L = this.L;
    let m = ERA_BY_ID[L.era ?? 'E1']?.weight[loc] ?? 1;
    if (loc === 'fortune' && (L.flags.fortuneLife || L.flags.fortuneYear === L.age)) m *= 1.5;
    return m;
  }

  reunionCandidate(): Acquaintance | null {
    const L = this.L;
    const list = (this.M.acquaintances ?? []).filter((a) => !a.resolved && !L.acqMet!.includes(a.id) && a.life < L.lifeNo);
    return list.length ? pick(list) : null;
  }

  acqShape(a: Acquaintance): AcqShape {
    const now = eraIndex(this.L.era);
    const then = eraIndex(a.era);
    return now === then ? 'same' : now > then ? 'later' : 'earlier';
  }

  relatedLocs(): string[] {
    const L = this.L;
    const out: string[] = [];
    for (const r of L.regretsActive) if (r.type === 'place') out.push(r.ref);
    const w = L.wish?.id;
    if (w === 'W04' || w === 'W35' || w === 'W11' || w === 'W20') out.push('karma', 'roam');
    if (w === 'W08' || w === 'W15' || w === 'W37') out.push('karma', 'demon');
    if (w === 'W09' || w === 'W36' || w === 'W38' || w === 'W16') out.push('karma', 'fortune');
    if (w === 'W05' || w === 'W29') out.push('forest', 'realm');
    if (w === 'W12') out.push('fortune');
    return out;
  }

  rerollCount() {
    const L = this.L;
    return (
      Math.floor(L.attrs.luck / 4) +
      L.talents.filter((t) => TALENT_BY_ID[t].flags?.includes('extraReroll')).length +
      (this.M.wheel.fate ?? 0) +
      (L.flags.rerollPlus ?? 0) +
      this.fairBonus
    );
  }

  cardFace(c: Card): { name: string; icon: string; hint: string } {
    const L = this.L;
    if (c.tag === '引' && L.hook) {
      const h = HOOK_BY_ID[L.hook.id];
      const b = h.beats[L.hook.beat];
      return { name: h.name, icon: '引', hint: `${BEAT_NAMES[L.hook.beat]}·${b.title}${L.hook.deferred ? `（已顺延 ${L.hook.deferred} 年）` : ''}` };
    }
    if (c.tag === '故' && c.acq) {
      const a = (this.M.acquaintances ?? []).find((x) => x.id === c.acq);
      if (a) return { name: a.name, icon: '故', hint: `${RELATION_NAMES[a.relation]} · ${ACQ_SHAPE_NAMES[this.acqShape(a)]}` };
    }
    const d = LOC_BY_ID[c.loc];
    const rn = ERA_BY_ID[L.era ?? 'E1']?.rename?.[c.loc];
    return { name: rn?.name ?? d.name, icon: d.icon, hint: rn?.hint ?? d.hint };
  }

  peekLabel(c: Card): string {
    if (c.tag === '引' || c.tag === '故') return this.cardFace(c).hint;
    const id = c.peeked!;
    if (id === 'nothing') return '平淡无事';
    if (id.startsWith('battle:')) return '劫难：' + id.slice(7);
    if (id.startsWith('bond:')) return '同行者事件';
    if (id === 'fatal') return '致命意外';
    if (id === 'market') return '坊市开张';
    if (id.startsWith('regret:')) return '前世遗憾';
    const e = LOOKUP.find((x) => x.id === id);
    return e ? e.text : '未知';
  }

  async rewind() {
    if (!this.prevSnapshot) return;
    const restored = JSON.parse(this.prevSnapshot) as LifeState;
    restored.rewindUsed = true;
    this.L = restored;
    this.trace('rewound');
    this.io.clearLog();
    for (const e of this.L.log) if (e.text) this.io.log(e);
    this.log('掌天瓶微微一亮。你眨了一下眼，回到了上一年的岁首。', 'fate');
    this.snapshot = JSON.stringify(this.L);
    this.prevSnapshot = null;
  }

  // 前往：按「本地点专属池 → 类别通用池 → 无事句」抽取
  pickEvent(c: Card): { id: string; ev?: LifeEvent; bond?: BondEvent } | null {
    const L = this.L;
    const loc = c.loc;
    const def = LOC_BY_ID[loc];
    if (c.tag === '劫' && def.battle) return { id: 'battle:' + pick(BATTLE_TITLES[loc] ?? ['劫难']) };
    if (c.tag === '凶') return { id: 'fatal' };
    // 前世遗憾的弥补事件
    for (const r of L.regretsActive) {
      if (r.type === 'place' && r.ref === loc) return { id: 'regret:place' };
      if (r.type === 'breakthrough' && loc === 'cave' && L.inDao) return { id: 'regret:breakthrough' };
      if (r.type === 'grudge' && (loc === 'neighbor' || loc === 'home' || loc === 'cross')) return { id: 'regret:grudge' };
      if (r.type === 'treasure' && (loc === 'fortune' || loc === 'bazaar') && L.inDao) return { id: 'regret:treasure' };
    }
    if (loc === 'river' && this.M.hebo >= 3 && !L.flags.heboMet) return { id: 'hebo' };
    // 同行者事件
    const bond = this.readyBond(loc, c.tag === '缘' || loc === 'karma');
    if (bond) return { id: `bond:${bond.comp}:${bond.n}`, bond };
    // 命格事件链：道途的诱惑、戒律与尘缘
    const fe = FATE_EVENTS.filter((e) => e.locs.includes(loc) && !L.choicesDone.includes(e.id) && (!e.when || e.when(L, this.M)));
    if (fe.length && chance(0.5)) return { id: '', ev: pick(fe) };
    if (loc === 'bazaar' && L.marketCd === 0 && L.stones >= 40 && chance(0.6)) return { id: 'market' };
    const ok = (e: LifeEvent) => e.locs.includes(loc) && (e.repeat || !L.choicesDone.includes(e.id)) && (!e.when || e.when(L, this.M));
    const choices = ALL_CHOICES.filter((e) => (e.locs.includes(loc) || (e.anyLoc && def.stage === (L.inDao ? 'cult' : 'mortal'))) && !L.choicesDone.includes(e.id) && (!e.when || e.when(L, this.M)));
    const enc = ENCOUNTERS.filter(ok);
    const flav = ALL_FLAVORS.filter((e) => e.kind !== 'fatal' && ok(e));
    // 同一世少重复：见过的流水与奇遇权重递减
    const seenW = (e: LifeEvent) => 1 / (1 + 3 * (L.seen?.[e.id] ?? 0));
    // 跨世冷却：最近两世见过的抉择尽量不再出
    const recent = new Set((this.M.recentChoices ?? []).flat());
    const fresh = choices.filter((e) => !recent.has(e.id));
    const isChance = c.tag === '缘' || loc === 'fortune' || loc === 'karma' || loc === 'rift';
    if (isChance && enc.length && chance(0.75)) return { id: '', ev: weighted(enc, seenW)! };
    const pc = (isChance ? 0.8 : 0.55) * (fresh.length ? 1 : 0.3);
    // 原有抉择权重 2，扩充的奇遇 1，链的起拍 1.5（宿敌 3）：扩充之后老抉择也还常见
    if (choices.length && chance(pc)) return { id: '', ev: weighted(fresh.length ? fresh : choices, (e) => e.weight ?? (e.sort ? 1 : 2))! };
    if (enc.length && chance(0.3)) return { id: '', ev: weighted(enc, seenW)! };
    if (flav.length) return { id: '', ev: weighted(flav, seenW)! };
    return null;
  }

  readyBond(loc: string, boosted: boolean): BondEvent | null {
    const L = this.L;
    const comps: Exclude<CompanionId, 'silu'>[] = ['fox', 'chiyi', 'danzun', 'bottle'];
    const ready: BondEvent[] = [];
    for (const c of comps) {
      if ((L.bonds[c] ?? 0) >= 2) continue;
      if (c === 'fox' && L.flags.foxDead) continue;
      if (c === 'chiyi' && L.flags.chiyiDead) continue;
      if (c === 'danzun' && L.flags.danzunEnd) continue;
      if (c === 'bottle' && L.flags.bottleEnd) continue;
      const lamp = this.lamp(c);
      if (lamp >= 9) continue;
      let n = lamp + 1;
      if (c === 'bottle' && n === 3) continue; // 死前一刻
      let be = BOND_EVENTS.find((b) => b.comp === c && b.n === n);
      if (!be || !be.cond(L, this.M)) {
        // 补段：前几世错过了带天书页的选项，这一世还能再遇上（不再点灯）
        be = BOND_EVENTS.find((b) => b.comp === c && b.n <= lamp && b.options.some((o) => o.page && !this.hasPage(o.page)) && b.cond(L, this.M) && !L.choicesDone.includes(`bond:${c}:${b.n}`));
        if (!be) continue;
      }
      const mortalLoc = (c === 'fox' && n === 6 && ['neighbor', 'river'].includes(loc)) || (c === 'chiyi' && n === 7 && ['road', 'neighbor'].includes(loc));
      if (L.inDao ? loc === 'karma' || (boosted && loc === 'fortune') || (loc === 'roam' && c === 'fox' && n === 1) : mortalLoc) ready.push(be);
    }
    if (!ready.length) return null;
    if (loc !== 'karma' && !boosted && !chance(0.5)) return null;
    return pick(ready);
  }

  // 停在地点格：抽事件并结算，返回是否打过仗
  async goTo(c: Card): Promise<boolean> {
    const L = this.L;
    const def = LOC_BY_ID[c.loc];
    if (c.loc === 'home') L.homeVisits += 1;
    if (c.loc === 'cave') L.caveVisits += 1;
    if (L.realm >= 5 && def.stage === 'mortal') L.mortalVisitsAfterSpirit += 1;
    if (L.homeVisits >= 8 && !L.inDao) this.trace('hometown');
    if (L.caveVisits >= 10) this.trace('cave_heaven');
    if (c.loc === 'demon') this.trace('ink_touched');
    if (c.loc === 'rift') this.trace('rift');
    if (c.loc === 'fair') this.fairBonus += 1;
    if (c.loc === 'cave' && L.inDao) L.xp += this.need() * (0.03 + gainSum(L, 'xp') * 0.1 + (L.pet?.kind === 'lynx' ? 0.01 : 0));
    if (c.loc === 'home' && !L.inDao) L.stones += Math.max(1, Math.floor(L.attrs.fam / 2));
    if (c.loc === 'trace') L.flags.extraCall = 1;
    // 被困住时，去机缘、因果处寻转机
    if (this.blocked() && (c.loc === 'fortune' || c.loc === 'karma')) {
      if (L.turnAt != null) L.turnAt = Math.min(L.turnAt, L.age + this.step);
      else this.scheduleTurn(0.1);
    }

    if (c.tag === '引' || c.tag === '故') {
      const fought = { v: false };
      if (c.tag === '引') await this.hookBeat(c, fought);
      else await this.reunion(c, fought);
      return fought.v;
    }
    let picked: { id: string; ev?: LifeEvent; bond?: BondEvent } | null;
    if (c.peeked) picked = this.resolvePeeked(c);
    else picked = this.pickEvent(c);

    const fought = { v: false };
    await this.runPicked(c, picked, fought);
    // 「顺路」流水账
    if (!this.dead() && chance(0.12)) this.log(pick(L.inDao ? ON_THE_WAY_CULT : ON_THE_WAY_MORTAL));
    return fought.v;
  }

  resolvePeeked(c: Card) {
    const id = c.peeked!;
    if (id === 'nothing') return null;
    if (id.startsWith('battle:')) return { id };
    if (id === 'fatal' || id === 'market' || id === 'hebo' || id.startsWith('regret:')) return { id };
    if (id.startsWith('bond:')) {
      const [, comp, n] = id.split(':');
      const bond = BOND_EVENTS.find((b) => b.comp === comp && b.n === Number(n));
      return { id, bond };
    }
    const ev = LOOKUP.find((x) => x.id === id);
    return ev ? { id: '', ev } : null;
  }

  async runPicked(c: Card, picked: { id: string; ev?: LifeEvent; bond?: BondEvent } | null, fought: { v: boolean }) {
    const L = this.L;
    const def = LOC_BY_ID[c.loc];
    if (!picked) {
      this.log(pick(L.inDao ? ALL_NOTHING_CULT : ALL_NOTHING_MORTAL), 'normal', { loc: c.loc });
      return;
    }
    const id = picked.id;
    if (id.startsWith('battle:')) {
      fought.v = true;
      let kind: BattleKind = c.loc === 'realm' && chance(0.4) ? 'duel' : def.battle ?? 'beast';
      const era = ERA_BY_ID[L.era ?? 'E1'];
      if (kind === 'beast' && era?.duelBoost && chance(era.duelBoost)) kind = 'duel';
      else if (kind === 'duel' && c.loc !== 'gate' && era?.beastBoost && chance(era.beastBoost)) kind = 'beast';
      const title = kind === 'duel' && era?.duelTitles ? pick(era.duelTitles) : L.era === 'E3' && kind === 'beast' ? '海妖上岸' : id.slice(7);
      await this.fight({ kind, title, loc: c.loc, prep: true });
      return;
    }
    if (id === 'fatal') return this.fatalAt(c.loc);
    if (id === 'market') return this.market();
    if (id === 'hebo') return this.hebo();
    if (id.startsWith('regret:')) return this.regretEvent(id.slice(7), c.loc);
    if (picked.bond) return this.bondEvent(picked.bond, fought);
    if (picked.ev) return this.runEvent(picked.ev, c.loc, fought);
  }

  async fatalAt(loc: string) {
    const L = this.L;
    const ev = FLAVORS.find((e) => e.kind === 'fatal' && e.locs.includes(loc));
    if (!ev || !ev.fatal) return;
    const tid = trailOpen(this, { kind: 'flavor', title: `${LOC_BY_ID[loc]?.name ?? ''}遇险`, loc, text: ev.text });
    try {
      await this.fatal0(ev, loc);
    } finally {
      trailClose(this, tid);
    }
  }
  private async fatal0(ev: LifeEvent, loc: string) {
    const L = this.L;
    if (!ev.fatal) return;
    let p = ev.fatal.chance;
    if (loc === 'road' && L.flags.escort) p *= 2;
    if (loc === 'river' && (L.flags.foxRiver || L.origin === '龙族血脉')) p = 0;
    if (loc === 'sickbed') p *= Math.max(0.3, 1 - L.attrs.gen * 0.08);
    if (loc === 'river' || loc === 'road') p *= Math.max(0.4, 1 - L.attrs.gen * 0.05);
    this.log(ev.text, 'normal', { loc });
    if (loc === 'river') this.trace('river');
    if (chance(p)) return this.die(ev.fatal.cause, loc);
    this.log('有惊无险，捡回一条命。');
  }

  // ================= 事件解释器 =================
  async runEvent(e: LifeEvent, loc: string, fought: { v: boolean }, title?: string) {
    const tid = trailOpen(this, { kind: e.kind === 'flavor' || !e.options ? 'flavor' : 'choice', title: title ?? e.title ?? LOC_BY_ID[loc]?.name ?? '抉择', loc, text: e.text, ev: e, past: e.id === 'NEMESIS' ? ['nemesis'] : undefined });
    try {
      await this.runEvent0(e, loc, fought, title);
    } finally {
      trailClose(this, tid);
    }
  }
  private async runEvent0(e: LifeEvent, loc: string, fought: { v: boolean }, title?: string) {
    const L = this.L;
    if (!e.repeat) L.choicesDone.push(e.id);
    else (L.seen ??= {})[e.id] = (L.seen[e.id] ?? 0) + 1;
    if (e.kind === 'flavor' || !e.options) {
      this.log(e.text, 'normal', { loc });
      if (e.eff) await this.apply(e.eff, loc, fought);
      return;
    }
    if (e.eff) await this.apply(e.eff, loc, fought);
    const opts = e.options.filter((o) => !o.when || o.when(L, this.M));
    const i = await this.ask(title ?? e.title ?? LOC_BY_ID[loc]?.name ?? '抉择', e.text, opts.map((o) => (o.desc ? `${o.label}｜${o.desc}` : o.label)), 'event', false, e.id);
    const o = opts[i];
    this.log(`${e.text}你选择了「${o.label}」。`, 'normal', { loc });
    await this.applyOption(o, loc, fought);
  }

  async applyOption(o: Option, loc: string, fought: { v: boolean }) {
    const L = this.L;
    if (o.eff) await this.apply(o.eff, loc, fought);
    if (this.dead()) return;
    if (o.roll) {
      const v = L.attrs[o.roll.attr] + rollBonus(L, o.roll.attr);
      const p = Math.max(0.1, Math.min(0.95, 0.5 + (v - o.roll.dc) * 0.12));
      const ok = chance(p);
      this.log(`（${ATTR_NAMES[o.roll.attr]}判定${ok ? '成功' : '失败'}）`);
      await this.apply(ok ? o.roll.ok : o.roll.fail, loc, fought);
    }
    if (o.chance) await this.apply(chance(o.chance.p) ? o.chance.ok : o.chance.fail, loc, fought);
    if (o.page) this.gainPage(o.page);
  }

  async apply(e: Effect, loc: string, fought: { v: boolean }) {
    const L = this.L;
    if (e.text) this.log(e.text);
    if (e.attr) for (const [k, v] of Object.entries(e.attr)) L.attrs[k as AttrKey] = Math.max(0, Math.min(12, L.attrs[k as AttrKey] + (v as number)));
    if (e.stones) L.stones = Math.max(0, L.stones + e.stones);
    if (e.merit) L.merit += e.merit;
    if (e.xpPct && L.inDao && !(L.stall && e.xpPct > 0)) {
      L.xp = Math.max(0, L.xp + this.need() * e.xpPct / 100);
      if (this.capped()) L.xp = Math.min(L.xp, this.need());
    }
    if (e.life) {
      // 事件加的寿元有个总上限，免得卡在某个境界时靠灵芝之类一直续命（约为本境寿元的三成）
      if (e.life > 0) {
        const cap = 60 + 0.3 * REALMS[Math.max(1, L.realm)].lifeBase;
        const add = Math.max(0, Math.min(e.life, cap - (L.flags.lifeGot ?? 0)));
        L.flags.lifeGot = (L.flags.lifeGot ?? 0) + add;
        L.lifeBonus += add;
      } else L.lifeBonus += e.life;
    }
    if (e.age) L.age += e.age;
    if (e.school) for (const [k, v] of Object.entries(e.school)) L.school[k as School] += v as number;
    if (e.trace) this.trace(e.trace);
    if (e.flag) {
      L.flags[e.flag] = (L.flags[e.flag] ?? 0) + 1;
      if (e.flag === 'saved' && L.flags.saved >= 5) this.trace('kind_heart');
      if (e.flag === 'gambleWin' && L.flags.gambleWin >= 2) this.trace('gambler');
      if (e.flag === 'allUp') for (const s of L.skills) layerUp(this, s, '灵液入腹');
      if (e.flag === 'loseSkill') {
        ensureCult(L);
        const bmKey = L.skills.find((s) => s.bm)?.id;
        const lose = L.bag!.filter((t) => !(t.kind === 'gong' && t.key === bmKey && L.load?.gong[t.key as SkillId] === t.uid));
        if (lose.length) {
          const t = lose.sort((a, b) => b.grade - a.grade)[0];
          L.bag = L.bag!.filter((x) => x !== t);
          this.log(`你交出了「${t.name}」。`);
          autoEquip(L);
        } else if (L.skills.length) {
          const s = L.skills.reduce((a, b) => (a.lvl >= b.lvl ? a : b));
          s.lvl = Math.max(1, s.lvl - 1);
          this.log(`${SKILL_NAMES[s.id]}退回${LAYER_NAMES[s.lvl]}。`);
        }
      }
      if (e.flag === 'sword_tomb') this.M.discoveries.includes('swordTomb') || this.M.discoveries.push('swordTomb');
    }
    if (e.trace === 'sword_tomb' && !this.M.discoveries.includes('swordTomb')) this.M.discoveries.push('swordTomb');
    if (e.favor) L.favor = Math.min(5, L.favor + e.favor);
    if (e.injure) L.injuries = Math.max(0, L.injuries + e.injure);
    if (e.hpMax) {
      L.flags.hpMax = (L.flags.hpMax ?? 0) + e.hpMax;
      L.maxHp = this.calcMaxHp();
      L.hp = Math.min(L.hp, L.maxHp);
    }
    if (e.grudge) L.flags.grudge = 1;
    // 命途棋盘：这一圈做过的事，下个岁首长成后果格
    const cq = (L.conseqNext ??= []);
    if (e.grudge) cq.push('grudge');
    if (e.partner) cq.push('partner');
    if (e.disciple && e.disciple > 0) cq.push('disciple');
    if (e.injure && e.injure > 0) cq.push('injured');
    if (e.skill && L.inDao) cq.push('treasure');
    if (e.flag === 'saved' || (e.merit ?? 0) >= 15) cq.push('rescue');
    if (e.grudge) this.trace('grudge');
    if (e.removeGrudge) {
      delete L.flags.grudge;
      L.traces = L.traces.filter((t) => t.tag !== 'grudge');
    }
    if (e.inspire) L.inspire = Math.max(0, L.inspire + e.inspire);
    if (e.disciple) L.disciples = Math.min(3, L.disciples + e.disciple);
    if (e.partner) {
      if (L.partner && typeof e.partner === 'string' && L.partnerName && L.partnerName !== e.partner) {
        this.log(`你已有道侣${L.partnerName}，这段缘只能放下。`);
      } else {
        const first = !L.partner;
        L.partner = true;
        if (typeof e.partner === 'string') L.partnerName = e.partner;
        if (first) {
          this.log(`你${L.partnerName ? `与${L.partnerName}` : '们'}结为道侣。`, 'milestone');
          this.highlight(L.partnerName ? `与${L.partnerName}结为道侣` : '结为道侣', 50, 'partner');
        }
      }
    }
    // 事件库扩充：因果链、灵宠、其它收获
    if (e.chain) await chainOp(this, e.chain);
    if (e.pet) givePet(this, e.pet);
    if (e.gain) giveGain(this, e.gain);
    if (e.qi) {
      if (L.inDao) giveQi(this, e.qi.skill, e.qi.grade);
      else L.flags['pendQi_' + e.qi.skill] = Math.max(L.flags['pendQi_' + e.qi.skill] ?? 0, e.qi.grade + 1);
    }
    if (e.echo) addEcho(this, e.echo);
    if (e.flag === 'inkCleansed' || e.flag === 'inkWiped') L.traces = L.traces.filter((t) => t.tag !== 'ink_touched');
    if (e.acqResolve) {
      // 事件里了结一位故人（优先「诺」）
      const open = (this.M.acquaintances ?? []).filter((a) => !a.resolved && a.life < L.lifeNo);
      const a = open.find((x) => x.relation === 'vow') ?? open[0];
      if (a) {
        a.resolved = true;
        (L.acqResolved ??= []).push({ id: a.id, relation: a.relation, earlier: false });
        this.log(`与${a.name}的这段${RELATION_NAMES[a.relation]}，了了。`, 'fate');
      trailChip(this, '了结');
      }
    }
    if (e.flag === 'nemesisWin' && this.M.nemesis) {
      this.M.nemesis.wins += 1;
      this.M.nemesis.life = this.M.lives;
    }
    if (e.hebo) this.M.hebo += e.hebo;
    if (e.kill) L.kills += 1;
    if (e.nextLoc) L.nextLoc = e.nextLoc;
    if (e.banLoc) L.bans[e.banLoc.loc] = e.banLoc.years;
    if (e.reroll) this.fairBonus += e.reroll;
    if (e.again) {
      if (L.dice) L.dice.again = (L.dice.again ?? 0) + e.again;
      else L.flags.againPending = (L.flags.againPending ?? 0) + e.again;
    }
    if (e.skill && L.inDao) this.addSkill(e.skill);
    else if (e.skill) L.flags['pendStart_' + e.skill] = 0;
    if (e.fujue && L.inDao) grantFujue(this, typeof e.fujue === 'string' ? e.fujue : undefined);
    if (e.item && L.inDao) grantItem(this, e.item === '?' ? pick(Object.keys(ITEMS)) : e.item);
    if (e.canye && L.inDao) await upgradeGrade(this, this.sim);
    if (e.xinde && L.inDao) L.xinde = (L.xinde ?? 0) + e.xinde;
    if (e.spareChiyi) L.flags.chiyiSpared = (L.flags.chiyiSpared ?? 0) + 1;
    if (e.killChiyi) {
      L.flags.chiyiDead = 1;
      this.M.saga.chiyiKills += 1;
      L.kills += 1;
      if (this.M.saga.chiyiKills >= 3) this.gainPage(24);
    }
    if (e.epitaph) L.epitaphSpecial = e.epitaph;
    // 一人千面
    if (e.flag === 'giftSkill' || e.flag === 'pastNotes') {
      if (L.inDao) {
        const id = pick(['sword', 'orbit', 'thunder', 'fire', 'frost'] as SkillId[]);
        this.addSkill(id);
        giveQi(this, id, Math.min(2, Math.max(0, L.realm - 1)), true);
      } else L.flags.pendStart_sword = 0;
      if (e.flag === 'pastNotes') L.school[this.topSchool()] += 20;
    }
    if (e.flag === 'fortuneYear') L.flags.fortuneYear = L.age;
    if (e.flag === 'fateKnown') this.log(`卦上写着：你活不过${cnAge(this.lifespan())}岁。`, 'fate');
    if (e.acq) (L.acqNew ??= []).push({ role: e.acq.role, relation: e.acq.relation, src: 'event', node: trailHere(this) });
    if (e.hl) this.highlight(e.hl.text, e.hl.score, 'face');
    if (e.insight) L.insightExtra = (L.insightExtra ?? 0) + e.insight;
    if (e.bond) this.bondUp(e.bond);
    if (e.next) {
      const nb = (this.M.nextBonus ??= {});
      if (e.next.chooseHook) nb.chooseHook = true;
      if (e.next.regretKeep) L.flags.regretKeep = 1;
    }
    if (e.fate) await this.applyFate(e.fate);
    if (e.giveHook && !L.hook && !L.legend) {
      L.hook = { id: e.giveHook, beat: 0, due: L.age + 1, deferred: 0 };
      this.log(`本世引子：「${HOOK_BY_ID[e.giveHook].name}」`, 'fate');
    }
    if (e.die) {
      // 护命（阴司令牌之类）：本世第一次因事件致死时活下来
      const ward = (L.gains ?? []).find((x) => x.ward);
      if (ward && !L.flags.wardUsed) {
        L.flags.wardUsed = 1;
        this.log(`「${ward.name}」替你挡了这一回：你本该${e.die}。`, 'fate');
        L.injuries += 1;
        return;
      }
      return this.die(e.die, loc);
    }
    if (e.battle) {
      const b = e.battle;
      let win: boolean | null;
      if (b.cultOnly && !L.inDao) {
        // 凡人身打不了这一仗，改为根骨判定
        win = chance(Math.max(0.15, Math.min(0.85, 0.5 + (L.attrs.gen - 6) * 0.12)));
        this.log(`（凡人之身，${b.title}只能硬扛：${win ? '扛过去了' : '没扛住'}）`);
        if (!win) L.injuries += 2;
      } else {
        fought.v = true;
        const res = await this.fight({ kind: b.kind, title: b.title, loc, elites: b.elites, boss: b.boss as Boss | undefined, reward: b.reward, prep: true });
        win = res ? res.win : null;
      }
      if (!this.dead() && win !== null) {
        const next = win ? b.win : b.lose;
        if (next) await this.apply(next, loc, fought);
      }
    }
    if (e.hook && !this.dead()) await this.hookEnd(e.hook);
  }

  // ================= 一人千面：引子 =================
  async pickHook(choose: boolean) {
    const L = this.L;
    const M = this.M;
    if (L.legend) return;
    const ok = HOOKS.filter((h) => h.cond(L, M, L.era!));
    if (!ok.length) return;
    const done = new Set((M.faces ?? []).map((f) => f.hook));
    const w = (h: HookDef) => (done.has(h.id) ? 1 : 2);
    let h: HookDef | undefined;
    if (choose) {
      const a = weighted(ok, w)!;
      const b = weighted(ok.filter((x) => x !== a), w);
      const cands = b ? [a, b] : [a];
      const i = await this.choose({ title: '择世', text: '照命镜里浮出两段人生。这一世，你想做谁？', options: [...cands.map((c) => ({ label: `「${c.name}」`, desc: `${c.condText}｜了结：${c.reward}` })), { label: '都不要' }], style: 'legend', key: 'chooseHook' });
      h = cands[i];
    } else if (chance(0.6)) h = weighted(ok, w);
    if (!h) return;
    if (h.start.birth) L.hook = { id: h.id, beat: 1, due: L.age + randInt(5, 15), deferred: 0 };
    else L.hook = { id: h.id, beat: 0, due: Math.max(L.age + 1, h.start.age ?? 6), deferred: 0 };
  }

  async hookBeat(c: Card, fought: { v: boolean }) {
    const L = this.L;
    const h = L.hook;
    if (!h || h.outcome) return;
    const def = HOOK_BY_ID[h.id];
    const beat = def.beats[h.beat];
    const ev = typeof beat.ev === 'string' ? IDENTITY_CHOICES.find((x) => x.id === beat.ev) ?? CHOICES.find((x) => x.id === beat.ev) : beat.ev;
    const beatNo = h.beat;
    const tid = trailOpen(this, { kind: 'hook', title: `引 · ${def.name}`, loc: c.loc, text: ev?.text, thread: `hook:${h.id}`, threadName: `引子「${def.name}」`, beat: BEAT_NAMES[beatNo], ev });
    try {
      await this.hookBeat0(c, fought, ev, beatNo);
    } finally {
      trailClose(this, tid);
    }
  }
  private async hookBeat0(c: Card, fought: { v: boolean }, ev: LifeEvent | undefined, beatNo: number) {
    const L = this.L;
    const h = L.hook!;
    const def = HOOK_BY_ID[h.id];
    if (ev?.options?.length) {
      if (!L.choicesDone.includes(ev.id)) L.choicesDone.push(ev.id);
      const opts = ev.options.filter((o) => !o.when || o.when(L, this.M));
      const i = await this.ask(`引 · ${def.name}（${BEAT_NAMES[beatNo]}）`, ev.text, opts.map((o) => (o.desc ? `${o.label}｜${o.desc}` : o.label)), 'event', true, 'hook');
      const o = opts[i];
      this.log(`【${def.name}·${BEAT_NAMES[beatNo]}】${ev.text}你选择了「${o.label}」。`, 'fate', { loc: c.loc });
      await this.applyOption(o, c.loc, fought);
    }
    if (this.dead() || !L.hook || L.hook.outcome) return;
    h.beat = beatNo + 1;
    h.deferred = 0;
    if (h.beat >= 3) await this.hookEnd('done');
    else h.due = L.age + (h.beat === 1 ? randInt(5, 15) : randInt(5, 20));
  }

  async hookEnd(outcome: 'done' | 'open', why?: string) {
    const L = this.L;
    const M = this.M;
    const h = L.hook;
    if (!h || h.outcome) return;
    h.outcome = outcome;
    const def = HOOK_BY_ID[h.id];
    if (trailTop(this) == null || outcome === 'open') trailMark(this, { kind: 'hook', title: `「${def.name}」${outcome === 'done' ? '了结' : '未了'}`, text: why, thread: `hook:${h.id}`, threadName: `引子「${def.name}」`, beat: outcome === 'done' ? '了' : '断' });
    else trailChip(this, '引子了结');
    if (outcome === 'open') {
      (L.acqNew ??= []).push({ role: def.acq.role, relation: def.acq.relation, src: 'hook', node: trailHere(this) });
      this.log(`「${def.name}」没有走完${why ? `（${why}）` : ''}。`, 'fate');
      return;
    }
    const first = !(M.faces ?? []).some((f) => f.hook === h.id);
    if (!(M.faces ?? []).some((f) => f.hook === h.id && f.era === L.era)) (M.faces ??= []).push({ hook: h.id, era: L.era! });
    if (first) L.insightExtra = (L.insightExtra ?? 0) + 30;
    const nb = (M.nextBonus ??= {});
    switch (h.id) {
      case 'Y01': L.insightExtra = (L.insightExtra ?? 0) + 40; break;
      case 'Y02': nb.fam = (nb.fam ?? 0) + 2; break;
      case 'Y03': L.school.body += 20; this.trace('soldier'); break;
      case 'Y04': L.attrs.fam = Math.min(12, L.attrs.fam + 2); L.flags.wangsun = 1; break;
      case 'Y05': nb.fortune = 1.5; break;
      case 'Y06': L.stones += 100; break;
      case 'Y07': L.school.alchemy += 20; L.merit += 50; break;
      case 'Y08': if (!M.discoveries.includes('storybook')) M.discoveries.push('storybook'); break;
      case 'Y09': this.bondUp('chiyi'); break;
      case 'Y10': L.merit += 40; L.inspire += 1; break;
      case 'Y11': L.flags.wolfKin = 1; break;
      case 'Y12': nb.reroll = 1; break;
      case 'Y13': L.merit += 80; this.trace('ink_touched'); break;
      case 'Y14': nb.fam = (nb.fam ?? 0) + 3; break;
      case 'Y15': L.merit += 60; L.flags.siluExtra = 1; break;
      case 'Y16': L.inspire += 1; break;
    }
    this.log(`引子了结：「${def.name}」——${def.reward}${first ? '；首次了结，记入千面录，宿慧 +30' : ''}。`, 'fate');
    this.highlight(`了结「${def.name}」`, 65, 'hook');
    // 前世遗憾「引子未了」：了结任意引子即算弥补
    if (L.regretsActive.some((r) => r.type === 'hook')) this.fixRegret('hook');
  }

  // ================= 一人千面：故人 =================
  async reunion(c: Card, fought: { v: boolean }) {
    const L = this.L;
    const a = (this.M.acquaintances ?? []).find((x) => x.id === c.acq);
    if (!a || a.resolved) return this.log(pick(L.inDao ? NOTHING_CULT : NOTHING_MORTAL));
    const tid = trailOpen(this, { kind: 'acq', title: `故 · ${a.name}`, loc: c.loc, thread: `acq:${a.id}`, threadName: `故人${a.name}（${RELATION_NAMES[a.relation]}）`, text: `第 ${a.life} 世结下的${RELATION_NAMES[a.relation]}` });
    try {
      await this.reunion0(c, fought, a);
    } finally {
      trailClose(this, tid);
    }
  }
  private async reunion0(c: Card, fought: { v: boolean }, a: Acquaintance) {
    const L = this.L;
    L.acqMet!.push(a.id);
    L.acqCards = (L.acqCards ?? 0) + 1;
    a.lastSeen = L.lifeNo;
    const shape = this.acqShape(a);
    let text = ACQ_TEXT[a.relation][shape].replace(/\{名\}/g, a.name);
    if (a.relation === 'grudge' && shape === 'later' && c.loc === 'cave') text = IDENTITY_CHOICES.find((x) => x.id === 'C-洞府-3')!.text;
    if (a.relation === 'favor' && shape === 'later' && c.loc === 'bazaar') text = IDENTITY_CHOICES.find((x) => x.id === 'C-坊市-3')!.text;
    const title = `故 · ${a.name}（${RELATION_NAMES[a.relation]}·${ACQ_SHAPE_NAMES[shape]}）`;
    const resolve = async (extra: Effect = {}) => {
      await this.apply(extra, c.loc, fought);
      a.resolved = true;
      (L.acqResolved ??= []).push({ id: a.id, relation: a.relation, earlier: shape === 'earlier' });
      this.log(`与${a.name}的这段${RELATION_NAMES[a.relation]}，了了。`, 'fate');
      this.highlight(`了结与${a.name}的${RELATION_NAMES[a.relation]}`, 65, 'acq');
      if (a.relation === 'grudge' && shape === 'earlier' && L.wish?.id === 'W43') this.completeWish();
    };
    let i: number;
    if (a.relation === 'favor') {
      i = await this.ask(title, text, shape === 'earlier' ? ['先结个善缘｜功德 +20，了结', '装作不认识'] : ['收下｜灵石 +50，了结', '转赠旁人｜功德 +30，了结', '不收｜下次再说'], 'event', true, 'acq');
      if (shape === 'earlier') return i === 0 ? resolve({ merit: 20 }) : undefined;
      if (i === 0) return resolve({ stones: 50 });
      if (i === 1) return resolve({ merit: 30 });
      return;
    }
    if (a.relation === 'grudge') {
      const opts = shape === 'earlier' ? ['化解｜这段仇不必发生，了结', '避开'] : [L.inDao ? '斗法了断｜胜则了结，修为 +5%' : '动手｜根骨判定', '化解｜悟性判定，成则了结，功德 +30', '避开'];
      i = await this.ask(title, text, opts, 'event', true, 'acq');
      if (shape === 'earlier') return i === 0 ? resolve({ merit: 20 }) : undefined;
      if (i === 0) {
        if (L.inDao) {
          fought.v = true;
          const res = await this.fight({ kind: 'duel', title: `了断 · ${a.name}`, loc: c.loc, elites: 1, prep: true });
          if (res?.win && !this.dead()) return resolve({ xpPct: 5 });
          return;
        }
        if (chance(0.5 + (L.attrs.gen - 6) * 0.12)) return resolve({ kill: true });
        L.injuries += 2;
        return this.log('你没打过。');
      }
      if (i === 1) {
        const ok = chance(Math.max(0.1, Math.min(0.95, 0.5 + (L.attrs.wu - 6) * 0.12)));
        this.log(`（悟性判定${ok ? '成功' : '失败'}）`);
        if (ok) return resolve({ merit: 30 });
      }
      return;
    }
    i = await this.ask(title, text, shape === 'earlier' ? ['许下这个诺｜了结', '不许'] : ['去做那件事｜年龄 +1，功德 +20，了结', '推说日后'], 'event', true, 'acq');
    if (i === 0) return resolve(shape === 'earlier' ? {} : { age: 1, merit: 20 });
  }

  // 结算时把本世结下的故人写进轮回数据
  settleAcquaintances(): string[] {
    const L = this.L;
    const M = this.M;
    const lines: string[] = [];
    const list = (M.acquaintances ??= []);
    // 了结的移出
    for (const r of L.acqResolved ?? []) {
      const a = list.find((x) => x.id === r.id);
      if (!a) continue;
      list.splice(list.indexOf(a), 1);
    }
    // 五世未再遇就散了
    for (const a of list.slice()) {
      if (L.lifeNo - a.lastSeen >= 5) {
        list.splice(list.indexOf(a), 1);
        lines.push(`${a.name}：散了。司灯：「${ACQ_GONE}」`);
      }
    }
    const fresh = (L.acqNew ?? []).slice().sort((x, y) => (x.src === 'event' ? 0 : 1) - (y.src === 'event' ? 0 : 1)).slice(0, 2);
    for (const f of fresh) {
      const name = `${f.role}${f.role.length <= 2 ? pick(ACQ_NICK) : ''}`;
      const a: Acquaintance = { id: `A${L.lifeNo}-${list.length}-${randInt(100, 999)}`, name, role: f.role, relation: f.relation, era: L.era ?? 'E1', life: L.lifeNo, lastSeen: L.lifeNo, resolved: false };
      list.push(a);
      trailRef(this, `acq:${a.id}`, f.node);
      lines.push(`${name}（${RELATION_NAMES[f.relation]}）：会在之后的某一世回来。`);
    }
    while (list.length > 8) list.shift();
    return lines;
  }

  fixRegret(type: string) {
    const L = this.L;
    const fixedRegret = L.regretsActive.find((x) => x.type === type);
    if (!fixedRegret) return;
    L.regretsActive = L.regretsActive.filter((x) => x !== fixedRegret);
    this.M.regrets = this.M.regrets.filter((x) => x.type !== type);
    L.regretFixed = true;
    this.log(REGRETS[type]?.fixed ?? '前世的遗憾，了了。', 'fate');
    this.highlight('弥补了一件前世遗憾', 60, 'regret');
    this.gainPage(8);
    if (L.wish?.id === 'W07') this.completeWish();
  }

  async bondEvent(b: BondEvent, fought: { v: boolean }) {
    const name = COMPANION_NAMES[b.comp];
    const tid = trailOpen(this, { kind: 'bond', title: `${name} · ${b.title}`, loc: 'karma', text: b.text, thread: `bond:${b.comp}`, threadName: name });
    try {
      await this.bondEvent0(b, fought);
    } finally {
      trailClose(this, tid);
    }
  }
  private async bondEvent0(b: BondEvent, fought: { v: boolean }) {
    const L = this.L;
    const name = COMPANION_NAMES[b.comp];
    // 赤衣第 3 段要先在这一世打赢他：命灯已过第 2 段时，他会再来约战
    if (b.comp === 'chiyi' && b.n === 3 && !L.flags.chiyiBeaten) {
      this.log('红衣人又来了：「执笔人，上一世的账，这一世接着算。」', 'companion');
      fought.v = true;
      await this.fight({ kind: 'duel', title: '赤衣再战', loc: 'karma', elites: 1, boss: 'chiyi', reward: 1, prep: true });
      if (this.dead() || !L.flags.chiyiBeaten) return;
    }
    const opts = b.options.filter((o) => !o.when || o.when(L, this.M));
    const i = await this.ask(`${name} · ${b.title}`, `${b.text}\n\n——「${COMPANION_QUOTE[b.comp]}」`, opts.map((o) => (o.desc ? `${o.label}｜${o.desc}` : o.label)), 'event', true, 'bond');
    const o = opts[i];
    this.log(`【${name}·${b.title}】${b.text}你选择「${o.label}」。`, 'companion');
    if (!L.companionsMet.includes(b.comp)) L.companionsMet.push(b.comp);
    const replay = b.n <= this.lamp(b.comp);
    if (replay) L.choicesDone.push(`bond:${b.comp}:${b.n}`);
    await this.applyOption(o, 'karma', fought);
    if (replay) return;
    if (o.lamp === false) {
      if (b.comp === 'danzun') L.flags.danzunEnd = 1;
      if (b.comp === 'bottle') L.flags.bottleEnd = 1;
      if (b.comp === 'fox') L.flags.foxDead = 1;
      return;
    }
    this.bondUp(b.comp);
  }

  bondUp(c: Exclude<CompanionId, 'silu'>) {
    const L = this.L;
    if ((L.bonds[c] ?? 0) >= 2 || this.lamp(c) >= 9) return;
    L.bonds[c] = (L.bonds[c] ?? 0) + 1;
    this.log(`${COMPANION_NAMES[c]}的命灯亮了一分（${this.lamp(c)} 级）。`, 'companion');
    trailChip(this, `${COMPANION_NAMES[c]}命灯 +1`);
    this.highlight(`与${COMPANION_NAMES[c]}了却一段因果`, 70, 'bond');
    if (c === 'fox' && this.lamp('fox') >= 3) this.gainPage(12);
    if (c === 'chiyi' && this.lamp('chiyi') >= 3) this.gainPage(16);
    if (c === 'fox' && this.lamp('fox') >= 9) this.gainPage(21);
    if (c === 'danzun' && this.lamp('danzun') >= 9) this.gainPage(23);
    if (c === 'chiyi' && this.lamp('chiyi') >= 9) this.gainPage(24);
    if (Object.keys(L.bonds).length >= 2) this.gainPage(14);
  }

  async market() {
    const L = this.L;
    L.marketCd = 2;
    ensureCult(L);
    rotateShop(L);
    const bought = new Set<number>();
    for (;;) {
      const yuCost = 50 + 30 * L.realm;
      const shop = shopItems(this);
      const items: { label: string; desc?: string; cost: number; fn: () => void | Promise<void>; score: number; once?: boolean }[] = [
        ...shop.map((x) => ({ ...x, label: `${x.label}（灵石 ${x.cost}）`, once: true })),
        { label: `悟道玉简（灵石 ${yuCost}）`, desc: '自选一门功法 +1 层', cost: yuCost, score: 2.5, fn: async () => {
          const can = L.skills.filter((s) => s.lvl < layerCap(L, s));
          if (!can.length) { L.xinde = (L.xinde ?? 0) + 1; return; }
          const j = can.length > 1 ? await this.choose({ title: '悟道玉简', text: '参悟哪门功法？', options: can.map((s) => ({ label: SKILL_NAMES[s.id], desc: `${LAYER_NAMES[s.lvl]} → ${LAYER_NAMES[s.lvl + 1]}` })), style: 'event', key: 'yujian', autoPick: 0 }) : 0;
          layerUp(this, can[j] ?? can[0], '参悟玉简');
        } },
        { label: `如意骰（灵石 30）`, desc: '下一次掷骰任选点数', cost: 30, score: 0, fn: () => { L.dice && (L.dice.ruyi += 1); } },
        { label: `疗伤丹（灵石 20）`, desc: '清空暗伤，回满气血', cost: 20, score: L.injuries ? 3 : 0, fn: () => { L.injuries = 0; L.hp = L.maxHp; } },
        { label: `续命丹（灵石 60）`, desc: '寿元 +10', cost: 60, score: 0.5, fn: () => { L.lifeBonus += 10; } },
        { label: `破境丹（灵石 80）`, desc: '修为 +15%', cost: 80, score: 1, fn: () => { L.xp += this.need() * 0.15; } },
      ];
      // 商会：坊市价格常驻打折
      const disc = 1 - Math.min(0.4, gainSum(L, 'price'));
      if (disc < 1) for (const it of items) {
        const c = Math.max(1, Math.round(it.cost * disc));
        it.label = it.label.replace(`灵石 ${it.cost}`, `灵石 ${c}`);
        it.cost = c;
      }
      const shown = items.map((it, k) => ({ it, k })).filter((x) => !(x.it.once && bought.has(x.k)));
      const opts = shown.map(({ it }) => ({ label: it.label, desc: it.desc, disabled: L.stones < it.cost }));
      // 自动：挑最想要且买得起、买完还留点底的那件
      const want = shown.map((x, j) => ({ j, s: x.it.score, ok: L.stones - x.it.cost >= 20 })).filter((x) => x.ok && x.s >= 2.5).sort((a, b) => b.s - a.s)[0];
      const i = await this.choose({ title: '坊市', text: `坊市开张。你有灵石 ${L.stones}，心得 ${L.xinde ?? 0}。`, options: [...opts, { label: '离开' }], style: 'event', key: 'market', autoPick: want ? want.j : opts.length });
      if (i >= shown.length) break;
      const { it, k } = shown[i];
      if (L.stones < it.cost) break;
      L.stones -= it.cost;
      L.marketSpent = (L.marketSpent ?? 0) + it.cost;
      if (it.once) bought.add(k);
      this.log(`在坊市买下${it.label.split('（')[0]}。`);
      await it.fn();
      this.io.refresh();
    }
  }

  async hebo() {
    const tid = trailOpen(this, { kind: 'choice', title: '河伯', loc: 'river' });
    try {
      await this.hebo0();
    } finally {
      trailClose(this, tid);
    }
  }
  private async hebo0() {
    const L = this.L;
    L.flags.heboMet = 1;
    const i = await this.ask('河伯', '河水忽然停了。一个披着蓑衣的人从水里站起来：他是被墨淹没的画中河神，三千年来守着这条河，想换一个人守。', ['替他守河', '斩了他', '放他走'], 'event', true);
    if (i === 0) return this.endHidden('H2');
    if (i === 2) {
      this.M.hebo = 0;
      L.flags.foxRiver = 1;
      this.log('河伯离去。这一世，河畔再不会有人溺水。');
      return;
    }
    this.M.hebo = 0;
    if (!L.inDao) {
      this.log('你一个凡人，拿什么斩河神？他只是笑了笑，沉回水里。');
      return;
    }
    await this.fight({ kind: 'beast', title: '斩河伯', loc: 'river', boss: 'hebo', prep: true });
  }

  async regretEvent(type: string, loc: string) {
    const tid = trailOpen(this, { kind: 'choice', title: '前世遗憾', loc, past: [`regret:${type}`] });
    try {
      await this.regret0(type, loc);
    } finally {
      trailClose(this, tid);
    }
  }
  private async regret0(type: string, loc: string) {
    const L = this.L;
    const r = REGRETS[type];
    const fixedRegret = L.regretsActive.find((x) => x.type === type);
    if (!fixedRegret) return;
    const place = LOC_BY_ID[fixedRegret.ref]?.name ?? '';
    const fill = (s: string) => s.replace(/\{地点\}/g, place).replace(/\{法宝\}/g, '旧法宝');
    let fixed = true;
    if (type === 'place') {
      const i = await this.ask('故地', fill(r.open), ['小心绕开', '一探究竟（有险）'], 'event', true);
      if (i === 1 && chance(0.25)) {
        this.log(fill(r.open));
        return this.die(FATAL_DEATHS.includes(L.deathCause ?? '') ? L.deathCause! : '殁于故地', fixedRegret.ref);
      }
    } else if (type === 'breakthrough') {
      await this.ask('旧日洞府', r.open, ['坐上去'], 'event', true);
      L.xp += this.need() * 0.15;
    } else if (type === 'grudge') {
      const i = await this.ask('前世仇家', r.open, ['登门化解（功德 +20）', '不理会'], 'event', true);
      if (i === 1) fixed = false;
      else L.merit += 20;
    } else if (type === 'treasure') {
      await this.ask('前世法宝', fill(r.open), ['取回'], 'event', true);
      const id = pick(['sword', 'orbit', 'thunder', 'fire'] as SkillId[]);
      this.addSkill(id);
      giveQi(this, id, 2, true);
    }
    if (!fixed) return;
    L.regretsActive = L.regretsActive.filter((x) => x !== fixedRegret);
    this.M.regrets = this.M.regrets.filter((x) => x.type !== type);
    L.regretFixed = true;
    this.log(fill(r.fixed), 'fate');
    this.highlight('弥补了一件前世遗憾', 60, 'regret');
    this.gainPage(8);
    if (L.wish?.id === 'W07') this.completeWish();
  }

  // ================= 劫难：出征准备 + 战斗 =================
  partnersAvailable(): PartnerSpec[] {
    const L = this.L;
    const out: PartnerSpec[] = [];
    const ok = (id: string) => (L.injuredUntil[id] ?? -1) < L.age;
    // 命灯 2 级起白狐跨世记得你，入道后自来同行
    const foxMet = (L.flags.foxPartner || this.lamp('fox') >= 2 || L.companionsMet.includes('fox')) && !L.flags.foxAway && !L.flags.foxDead && L.inDao;
    if (foxMet && (L.flags.foxPartner || this.lamp('fox') >= 2) && ok('fox')) out.push({ id: 'fox', name: '白狐', lamp: this.lamp('fox') });
    if (L.flags.chiyiAlly && ok('chiyi')) out.push({ id: 'chiyi', name: '赤衣', lamp: this.lamp('chiyi') });
    if (L.flags.danzunPartner) out.push({ id: 'danzun', name: '丹尊残魂', lamp: this.lamp('danzun') });
    if (L.partner && ok('partner')) out.push({ id: 'partner', name: L.partnerName ?? '道侣', lamp: 2 });
    if (this.tflag('cat') && ok('cat')) out.push({ id: 'cat', name: '灵猫', lamp: 2 });
    if (L.disciples > 0 && ok('disciples')) out.push({ id: 'disciples', name: `弟子 ×${L.disciples}`, lamp: 2, count: L.disciples });
    return out;
  }

  rollMutators(kind: BattleKind): Mutator[] {
    const L = this.L;
    const tags = new Map<string, number>();
    for (const t of L.traces) tags.set(t.tag, t.realm === L.realm ? 3 : 1);
    if (L.merit >= 200) tags.set('merit_high', 1);
    if (L.kills >= 600) tags.set('beast_hunter', 1);
    if (L.skills.length > 0 && L.skills.length <= 2 && L.realm >= 2) tags.set('ascetic', 1);
    if (L.skills.some((s) => s.id === 'fire' && s.lvl >= 3)) tags.set('fire_born', 1);
    const k = kind === 'beast' ? 'B' : kind === 'duel' ? 'D' : 'T';
    const pool = MUTATORS.filter((m) => tags.has(m.trace) && m.kinds.includes(k));
    const out: Mutator[] = [];
    const forced = ERA_BY_ID[L.era ?? 'E1']?.mutator;
    const fm = forced ? MUTATORS.find((m) => m.id === forced && m.kinds.includes(k)) : undefined;
    if (fm) out.push(fm);
    for (let i = out.length; i < 2; i++) {
      const avail = pool.filter((m) => !out.includes(m) && !out.some((o) => o.type === m.type));
      const m = weighted(avail, (x) => tags.get(x.trace) ?? 1);
      if (m) out.push(m);
    }
    return out;
  }

  playerStats() {
    const L = this.L;
    let dmg = 1 + 0.05 * (this.M.wheel.blade ?? 0);
    if (this.tflag('swordDmg')) dmg += 0.15;
    if (this.tflag('dmg10')) dmg += 0.1;
    if (L.schoolCur) dmg += 0.1;
    dmg += gainSum(L, 'dmg'); // 随身前辈等
    let crit = 0.05 + L.attrs.luck * 0.005 + (this.tflag('crit') ? 0.08 : 0);
    return {
      maxHp: L.maxHp,
      hp: Math.max(1, L.hp),
      dmgMul: dmg,
      crit,
      speed: 1,
      armor: this.tflag('armor') ? 0.1 : 0,
      regen: this.tflag('regen'),
      lifesteal: this.tflag('lifesteal'),
      // 守则纸：每场第一次致命伤无效
      phoenix: ((this.tflag('phoenix') || L.legend === 'L08') && !L.phoenixUsed) || (L.gains ?? []).some((x) => x.id === 'rules'),
    };
  }

  async fight(o: { kind: BattleKind; title: string; loc: string; prep?: boolean; elites?: number; boss?: Boss; reward?: number; tutorial?: boolean; mode?: 'ask' | 'free' }): Promise<BattleResult | null> {
    const tid = trailOpen(this, { kind: 'battle', title: o.title, loc: o.loc });
    let res: BattleResult | null = null;
    try {
      res = await this.fight0(o);
    } finally {
      trailClose(this, tid, [res ? (res.win ? '胜' : '败') : '未战']);
    }
    return res;
  }
  private async fight0(o: { kind: BattleKind; title: string; loc: string; prep?: boolean; elites?: number; boss?: Boss; reward?: number; tutorial?: boolean; mode?: 'ask' | 'free' }): Promise<BattleResult | null> {
    const L = this.L;
    const realm = Math.max(1, L.realm);
    const mainLine = o.kind === 'trial' && L.realm === 5;
    const mutators = o.tutorial || mainLine || o.boss === 'chiyi' ? [] : this.rollMutators(o.kind);
    let partners: PartnerSpec[] = [];
    let formation = false;
    let reward = o.reward ?? 1;
    const isTrial = o.kind === 'trial';
    const avail = this.partnersAvailable();
    if (o.prep && !o.tutorial) {
      const formCost = 30 + 10 * realm;
      const kindName = { beast: '妖潮（坚守）', duel: '斗法（击败精英）', trial: '天劫（渡雷）' }[o.kind];
      const mutText = mutators.length ? mutators.map((m) => `【${m.name}】利：${m.pro}；弊：${m.con}`).join('\n') : '本场无词条';
      const noAvoid = isTrial || o.boss === 'chiyi';
      const noForm = isTrial || mutators.some((m) => m.id === 'M22');
      const opts: PromptOption[] = [
        { label: '硬接｜全额奖励' },
        { label: `布阵｜灵石 ${formCost}，开场敌人 -30%，奖励八成`, disabled: noForm || L.stones < formCost },
        { label: `请援｜1 点人情，${avail[0]?.name ?? '无可参战伙伴'}参战`, disabled: !avail.length || L.favor < 1 },
        { label: `避劫｜折寿 ${Math.max(1, this.step)} 年，作废本回合机缘`, disabled: noAvoid },
      ];
      const lo = loadoutSpec(this);
      const st = this.playerStats();
      const dps = estDps(lo.gong ?? [], st.dmgMul * (1 + 0.45 * (realm - 1)) * BATTLE_POWER);
      const kit = `功法 ${lo.gong!.map((x) => `${x.name}${LAYER_NAMES[x.lvl]}`).join('、') || '无'}${lo.idle!.length ? `（${lo.idle!.join('、')}无器可御）` : ''}\n估算秒伤 ${dps}　法宝 ${[...lo.passives!, ...lo.actives!.map((a) => a.id)].map((k) => ITEMS[k]?.name).join('、') || '无'}`;
      const i = await this.choose({ title: `出征 · ${o.title}`, text: `劫难：${kindName}\n境界：${REALMS[realm].name}\n${kit}\n\n${mutText}`, options: opts, style: 'battle', key: 'battlePrep', important: true });
      if (i === 1) {
        L.stones -= formCost;
        formation = true;
        reward *= 0.8;
        L.usedFormation = true;
      } else if (i === 2) {
        L.favor -= 1;
        let pi = 0;
        if (avail.length > 1) pi = await this.ask('请援', '请谁来助阵？', avail.map((p) => p.name), 'battle');
        partners = [avail[pi]];
        if (avail.length > 1 && (this.lamp('fox') >= 9 || L.flags.headWin)) {
          const second = avail.find((p, j) => j !== pi);
          if (second) partners.push(second);
        }
        L.usedHelp = true;
      } else if (i === 3) {
        L.lifeBonus -= Math.max(1, this.step);
        this.log(`你避开了这场劫难，折寿 ${Math.max(1, this.step)} 年。`, 'battle');
        return null;
      }
    }
    if (o.kind === 'beast' && L.flags.wolfKin && !formation) {
      formation = true;
      this.log('山里的狼妖认得你的气味，妖潮比往常稀了些。', 'battle');
    }
    // 灵宠、鬼伴、化身这类伙伴不必请援，自己跟着上（天劫除外）
    if (!o.tutorial && !isTrial) {
      for (const a of freeAllies(L)) if ((L.injuredUntil[a.id] ?? -1) < L.age && !partners.some((p) => p.name === a.name)) partners.push(a);
    }
    if (mutators.length) this.log(`战场词条：${mutators.map((m) => m.name).join('、')}`, 'battle');
    const foxGuard = this.lamp('fox') >= 5 && !L.flags.foxDead && !L.flags.foxAway && L.inDao;
    if (!L.firstRealmBattle.includes(realm) && !o.tutorial) L.firstRealmBattle.push(realm);
    let boss = o.boss;
    if (mainLine) boss = this.M.saga.volume >= 3 ? 'lord' : 'knock';
    const spec: BattleSpec = {
      kind: o.kind,
      title: o.title,
      realm,
      duration: o.tutorial ? 25 : 30 + realm * 5,
      elites: o.elites ?? (o.kind === 'duel' ? 2 + (realm >= 4 ? 1 : 0) : 0),
      strikes: Math.max(1, (REALMS[realm].strikes || 3) - (isTrial && L.flags.trialEase ? 1 : 0)),
      mutators,
      partners,
      foxGuard,
      skills: L.skills.map((s) => ({ ...s })),
      ...loadoutSpec(this),
      // 神位：前世受过香火，劫难里的敌人弱一些（每座 -5%，至多 -15%）
      enemyMul: loadoutSpec(this).enemyMul! * (1 - Math.min(0.15, 0.05 * (this.M.shrines?.length ?? 0))) * flagEnemyMul(L, o.loc),
      player: { ...this.playerStats(), dmgMul: this.playerStats().dmgMul * BATTLE_POWER },
      formation,
      boss,
      heartDemon: isTrial && realm === 4,
      heartMod: (L.flags.heartUp ? 1 : 0) + (L.flags.heartDemonHard ? 1 : 0) - (L.flags.heartDown ? 1 : 0) - ((L.bag ?? []).some((t) => t.key === 'qingxin' && L.load?.passive.includes(t.uid)) ? 1 : 0),
      scholar: mutators.some((m) => m.id === 'M21'),
      ascetic: mutators.some((m) => m.id === 'M24'),
      reward,
      tutorial: o.tutorial,
      assist: boss === 'lord' ? { fox: this.lamp('fox') >= 9, danzun: this.lamp('danzun') >= 9, chiyi: this.lamp('chiyi') >= 9, bottle: this.lamp('bottle') >= 9 } : undefined,
    };
    this.battleSinceSnap = true;
    const res = await this.io.battle(spec);
    this.afterBattle(o, spec, res);
    return res;
  }

  afterBattle(o: { kind: BattleKind; title: string; loc: string; boss?: Boss; mode?: 'ask' | 'free' }, spec: BattleSpec, res: BattleResult) {
    const L = this.L;
    L.kills += res.kills;
    if (spec.kind === 'trial') delete L.flags.trialEase;
    const cultLines = afterBattleCult(this, spec, res, !!o.boss);
    if (cultLines.length) this.log(cultLines.join('；') + '。', 'battle');
    if (o.title === '宗门大比' && res.win) L.flags.tourneyWin = 1;
    L.merit += res.purified * 5;
    if (!L.battleKinds.includes(o.kind)) L.battleKinds.push(o.kind);
    if (L.battleKinds.length >= 3) this.gainPage(6);
    if (spec.player.phoenix && res.hp > 0 && res.foxBlocked === false && res.hp <= 1) L.phoenixUsed = true;
    for (const d of res.downed) L.injuredUntil[d] = L.age + Math.max(1, this.step);
    if (res.foxBlocked) {
      L.flags.foxBlocked = 1;
      this.highlight('白狐替你挡下一道雷', 65, 'guard');
    }
    if (spec.partners.some((p) => p.id === 'fox')) L.flags.foxFought = 1;
    if (res.cloneBeaten && (L.bonds.chiyi ?? 0) < 2) this.bondUp('chiyi');
    if (res.mirrorBeaten && this.M.saga.volume >= 3) this.gainPage(22);
    if (o.boss === 'chiyi') {
      L.flags.chiyiFought = 1;
      if (res.win) L.flags.chiyiBeaten = 1;
    }
    if (o.boss === 'hebo' && res.win) {
      this.log('河伯珠落在你掌心，冰凉。', 'battle');
      this.addSkill('frost');
      giveQi(this, 'frost', 2, true);
    }
    if (res.lifeOrbs) L.lifeBonus += res.lifeOrbs;
    if (res.partnerSaved && res.win && L.wish?.id === 'W40') this.completeWish();

    if (res.fled) {
      L.hp = Math.max(1, res.hp);
      return this.fled(o);
    }
    const mainLine = spec.boss === 'knock' || spec.boss === 'lord';
    if (res.win) {
      L.battlesWon += 1;
      if (o.kind !== 'trial' || !mainLine) {
        const gain = Math.round(res.xp * 0.35);
        if (L.inDao && o.kind !== 'trial') L.xp += gain;
        L.stones += Math.round(res.stones * spec.reward);
      }
      L.hp = Math.max(1, res.hp);
      if (this.tflag('stealLife')) L.lifeBonus += 2;
      this.log(`${o.title}：胜。斩墨 ${res.kills}，灵石 +${Math.round(res.stones * spec.reward)}。`, 'battle');
      if (o.kind === 'duel') this.highlight(`${o.title}，力克强敌`, 30, 'elite');
      if (o.kind === 'beast' && L.inDao && chance(0.3)) (L.conseqNext ??= []).push('slay');
      if (mainLine) this.ascend(res);
      return;
    }
    // 失败
    if (spec.boss === 'knock' && res.survivedKnock) return this.ascend(res);
    if (o.kind === 'trial') {
      if (o.mode === 'free' && !mainLine) {
        L.xp *= 0.5;
        L.lifeBonus -= Math.round(this.lifespan() * 0.1);
        L.hp = Math.max(1, L.maxHp * 0.3);
        L.injuries = 3;
        this.log(`渡劫失败。你散去劫雷，修为减半，折寿一成。`, 'battle');
        return;
      }
      return void this.die('陨于天劫', 'trial');
    }
    const loss = Math.max(2, this.step * 2);
    L.lifeBonus -= loss;
    L.injuries = 3;
    L.hp = Math.max(1, L.maxHp * 0.2);
    this.log(`${o.title}：败。你重伤遁走，折寿 ${loss} 年，暗伤 3 回合。`, 'battle');
    if (L.age >= this.lifespan()) this.die('伤重不治', o.loc);
  }

  // 遁地符：脱战，不胜不败
  fled(o: { title: string }) {
    this.log(`${o.title}：你捏碎遁地符遁走，什么也没得到。`, 'battle');
  }

  ascend(res: BattleResult) {
    const L = this.L;
    if (res.lordBeaten) {
      this.gainPage(27);
      L.flags.lordBeaten = 1;
      L.ended = 'lord';
      L.deathLoc = 'gate';
      return;
    }
    // 叩门
    this.M.saga.knocks += 1;
    L.flags.knocked = 1;
    if (this.M.saga.knocks === 1) this.gainPage(18);
    if (this.M.saga.knocks >= 3) this.gainPage(19);
    L.ended = '叩门';
    this.log('劫主一击，你被打回轮回井。这是剧本内的失败：叩门。', 'death');
    this.highlight('叩开天门', 80, 'knock');
  }

  // ================= 死亡与结局 =================
  die(cause: string, loc?: string) {
    const L = this.L;
    if (L.deathCause || L.ended) return;
    if ((this.tflag('phoenix') || L.legend === 'L08') && !L.phoenixUsed && cause !== '大限坐化' && cause !== '寿终正寝' && cause !== '坠入墨井') {
      L.phoenixUsed = true;
      if (L.legend === 'L08') L.attrs.luck = Math.max(0, L.attrs.luck - 2);
      this.log('浴火凤命：本该死在这里，可你又睁开了眼。', 'fate');
      L.hp = 1;
      return;
    }
    if (L.flags.sarira && cause !== '大限坐化' && cause !== '寿终正寝' && cause !== '坠入墨井' && cause !== '陨于天劫') {
      delete L.flags.sarira;
      this.log('胸口那点温热碎了。舍利替你挡下了这一回。', 'fate');
      L.hp = Math.max(1, Math.round(L.maxHp * 0.3));
      return;
    }
    L.deathCause = cause;
    L.deathLoc = loc ?? null;
    trailMark(this, { kind: 'death', title: cause, loc });
    this.log(`${cnAge(L.age)}岁，${cause}${loc && LOC_BY_ID[loc] ? '于' + LOC_BY_ID[loc].name : ''}。`, 'death');
    // 掌天瓶第 3 段：死前一刻
    if (L.inDao && !L.flags.bottleEnd && this.lamp('bottle') === 2) {
      this.log('瓶在你死前亮了一下，然后暗了。', 'companion');
      this.bondUp('bottle');
    }
  }

  async endHidden(id: 'H1' | 'H2') {
    const L = this.L;
    const h = HIDDEN[id];
    L.ended = h.name;
    if (!this.M.discoveries.includes(id)) this.M.discoveries.push(id);
    this.log(`隐藏结局 · ${h.name}`, 'death');
    await this.choose({ title: `隐藏结局 · ${h.name}`, text: h.text + (h.silu ? `\n\n司灯：「${h.silu}」` : ''), options: [{ label: '回到轮回井' }], style: 'ending', important: true });
  }

  // ================= 天书、心愿 =================
  gainPage(n: number) {
    const L = this.L;
    if (this.hasPage(n)) return;
    L.pagesGot.push(n);
    const p = PAGES[n - 1];
    const sealed = p.vol > this.M.saga.volume;
    this.log(`天书第 ${n} 页${sealed ? '（封印中，待' + VOLUME_NAMES[p.vol] + '解锁时可读）' : ''}：「${p.cond}」`, 'page');
    this.highlight(`得天书第 ${n} 页`, 90, 'page' + n);
    if (L.wish && this.wishDef(L.wish.id)?.page === n) this.completeWish();
  }

  checkPages() {
    const L = this.L;
    if (!L.inDao && L.realm === 0 && L.age >= 80) this.gainPage(2);
    if (L.rootFailed && L.inDao) this.gainPage(3);
    if (L.realm >= 2) this.gainPage(4);
  }

  wishDef(id: string): WishDef | undefined {
    return WISHES.find((w) => w.id === id);
  }

  checkWish(atDeath = false) {
    const L = this.L;
    const w = L.wish;
    if (!w || w.done) return;
    const d = this.wishDef(w.id);
    if (!d) return;
    let prog = 0;
    let done = false;
    switch (w.id) {
      case 'W01': prog = L.age / 80; done = !L.inDao && L.age >= 80; break;
      case 'W25': prog = L.age / 100; done = !L.inDao && L.age >= 100; break;
      case 'W03': prog = L.realm >= 2 ? 1 : L.inDao ? (L.realm - 1 + L.xp / this.need()) / 1 : 0; done = L.realm >= 2; break;
      case 'W10': prog = L.realm / 3; done = L.realm >= 3; break;
      case 'W14': prog = L.realm / 4; done = L.realm >= 4; break;
      case 'W05': prog = L.battleKinds.length / 3; done = L.battleKinds.length >= 3; break;
      case 'W06': prog = Math.min(1, L.merit / 150) * 0.9; done = atDeath && !L.inDao && (L.deathCause === '寿终正寝' || L.ended === '人间一世') && L.merit >= 150; break;
      case 'W19': prog = L.realm / 4; done = L.realm >= 4 && L.kills === 0; if (L.kills > 0) prog = 0; break;
      case 'W26': prog = L.realm / 5; done = L.realm >= 5 && L.skills.length <= 1; break;
      case 'W27': prog = L.realm / 3; done = L.realm >= 3 && L.origin === '贫苦农家'; break;
      case 'W28': prog = L.realm / 4; done = L.realm >= 4 && !L.usedHelp && !L.usedFormation; break;
      case 'W29': prog = L.battlesWon / 30; done = L.battlesWon >= 30; break;
      case 'W30': prog = L.mortalVisitsAfterSpirit / 5; done = L.mortalVisitsAfterSpirit >= 5; break;
      case 'W31': prog = this.hasTrace('life_borrowed') ? 0.6 : 0; done = atDeath && this.hasTrace('life_borrowed') && (L.deathCause === '大限坐化' || L.deathCause === '寿终正寝'); break;
      case 'W32': prog = L.disciples / 3; done = L.disciples >= 3 && !!L.flags.headWin; break;
      case 'W33': prog = L.realm / 3; done = L.realm >= 3 && L.talents.every((t) => TALENT_BY_ID[t].grade === '凡品'); break;
      case 'W34': prog = L.realm / 5; done = L.realm >= 5 && L.rerollsUsed === 0; if (L.rerollsUsed) prog = 0; break;
      case 'W35': case 'W36': case 'W37': case 'W38': {
        const c = d.lamp!;
        done = (L.bonds[c] ?? 0) >= 1 && (w.id !== 'W37' || !L.flags.chiyiDead);
        prog = done ? 1 : 0.3;
        break;
      }
      case 'W13': prog = Object.keys(L.bonds).length / 2; done = Object.keys(L.bonds).length >= 2; break;
      case 'W17': prog = L.realm / 5; break;
      case 'W41': prog = faceKinds(this.M) / 12; done = faceKinds(this.M) >= 12; break;
      case 'W42': prog = (L.acqResolved?.length ?? 0) / 3; done = (L.acqResolved?.length ?? 0) >= 3; break;
      case 'W43': prog = L.acqResolved?.some((r) => r.relation === 'grudge' && r.earlier) ? 1 : 0.1; done = prog === 1; break;
      case 'W18': prog = this.M.saga.knocks / 3; break;
      default:
        if (d.page) prog = 0.2;
    }
    w.progress = Math.max(w.progress, Math.min(1, prog));
    if (done) this.completeWish();
  }

  completeWish() {
    const L = this.L;
    if (!L.wish || L.wish.done) return;
    L.wish.done = true;
    L.wish.progress = 1;
    const d = this.wishDef(L.wish.id);
    this.log(`心愿圆满：「${d?.name ?? '弥补遗憾'}」`, 'wish');
    trailMark(this, { kind: 'wish', title: `心愿圆满「${d?.name ?? '弥补遗憾'}」` });
    this.highlight(`了却心愿「${d?.name}」`, 100, 'wish');
    if (d?.page) this.gainPage(d.page);
  }

  // ================= 轮回井 =================
  async well() {
    const L = this.L;
    const M = this.M;
    M.deaths += 1;
    recordLegacies(this);
    settleBook(this);
    const newAch = checkAchievements(this);
    M.recentChoices = [L.choicesDone.slice(), ...(M.recentChoices ?? [])].slice(0, 2);
    if (L.hook && !L.hook.outcome) await this.hookEnd('open', '到死没走完');
    this.checkWish(true);
    if (!L.inDao && (L.deathCause === '寿终正寝' || L.ended === '人间一世') && L.merit >= 150) this.gainPage(7);
    if (M.deaths === 1) this.gainPage(1);

    // 劫主之后的结局选择
    let endingKey: string | null = null;
    if (L.ended === 'lord') endingKey = await this.chooseEnding();

    // 墓志铭
    const ep = this.epitaph(endingKey);
    M.epitaphs.unshift(ep);
    M.epitaphs = M.epitaphs.slice(0, 50);
    const tl = L.trail?.nodes ?? [];
    if (tl.length && tl[tl.length - 1].kind !== 'death') {
      const last = tl[tl.length - 1];
      trailMark(this, { kind: 'death', title: L.deathCause ?? (endingKey ? `结局 · ${ENDINGS[endingKey as keyof typeof ENDINGS]?.name ?? endingKey}` : L.ended === 'lord' ? '斩劫主' : L.ended ?? '终'), from: last.age === L.age && last.kind === 'battle' ? last.id : undefined });
    }
    trailArchive(M, L);
    if (L.epitaphSpecial === '井中人' && !M.discoveries.includes('well')) M.discoveries.push('well');

    // 结算（R10）
    const ascended = L.ended === '叩门' || endingKey !== null;
    let score = (ascended ? 2400 : REALM_SCORE[L.realm]) + Math.min(L.age, 120) * 2 + L.merit * 0.6 + L.kills * 0.15 + Object.values(L.bonds).reduce((a, b) => a + (b ?? 0), 0) * 80 + (ascended ? 300 : 0);
    score = Math.round(score);
    const grade = gradeOf(score);
    ep.grade = grade;
    let insight = Math.max(5, Math.round(score / 18));
    if (this.tflag('insightBonus')) insight = Math.round(insight * 1.2);
    const wd = L.wish?.done ? this.wishDef(L.wish.id) : undefined;
    if (wd) {
      if (wd.kind === 'main') insight += 30;
      else if (wd.kind === 'challenge') insight = Math.round(insight * 1.5);
      else insight += 20;
      if (!M.wishesDone.includes(wd.id)) M.wishesDone.push(wd.id);
      if (wd.kind === 'companion' && wd.lamp) {
        L.bonds[wd.lamp] = (L.bonds[wd.lamp] ?? 0) + 1;
      }
    }
    if (L.regretFixed) insight += 20 + 10 * M.saga.volume;
    // 一人千面：引子与故人的宿慧
    let faceInsight = L.insightExtra ?? 0;
    for (const r of L.acqResolved ?? []) {
      faceInsight += r.relation === 'favor' ? 20 : 30;
      if (r.relation === 'vow') (M.nextBonus ??= {}).rerollOnce = ((M.nextBonus ??= {}).rerollOnce ?? 0) + 1;
    }
    insight += faceInsight;
    M.insight += insight;
    if (ascended) M.ascensions += 1;

    const epText = `${ep.title}\n\n${ep.lines.join('\n')}\n${ep.death}`;
    await this.choose({ title: '墓志铭', text: epText, options: [{ label: '收起墓志铭' }], style: 'epitaph', important: true });
    await this.choose({
      title: '本世结算',
      text: `评分 ${score} · 评级 ${grade}\n境界：${ascended ? '飞升' : REALMS[L.realm].name}　享年：${L.age}\n功德 ${L.merit}　斩墨 ${L.kills}\n宿慧 +${insight}（共 ${M.insight}）${faceInsight ? `，其中引子与故人 +${faceInsight}` : ''}${wd ? `\n心愿「${wd.name}」圆满` : L.wish ? `\n心愿「${this.wishDef(L.wish.id)?.name}」未成（${Math.round(L.wish.progress * 100)}%）` : ''}`,
      options: [{ label: '继续' }],
      style: 'well',
    });

    // 故人与千面录
    const kindsBefore = faceKinds(M) - (L.hook?.outcome === 'done' && (M.faces ?? []).filter((f) => f.hook === L.hook!.id).length === 1 ? 1 : 0);
    const acqLines = this.settleAcquaintances();
    const kinds = faceKinds(M);
    if (kindsBefore < 3 && kinds >= 3) acqLines.push('千面录集齐 3 种引子：引子「说书人」可能出现了。');
    if (kindsBefore < 6 && kinds >= 6) acqLines.push('千面录集齐 6 种引子：轮回盘新增「择世」。');
    if (kindsBefore < 12 && kinds >= 12) {
      acqLines.push('千面录集齐 12 种引子：称号「一人千面」。');
      if (!M.discoveries.includes('faces12')) M.discoveries.push('faces12');
    }
    M.lastEra = L.era ?? null;
    if (acqLines.length) await this.choose({ title: '故人', text: acqLines.join('\n'), options: [{ label: '记下' }], style: 'well' });
    if (newAch.length) {
      metaCult(M).newAch = newAch;
      await this.choose({ title: '轮回碑', text: newAch.map((id) => { const a = ACHIEVEMENTS.find((x) => x.id === id)!; return `【${a.name}】${a.cond}\n　→ ${a.reward}`; }).join('\n'), options: [{ label: '刻下' }], style: 'well' });
    }

    // 前世遗憾
    const reg = this.makeRegret();
    M.regrets = M.regrets.filter((r) => r.expires > L.lifeNo);
    if (reg) {
      M.regrets.unshift(reg);
      M.regrets = M.regrets.slice(0, 2);
      trailRef(this, `regret:${reg.type}`);
      await this.choose({ title: '前世遗憾', text: reg.text, options: [{ label: '记下' }], style: 'well' });
    }

    // 天书与命灯：合并到轮回数据
    const newPages = L.pagesGot.filter((p) => !M.saga.pages.includes(p));
    const oldSilu = lampOf(M, null, 'silu');
    for (const p of newPages) M.saga.pages.push(p);
    M.saga.pages.sort((a, b) => a - b);
    // 卷三自动页
    if (M.saga.pages.length >= 24 && !M.saga.pages.includes(25)) {
      M.saga.pages.push(25);
      newPages.push(25);
    }
    if ([...Array(25).keys()].every((i) => M.saga.pages.includes(i + 1)) && !M.saga.pages.includes(26)) {
      M.saga.pages.push(26);
      newPages.push(26);
    }
    for (const p of newPages) {
      const pg = PAGES[p - 1];
      const sealed = pg.vol > M.saga.volume;
      await this.choose({ title: `天书 · 第 ${p} 页`, text: sealed ? `（此页封印，待${VOLUME_NAMES[pg.vol]}解锁时方可读）\n\n获得条件：${pg.cond}` : pg.text, options: [{ label: '翻过' }], style: 'page' });
    }
    const brightened: string[] = [];
    for (const c of ['fox', 'chiyi', 'danzun', 'bottle'] as const) {
      const add = L.bonds[c] ?? 0;
      if (add > 0) {
        M.saga.lamps[c] = Math.min(9, M.saga.lamps[c] + Math.min(2, add));
        brightened.push(`${COMPANION_NAMES[c]}的命灯亮到 ${M.saga.lamps[c]} 级：「${COMPANION_QUOTE[c]}」`);
      }
    }
    M.saga.lamps.silu = lampOf(M, null, 'silu');
    if (brightened.length) await this.choose({ title: '命灯', text: brightened.join('\n'), options: [{ label: '继续' }], style: 'well' });

    // 卷的解锁
    const vol = M.saga.volume;
    const cnt = (a: number, b: number) => M.saga.pages.filter((p) => p >= a && p <= b).length;
    if (vol === 1 && cnt(1, 9) >= 7 && M.saga.pages.includes(4) && M.saga.pages.includes(9)) {
      M.saga.volume = 2;
      await this.choose({ title: '仙途卷', text: '凡尘卷合上了。司灯：「你问执笔人是谁？去问丹尊。」\n\n解锁：魔域地点（可在轮回盘购买）、丹尊与掌天瓶的同行者线、三个新出身。', options: [{ label: '展卷' }], style: 'page', important: true });
    } else if (vol === 2 && cnt(10, 18) >= 7 && M.saga.pages.includes(18)) {
      M.saga.volume = 3;
      await this.choose({ title: '天门卷', text: '仙途卷合上了。下一次飞升天门劫，你将真正面对劫主。\n\n解锁：劫主三阶段战、天门前庭地点。', options: [{ label: '展卷' }], style: 'page', important: true });
    }

    // 司灯对白
    let silu = this.siluLine(newPages, endingKey, oldSilu);
    if (L.flags.siluExtra) silu += '\n\n她看了一眼你守过的那座小庙：「庙火没灭。我替你记着。」';
    await this.choose({ title: '司灯', text: silu, options: [{ label: '……' }], style: 'well' });

    // 井底（隐藏 H3）
    if (M.discoveries.includes('well') && !M.discoveries.includes('H3')) {
      const i = await this.choose({ title: '轮回井', text: '井边多了一道裂缝，往下看，深不见底。', options: [{ label: '往下看' }, { label: '不看' }], style: 'well' });
      if (i === 0) {
        const j = await this.choose({ title: '轮回井', text: '真的要跳下去吗？', options: [{ label: '跳' }, { label: '算了' }], style: 'well' });
        if (j === 0) {
          M.discoveries.push('H3');
          await this.choose({ title: '隐藏结局 · 井底', text: `${HIDDEN.H3.text}\n\n司灯：「${HIDDEN.H3.silu}」`, options: [{ label: '上去' }], style: 'ending' });
        }
      }
    }

    // 传承
    const hi = await this.choose({ title: '传承', text: '择一项天赋，下一世必定出现。', options: L.talents.map((t) => ({ label: `${TALENT_BY_ID[t].name}（${TALENT_BY_ID[t].grade}）`, desc: TALENT_BY_ID[t].desc })), style: 'well' });
    M.heritage = L.talents[hi] ?? null;

    // 轮回盘与画卷解锁
    await this.wheelShop();

    // 领取心愿
    if (M.deaths >= 3) await this.offerWish();
    saveMeta(M);
  }

  async chooseEnding(): Promise<string> {
    const M = this.M;
    const L = this.L;
    const opts: { k: string; label: string }[] = [
      { k: 'A', label: '封门守世｜你取代劫主，守住画卷' },
      { k: 'B', label: '大开天门｜众生可以飞升，墨潮也随之涌入' },
    ];
    if (this.lamp('chiyi') >= 9) opts.push({ k: 'C', label: '与赤衣同入墨中｜化墨' });
    const allPages = PAGES.every((p) => this.hasPage(p.n));
    const allLamps = (['fox', 'chiyi', 'danzun', 'bottle'] as const).every((c) => this.lamp(c) >= 9);
    if (allPages && allLamps) opts.push({ k: 'T', label: '重画天门｜真结局' });
    const i = await this.choose({ title: '落笔', text: PAGES[26].text, options: opts.map((o) => ({ label: o.label })), style: 'ending', important: true });
    const k = opts[i].k;
    const E = ENDINGS[k as keyof typeof ENDINGS];
    let text = E.text;
    if (k === 'B' && L.flags.foxSnowHeard) text += '\n\n白狐：「画外也下雪。雪是黑的。我陪你看。」';
    if (k === 'C') text += L.flags.chiyiSorry ? '\n\n赤衣：「这次，你没把我留在门外。」' : '\n\n赤衣：「你还是这样。走吧，一起。」';
    if (E.silu) text += `\n\n司灯：「${E.silu}」`;
    await this.choose({ title: `结局 · ${E.name}`, text, options: [{ label: '继续轮回' }], style: 'ending', important: true });
    if (!M.saga.endings.includes(k)) M.saga.endings.push(k);
    L.ended = E.name;
    return k;
  }

  epitaph(endingKey: string | null) {
    const L = this.L;
    const hls = L.log.filter((e) => e.hl && e.score).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const h of hls) {
      const t = (h.hlType ?? '').replace(/\d+$/, '');
      if (seen.has(t) && t !== 'page') continue;
      seen.add(t);
      lines.push(h.hl!);
      if (lines.length >= 3) break;
    }
    if (!lines.length) lines.push(`${cnAge(Math.max(1, Math.floor(L.age / 2)))}岁，日子平平淡淡`);
    let title = '';
    if (L.epitaphSpecial === '井中人') return { life: L.lifeNo, title: '井中人', lines: ['他跳进了另一口井。'], death: '', grade: '' };
    if (endingKey) title = ENDINGS[endingKey as keyof typeof ENDINGS].name;
    else if (L.flags.wangsun && !L.ended) title = '王孙';
    else if (L.ended === '叩门') title = '叩门人';
    else if (L.ended) title = L.ended;
    else if (!L.inDao && L.age >= 60) title = `${L.origin.slice(0, 2)}某翁`;
    else if (!L.inDao && L.age < 20) title = '少年郎';
    else if (L.capReason === 'love' && L.cap != null) title = '还俗人';
    else if (this.capped() && L.fate && FATE_BY_ID[L.fate].paths.length) title = `止步${REALMS[L.realm].name}的${FATE_BY_ID[L.fate].name}`;
    else if (L.inDao && L.kills === 0 && L.realm >= 2) title = '不杀人';
    else if (L.kills >= 2000) title = '斩墨万计';
    else if (L.schoolCur) title = `${SCHOOL_NAMES[L.schoolCur]}${REALMS[L.realm].name}`;
    else title = L.inDao ? `${REALMS[L.realm].name}散人` : '凡人';
    const place = L.deathLoc && LOC_BY_ID[L.deathLoc] ? '于' + LOC_BY_ID[L.deathLoc].name : '';
    const death = L.ended ? `${cnAge(L.age)}岁，${L.ended}` : L.deathCause === '寿终正寝' ? `${cnAge(L.age)}岁，寿终正寝` : `${cnAge(L.age)}岁，${L.deathCause}${place}`;
    return { life: L.lifeNo, title, lines, death, grade: '' };
  }

  makeRegret() {
    const L = this.L;
    const cands: { type: string; ref: string; text: string; score: number }[] = [];
    if (L.inDao && L.xp >= this.need() * 0.85 && L.realm < 5) {
      cands.push({ type: 'breakthrough', ref: '', text: REGRETS.breakthrough.show.replace('{数值}', String(Math.max(1, Math.round(this.need() - L.xp)))).replace('{下一境界}', REALMS[L.realm + 1].name), score: 80 });
    }
    if (L.deathCause && FATAL_DEATHS.includes(L.deathCause) && L.deathLoc) {
      cands.push({ type: 'place', ref: L.deathLoc, text: REGRETS.place.show.replace('{年龄}', cnAge(L.age)).replace('{地点}', LOC_BY_ID[L.deathLoc].name), score: 75 });
    }
    if (L.wish && !L.wish.done && L.wish.progress >= 0.6) cands.push({ type: 'wish', ref: L.wish.id, text: REGRETS.wish.show.replace('{心愿}', this.wishDef(L.wish.id)?.name ?? ''), score: 70 });
    if (L.flags.grudge) cands.push({ type: 'grudge', ref: '', text: REGRETS.grudge.show, score: 60 });
    if (L.hook?.outcome === 'open') cands.push({ type: 'hook', ref: L.hook.id, text: REGRETS.hook.show.replace('{引子}', HOOK_BY_ID[L.hook.id].name), score: 55 });
    if (L.skills.some((s) => s.lvl >= 4)) cands.push({ type: 'treasure', ref: 'fortune', text: REGRETS.treasure.show.replace('{法宝}', SKILL_NAMES[L.skills.reduce((a, b) => (a.lvl >= b.lvl ? a : b)).id]), score: 50 });
    if (L.ended) return null;
    const best = cands.sort((a, b) => b.score - a.score)[0];
    if (!best) return null;
    return { type: best.type, ref: best.ref, text: best.text, bornLife: L.lifeNo, expires: L.lifeNo + 3 + (L.flags.regretKeep ? 1 : 0) };
  }

  siluLine(newPages: number[], endingKey: string | null, oldSilu: number): string {
    const M = this.M;
    const L = this.L;
    if (endingKey) return SILU_TRIGGER.afterEnd;
    if (M.deaths === 1) return SILU_TRIGGER.death1;
    if (M.deaths === 2) return SILU_TRIGGER.death2;
    if (M.deaths === 3) return SILU_TRIGGER.death3 + '（心愿系统解锁）';
    if (newPages.includes(4)) return SILU_TRIGGER.p04;
    if (L.ended === '叩门' && M.saga.knocks === 1) return SILU_TRIGGER.knock1;
    if (L.flags.askSilu) return '「砚」字？……那是画者的东西。它认得你，比我认得你更早。';
    if (L.deathCause && FATAL_DEATHS.includes(L.deathCause)) return SILU_TRIGGER.accident;
    if (L.deathCause === '陨于天劫') return SILU_TRIGGER.trial;
    if (L.wish?.done) return SILU_TRIGGER.wishDone;
    if (L.wish && !L.wish.done && L.wish.progress >= 0.6) return SILU_TRIGGER.wishFail;
    if (lampOf(M, null, 'silu') >= 7) return SILU_TRIGGER.dim;
    void oldSilu;
    const lines = faceKinds(M) >= 1 ? [...SILU_DAILY[M.saga.volume], ...FACES_SILU] : SILU_DAILY[M.saga.volume];
    const line = lines[M.siluIdx % lines.length];
    M.siluIdx += 1;
    return line;
  }

  async wheelShop() {
    const M = this.M;
    for (;;) {
      const items: { label: string; desc: string; price: number; ok: boolean; fn: () => void }[] = [];
      for (const w of WHEEL) {
        const lvl = M.wheel[w.id] ?? 0;
        if (lvl >= w.max) continue;
        const gateOk = !w.gate || w.gate(M);
        const price = wheelPrice(w, lvl);
        items.push({ label: `${w.name} ${lvl}→${lvl + 1}（${price} 宿慧）`, desc: gateOk ? w.desc : `${w.desc}｜${w.gateText}`, price, ok: gateOk && M.insight >= price, fn: () => (M.wheel[w.id] = lvl + 1) });
      }
      for (const u of UNLOCKS) {
        if (M.unlocks.includes(u.id)) continue;
        const gateOk = u.gate(M);
        items.push({ label: `画卷解锁 · ${u.name}（${u.price} 宿慧）`, desc: gateOk ? u.desc : `${u.desc}｜${u.gateText}`, price: u.price, ok: gateOk && M.insight >= u.price, fn: () => M.unlocks.push(u.id) });
      }
      const i = await this.choose({ title: `轮回盘 · 宿慧 ${M.insight}`, text: '花宿慧强化或解锁画卷。', options: [...items.map((it) => ({ label: it.label, desc: it.desc, disabled: !it.ok })), { label: '入画（开始下一世）' }], style: 'well', key: 'wheel' });
      if (i >= items.length) return;
      M.insight -= items[i].price;
      items[i].fn();
    }
  }

  async offerWish() {
    const M = this.M;
    const avail = (w: WishDef) => !M.wishesDone.includes(w.id) || w.kind === 'challenge';
    const pages = M.saga.pages;
    const main = WISHES.filter((w) => w.kind === 'main' && w.page && !pages.includes(w.page) && PAGES[w.page - 1].vol <= M.saga.volume).sort((a, b) => a.page! - b.page!);
    const out: WishDef[] = [];
    if (main[0]) out.push(main[0]);
    const free = WISHES.filter((w) => (w.kind === 'challenge' && (w.unlock ?? 0) <= M.saga.volume - 1) || (w.kind === 'companion' && (!w.lamp || ['fox', 'chiyi'].includes(w.lamp) || M.saga.volume >= 2)));
    const pickFree = () => weighted(free.filter((w) => !out.includes(w) && avail(w)), (w) => (M.wishesDone.includes(w.id) ? 0.3 : 1));
    const f1 = pickFree();
    if (f1) out.push(f1);
    const regWish = M.regrets.find((r) => r.type === 'wish');
    if (regWish && this.wishDef(regWish.ref) && !out.some((w) => w.id === regWish.ref)) out.push(this.wishDef(regWish.ref)!);
    else if (M.regrets.length && !out.some((w) => w.id === 'W07')) out.push(this.wishDef('W07')!);
    else {
      const f2 = pickFree();
      if (f2) out.push(f2);
    }
    if (main[1] && out.length < 3) out.push(main[1]);
    const i = await this.choose({ title: '领取心愿', text: '司灯给出三个心愿，选一个带入下一世。', options: out.map((w) => ({ label: `「${w.name}」`, desc: `${w.cond}${w.page ? `（天书第 ${w.page} 页）` : w.kind === 'challenge' ? '（挑战：宿慧 ×1.5）' : '（命灯 +1）'}` })), style: 'well', important: true });
    this.pendingWish = out[i]?.id ?? null;
    (M as MetaState & { nextWish?: string | null }).nextWish = this.pendingWish;
  }

  // ================= IO 包装 =================
  async ask(title: string, text: string, options: string[], style: Prompt['style'] = 'event', important = false, key?: string): Promise<number> {
    const i = await this.io.choose({ title, text, options: options.map((o) => { const [label, desc] = o.split('｜'); return { label, desc }; }), style, important, key });
    const label = (options[i] ?? '').split('｜')[0];
    // 经历图谱：事件里的抉择记在事件名下；人生大关（抓周、仙缘、择本命……）单独记一笔
    if (trailTop(this) != null) trailPick(this, label);
    else if (this.L && !this.L.deathCause && !this.L.ended && style === 'milestone') {
      const id = trailOpen(this, { kind: 'choice', title, text });
      trailPick(this, label);
      trailClose(this, id);
    }
    return i;
  }
  choose(p: Prompt) {
    return this.io.choose(p);
  }
}

export { rand, randInt };
export type { Tendency };
