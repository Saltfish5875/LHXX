// 轮回数据（跨世）与存档：lhxx.meta.v3 / lhxx.life.v3
import type { LifeState, MetaState } from './types';
import type { CompanionId } from '../data/content';
import { faceKinds } from '../data/faces';

const META_KEY = 'lhxx.web.meta.v3';
const LIFE_KEY = 'lhxx.web.life.v3';

export function newMeta(): MetaState {
  return {
    version: 3,
    lives: 0,
    insight: 0,
    ascensions: 0,
    saga: {
      volume: 1,
      pages: [],
      lamps: { silu: 0, fox: 0, chiyi: 0, danzun: 0, bottle: 0 },
      knocks: 0,
      endings: [],
      chiyiKills: 0,
    },
    regrets: [],
    wishesDone: [],
    unlocks: [],
    wheel: {},
    heritage: null,
    epitaphs: [],
    discoveries: [],
    hebo: 0,
    siluIdx: 0,
    achievements: [],
    deaths: 0,
    acquaintances: [],
    faces: [],
    lastEra: null,
    nextBonus: {},
    settings: { tendency: 'safe', speed: 1 },
    cult: { book: {}, mortalStreak: 0, saves: 0, newAch: [] },
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadMeta(): MetaState {
  const s = storage();
  if (!s) return newMeta();
  try {
    const raw = s.getItem(META_KEY);
    if (!raw) return newMeta();
    const m = JSON.parse(raw) as MetaState;
    const base = newMeta();
    return { ...base, ...m, saga: { ...base.saga, ...m.saga, lamps: { ...base.saga.lamps, ...m.saga?.lamps } }, settings: { ...base.settings, ...m.settings } };
  } catch {
    return newMeta();
  }
}

export function saveMeta(m: MetaState) {
  try {
    storage()?.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* 存储不可用时静默 */
  }
}

export function saveLife(L: LifeState | null) {
  try {
    const s = storage();
    if (!s) return;
    if (L) s.setItem(LIFE_KEY, JSON.stringify(L));
    else s.removeItem(LIFE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadLife(): LifeState | null {
  try {
    const raw = storage()?.getItem(LIFE_KEY);
    return raw ? (JSON.parse(raw) as LifeState) : null;
  } catch {
    return null;
  }
}

export function resetAll() {
  try {
    storage()?.removeItem(META_KEY);
    storage()?.removeItem(LIFE_KEY);
  } catch {
    /* ignore */
  }
}

export const lampOf = (M: MetaState, L: LifeState | null, c: CompanionId) =>
  c === 'silu' ? Math.floor((M.saga.pages.length + (L ? L.pagesGot.filter((p) => !M.saga.pages.includes(p)).length : 0)) / 3) : Math.min(9, M.saga.lamps[c] + (L?.bonds[c] ?? 0));

export function hasPage(M: MetaState, L: LifeState | null, n: number) {
  return M.saga.pages.includes(n) || !!L?.pagesGot.includes(n);
}

// 轮回盘（R10 六项 + R12 天机一线）与画卷解锁
export interface WheelItem {
  id: string;
  name: string;
  desc: string;
  base: number;
  max: number;
  gate?: (M: MetaState) => boolean;
  gateText?: string;
}
export const WHEEL: WheelItem[] = [
  { id: 'attr', name: '宿世灵慧', desc: '开局属性点 +1', base: 60, max: 5 },
  { id: 'echo', name: '前尘回响', desc: '天赋候选 +1', base: 80, max: 3 },
  { id: 'blade', name: '前尘剑意', desc: '战斗伤害 +5%', base: 50, max: 5 },
  { id: 'longevity', name: '长生道果', desc: '寿元 +5%', base: 50, max: 5 },
  { id: 'affinity', name: '仙缘深厚', desc: '仙缘概率提升、无灵根更少', base: 60, max: 3 },
  { id: 'fate', name: '天机一线', desc: '每年改命 +1', base: 120, max: 2, gate: (M) => M.saga.pages.includes(6), gateText: '需天书第 6 页' },
  { id: 'choose', name: '择世', desc: '开局从两个引子里选一个（年代仍随机）', base: 180, max: 1, gate: (M) => faceKinds(M) >= 6, gateText: '千面录集齐 6 种引子' },
];
export const wheelPrice = (it: WheelItem, lvl: number) => Math.round(it.base * (1 + 0.65 * lvl));

export interface UnlockItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  gate: (M: MetaState) => boolean;
  gateText: string;
}
export const UNLOCKS: UnlockItem[] = [
  { id: 'demon', name: '魔域', desc: '开启魔域地点：魔修与赤衣势力', price: 120, gate: (M) => M.saga.volume >= 2, gateText: '仙途卷解锁' },
  { id: 'rift', name: '画外裂隙', desc: '元婴后可去，奇遇全为主线线索', price: 200, gate: (M) => M.saga.pages.includes(15), gateText: '需天书第 15 页' },
];
