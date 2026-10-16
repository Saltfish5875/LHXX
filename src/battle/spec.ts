import type { BattleKind, Skill, SkillId } from '../game/types';
import type { Mutator } from '../data/content';

export type Boss = 'general' | 'knock' | 'lord' | 'chiyi' | 'hebo' | 'trial-mirror';

export interface PartnerSpec {
  id: string; // fox / chiyi / danzun / partner / cat / disciples
  name: string;
  lamp: number;
  count?: number;
}

// 一门能施展的功法：层数、总倍率（品阶 × 法宝 × 器不承法 × 器灵）、附诀
export interface BattleGong {
  id: SkillId;
  lvl: number;
  mul: number;
  fj: string[];
  name: string;
  weak?: boolean; // 器不承法
}
export interface BattleActive {
  uid: number;
  id: string;
  uses: number; // 消耗型剩余次数；充能型 = 每次所需格数
  recharge: boolean;
}

export interface BattleSpec {
  kind: BattleKind;
  title: string;
  realm: number; // 1..5
  duration: number; // 妖潮坚守秒数
  elites: number;
  strikes: number; // 天劫雷数
  mutators: Mutator[];
  partners: PartnerSpec[];
  foxGuard: boolean; // 白狐命灯 ≥ 5：替主角挡一道雷 / 一次致命伤
  skills: Skill[];
  gong?: BattleGong[]; // 有法宝可御的功法（缺省时按 skills ×1）
  idle?: string[]; // 无器可御的功法名
  passives?: string[];
  actives?: BattleActive[];
  chain?: SkillId | null;
  amulet?: number; // 护身符剩余次数
  enemyMul?: number; // 底蕴：劫难强度倍率
  player: {
    maxHp: number;
    hp: number;
    dmgMul: number;
    crit: number;
    speed: number;
    armor: number;
    regen: boolean;
    lifesteal: boolean;
    phoenix: boolean;
  };
  formation: boolean;
  boss?: Boss;
  heartDemon: boolean; // 元婴劫的心魔镜像
  heartMod?: number; // 心魔难度 ±1（一人千面抉择）
  scholar: boolean;
  ascetic: boolean;
  reward: number;
  tutorial?: boolean;
  assist?: { fox: boolean; danzun: boolean; chiyi: boolean; bottle: boolean };
}

export interface BattleResult {
  win: boolean;
  hp: number;
  kills: number;
  xp: number; // 战斗经验（35% 折算修为）
  stones: number;
  skills: Skill[];
  downed: string[];
  foxBlocked: boolean;
  partnerSaved: boolean;
  mirrorBeaten: boolean;
  purified: number;
  survivedKnock: boolean;
  lordBeaten: boolean;
  cloneBeaten: boolean;
  lifeOrbs: number;
  fled?: boolean;
  dmgBy?: Record<string, number>; // 各功法出力
  procs?: Record<string, number>; // 附诀 / 触发型法宝触发次数
  activeLeft?: Record<number, number>; // 消耗型主动法宝剩余次数（uid → 次数）
  amuletUsed?: number;
  saves?: number;
  orbs?: number;
}
