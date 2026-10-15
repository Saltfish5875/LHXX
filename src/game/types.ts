import type { AttrKey, School } from '../data/core';
import type { CompanionId } from '../data/content';

export type BattleKind = 'beast' | 'duel' | 'trial';
export type Tendency = 'safe' | 'chance' | 'war';
export type CardTag = '劫' | '缘' | '凶' | '平' | '引' | '故';
export type AcqRelation = 'favor' | 'grudge' | 'vow';

// 战斗中可升阶的法宝 / 道法（跨战斗保留，一世有效）
export type SkillId = 'sword' | 'orbit' | 'thunder' | 'fire' | 'frost' | 'ink' | 'art';
export interface Skill {
  id: SkillId;
  lvl: number;
}

export interface Effect {
  attr?: Partial<Record<AttrKey, number>>;
  stones?: number;
  merit?: number;
  xpPct?: number;
  life?: number; // 寿元增减（年）
  age?: number; // 额外流逝年数
  school?: Partial<Record<School, number>>;
  trace?: string;
  flag?: string;
  favor?: number;
  injure?: number;
  hpMax?: number;
  grudge?: boolean;
  removeGrudge?: boolean;
  inspire?: number;
  disciple?: number;
  partner?: boolean; // 结为道侣
  hebo?: number;
  kill?: boolean;
  nextLoc?: string;
  banLoc?: { loc: string; years: number };
  reroll?: number;
  skill?: SkillId;
  battle?: { kind: BattleKind; title: string; elites?: number; boss?: string; reward?: number; win?: Effect; lose?: Effect; cultOnly?: boolean };
  die?: string;
  text?: string;
  epitaph?: string; // 隐藏墓志铭
  spareChiyi?: boolean;
  killChiyi?: boolean;
  // 一人千面
  hook?: 'done' | 'open'; // 立即了结 / 记为未了
  giveHook?: string; // 本世没有引子时获得
  acq?: { role: string; relation: AcqRelation }; // 生成一位故人
  acqResolve?: boolean; // 了结当前再遇的故人
  hl?: { text: string; score: number }; // 墓志铭高光
  insight?: number; // 结算时额外宿慧
  bond?: 'fox' | 'chiyi' | 'danzun' | 'bottle'; // 同行者本世进度 +1
  next?: { fam?: number; fortune?: number; reroll?: number; rerollOnce?: number; chooseHook?: boolean; regretKeep?: number }; // 影响下一世
}

export interface Roll {
  attr: AttrKey;
  dc: number; // 属性 ≥ dc 必成，否则按差值折算概率
  ok: Effect;
  fail: Effect;
}

export interface Option {
  label: string;
  desc?: string;
  eff?: Effect;
  roll?: Roll;
  chance?: { p: number; ok: Effect; fail: Effect };
  when?: (L: LifeState, M: MetaState) => boolean;
  lamp?: boolean; // 同行者事件：选这个是否点亮命灯（默认 true）
  page?: number; // 直接给天书页
}

export interface LogEntry {
  age: number;
  text: string;
  kind?: 'normal' | 'milestone' | 'battle' | 'death' | 'page' | 'wish' | 'companion' | 'fate';
  loc?: string;
  score?: number; // 墓志铭高光分
  hl?: string; // 高光短句
  hlType?: string;
}

export interface Card {
  loc: string;
  tag: CardTag;
  peeked?: string; // 窥过的事件 id
  acq?: string; // 「故」卡：故人 id
}

// 一人千面：引子、故人
export interface HookState {
  id: string;
  beat: number; // 已走完的拍数 0～3
  due: number; // 下一拍到期的年龄
  deferred: number; // 当前拍已顺延的年数
  outcome?: 'done' | 'open';
}
export interface Acquaintance {
  id: string;
  name: string;
  role: string;
  relation: AcqRelation;
  era: string;
  life: number;
  lastSeen: number;
  resolved: boolean;
}

export interface Wish {
  id: string;
  progress: number;
  done: boolean;
}

export interface LifeState {
  lifeNo: number;
  age: number;
  realm: number; // 0 凡人
  inDao: boolean;
  xp: number;
  hp: number;
  maxHp: number;
  attrs: Record<AttrKey, number>;
  talents: string[];
  origin: string;
  root: string;
  rootFailed: boolean;
  route: 'sect' | 'rogue' | null;
  stones: number;
  merit: number;
  kills: number;
  lifeBonus: number; // 事件累计寿元
  injuries: number;
  traces: { tag: string; realm: number }[];
  flags: Record<string, number>;
  school: Record<School, number>;
  schoolCur: School | null;
  skills: Skill[];
  favor: number;
  inspire: number;
  disciples: number;
  partner: boolean;
  wish: Wish | null;
  log: LogEntry[];
  pagesGot: number[];
  bonds: Partial<Record<CompanionId, number>>; // 本世命灯进度
  companionsMet: CompanionId[];
  injuredUntil: Partial<Record<string, number>>;
  calm: number;
  rerollsUsed: number;
  battleKinds: BattleKind[];
  battlesWon: number;
  usedHelp: boolean;
  usedFormation: boolean;
  nextLoc: string | null;
  bans: Record<string, number>;
  choicesDone: string[];
  deathCause: string | null;
  deathLoc: string | null;
  ended: string | null; // 结局标题
  legend: string | null;
  firstRealmBattle: number[]; // 已打过首场的境界
  hold: number;
  rewindUsed: boolean;
  regretsActive: { type: string; ref: string }[];
  regretFixed: boolean;
  phoenixUsed: boolean;
  epitaphSpecial: string | null;
  homeVisits: number;
  caveVisits: number;
  mortalVisitsAfterSpirit: number;
  marketCd: number;
  era?: string;
  hook?: HookState | null;
  acqMet?: string[];
  acqNew?: { role: string; relation: AcqRelation; src: string }[]; // 本世结下、待结算的故人
  acqResolved?: { id: string; relation: AcqRelation; earlier: boolean }[];
  acqCards?: number;
  insightExtra?: number;
}

export interface Regret {
  type: string;
  ref: string;
  text: string;
  bornLife: number;
  expires: number;
}

export interface Epitaph {
  life: number;
  title: string;
  lines: string[];
  death: string;
  grade: string;
}

export interface MetaState {
  version: 3;
  lives: number;
  insight: number;
  ascensions: number;
  saga: {
    volume: number;
    pages: number[];
    lamps: Record<CompanionId, number>;
    knocks: number;
    endings: string[];
    chiyiKills: number;
  };
  regrets: Regret[];
  wishesDone: string[];
  unlocks: string[];
  wheel: Record<string, number>;
  heritage: string | null;
  epitaphs: Epitaph[];
  discoveries: string[];
  hebo: number;
  siluIdx: number;
  achievements: string[];
  deaths: number;
  acquaintances?: Acquaintance[];
  faces?: { hook: string; era: string }[];
  lastEra?: string | null;
  nextBonus?: { fam?: number; fortune?: number; reroll?: number; rerollOnce?: number; chooseHook?: boolean };
  settings: { tendency: Tendency; speed: number };
}
