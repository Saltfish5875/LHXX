import type { BattleKind, Skill } from '../game/types';
import type { Mutator } from '../data/content';

export type Boss = 'general' | 'knock' | 'lord' | 'chiyi' | 'hebo' | 'trial-mirror';

export interface PartnerSpec {
  id: string; // fox / chiyi / danzun / partner / cat / disciples
  name: string;
  lamp: number;
  count?: number;
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
}
