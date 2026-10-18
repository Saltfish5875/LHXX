// 因果链与即时奇遇的数据格式（内容库「事件库扩充」、系统设计案附录「事件关联与因果链」）
import type { Effect, LifeState, MetaState, Option, PetKind } from '../game/types';

// 条件：都写了就都要满足。链内标记只在链拍里有意义
export interface Need {
  mark?: string; // 有这个链内标记
  noMark?: string; // 没有这个链内标记
  markN?: [string, number]; // 这个标记至少记了 n 次
  yuanMin?: number;
  yuanMax?: number;
  cult?: boolean; // 已入道
  mortal?: boolean; // 未入道
  realm?: number; // 境界 ≥（1 练气 2 筑基 3 金丹 4 元婴 5 化神）
  stones?: number; // 灵石 ≥
  flag?: string; // 世内标记 L.flags[flag] 存在
  noFlag?: string;
  partner?: boolean; // 有道侣
  pet?: boolean; // 有灵宠
  noPet?: boolean;
  ageMin?: number;
  ageMax?: number;
  attr?: [keyof LifeState['attrs'], number]; // 属性 ≥
}

export interface ChainOption extends Option {
  need?: Need;
}

export interface ChainBeat {
  // 「缘」格可能刷在哪些地点；'any' = 当前能去的任意地点；'same' = 和上一拍同一格（签到碑）
  locs: string[] | 'any' | 'same';
  text: string;
  textIf?: { need: Need; text: string }[]; // 第一个满足的替换 text
  options: ChainOption[];
  when?: (L: LifeState, M: MetaState) => boolean; // 这一拍的「缘」格要等到条件满足才出现（如「上山修道那天」要等入道）
}

export interface ChainEnding {
  tier: 'top' | 'mid' | 'low';
  need?: Need; // 写了条件的结局优先（按书写顺序）；没写的按缘分分档：上 ≥4、中 2～3、下 ≤1
  text: string; // 结局文案
  label?: string; // 选项文字，默认「收下」
  eff?: Effect;
  options?: ChainOption[]; // 结局里还要再选一次时用（代替 label/eff）
}

export interface ChainDef {
  id: string; // YG01 / LC01 / D01
  name: string; // 剑中老鬼
  group: string; // 金手指与随身前辈
  gain: string; // 最大收获，一句话
  stage: 'mortal' | 'cult' | 'any'; // 起拍在哪个阶段出现
  when?: (L: LifeState, M: MetaState) => boolean; // 起拍的额外条件（年龄、世数……）
  weight?: number; // 起拍出现的权重，默认 1
  start: ChainBeat; // 第一拍：选项里 eff.chain = { op: 'start', yuan, mark } 才开链；不写 = 不开链
  beats: [ChainBeat, ChainBeat]; // 第二、三拍
  end: ChainBeat & { endings?: ChainEnding[] }; // 第四拍：有 endings 时按缘分/标记自动分档；没有时用 options 让玩家选
}

export const PET_NAMES: Record<PetKind, string> = {
  fox: '小狐', lynx: '山猫', crane: '白鹤', crow: '火鸦', jiao: '青蛟', chi: '墨螭', rat: '寻宝鼠', horse: '龙驹',
  tiger: '山君', gu: '本命蛊', eagle: '雷鹰', turtle: '玄龟', paper: '纸鹤', dog: '土狗', clay: '泥狗',
  parrot: '白鹦鹉', carp: '红鲤', peng: '大鹏雏', snake: '青蛇',
};
// 不战斗的灵宠
export const PET_NOFIGHT: PetKind[] = ['rat', 'clay', 'parrot', 'carp'];

export function needOk(n: Need | undefined, L: LifeState, marks?: Record<string, number>, yuan?: number): boolean {
  if (!n) return true;
  const m = marks ?? {};
  if (n.mark && !m[n.mark]) return false;
  if (n.noMark && m[n.noMark]) return false;
  if (n.markN && (m[n.markN[0]] ?? 0) < n.markN[1]) return false;
  if (n.yuanMin != null && (yuan ?? 0) < n.yuanMin) return false;
  if (n.yuanMax != null && (yuan ?? 0) > n.yuanMax) return false;
  if (n.cult && !L.inDao) return false;
  if (n.mortal && L.inDao) return false;
  if (n.realm != null && L.realm < n.realm) return false;
  if (n.stones != null && L.stones < n.stones) return false;
  if (n.flag && !(n.flag in L.flags)) return false;
  if (n.noFlag && n.noFlag in L.flags) return false;
  if (n.partner && !L.partner) return false;
  if (n.pet && !L.pet) return false;
  if (n.noPet && L.pet) return false;
  if (n.ageMin != null && L.age < n.ageMin) return false;
  if (n.ageMax != null && L.age > n.ageMax) return false;
  if (n.attr && L.attrs[n.attr[0]] < n.attr[1]) return false;
  return true;
}

// 给即时奇遇写条件用：when: need({ cult: true, realm: 2 })
export const need = (n: Need) => (L: LifeState) => needOk(n, L);
