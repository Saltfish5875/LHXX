// 「青冥画卷」配色：淡彩青绿、暖白纸面与少量朱砂，场景、棋盘和图标共用。

export const C = {
  paper: '#edf5f1', // 天青白纸
  paperDeep: '#d9e9e3',
  ink: '#243f40', // 焦墨
  inkSoft: '#526c69', // 淡墨
  stoneBlue: '#477c83', // 石青
  stoneGreen: '#568b80', // 石绿（偏青）
  indigo: '#537a83', // 花青
  ochre: '#8a7a68', // 赭石（压灰，只做点缀）
  cinnabar: '#a45248', // 朱砂
  gold: '#967b4b', // 泥金
  jade: '#9cbeb5',
  mist: 'rgba(239,245,248,0.85)',
  line: '#2b5d66', // 仙山与建筑的勾线：深青，不用焦墨
  cloudShade: '#d2e5e1',
  swordLight: '#7fe0ff', // 御剑青光
};

export interface EraLook {
  sky: [string, string];
  hills: [string, string]; // 受光面、背光面
  far: string;
  accent: string;
  night?: boolean;
  smoke?: boolean;
  sea?: boolean;
  redLeaves?: boolean;
  inkDrip?: boolean;
  swordLight?: boolean;
  gateFar?: boolean;
}

// 一人千面的七个年代：同一套山水，换天色和点景
// hills = [受光面, 背光面]：石柱峰左亮右暗
export const ERA_LOOK: Record<string, EraLook> = {
  E1: { sky: ['#c1dad9', '#eff6f0'], hills: ['#b2d0c5', '#63928d'], far: '#b9d8e4', accent: C.stoneBlue },
  E2: { sky: ['#c3d0d8', '#eef2f2'], hills: ['#b3cbc4', '#46707a'], far: '#c4d0d6', accent: C.cinnabar, smoke: true },
  E3: { sky: ['#9fd0ee', '#f2f9fc'], hills: ['#a3dad6', '#25788e'], far: '#b2d6e6', accent: '#2f8aa0', sea: true },
  E4: { sky: ['#9ccdf0', '#f4faff'], hills: ['#b0e2d6', '#2a7c8c'], far: '#b4d4ea', accent: C.stoneBlue, swordLight: true },
  E5: { sky: ['#c8cfdc', '#f1f0f0'], hills: ['#b9cfc6', '#4a6670'], far: '#c9d0da', accent: C.cinnabar, redLeaves: true },
  E6: { sky: ['#b7c0c8', '#e6eaec'], hills: ['#a3b8b6', '#33505a'], far: '#b5bfc6', accent: C.ink, inkDrip: true },
  E7: { sky: ['#1b2840', '#44567a'], hills: ['#5f97a0', '#1a3a4c'], far: '#566a86', accent: C.gold, night: true, gateFar: true },
};

// 境界：越往上，青绿越浓、泥金越多
export const REALM_SAT = [0.65, 0.75, 0.85, 0.92, 1, 1];

export function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
export function hex(c: string): [number, number, number] {
  if (c.startsWith('rgb')) {
    const m = c.match(/\d+/g)!.map(Number);
    return [m[0], m[1], m[2]];
  }
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgba(c: string, a: number): string {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}
