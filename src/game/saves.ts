// 存档系统：当前进度 + 三个手动档位 + 自动备份 + 导出导入 + 预置存档
// 当前进度仍是 lhxx.web.meta.v3 / lhxx.web.life.v3（每年岁末自动写）；档位是它们的整份拷贝。
import type { LifeState, MetaState } from './types';
import { LIFE_KEY, META_KEY, freezeStorage } from './meta';
import { REALMS, cnAge } from '../data/core';

export const SAVE_FORMAT = 'lhxx-save';
export const SLOT_COUNT = 3;
const SLOT_KEY = (n: number | 'backup') => `lhxx.explore.slot.${n}`;
export const OFFER_KEY = 'lhxx.explore.presetOffered';

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  v: 1;
  name: string;
  savedAt: string; // ISO 时间
  meta: MetaState | null; // null = 一世都还没过完
  life: LifeState | null; // 没过完的这一世（存到最近一个岁末）
}

export interface Preset {
  id: string;
  name: string;
  desc: string;
  url: string;
}
// 预置存档放在 public/saves/，由 npm run make-save 用真实引擎跑出来
export const PRESETS: Preset[] = [
  { id: 'twenty', name: '二十世存档', desc: '用真实引擎自动跑完的二十世：天书过半、轮回盘点满大半，前世书、经历图谱（近八世）、故人、遗泽、功法谱都有内容。从第二十一世开始。', url: './saves/twenty-lives.json' },
];

function ls(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function hasProgress(f: SaveFile | null): boolean {
  return !!f && ((f.meta?.lives ?? 0) > 0 || !!f.life);
}

// 一句话：第几世、走到哪
export function summary(f: SaveFile): string {
  const M = f.meta;
  const lives = M?.lives ?? 0;
  const parts: string[] = [];
  if (f.life) parts.push(`第 ${f.life.lifeNo} 世进行中 · ${cnAge(f.life.age)}岁 · ${REALMS[f.life.realm]?.name ?? ''}`);
  else parts.push(lives ? `已过 ${lives} 世，待第 ${lives + 1} 世入世` : '尚未入世');
  if (M && lives) {
    parts.push(`天书 ${M.saga?.pages?.length ?? 0}/27`);
    if (M.ascensions) parts.push(`飞升 ${M.ascensions} 次`);
    parts.push(`轮回碑 ${M.achievements?.length ?? 0}`);
  }
  return parts.join(' · ');
}

export function stamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function autoName(meta: MetaState | null, life: LifeState | null): string {
  if (life) return `第 ${life.lifeNo} 世 · ${cnAge(life.age)}岁`;
  return meta?.lives ? `第 ${meta.lives} 世之后` : '新入世';
}

// 当前进度（就是刷新后会接着玩的那份）
export function currentSave(): SaveFile {
  const s = ls();
  const meta = parse<MetaState>(s?.getItem(META_KEY));
  const life = parse<LifeState>(s?.getItem(LIFE_KEY));
  return { format: SAVE_FORMAT, v: 1, name: autoName(meta, life), savedAt: new Date().toISOString(), meta, life };
}

export function readSlot(n: number | 'backup'): SaveFile | null {
  return validate(parse<unknown>(ls()?.getItem(SLOT_KEY(n))));
}

// 写档位；存满时报错给界面
export function writeSlot(n: number | 'backup', f: SaveFile): string | null {
  try {
    ls()?.setItem(SLOT_KEY(n), JSON.stringify(f));
    return null;
  } catch {
    return '浏览器存储空间不够了，先删掉一个档位或导出成文件再试。';
  }
}

export function deleteSlot(n: number | 'backup') {
  ls()?.removeItem(SLOT_KEY(n));
}

// 接受本游戏导出的存档；也接受直接粘出来的 meta（version 3）
export function validate(x: unknown): SaveFile | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Partial<SaveFile> & { version?: number };
  if (o.format === SAVE_FORMAT) {
    if (o.meta && (typeof o.meta !== 'object' || o.meta.version !== 3)) return null;
    if (o.life && (typeof o.life !== 'object' || typeof o.life.lifeNo !== 'number')) return null;
    return { format: SAVE_FORMAT, v: 1, name: String(o.name ?? '存档'), savedAt: String(o.savedAt ?? new Date().toISOString()), meta: o.meta ?? null, life: o.life ?? null };
  }
  if (o.version === 3 && typeof (o as unknown as MetaState).lives === 'number') {
    const meta = o as unknown as MetaState;
    return { format: SAVE_FORMAT, v: 1, name: autoName(meta, null), savedAt: new Date().toISOString(), meta, life: null };
  }
  return null;
}

// 读档：先把当前进度备份进「自动备份」，再换上新的，然后刷新页面
export function applySave(f: SaveFile, backup = true): string | null {
  const s = ls();
  if (!s) return '浏览器不让写存储，读不了档。';
  const cur = currentSave();
  if (backup && hasProgress(cur)) {
    const err = writeSlot('backup', { ...cur, name: `读档前自动备份 · ${cur.name}` });
    if (err) return err;
  }
  try {
    if (f.meta) s.setItem(META_KEY, JSON.stringify(f.meta));
    else s.removeItem(META_KEY);
    if (f.life) s.setItem(LIFE_KEY, JSON.stringify(f.life));
    else s.removeItem(LIFE_KEY);
  } catch {
    return '浏览器存储空间不够了，先删掉一个档位再试。';
  }
  freezeStorage();
  return null;
}

export async function fetchPreset(p: Preset): Promise<SaveFile> {
  const r = await fetch(p.url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`读不到预置存档（${r.status}）`);
  const f = validate(await r.json());
  if (!f) throw new Error('预置存档格式不对');
  return f;
}

export function fileName(f: SaveFile): string {
  const d = stamp(f.savedAt).replace(/[: ]/g, '').replace(/-/g, '');
  return `轮回修仙-${f.name.replace(/[\\/:*?"<>|\s·]+/g, '')}-${d}.json`;
}
