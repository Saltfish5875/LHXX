import type { AttrKey, School } from '../data/core';
import type { CompanionId } from '../data/content';

export type BattleKind = 'beast' | 'duel' | 'trial';
export type Tendency = 'safe' | 'chance' | 'war';
export type CardTag = '劫' | '缘' | '凶' | '平';

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
  battle?: { kind: BattleKind; title: string; elites?: number; boss?: string; reward?: number };
  die?: string;
  text?: string;
  epitaph?: string; // 隐藏墓志铭
  spareChiyi?: boolean;
  killChiyi?: boolean;
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
  settings: { tendency: Tendency; speed: number };
}
