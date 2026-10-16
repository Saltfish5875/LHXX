// 「青冥画卷」配色：世界是一幅画在宣纸上的青绿山水，墨潮是画里唯一的纯黑。

export const C = {
  paper: '#e4eaed', // 宣纸
  paperDeep: '#d3d9dc',
  ink: '#1c232c', // 焦墨
  inkSoft: '#46535f', // 淡墨
  stoneBlue: '#2e6e8e', // 石青
  stoneGreen: '#3f8a8c', // 石绿（偏青）
  indigo: '#3a5f7a', // 花青
  ochre: '#8a7a68', // 赭石（压灰，只做点缀）
  cinnabar: '#b8382e', // 朱砂
  gold: '#b8923a', // 泥金
  jade: '#7fb3bb',
  mist: 'rgba(239,245,248,0.85)',
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
  E1: { sky: ['#d9e8f0', '#eef4f6'], hills: ['#28668a', '#4b92a3'], far: '#a2bfcd', accent: C.stoneBlue },
  E2: { sky: ['#c6ced4', '#e4e8ea'], hills: ['#46596a', '#6c8090'], far: '#a9b4bd', accent: C.cinnabar, smoke: true },
  E3: { sky: ['#d2e8f0', '#eef4f6'], hills: ['#20627f', '#3c90a6'], far: '#9cc3d1', accent: '#2f8aa0', sea: true },
  E4: { sky: ['#d3e5f3', '#eef3f7'], hills: ['#1d5285', '#3784aa'], far: '#96b6d3', accent: C.stoneBlue, swordLight: true },
  E5: { sky: ['#d6dce2', '#ecf0f1'], hills: ['#33475d', '#5d6a7e'], far: '#b1bbc6', accent: C.cinnabar, redLeaves: true },
  E6: { sky: ['#c1c7cc', '#dde2e5'], hills: ['#212d39', '#3b4f5f'], far: '#9ca7b0', accent: C.ink, inkDrip: true },
  E7: { sky: ['#1b2840', '#44567a'], hills: ['#1a3149', '#285468'], far: '#566a86', accent: C.gold, night: true, gateFar: true },
};

// 境界：越往上，蓝青越浓、泥金越多
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
