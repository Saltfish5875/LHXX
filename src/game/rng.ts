// 可注入的随机数，模拟脚本用固定种子
let seed = Date.now() >>> 0;
let seeded = false;

export function setSeed(s: number) {
  seed = s >>> 0;
  seeded = true;
}

export function rand(): number {
  if (!seeded) return Math.random();
  // mulberry32
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (p: number) => rand() < p;
export const randInt = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
export const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

export function weighted<T>(items: T[], w: (t: T) => number): T | undefined {
  let total = 0;
  for (const it of items) total += Math.max(0, w(it));
  if (total <= 0) return undefined;
  let r = rand() * total;
  for (const it of items) {
    r -= Math.max(0, w(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
