import type { AttrKey, School } from '../data/core';
import type { CompanionId } from '../data/content';

export type BattleKind = 'beast' | 'duel' | 'trial';
export type Tendency = 'safe' | 'chance' | 'war';
export type CardTag = '劫' | '缘' | '凶' | '平' | '引' | '故';
export type AcqRelation = 'favor' | 'grudge' | 'vow';

// 功法：品阶（黄玄地天）+ 层数（一层～圆满），须配同器类的法宝才能施展
export type SkillId = 'sword' | 'orbit' | 'thunder' | 'fire' | 'frost' | 'ink' | 'art';
export interface Skill {
  id: SkillId;
  lvl: number;
  grade?: number; // 0 黄 1 玄 2 地 3 天
  bm?: boolean; // 本命功法
  up?: boolean; // 本世已升过品
}
// 法宝：功法型（按器类）/ 被动型 / 主动型
export interface Treasure {
  uid: number;
  kind: 'gong' | 'passive' | 'active';
  key: string; // 功法型：SkillId；其他：ITEMS 的 id
  grade: number; // 0 凡 1 法 2 灵 3 宝 4 仙
  name: string;
  fj?: string[]; // 附诀
  uses?: number; // 消耗型剩余次数；护身符剩余次数
  spirit?: string; // 器灵（灵器以上）
  bound?: boolean; // 认主（本命法宝）
}
export interface Loadout {
  gong: Partial<Record<SkillId, number>>; // 功法 → 法宝 uid
  passive: number[];
  active: number[];
  chain?: SkillId | null; // 引雷引动的功法
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
  partner?: boolean | string; // 结为道侣（字符串 = 道侣的称呼）
  hebo?: number;
  kill?: boolean;
  nextLoc?: string;
  banLoc?: { loc: string; years: number };
  reroll?: number;
  again?: number; // 再摇次数 +n（本世）
  skill?: SkillId;
  fujue?: string | boolean; // 得一枚附诀（true = 随机）
  item?: string; // 得一件被动 / 主动法宝
  canye?: boolean; // 功法残页：一门功法升一品
  xinde?: number; // 心得
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
  // 事件库扩充：因果链与新收获
  chain?: ChainOp; // 因果链：开链、缘分、标记、断链
  pet?: { kind: PetKind; adult?: boolean; name?: string }; // 得灵宠（一世一只；adult = 链上档成体）
  gain?: Gain; // 其它收获：随身前辈、化身、洞天、商会、家族……
  qi?: { skill: SkillId; grade: number }; // 得一件功法型法宝（grade 0 凡 1 法 2 灵 3 宝 4 仙）
  echo?: { text: string; eff?: Effect; laps?: number }; // 余波：几圈后兑现一次
  // 命途分岔
  fate?: {
    breakVow?: Vow; // 破戒：道心蒙尘，修为停滞
    capHere?: boolean; // 修为到此为止：上限 = 当前境界
    lift?: number; // 上限 +n（99 = 解除）
    clearStall?: boolean; // 了却尘缘
    recast?: boolean; // 散功重修：退回筑基，重铸道基
    xpMul?: number; // 本世修炼倍率
    retire?: boolean; // 安度余生
    tag?: string; // 记一笔，供后续事件判断（flags[tag] = 当时年龄）
  };
}
export type Vow = 'love' | 'kill';

// ================= 事件库扩充 =================
// 灵宠图鉴（内容库「事件库扩充」第二节）
export type PetKind =
  | 'fox' | 'lynx' | 'crane' | 'crow' | 'jiao' | 'chi' | 'rat' | 'horse' | 'tiger' | 'gu'
  | 'eagle' | 'turtle' | 'paper' | 'dog' | 'clay' | 'parrot' | 'carp' | 'peng' | 'snake';
export interface ChainOp {
  id?: string; // 省略 = 当前这条链
  op?: 'start' | 'skip' | 'break'; // start 从第一拍后开链；skip 直接到第二拍（缘分按 1 起）；break 断链
  yuan?: number; // 缘分增减（玩家看不到）
  mark?: string; // 记一个链内标记（可重复记，计次数）
  unmark?: string; // 去掉一个链内标记
}
// 其它收获：一世有效，除非写了 meta（跨世）
export interface Gain {
  id: string; // elder 随身前辈 / clone 化身 / ghost 鬼伴 / ally 伙伴 / dongtian 洞天 / guild 商会 / ward 护命 / clan 家族 / shrine 神位 / nemesis 宿敌 / keep 纪念品……
  name: string; // 显示名，如「剑鬼」「首徒」「残破洞天」
  desc?: string; // 一句话说明，显示在角色面板
  lv?: number;
  ally?: boolean; // 参战伙伴（不必请援，至多两位）
  dmg?: number; // 战斗伤害 +x（0.1 = +10%）
  roll?: number; // 判定 +n（按属性值加）
  xp?: number; // 闭关、停洞府、岁首修为 +x（0.15 = +15%）
  price?: number; // 坊市价格 -x（0.2 = -20%）
  lap?: Effect; // 每个岁首自动给的东西（如每圈灵石 +5）
  ward?: boolean; // 护命：本世第一次因事件致死时活下来
  meta?: 'clan' | 'shrine' | 'nemesis' | 'signin'; // 跨世：家族 / 神位 / 宿敌 / 签到碑
}
// ================= 经历图谱 =================
export type TrailKind = 'birth' | 'choice' | 'flavor' | 'chain' | 'hook' | 'acq' | 'bond' | 'battle' | 'realm' | 'echo' | 'wish' | 'ruin' | 'death';
export interface TrailLink {
  from: number;
  why: '承' | '因' | '引发' | '余波' | '旧事';
}
export interface TrailNode {
  id: number;
  age: number;
  kind: TrailKind;
  title: string;
  loc?: string;
  text?: string; // 事件原文（截短）
  pick?: string; // 你选了什么
  lines: string[]; // 之后发生了什么
  chips: string[]; // 得失
  thread?: string;
  threadName?: string;
  beat?: string;
  links: TrailLink[]; // 指向更早的节点
}
export interface TrailState {
  nodes: TrailNode[];
  flagSrc: Record<string, number>; // 世内标记 → 留下它的节点
  cqSrc: Record<string, number>; // 后果格标签 → 留下它的节点
  last: Record<string, number>; // 线索 → 最近一拍
}

export interface ChainState {
  id: string;
  beat: number; // 已走完的拍数 1～3（4 = 结束）
  yuan: number;
  marks: Record<string, number>;
  due: number; // 下一个「缘」格最早出现的圈数（board.lap）
  misses: number; // 「缘」格出现了却没去的次数，2 次断链
  onBoard?: boolean;
  slot?: number; // 签到碑：固定在同一格
  end?: 'top' | 'mid' | 'low' | 'broken';
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
  // 命途分岔
  fate?: string; // 命格
  daoji?: School | null; // 道基（筑基时铸成）
  cap?: number | null; // 境界上限（含），null = 无
  capReason?: string;
  stall?: Vow | null; // 破戒后道心蒙尘
  retired?: boolean; // 安度余生
  xpMul?: number;
  turnAt?: number | null; // 转机到来的年龄
  turned?: number; // 本世转机次数
  seen?: Record<string, number>; // 本世见过的流水事件
  // 命途棋盘
  board?: BoardState;
  dice?: DiceState;
  holdings?: Holding[];
  fateTile?: { lv: number; dusty: number };
  conseqNext?: string[]; // 本圈留下、下个岁首生成后果格的标签
  ruinVisits?: Record<string, number>; // 每处遗迹本世进入次数
  ruinVault?: string[]; // 本世已拿过专属遗物的遗迹
  ruinCleared?: string[]; // 本世通关过秘库的遗迹（可重振）
  // 修炼与法宝
  bag?: Treasure[];
  fjBag?: string[]; // 未挂上的附诀
  load?: Loadout;
  xinde?: number;
  identity?: string; // 轮回身份 S01…
  tier?: number;
  uid?: number;
  chainGot?: boolean; // 本世已得连锁附诀
  marketSpent?: number;
  maxStones?: number;
  saves?: number; // 本世被救回的致命伤次数
  // 事件库扩充
  chains?: ChainState[];
  pet?: { kind: PetKind; lv: number; adult: boolean; name: string } | null;
  gains?: Gain[];
  partnerName?: string;
  echoes?: { text: string; eff?: Effect; due: number; src?: number }[];
  trail?: TrailState; // 经历图谱
  nudgeLap?: number; // 龙驹：这一圈已拨过点数
}

export interface BookEntry {
  grade: number; // 前世最高品阶
  best: number; // 前世最高层数
  reach: number[]; // reach[n] = 练到第 n 层的世数
  fj: string[]; // 上一世挂在这门功法法宝上的附诀
  grades: number[]; // 收录过的品阶
}
export interface CultMeta {
  book: Partial<Record<SkillId, BookEntry>>;
  mortalStreak: number;
  saves: number;
  newAch: string[];
}

// ================= 命途棋盘 =================
export type TileKind = 'start' | 'fate' | 'market' | 'oracle' | 'hold' | 'loc' | 'conseq' | 'stray' | 'dust' | 'ruin' | 'chain';
export interface Tile {
  slot: number;
  kind: TileKind;
  loc?: string; // 地点格、引、故：地点 id
  tag?: CardTag; // 流年签标记
  ttl: number; // 剩余存续圈数（固定格为 99）
  ref?: string; // 后果格标签 / 歧路格 id / 遗泽 id / 故人 id / 因果链 id
  peeked?: string;
}
export interface BoardState {
  tiles: Tile[];
  pos: number;
  lap: number;
  stops: number;
  visited: number[];
  seenLoc: Record<string, number>; // 本世地点格出现次数
  gathered: boolean;
  forceRuin?: boolean;
  stage?: 'mortal' | 'cult';
}
export interface DiceState {
  n: number; // 恒为 1（旧档的 2～3 颗在读档时折成再摇次数）
  again?: number; // 再摇次数：本世剩余，事件与天机格可得，每世重置
  stopFace: boolean; // 「止」面：骰子的 1 换成 0
  dunFace: boolean; // 「遁」面：骰子的 6 换成遁
  ruyi: number; // 如意骰：下一次任选点数
}
export interface Holding {
  slot: number;
  type: string;
  lv: number;
  branch?: number;
  idle: number; // 连续没停过的圈数
  spent: number;
  name: string;
  forge?: number;
}
export interface Legacy {
  id: string;
  type: string;
  lv: number;
  branch?: number;
  era: string;
  name: string;
  life: number;
  keep?: boolean; // 上一世「留给后人」
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
  lastTrail?: { life: number; era?: string; nodes: TrailNode[] }; // 上一世的经历图谱
  discoveries: string[];
  hebo: number;
  siluIdx: number;
  achievements: string[];
  deaths: number;
  acquaintances?: Acquaintance[];
  faces?: { hook: string; era: string }[];
  lastEra?: string | null;
  nextBonus?: { fam?: number; fortune?: number; reroll?: number; rerollOnce?: number; chooseHook?: boolean };
  recentChoices?: string[][]; // 最近两世见过的抉择（跨世冷却）
  fates?: string[]; // 见过的命格
  legacies?: Legacy[]; // 前世产业留下的遗迹
  cult?: CultMeta;
  // 事件库扩充：跨世的收获
  clan?: { name: string; life: number } | null;
  shrines?: { name: string; life: number }[];
  nemesis?: { name: string; wins: number; life: number } | null;
  signin?: number; // 下一世签到碑从几起
  chainsDone?: string[]; // 走到上档过的链
  settings: { tendency: Tendency; speed: number; autoRoll?: boolean };
}
