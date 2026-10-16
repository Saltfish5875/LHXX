// 「青冥画卷」配色：世界是一幅画在宣纸上的青绿山水，墨潮是画里唯一的纯黑。

export const C = {
  paper: '#f3ecdc', // 宣纸
  paperDeep: '#e7dcc4',
  ink: '#1e2227', // 焦墨
  inkSoft: '#4a4f55', // 淡墨
  stoneBlue: '#2e6e8e', // 石青
  stoneGreen: '#4f9a83', // 石绿
  indigo: '#3a5f7a', // 花青
  ochre: '#a8784a', // 赭石
  cinnabar: '#b8382e', // 朱砂
  gold: '#b8923a', // 泥金
  jade: '#7fb8a6',
  mist: 'rgba(250,246,236,0.85)',
};

export interface EraLook {
  sky: [string, string];
  hills: [string, string]; // 峰顶、山脚
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
export const ERA_LOOK: Record<string, EraLook> = {
  E1: { sky: ['#e3ecee', '#f6efdf'], hills: ['#2e6e8e', '#5ea08a'], far: '#a9c3c8', accent: C.stoneGreen },
  E2: { sky: ['#d8c6ad', '#f0e2c8'], hills: ['#5e6a68', '#8a8f73'], far: '#c2b49c', accent: C.cinnabar, smoke: true },
  E3: { sky: ['#d6e9ec', '#f4efe1'], hills: ['#2c6f86', '#4f9aa0'], far: '#a6c8cf', accent: '#2f8aa0', sea: true },
  E4: { sky: ['#dcebf2', '#f7f1e2'], hills: ['#245f86', '#3f9a83'], far: '#9fbfd0', accent: C.stoneBlue, swordLight: true },
  E5: { sky: ['#ecd9c6', '#f6ead6'], hills: ['#5b5a4a', '#a3563f'], far: '#d1b29b', accent: C.cinnabar, redLeaves: true },
  E6: { sky: ['#c9c9c4', '#e8e3d6'], hills: ['#2e3a40', '#4c5d5a'], far: '#a5a9a6', accent: C.ink, inkDrip: true },
  E7: { sky: ['#1f2b3d', '#4a5670'], hills: ['#1d3346', '#2c5a5e'], far: '#5b6a80', accent: C.gold, night: true, gateFar: true },
};

// 境界：越往上，青绿越浓、泥金越多
export const REALM_SAT = [0.5, 0.65, 0.78, 0.9, 1, 1];

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
