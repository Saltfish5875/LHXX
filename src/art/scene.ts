// 画卷舞台：把这一年画出来。年代定天色，境界定青绿浓淡，地点定点景，年纪定小人，劫气定墨潮。
// 静态部分（天、山、点景、题款）画进离屏画布，只在状态变化时重画；每帧只画雾、人、墨。
import { C, ERA_LOOK, EraLook, REALM_SAT, mix, rgba } from './palette';

export interface SceneState {
  lifeNo: number;
  age: number;
  realm: number;
  inDao: boolean;
  era: string;
  loc: string;
  locName: string;
  danger: number; // 0..1 劫气、凶年
  hpLow: boolean;
  mode: 'life' | 'dead' | 'well';
}

const DEFAULT: SceneState = { lifeNo: 0, age: 0, realm: 0, inDao: false, era: 'E1', loc: 'home', locName: '家宅', danger: 0, hpLow: false, mode: 'well' };

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

let paperTex: HTMLCanvasElement | null = null;
export function paperTexture(): HTMLCanvasElement {
  if (paperTex) return paperTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const r = rng(7);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(86,109,138,${r() * 0.035})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 10 + r() * 40, 6 + r() * 20, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 700; i++) {
    g.strokeStyle = `rgba(61,76,97,${r() * 0.07})`;
    g.lineWidth = r() * 0.9;
    const x = r() * 256;
    const y = r() * 256;
    const a = r() * Math.PI;
    const l = 3 + r() * 16;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  paperTex = c;
  return c;
}

type G = CanvasRenderingContext2D;

// ---------- 笔墨小件 ----------
function roof(g: G, x: number, y: number, w: number, h: number, col = '#2d6a70') {
  // 飞檐：两端上翘
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x - w * 0.62, y - h * 0.15);
  g.quadraticCurveTo(x - w * 0.45, y + h * 0.05, x - w * 0.3, y);
  g.lineTo(x - w * 0.18, y - h);
  g.lineTo(x + w * 0.18, y - h);
  g.lineTo(x + w * 0.3, y);
  g.quadraticCurveTo(x + w * 0.45, y + h * 0.05, x + w * 0.62, y - h * 0.15);
  g.quadraticCurveTo(x + w * 0.5, y + h * 0.25, x, y + h * 0.22);
  g.quadraticCurveTo(x - w * 0.5, y + h * 0.25, x - w * 0.62, y - h * 0.15);
  g.fill();
}
function house(g: G, x: number, gy: number, s: number, opts: { lit?: boolean; banner?: string } = {}) {
  const w = 46 * s;
  const h = 26 * s;
  g.fillStyle = '#f7fbfc';
  g.strokeStyle = rgba(C.line, 0.75);
  g.lineWidth = 1.2;
  g.fillRect(x - w / 2, gy - h, w, h);
  g.strokeRect(x - w / 2, gy - h, w, h);
  g.fillStyle = opts.lit ? '#f2c66d' : rgba(C.line, 0.65);
  g.fillRect(x - w * 0.12, gy - h * 0.62, w * 0.22, h * 0.3);
  g.fillStyle = rgba(C.line, 0.8);
  g.fillRect(x + w * 0.2, gy - h * 0.6, w * 0.14, h * 0.6);
  roof(g, x, gy - h, w * 1.15, h * 0.75);
  if (opts.lit) {
    const rg = g.createRadialGradient(x - w * 0.01, gy - h * 0.47, 1, x, gy - h * 0.47, 30 * s);
    rg.addColorStop(0, 'rgba(242,198,109,0.45)');
    rg.addColorStop(1, 'rgba(242,198,109,0)');
    g.fillStyle = rg;
    g.fillRect(x - 40 * s, gy - h - 20 * s, 80 * s, 60 * s);
  }
  if (opts.banner) {
    const bx = x + w * 0.62;
    g.strokeStyle = C.line;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(bx, gy);
    g.lineTo(bx, gy - h * 2.2);
    g.stroke();
    g.fillStyle = '#e7edf0';
    g.fillRect(bx, gy - h * 2.2, 14 * s, 26 * s);
    g.strokeRect(bx, gy - h * 2.2, 14 * s, 26 * s);
    g.fillStyle = C.line;
    g.font = `${11 * s}px brush, serif`;
    g.textAlign = 'center';
    g.fillText(opts.banner, bx + 7 * s, gy - h * 2.2 + 17 * s);
  }
}
function pine(g: G, x: number, gy: number, s: number, col = '#2e6f66', r = Math.random) {
  g.strokeStyle = rgba(C.line, 0.85);
  g.lineWidth = 3 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, gy);
  g.bezierCurveTo(x - 8 * s, gy - 20 * s, x + 10 * s, gy - 34 * s, x + 2 * s, gy - 60 * s);
  g.stroke();
  // 点叶：每层一簇小墨团
  for (let i = 0; i < 4; i++) {
    const yy = gy - (26 + i * 10) * s;
    const cx = x + (i % 2 ? 1 : -1) * (7 + r() * 5) * s;
    const wd = (15 - i * 2.2) * s;
    for (let k = 0; k < 7; k++) {
      const px = cx + (r() - 0.5) * wd * 1.6;
      const py = yy + (r() - 0.5) * 5 * s;
      g.fillStyle = rgba(col, 0.55 + r() * 0.35);
      g.beginPath();
      g.ellipse(px, py, (3 + r() * 3) * s, (2 + r() * 1.6) * s, r() - 0.5, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = rgba(C.line, 0.55);
    g.lineWidth = 0.8;
    for (let k = 0; k < 5; k++) {
      const px = cx + (r() - 0.5) * wd * 1.4;
      g.beginPath();
      g.moveTo(px - 2 * s, yy - 2 * s);
      g.lineTo(px, yy + 1 * s);
      g.lineTo(px + 2 * s, yy - 2 * s);
      g.stroke();
    }
  }
}
function willow(g: G, x: number, gy: number, s: number, col = '#5fa293') {
  g.strokeStyle = rgba(C.line, 0.8);
  g.lineWidth = 3 * s;
  g.beginPath();
  g.moveTo(x, gy);
  g.quadraticCurveTo(x + 4 * s, gy - 30 * s, x - 2 * s, gy - 52 * s);
  g.stroke();
  g.strokeStyle = rgba(col, 0.75);
  g.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    const sx = x - 2 * s + (i - 8) * 2.4 * s;
    g.beginPath();
    g.moveTo(sx, gy - 52 * s);
    g.quadraticCurveTo(sx + (i - 8) * 1.6 * s, gy - 40 * s, sx + (i - 8) * 2 * s, gy - (18 + (i % 4) * 5) * s);
    g.stroke();
  }
}
function bamboo(g: G, x: number, gy: number, s: number) {
  for (let k = 0; k < 4; k++) {
    const bx = x + k * 7 * s;
    const hh = (50 + k * 9) * s;
    g.strokeStyle = rgba('#3f8a72', 0.85);
    g.lineWidth = 2.2 * s;
    g.beginPath();
    g.moveTo(bx, gy);
    g.lineTo(bx + 3 * s, gy - hh);
    g.stroke();
    g.fillStyle = rgba('#2e6f66', 0.8);
    for (let j = 1; j < 4; j++) {
      const ly = gy - hh * (j / 4);
      g.beginPath();
      g.ellipse(bx + 7 * s, ly, 7 * s, 1.8 * s, -0.5, 0, Math.PI * 2);
      g.ellipse(bx - 4 * s, ly - 4 * s, 6 * s, 1.6 * s, 0.6, 0, Math.PI * 2);
      g.fill();
    }
  }
}
function pavilion(g: G, x: number, gy: number, s: number) {
  g.strokeStyle = rgba(C.line, 0.9);
  g.lineWidth = 2 * s;
  for (const dx of [-14, 14]) {
    g.beginPath();
    g.moveTo(x + dx * s, gy);
    g.lineTo(x + dx * s, gy - 26 * s);
    g.stroke();
  }
  g.fillStyle = rgba(C.cinnabar, 0.7);
  g.fillRect(x - 16 * s, gy - 8 * s, 32 * s, 2 * s);
  roof(g, x, gy - 26 * s, 50 * s, 16 * s);
  g.fillStyle = C.line;
  g.beginPath();
  g.arc(x, gy - 44 * s, 2.5 * s, 0, Math.PI * 2);
  g.fill();
}
function pagoda(g: G, x: number, gy: number, s: number, levels = 5) {
  let y = gy;
  for (let i = 0; i < levels; i++) {
    const w = (34 - i * 4) * s;
    const h = 13 * s;
    g.fillStyle = '#dce2e5';
    g.fillRect(x - w / 2, y - h, w, h);
    g.strokeStyle = rgba(C.line, 0.7);
    g.lineWidth = 1;
    g.strokeRect(x - w / 2, y - h, w, h);
    g.fillStyle = rgba(C.cinnabar, 0.75);
    g.fillRect(x - 3 * s, y - h * 0.8, 6 * s, h * 0.6);
    roof(g, x, y - h, w * 1.25, 8 * s);
    y -= h + 6 * s;
  }
  g.strokeStyle = C.line;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x, y + 6 * s);
  g.lineTo(x, y - 10 * s);
  g.stroke();
}
function paifang(g: G, x: number, gy: number, s: number, text = '') {
  g.fillStyle = rgba(C.cinnabar, 0.85);
  g.fillRect(x - 26 * s, gy - 38 * s, 4 * s, 38 * s);
  g.fillRect(x + 22 * s, gy - 38 * s, 4 * s, 38 * s);
  g.fillRect(x - 30 * s, gy - 34 * s, 60 * s, 4 * s);
  roof(g, x, gy - 38 * s, 70 * s, 10 * s);
  if (text) {
    g.fillStyle = '#dae0e3';
    g.fillRect(x - 9 * s, gy - 30 * s, 18 * s, 10 * s);
    g.fillStyle = C.line;
    g.font = `${8 * s}px brush, serif`;
    g.textAlign = 'center';
    g.fillText(text, x, gy - 22 * s);
  }
}
function stall(g: G, x: number, gy: number, s: number, col: string) {
  g.strokeStyle = rgba(C.line, 0.85);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x - 16 * s, gy);
  g.lineTo(x - 16 * s, gy - 24 * s);
  g.moveTo(x + 16 * s, gy);
  g.lineTo(x + 16 * s, gy - 24 * s);
  g.stroke();
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x - 22 * s, gy - 22 * s);
  g.lineTo(x - 12 * s, gy - 32 * s);
  g.lineTo(x + 12 * s, gy - 32 * s);
  g.lineTo(x + 22 * s, gy - 22 * s);
  g.closePath();
  g.fill();
  g.fillStyle = '#c9b48d';
  g.fillRect(x - 15 * s, gy - 10 * s, 30 * s, 4 * s);
}
export function lantern(g: G, x: number, y: number, s: number, glow = 1) {
  const rg = g.createRadialGradient(x, y, 0, x, y, 14 * s);
  rg.addColorStop(0, `rgba(240,120,70,${0.4 * glow})`);
  rg.addColorStop(1, 'rgba(240,120,70,0)');
  g.fillStyle = rg;
  g.fillRect(x - 14 * s, y - 14 * s, 28 * s, 28 * s);
  g.fillStyle = C.cinnabar;
  g.beginPath();
  g.ellipse(x, y, 4 * s, 5 * s, 0, 0, Math.PI * 2);
  g.fill();
}
function boat(g: G, x: number, y: number, s: number) {
  g.fillStyle = rgba(C.line, 0.85);
  g.beginPath();
  g.moveTo(x - 26 * s, y - 4 * s);
  g.quadraticCurveTo(x, y + 6 * s, x + 26 * s, y - 6 * s);
  g.lineTo(x + 18 * s, y);
  g.quadraticCurveTo(x, y + 4 * s, x - 20 * s, y);
  g.fill();
  g.fillStyle = '#bcc2c5';
  g.beginPath();
  g.moveTo(x - 8 * s, y - 4 * s);
  g.quadraticCurveTo(x, y - 14 * s, x + 8 * s, y - 4 * s);
  g.fill();
  g.strokeStyle = rgba(C.line, 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + 14 * s, y - 4 * s);
  g.lineTo(x + 30 * s, y - 26 * s);
  g.stroke();
}
function crane(g: G, x: number, y: number, s: number, flap = 0) {
  g.fillStyle = '#f1f7fa';
  g.strokeStyle = rgba(C.line, 0.7);
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(x, y, 10 * s, 3.5 * s, -0.1, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = C.line;
  for (const d of [-1, 1]) {
    g.beginPath();
    g.moveTo(x - 2 * s, y);
    g.quadraticCurveTo(x + d * 4 * s, y - (12 + flap) * s, x + d * 18 * s, y - (6 + flap) * s);
    g.quadraticCurveTo(x + d * 8 * s, y - 3 * s, x + 2 * s, y);
    g.fill();
  }
  g.strokeStyle = C.line;
  g.beginPath();
  g.moveTo(x + 9 * s, y - 1 * s);
  g.lineTo(x + 18 * s, y - 4 * s);
  g.stroke();
  g.fillStyle = C.cinnabar;
  g.beginPath();
  g.arc(x + 17 * s, y - 4 * s, 1.4 * s, 0, Math.PI * 2);
  g.fill();
}
function lightPillar(g: G, x: number, top: number, bottom: number, w: number, col: string, a = 1) {
  const lg = g.createLinearGradient(x - w, 0, x + w, 0);
  lg.addColorStop(0, rgba(col, 0));
  lg.addColorStop(0.5, rgba(col, 0.45 * a));
  lg.addColorStop(1, rgba(col, 0));
  g.fillStyle = lg;
  g.fillRect(x - w, top, w * 2, bottom - top);
}
function figureOther(g: G, x: number, gy: number, s: number, col: string) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x - 5 * s, gy - 16 * s);
  g.quadraticCurveTo(x - 8 * s, gy - 4 * s, x - 7 * s, gy);
  g.lineTo(x + 7 * s, gy);
  g.quadraticCurveTo(x + 8 * s, gy - 4 * s, x + 5 * s, gy - 16 * s);
  g.fill();
  g.beginPath();
  g.arc(x, gy - 20 * s, 4 * s, 0, Math.PI * 2);
  g.fill();
}

// ---------- 山 ----------
function ridge(r: () => number, w: number, base: number, amp: number, peaks: number) {
  const ps = Array.from({ length: peaks }, () => ({ x: r() * w * 1.2 - w * 0.1, h: amp * (0.45 + r() * 0.55), wd: w * (0.05 + r() * 0.09) }));
  const pts: [number, number][] = [];
  for (let x = -10; x <= w + 10; x += 4) {
    let y = 0;
    for (const p of ps) {
      const d = (x - p.x) / p.wd;
      y = Math.max(y, p.h * Math.exp(-Math.pow(Math.abs(d), 1.6)));
    }
    y += Math.sin(x * 0.09 + peaks) * amp * 0.03;
    pts.push([x, base - y]);
  }
  return pts;
}
function drawRange(g: G, pts: [number, number][], bottom: number, top: string, foot: string, inkA: number, r: () => number) {
  let minY = bottom;
  for (const [, y] of pts) minY = Math.min(minY, y);
  const lg = g.createLinearGradient(0, minY, 0, bottom);
  lg.addColorStop(0, top);
  lg.addColorStop(0.55, foot);
  lg.addColorStop(1, rgba('#e6ecef', 0));
  g.fillStyle = lg;
  g.beginPath();
  g.moveTo(pts[0][0], bottom);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(pts[pts.length - 1][0], bottom);
  g.closePath();
  g.fill();
  // 墨晕：峰顶积墨、往下化开
  const wash = g.createLinearGradient(0, minY, 0, minY + (bottom - minY) * 0.45);
  wash.addColorStop(0, rgba(C.line, inkA * 0.55));
  wash.addColorStop(1, rgba(C.line, 0));
  g.fillStyle = wash;
  g.fill();
  // 勾勒山脊：先一道化开的淡墨，再一道实笔
  g.save();
  g.strokeStyle = rgba(C.line, inkA * 0.35);
  g.lineWidth = 5;
  g.shadowColor = rgba(C.line, inkA * 0.6);
  g.shadowBlur = 8;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + 2) : g.moveTo(x, y + 2)));
  g.stroke();
  g.restore();
  g.strokeStyle = rgba(C.line, inkA);
  g.lineWidth = 1.2;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  // 皴擦：沿坡的短笔
  g.lineWidth = 0.8;
  for (let i = 2; i < pts.length - 2; i += 3) {
    const [x, y] = pts[i];
    const slope = pts[i + 1][1] - pts[i - 1][1];
    if (Math.abs(slope) < 1.2 || r() < 0.4) continue;
    g.strokeStyle = rgba(C.line, inkA * (0.3 + r() * 0.4));
    const len = 6 + r() * 14;
    g.beginPath();
    g.moveTo(x, y + 3);
    g.quadraticCurveTo(x + Math.sign(slope) * len * 0.3, y + len * 0.5, x + Math.sign(slope) * len * 0.2, y + len);
    g.stroke();
  }
}
function mistBand(g: G, w: number, y: number, h: number, night = false) {
  const c = night ? '70,84,108' : '236,243,244';
  const lg = g.createLinearGradient(0, y - h, 0, y + h);
  lg.addColorStop(0, `rgba(${c},0)`);
  lg.addColorStop(0.5, `rgba(${c},${night ? 0.6 : 0.85})`);
  lg.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = lg;
  g.fillRect(0, y - h, w, h * 2);
}

// ---------- 仙山 ----------
// 石柱峰：圆顶陡壁，左亮右暗，竖皴，顶上点松，可挂瀑布、立楼阁
export function pillarPeak(
  g: G,
  x: number,
  base: number,
  top: number,
  wd: number,
  lit: string,
  dark: string,
  near: number,
  r: () => number,
  o: { pines?: boolean; fall?: boolean; pavilion?: boolean } = {},
) {
  const hw = wd / 2;
  const sh = base - top;
  const lean = (r() - 0.5) * wd * 0.25;
  const tx = x + lean;
  // 轮廓：左右两条略带鼓包的陡壁，顶上圆
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps; // 0 底 → 1 顶
    const bulge = Math.sin(k * Math.PI * 2 + r() * 2) * wd * 0.06;
    const half = hw * (1 - Math.pow(k, 1.8) * 0.62) + bulge;
    const cx = x + lean * k;
    left.push([cx - half, base - sh * k * 0.86]);
    right.push([cx + half * 0.95 + bulge * 0.5, base - sh * k * 0.86]);
  }
  const path = () => {
    g.beginPath();
    g.moveTo(left[0][0], base);
    for (const p of left) g.lineTo(p[0], p[1]);
    const lt = left[steps];
    const rt = right[steps];
    g.bezierCurveTo(lt[0] - wd * 0.02, top + sh * 0.02, rt[0] + wd * 0.02, top + sh * 0.02, rt[0], rt[1]);
    for (let i = steps; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
    g.closePath();
  };
  // 受光面在左：横向渐变
  const lg = g.createLinearGradient(x - hw, 0, x + hw, 0);
  lg.addColorStop(0, lit);
  lg.addColorStop(0.45, mix(lit, dark, 0.45));
  lg.addColorStop(1, dark);
  g.fillStyle = lg;
  path();
  g.fill();
  // 顶上受光、脚下没进云里
  g.save();
  path();
  g.clip();
  const vg = g.createLinearGradient(0, top, 0, base);
  vg.addColorStop(0, 'rgba(255,255,255,0.35)');
  vg.addColorStop(0.35, 'rgba(255,255,255,0)');
  vg.addColorStop(0.75, 'rgba(255,255,255,0)');
  vg.addColorStop(1, 'rgba(255,255,255,0.85)');
  g.fillStyle = vg;
  g.fillRect(x - wd, top - 4, wd * 2, sh + 8);
  // 竖皴：顺着山势往下的细笔
  g.lineWidth = Math.max(0.6, near);
  for (let i = 0; i < 9 + near * 10; i++) {
    const fx = (r() - 0.5) * 1.6;
    const sx = tx + fx * hw * 0.9;
    const sy = top + sh * (0.06 + r() * 0.35);
    const len = sh * (0.15 + r() * 0.35);
    g.strokeStyle = rgba(fx > 0.1 ? dark : mix(dark, lit, 0.35), 0.25 + near * 0.3);
    g.beginPath();
    g.moveTo(sx, sy);
    g.bezierCurveTo(sx + fx * 4, sy + len * 0.3, sx - fx * 3, sy + len * 0.6, sx + fx * 6, sy + len);
    g.stroke();
  }
  g.restore();
  // 勾边
  g.strokeStyle = rgba(C.line, 0.18 + near * 0.3);
  g.lineWidth = 0.8 + near * 0.6;
  path();
  g.stroke();
  // 瀑布：从右上的豁口挂下来，落进云里
  if (o.fall) {
    const fx = tx + hw * 0.2;
    const fy = top + sh * (0.22 + r() * 0.12);
    const fw = Math.max(1.6, wd * 0.07);
    const fg = g.createLinearGradient(0, fy, 0, base);
    fg.addColorStop(0, 'rgba(255,255,255,0.95)');
    fg.addColorStop(0.8, 'rgba(240,250,255,0.85)');
    fg.addColorStop(1, 'rgba(240,250,255,0)');
    g.fillStyle = fg;
    g.beginPath();
    g.moveTo(fx - fw / 2, fy);
    g.quadraticCurveTo(fx - fw * 0.6, (fy + base) / 2, fx - fw * 0.75, base);
    g.lineTo(fx + fw * 0.75, base);
    g.quadraticCurveTo(fx + fw * 0.6, (fy + base) / 2, fx + fw / 2, fy);
    g.fill();
    g.strokeStyle = rgba('#bfe6f2', 0.6);
    g.lineWidth = 0.7;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(fx + i * fw * 0.25, fy + 4);
      g.lineTo(fx + i * fw * 0.4, base - sh * 0.1);
      g.stroke();
    }
  }
  // 峰顶松
  if (o.pines) {
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const px = tx + (r() - 0.5) * hw * 0.9;
      const py = top + sh * 0.02 + r() * 3;
      const s = (0.18 + near * 0.2) * (wd / 50);
      g.strokeStyle = rgba(C.line, 0.6);
      g.lineWidth = 1.2 * s + 0.4;
      g.beginPath();
      g.moveTo(px, py + 2);
      g.lineTo(px + (r() - 0.5) * 3, py - 10 * s);
      g.stroke();
      for (let k = 0; k < 4; k++) {
        g.fillStyle = rgba(mix('#2e6f66', dark, 0.3), 0.7 + r() * 0.25);
        g.beginPath();
        g.ellipse(px + (r() - 0.5) * 12 * s, py - 10 * s - r() * 8 * s, (4 + r() * 3) * s, (2.2 + r()) * s, r() - 0.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (o.pavilion) tower(g, tx - hw * 0.15, top + sh * 0.03, wd / 70);
}

// 楼阁：白墙、青瓦、泥金描边的小塔楼
function tower(g: G, x: number, gy: number, s: number, levels = 2) {
  let y = gy;
  for (let i = 0; i < levels; i++) {
    const w = (22 - i * 5) * s;
    const h = (12 - i * 2) * s;
    g.fillStyle = '#f7fbfc';
    g.fillRect(x - w / 2, y - h, w, h);
    g.strokeStyle = rgba(C.line, 0.5);
    g.lineWidth = 0.8;
    g.strokeRect(x - w / 2, y - h, w, h);
    g.fillStyle = rgba(C.line, 0.55);
    g.fillRect(x - w * 0.1, y - h * 0.7, w * 0.2, h * 0.7);
    roof(g, x, y - h, w * 1.45, h * 0.7, '#3b8a8a');
    g.strokeStyle = rgba(C.gold, 0.8);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x - w * 0.7, y - h - h * 0.1);
    g.quadraticCurveTo(x, y - h + h * 0.12, x + w * 0.7, y - h - h * 0.1);
    g.stroke();
    y -= h + h * 0.55;
  }
  g.strokeStyle = rgba(C.gold, 0.9);
  g.beginPath();
  g.moveTo(x, y + 2 * s);
  g.lineTo(x, y - 5 * s);
  g.stroke();
}

// 云端仙宫：一排高塔、连拱长桥，白中带金，淡淡地浮在远处
function palace(g: G, cx: number, base: number, s: number, a: number) {
  g.save();
  g.globalAlpha = a;
  const span = 220 * s;
  // 连拱桥
  const by = base - 28 * s;
  g.fillStyle = '#f4f9fb';
  g.fillRect(cx - span / 2, by, span, 12 * s);
  g.fillStyle = 'rgba(200,225,238,0.9)';
  for (let x = cx - span / 2 + 8 * s; x < cx + span / 2 - 8 * s; x += 16 * s) {
    g.beginPath();
    g.moveTo(x, by + 12 * s);
    g.lineTo(x, by + 6 * s);
    g.arc(x + 5 * s, by + 6 * s, 5 * s, Math.PI, 0);
    g.lineTo(x + 10 * s, by + 12 * s);
    g.fill();
  }
  g.strokeStyle = rgba(C.gold, 0.6);
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cx - span / 2, by);
  g.lineTo(cx + span / 2, by);
  g.stroke();
  // 高塔
  const xs = [-0.42, -0.25, -0.05, 0.12, 0.3, 0.45];
  xs.forEach((fx, i) => {
    const tall = i === 2 || i === 4;
    const tw = (tall ? 16 : 11) * s;
    const th = (tall ? 70 : 46) * s + (i % 2) * 8 * s;
    const x = cx + fx * span;
    const lg = g.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
    lg.addColorStop(0, '#ffffff');
    lg.addColorStop(1, '#d6e8f0');
    g.fillStyle = lg;
    g.fillRect(x - tw / 2, by - th, tw, th);
    for (let k = 0; k < (tall ? 3 : 2); k++) {
      const ry = by - th + k * th * 0.32;
      roof(g, x, ry, tw * 1.9, 6 * s, '#7fb8b4');
      g.strokeStyle = rgba(C.gold, 0.75);
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(x - tw * 1.1, ry - 1);
      g.lineTo(x + tw * 1.1, ry - 1);
      g.stroke();
    }
    g.strokeStyle = rgba(C.gold, 0.85);
    g.beginPath();
    g.moveTo(x, by - th - 5 * s);
    g.lineTo(x, by - th - 12 * s);
    g.stroke();
  });
  // 金色光环
  g.strokeStyle = 'rgba(243,217,138,0.5)';
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx - 0.05 * span, by - 76 * s, 60 * s, 10 * s, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

// 云海：一条由许多团云叠成的云带，底下一层淡青的影
export function cloudBank(g: G, w: number, y: number, th: number, sc: number, r: () => number, night = false) {
  const top = night ? 'rgba(120,138,166,0.55)' : 'rgba(255,255,255,0.97)';
  const shade = night ? 'rgba(70,84,108,0.5)' : rgba(C.cloudShade, 0.9);
  const puffs: [number, number, number][] = [];
  for (let x = -30; x < w + 30; x += (14 + r() * 18) * sc) {
    puffs.push([x, y - r() * th * 0.9, (10 + r() * 16) * sc]);
  }
  g.fillStyle = shade;
  for (const [x, py, rad] of puffs) {
    g.beginPath();
    g.arc(x, py + rad * 0.35, rad, 0, Math.PI * 2);
    g.fill();
  }
  g.fillRect(-10, y + 2, w + 20, th);
  g.fillStyle = top;
  for (const [x, py, rad] of puffs) {
    g.beginPath();
    g.arc(x, py, rad * 0.92, 0, Math.PI * 2);
    g.fill();
  }
  const lg = g.createLinearGradient(0, y - th * 0.4, 0, y + th * 1.6);
  lg.addColorStop(0, night ? 'rgba(120,138,166,0)' : 'rgba(255,255,255,0)');
  lg.addColorStop(0.35, top);
  lg.addColorStop(1, night ? 'rgba(120,138,166,0)' : 'rgba(240,247,251,0)');
  g.fillStyle = lg;
  g.fillRect(-10, y - th * 0.4, w + 20, th * 2);
}

// ---------- 场景 ----------
export class Scene {
  canvas: HTMLCanvasElement;
  ctx: G;
  st: SceneState = { ...DEFAULT };
  layer: HTMLCanvasElement | null = null;
  prevLayer: HTMLCanvasElement | null = null;
  fadeT = 1;
  key = '';
  w = 0;
  h = 0;
  dpr = 1;
  t = 0;
  ink = 0; // 墨潮当前高度（缓动）
  running = false;
  paused = false;
  last = 0;
  birds: { x: number; y: number; v: number }[] = [];

  constructor(public host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(host);
    document.fonts?.ready.then(() => this.rebuild());
    document.addEventListener('visibilitychange', () => !document.hidden && this.start());
    this.resize();
    this.start();
  }

  resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.rebuild();
  }

  set(p: Partial<SceneState>) {
    Object.assign(this.st, p);
    const s = this.st;
    const k = [s.mode, s.lifeNo, s.era, s.loc, s.realm, s.inDao, ageStage(s.age), Math.round(this.w), Math.round(this.h)].join('|');
    if (k !== this.key) {
      const animate = this.key !== '' && this.key.split('|').slice(-2).join() === k.split('|').slice(-2).join();
      this.key = k;
      this.prevLayer = animate ? this.layer : null;
      this.fadeT = animate ? 0 : 1;
      this.layer = this.paintStatic();
    }
    this.start();
  }

  rebuild() {
    this.key = '';
    this.set({});
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  frame = (now: number) => {
    if (document.hidden || this.paused) {
      this.running = false;
      return;
    }
    const dt = Math.min(0.1, (now - this.last) / 1000);
    if (dt < 1 / 32) {
      requestAnimationFrame(this.frame);
      return;
    }
    this.last = now;
    this.t += dt;
    this.draw(dt);
    requestAnimationFrame(this.frame);
  };

  look(): EraLook {
    return ERA_LOOK[this.st.era] ?? ERA_LOOK.E1;
  }

  paintStatic(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    const { w, h } = this;
    if (!w || !h) return c;
    const s = this.st;
    if (s.mode === 'well') {
      paintWell(g, w, h);
      return c;
    }
    const L = this.look();
    const sat = s.inDao ? REALM_SAT[s.realm] : REALM_SAT[0];
    const r = rng(hashStr(`${s.lifeNo}|${s.era}|${s.loc}`));
    const gy = h * 0.84;
    const sc = Math.max(0.75, Math.min(1.35, h / 190));

    // 天：天青到近乎白的地平
    const sky = g.createLinearGradient(0, 0, 0, h * 0.8);
    sky.addColorStop(0, L.sky[0]);
    sky.addColorStop(1, L.sky[1]);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // 日 / 月 / 天光
    const sunX = w * (0.58 + r() * 0.3);
    const sunY = h * (0.14 + r() * 0.08);
    if (L.night || s.loc === 'sickbed') {
      g.fillStyle = 'rgba(240,246,250,0.9)';
      g.beginPath();
      g.arc(sunX, sunY, 11 * sc, 0, Math.PI * 2);
      g.fill();
      if (L.night) {
        g.fillStyle = 'rgba(240,246,250,0.6)';
        for (let i = 0; i < 26; i++) g.fillRect(r() * w, r() * h * 0.5, 1.2, 1.2);
      }
    } else if (L.smoke || L.redLeaves || s.loc === 'demon') {
      g.fillStyle = s.loc === 'demon' ? 'rgba(170,40,30,0.75)' : rgba(C.cinnabar, 0.5);
      g.beginPath();
      g.arc(sunX, sunY, 10 * sc, 0, Math.PI * 2);
      g.fill();
    } else {
      // 仙境没有日头，只有一团白金天光
      const hg = g.createRadialGradient(sunX, sunY, 2, sunX, sunY, h * 0.6);
      hg.addColorStop(0, 'rgba(255,253,240,0.95)');
      hg.addColorStop(0.25, 'rgba(255,250,232,0.45)');
      hg.addColorStop(1, 'rgba(255,250,232,0)');
      g.fillStyle = hg;
      g.fillRect(0, 0, w, h);
    }
    if (L.gateFar || s.loc === 'gate') {
      // 远方天门：泥金勾线
      const gx = w * 0.5;
      const top = h * 0.08;
      g.strokeStyle = rgba(C.gold, s.loc === 'gate' ? 0.9 : 0.5);
      g.lineWidth = s.loc === 'gate' ? 2.5 : 1.5;
      const gw = (s.loc === 'gate' ? 90 : 50) * sc;
      const gh = (s.loc === 'gate' ? 80 : 44) * sc;
      g.beginPath();
      g.moveTo(gx - gw / 2, top + gh);
      g.lineTo(gx - gw / 2, top + gh * 0.25);
      g.quadraticCurveTo(gx, top - gh * 0.1, gx + gw / 2, top + gh * 0.25);
      g.lineTo(gx + gw / 2, top + gh * 0.7);
      g.moveTo(gx - gw * 0.15, top + gh);
      g.lineTo(gx - gw * 0.15, top + gh * 0.35);
      g.lineTo(gx + gw * 0.04, top + gh * 0.5);
      g.stroke();
      lightPillar(g, gx, 0, top + gh, gw * 0.4, '#f3d98a', 0.6);
    } else if (!L.night && (L.swordLight || s.loc === 'sect' || s.loc === 'immortal' || (s.inDao && s.realm >= 3))) {
      // 云端仙宫：白墙青瓦、泥金描边，远而淡
      palace(g, w * (0.55 + r() * 0.2), h * 0.5, sc * 0.9, 0.55);
    }
    if (L.smoke) {
      for (let i = 0; i < 3; i++) {
        const x = w * (0.15 + r() * 0.7);
        g.strokeStyle = rgba(C.inkSoft, 0.16);
        g.lineWidth = 8 + r() * 6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x, h * 0.6);
        g.bezierCurveTo(x + 10, h * 0.45, x - 14, h * 0.3, x + 18, h * 0.08);
        g.stroke();
      }
    }

    // 远峰：一排淡淡的石柱峰，半截没在云里
    const desat = (c: string, k = 1) => mix(c, '#b4c0c8', (1 - sat) * k);
    const farLit = mix(desat(L.hills[0]), L.sky[1], 0.55);
    const farDark = mix(desat(L.hills[1]), L.sky[1], 0.62);
    for (let i = 0, n = 6 + Math.floor(r() * 3); i < n; i++) {
      const x = w * ((i + r() * 0.8) / n);
      pillarPeak(g, x, h * 0.66, h * (0.3 + r() * 0.16), (22 + r() * 22) * sc, farLit, farDark, 0.25, r, { pines: r() < 0.5 });
    }
    cloudBank(g, w, h * 0.6, h * 0.08, sc, r, L.night);
    if (L.redLeaves) {
      for (let i = 0; i < 40; i++) {
        g.fillStyle = rgba(C.cinnabar, 0.25 + r() * 0.3);
        g.beginPath();
        g.arc(r() * w, h * (0.5 + r() * 0.2), 1.5 + r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    // 中峰：两三座高耸的石柱峰，顶上松与楼阁，挂着瀑布
    const midLit = desat(L.hills[0]);
    const midDark = desat(L.hills[1], 0.8);
    const spots = [0.04 + r() * 0.1, 0.4 + r() * 0.1, 0.74 + r() * 0.08];
    spots.forEach((fx, i) => {
      if (s.loc === 'sect' && i === 1) return;
      const pw = (46 + r() * 26) * sc;
      const ptop = h * (0.24 + r() * 0.12);
      // 旁边一座矮些的副峰，叠出群峰的层次
      const side = r() < 0.5 ? -1 : 1;
      pillarPeak(g, w * fx + side * pw * 0.55, h * 0.86, ptop + (h * 0.86 - ptop) * (0.3 + r() * 0.15), pw * 0.62, mix(midLit, L.sky[1], 0.2), mix(midDark, L.sky[1], 0.2), 0.6, r, { pines: true });
      pillarPeak(g, w * fx, h * 0.86, ptop, pw, midLit, midDark, 0.75, r, {
        pines: true,
        fall: !L.night && r() < 0.75,
        pavilion: (s.inDao || L.swordLight) && i === 2,
      });
    });
    if (s.loc === 'sect') {
      // 宗门：中间一座最高的峰，山腰层层殿宇
      const bx = w * 0.66;
      pillarPeak(g, bx, h * 0.86, h * 0.12, 80 * sc, midLit, midDark, 0.8, r, { pines: true, fall: true });
      for (let i = 0; i < 3; i++) house(g, bx + (i - 1) * 24 * sc, h * (0.3 + i * 0.12), sc * (0.55 + i * 0.06));
    }
    cloudBank(g, w, h * 0.78, h * 0.07, sc, r, L.night);
    // 地面 / 水面
    if (L.sea || s.loc === 'river') {
      const wy = L.sea ? h * 0.76 : h * 0.8;
      const lg = g.createLinearGradient(0, wy, 0, h);
      lg.addColorStop(0, rgba(L.sea ? '#8fd0e4' : '#a7d8e2', 0.85));
      lg.addColorStop(1, rgba('#3f9ab8', 0.55));
      g.fillStyle = lg;
      g.fillRect(0, wy, w, h - wy);
      g.strokeStyle = rgba('#ffffff', 0.7);
      g.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        const x = r() * w;
        const y = wy + 4 + r() * (h - wy - 6);
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 6, y - 2, x + 12, y);
        g.stroke();
      }
      // 岸
      g.fillStyle = rgba(mix(midLit, '#7fbfae', 0.4), 0.95);
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, gy - 4);
      g.quadraticCurveTo(w * 0.25, gy - 10, w * 0.42, gy + 4);
      g.quadraticCurveTo(w * 0.46, h, w * 0.5, h);
      g.fill();
      g.strokeStyle = rgba(C.line, 0.4);
      g.stroke();
    } else {
      // 近处一片青草台地，后沿压着云
      const lg = g.createLinearGradient(0, gy - 8, 0, h);
      lg.addColorStop(0, rgba(mix(midLit, '#d8efe4', 0.35), 0.98));
      lg.addColorStop(1, rgba(mix(midDark, '#6faf9c', 0.5), 0.98));
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, gy);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, gy + Math.sin(x * 0.03 + r() * 0.5) * 3);
      g.lineTo(w, h);
      g.fill();
      g.strokeStyle = rgba(C.line, 0.35);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(0, gy);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, gy + Math.sin(x * 0.03) * 3);
      g.stroke();
      // 草点
      for (let i = 0; i < 30; i++) {
        g.strokeStyle = rgba(C.line, 0.18 + r() * 0.2);
        const x = r() * w;
        const y = gy + 4 + r() * (h - gy - 4);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 2, y - 4);
        g.moveTo(x + 3, y);
        g.lineTo(x + 3, y - 5);
        g.stroke();
      }
    }
    paintProp(g, s, w, h, gy, sc, L, r);

    // 题款：地点名竖写 + 小印
    g.save();
    g.font = `${17 * Math.min(1.2, sc)}px brush, 'Kaiti SC', KaiTi, serif`;
    g.textAlign = 'center';
    g.fillStyle = L.night ? 'rgba(222,228,231,0.85)' : rgba(C.line, 0.82);
    const tx = w - 22 * sc;
    let ty = 26 * sc;
    for (const ch of s.locName) {
      g.fillText(ch, tx, ty);
      ty += 19 * Math.min(1.2, sc);
    }
    stamp(g, tx, ty + 2, 13 * Math.min(1.2, sc), s.inDao ? REALM_SEAL[s.realm] : '凡');
    g.restore();

    finishPaper(g, w, h);
    return c;
  }

  draw(dt: number) {
    const g = this.ctx;
    const { w, h } = this;
    if (!w || !h || !this.layer) return;
    const s = this.st;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.prevLayer && this.fadeT < 1) {
      this.fadeT = Math.min(1, this.fadeT + dt / 0.6);
      g.globalAlpha = 1;
      g.drawImage(this.prevLayer, 0, 0);
      g.globalAlpha = easeInOut(this.fadeT);
      g.drawImage(this.layer, 0, 0);
      g.globalAlpha = 1;
      if (this.fadeT >= 1) this.prevLayer = null;
    } else g.drawImage(this.layer, 0, 0);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const t = this.t;
    const L = this.look();
    const sc = Math.max(0.75, Math.min(1.35, h / 190));
    const gy = h * 0.84;

    if (s.mode === 'well') {
      animWell(g, w, h, t);
      return;
    }
    // 流云
    g.fillStyle = L.night ? 'rgba(90,104,128,0.3)' : 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 157 + t * (6 + i * 2)) % (w + 240)) - 120;
      const y = h * (0.22 + i * 0.11);
      g.beginPath();
      g.ellipse(x, y, 70 + i * 16, 7 + i * 2, 0, 0, Math.PI * 2);
      g.fill();
    }
    // 飞鸟
    if (this.birds.length < 3 && Math.random() < dt * 0.15 && !L.night) this.birds.push({ x: -10, y: h * (0.15 + Math.random() * 0.25), v: 18 + Math.random() * 14 });
    g.strokeStyle = rgba(C.line, 0.6);
    g.lineWidth = 1;
    this.birds = this.birds.filter((b) => {
      b.x += b.v * dt;
      b.y += Math.sin(t * 2 + b.v) * 0.1;
      const f = Math.sin(t * 9 + b.v) * 2;
      g.beginPath();
      g.moveTo(b.x - 4, b.y - f);
      g.quadraticCurveTo(b.x - 2, b.y - 1, b.x, b.y);
      g.quadraticCurveTo(b.x + 2, b.y - 1, b.x + 4, b.y - f);
      g.stroke();
      return b.x < w + 10;
    });
    animProp(g, s, w, h, gy, sc, t);
    if (L.swordLight) {
      // 宗门年：天上不时有一道御剑青光划过
      const p = (t * 0.22) % 1;
      const a = Math.sin(p * Math.PI);
      const hx = w * (-0.1 + p * 1.2);
      const hy = h * 0.32 - Math.sin(p * Math.PI) * h * 0.12;
      g.save();
      g.lineCap = 'round';
      g.shadowColor = C.swordLight;
      g.shadowBlur = 8;
      const sg = g.createLinearGradient(hx - w * 0.3, 0, hx, 0);
      sg.addColorStop(0, rgba(C.swordLight, 0));
      sg.addColorStop(1, rgba('#e8fbff', 0.9 * a));
      g.strokeStyle = sg;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(hx - w * 0.3, hy + h * 0.1);
      g.quadraticCurveTo(hx - w * 0.12, hy + 2, hx, hy);
      g.stroke();
      g.restore();
    }
    drawHero(g, w * 0.26, gy + 2, sc, s, t);

    // 墨潮：劫气越重，墨从画底往上漫
    const target = s.mode === 'dead' ? 1.15 : s.danger * 0.32 + (L.inkDrip ? 0.06 : 0);
    this.ink += (target - this.ink) * Math.min(1, dt * (s.mode === 'dead' ? 1.2 : 2));
    if (this.ink > 0.01) drawInkTide(g, w, h, this.ink, t);
    if (L.inkDrip) {
      g.fillStyle = rgba(C.ink, 0.7);
      for (let i = 0; i < 6; i++) {
        const x = w * ((i * 0.173 + 0.05) % 1);
        const len = 10 + ((Math.sin(t * 0.6 + i * 2) + 1) / 2) * 26 + i * 3;
        g.beginPath();
        g.moveTo(x - 3, 0);
        g.lineTo(x + 3, 0);
        g.quadraticCurveTo(x + 2, len * 0.7, x, len);
        g.quadraticCurveTo(x - 2, len * 0.7, x - 3, 0);
        g.fill();
      }
    }
    if (s.hpLow && s.mode === 'life') {
      const rg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      rg.addColorStop(0, 'rgba(184,56,46,0)');
      rg.addColorStop(1, `rgba(184,56,46,${0.22 + Math.sin(t * 3) * 0.06})`);
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    }
  }
}

const REALM_SEAL = ['凡', '气', '基', '丹', '婴', '神'];

export function ageStage(age: number) {
  return age < 3 ? 0 : age < 12 ? 1 : age < 18 ? 2 : age < 55 ? 3 : 4;
}
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export function stamp(g: G, x: number, y: number, size: number, ch: string) {
  g.save();
  g.fillStyle = rgba(C.cinnabar, 0.88);
  g.beginPath();
  const r = size * 0.18;
  g.roundRect?.(x - size / 2, y, size, size, r) ?? g.rect(x - size / 2, y, size, size);
  g.fill();
  g.fillStyle = '#e3e9ec';
  g.font = `${size * 0.72}px brush, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, x, y + size * 0.54);
  g.restore();
}

function finishPaper(g: G, w: number, h: number) {
  const pat = g.createPattern(paperTexture(), 'repeat');
  if (pat) {
    g.globalAlpha = 0.45;
    g.fillStyle = pat;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
  }
  // 卷边暗角
  const vg = g.createLinearGradient(0, 0, w, 0);
  vg.addColorStop(0, 'rgba(64,96,116,0.12)');
  vg.addColorStop(0.04, 'rgba(64,96,116,0)');
  vg.addColorStop(0.96, 'rgba(64,96,116,0)');
  vg.addColorStop(1, 'rgba(64,96,116,0.12)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

function paintProp(g: G, s: SceneState, w: number, h: number, gy: number, sc: number, L: EraLook, r: () => number) {
  const x = w * 0.64;
  switch (s.loc) {
    case 'home':
      house(g, x, gy, sc);
      house(g, x + 52 * sc, gy + 2, sc * 0.8);
      pine(g, x - 44 * sc, gy, sc * 0.9, undefined, r);
      break;
    case 'school':
      willow(g, x - 50 * sc, gy, sc);
      house(g, x, gy, sc * 1.1, { banner: '学' });
      break;
    case 'market':
    case 'bazaar':
      stall(g, x - 30 * sc, gy, sc, rgba(C.cinnabar, 0.75));
      stall(g, x + 18 * sc, gy, sc, rgba(C.stoneBlue, 0.75));
      if (s.loc === 'bazaar') pagoda(g, x + 70 * sc, gy, sc * 0.6, 3);
      else house(g, x + 74 * sc, gy, sc * 0.85);
      break;
    case 'neighbor':
      house(g, x - 34 * sc, gy, sc * 0.85);
      house(g, x + 22 * sc, gy + 1, sc);
      willow(g, x + 74 * sc, gy, sc * 0.8);
      break;
    case 'river':
      willow(g, x - 60 * sc, gy, sc);
      break;
    case 'road':
      g.fillStyle = rgba('#bbc1c4', 0.8);
      g.beginPath();
      g.moveTo(w * 0.3, h);
      g.quadraticCurveTo(w * 0.55, gy, w * 0.72, h * 0.72);
      g.lineTo(w * 0.74, h * 0.72);
      g.quadraticCurveTo(w * 0.62, gy, w * 0.52, h);
      g.fill();
      pavilion(g, x + 36 * sc, gy - 4, sc);
      pine(g, x - 30 * sc, gy, sc * 0.8, undefined, r);
      break;
    case 'sickbed':
      house(g, x, gy, sc * 1.1, { lit: true });
      pine(g, x + 56 * sc, gy, sc * 0.8, '#3c4d48', r);
      break;
    case 'fair':
      paifang(g, x - 36 * sc, gy, sc, '庙');
      pagoda(g, x + 40 * sc, gy, sc * 0.8, 4);
      break;
    case 'trace':
      lightPillar(g, x + 10 * sc, 0, gy, 24 * sc, '#f4e3a6', 0.8);
      pine(g, x - 34 * sc, gy, sc, undefined, r);
      break;
    case 'cave': {
      g.fillStyle = rgba(mix(L.hills[0], '#6b7a74', 0.4), 0.95);
      g.beginPath();
      g.moveTo(x - 60 * sc, gy);
      g.quadraticCurveTo(x - 40 * sc, gy - 90 * sc, x + 10 * sc, gy - 96 * sc);
      g.quadraticCurveTo(x + 60 * sc, gy - 80 * sc, x + 70 * sc, gy);
      g.fill();
      g.strokeStyle = rgba(C.line, 0.6);
      g.stroke();
      g.fillStyle = C.line;
      g.beginPath();
      g.moveTo(x - 10 * sc, gy);
      g.quadraticCurveTo(x + 4 * sc, gy - 46 * sc, x + 20 * sc, gy);
      g.fill();
      pine(g, x + 46 * sc, gy - 70 * sc, sc * 0.55, undefined, r);
      break;
    }
    case 'quiet':
      bamboo(g, x - 56 * sc, gy, sc);
      pavilion(g, x + 10 * sc, gy, sc * 1.1);
      bamboo(g, x + 44 * sc, gy, sc * 0.8);
      break;
    case 'sect':
      paifang(g, x, gy, sc * 1.1, '宗');
      break;
    case 'roam':
      g.strokeStyle = rgba(C.ochre, 0.5);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(w * 0.32, gy + 6);
      g.bezierCurveTo(w * 0.55, gy + 2, w * 0.6, h * 0.74, w * 0.82, h * 0.7);
      g.stroke();
      pine(g, x + 40 * sc, gy, sc * 1.1, undefined, r);
      break;
    case 'cross':
      g.fillStyle = rgba('#bbc1c4', 0.8);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(w * 0.42, h);
        g.quadraticCurveTo(w * 0.55, gy, w * (0.62 + d * 0.16), h * 0.7);
        g.lineTo(w * (0.63 + d * 0.16), h * 0.7);
        g.quadraticCurveTo(w * 0.6, gy, w * 0.56, h);
        g.fill();
      }
      g.fillStyle = '#9aa8b0';
      g.fillRect(x - 2 * sc, gy - 34 * sc, 4 * sc, 34 * sc);
      g.fillRect(x - 14 * sc, gy - 32 * sc, 28 * sc, 8 * sc);
      g.strokeStyle = rgba(C.line, 0.7);
      g.strokeRect(x - 14 * sc, gy - 32 * sc, 28 * sc, 8 * sc);
      break;
    case 'fortune':
      lightPillar(g, x, 0, gy, 30 * sc, '#f4e3a6', 1);
      break;
    case 'karma':
      figureOther(g, x + 20 * sc, gy, sc, rgba(C.indigo, 0.9));
      g.strokeStyle = rgba(C.cinnabar, 0.8);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(w * 0.27, gy - 14 * sc);
      g.bezierCurveTo(w * 0.4, gy - 50 * sc, x - 20 * sc, gy - 40 * sc, x + 20 * sc, gy - 12 * sc);
      g.stroke();
      break;
    case 'forest': {
      // 林子深处的暗：一团晕开的淡墨，树画在上面
      const rg = g.createRadialGradient(w * 0.72, gy - 30 * sc, 10, w * 0.72, gy - 30 * sc, w * 0.4);
      rg.addColorStop(0, 'rgba(28,35,44,0.45)');
      rg.addColorStop(1, 'rgba(28,35,44,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, w, gy + 10 * sc);
      for (let i = 0; i < 7; i++) pine(g, w * (0.4 + i * 0.09), gy + (i % 2) * 4, sc * (0.9 + r() * 0.5), '#1f4a48', r);
      break;
    }
    case 'realm':
      g.strokeStyle = rgba(C.stoneBlue, 0.8);
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(x, gy - 46 * sc, 26 * sc, 36 * sc, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = rgba('#1e3a4a', 0.75);
      g.fill();
      for (let i = 0; i < 3; i++) {
        g.fillStyle = rgba(mix(L.hills[0], '#7c8a84', 0.4), 0.9);
        g.beginPath();
        const rx = x + (i - 1) * 52 * sc;
        const ry = gy - (70 + i * 14) * sc;
        g.ellipse(rx, ry, 12 * sc, 5 * sc, 0, 0, Math.PI);
        g.fill();
      }
      break;
    case 'demon':
      g.fillStyle = rgba(C.line, 0.92);
      g.beginPath();
      g.moveTo(x - 20 * sc, gy);
      g.lineTo(x - 10 * sc, gy - 90 * sc);
      g.lineTo(x, gy - 110 * sc);
      g.lineTo(x + 10 * sc, gy - 90 * sc);
      g.lineTo(x + 20 * sc, gy);
      g.fill();
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(x - 24 * sc, gy - (30 + i * 22) * sc);
        g.lineTo(x + 24 * sc, gy - (30 + i * 22) * sc);
        g.lineTo(x + 14 * sc, gy - (24 + i * 22) * sc);
        g.lineTo(x - 14 * sc, gy - (24 + i * 22) * sc);
        g.fill();
      }
      break;
    case 'rift': {
      // 画外裂隙：纸被撕开，后面是空白的虚无
      g.fillStyle = '#111821';
      g.beginPath();
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) pts.push([x - 10 * sc + (r() - 0.5) * 18 * sc, h * 0.08 + i * (gy - h * 0.08) / 10]);
      g.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(([px, py], i) => g.lineTo(px + (i % 2 ? 14 : 22) * sc, py));
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] - (i % 2 ? 16 : 8) * sc, pts[i][1]);
      g.fill();
      g.strokeStyle = '#eff5f8';
      g.lineWidth = 2.5;
      g.stroke();
      break;
    }
    case 'gate':
      for (let i = 0; i < 5; i++) {
        g.fillStyle = L.night ? 'rgba(90,104,128,0.5)' : 'rgba(239,245,248,0.7)';
        g.beginPath();
        g.ellipse(w * (0.3 + i * 0.15), gy - 10 - (i % 2) * 14, 60, 12, 0, 0, Math.PI * 2);
        g.fill();
      }
      break;
    default:
      house(g, x, gy, sc);
  }
}

function animProp(g: G, s: SceneState, w: number, h: number, gy: number, sc: number, t: number) {
  const x = w * 0.64;
  const L = ERA_LOOK[s.era] ?? ERA_LOOK.E1;
  if (s.loc === 'river' || L.sea) boat(g, w * 0.72 + Math.sin(t * 0.3) * 12, (L.sea ? h * 0.84 : gy + 8) + Math.sin(t * 1.6) * 1.5, sc);
  if (s.loc === 'market' || s.loc === 'bazaar') {
    lantern(g, x - 30 * sc, gy - 34 * sc + Math.sin(t * 2) * 1.2, sc, 0.8 + Math.sin(t * 5) * 0.2);
    lantern(g, x + 18 * sc, gy - 34 * sc + Math.sin(t * 2 + 1) * 1.2, sc, 0.8 + Math.sin(t * 4) * 0.2);
  }
  if (s.loc === 'fair') for (let i = 0; i < 4; i++) lantern(g, x - 70 * sc + i * 26 * sc, gy - 52 * sc + Math.sin(t * 1.8 + i) * 1.5, sc * 0.8, 0.9);
  if (s.loc === 'trace' || s.loc === 'fortune') {
    crane(g, x + 40 * sc + Math.sin(t * 0.5) * 20, h * 0.3 + Math.sin(t) * 4, sc, Math.sin(t * 4) * 4);
    g.fillStyle = `rgba(244,227,166,${0.5 + Math.sin(t * 2) * 0.2})`;
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.2 + i / 6) % 1;
      g.beginPath();
      g.arc(x + Math.sin(i * 3 + t) * 14 * sc, gy - p * gy * 0.9, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (s.loc === 'cave') {
    const rg = g.createRadialGradient(x + 5 * sc, gy - 14 * sc, 1, x + 5 * sc, gy - 14 * sc, 26 * sc);
    rg.addColorStop(0, `rgba(127,184,166,${0.55 + Math.sin(t * 1.5) * 0.15})`);
    rg.addColorStop(1, 'rgba(127,184,166,0)');
    g.fillStyle = rg;
    g.fillRect(x - 30 * sc, gy - 50 * sc, 70 * sc, 50 * sc);
  }
  if (s.loc === 'forest') {
    const blink = Math.sin(t * 0.9) > -0.85;
    if (blink) {
      g.fillStyle = 'rgba(200,50,40,0.9)';
      for (const [ex, ey] of [[0.58, 0.7], [0.76, 0.66], [0.9, 0.74]]) {
        g.beginPath();
        g.arc(w * ex, h * ey, 1.6, 0, Math.PI * 2);
        g.arc(w * ex + 5, h * ey, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (s.loc === 'realm') {
    g.strokeStyle = `rgba(191,227,239,${0.4 + Math.sin(t * 2) * 0.3})`;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, gy - 46 * sc, 20 * sc, 30 * sc, t * 0.5, 0, Math.PI * 1.4);
    g.stroke();
  }
  if (s.loc === 'demon') {
    g.fillStyle = `rgba(184,56,46,${0.5 + Math.sin(t * 3) * 0.3})`;
    g.beginPath();
    g.arc(x, gy - 100 * sc, 3, 0, Math.PI * 2);
    g.fill();
  }
  if (s.loc === 'school' && s.age < 18) {
    // 书声：几个淡墨字从窗口飘出
    g.fillStyle = rgba(C.line, 0.35);
    g.font = `${10 * sc}px brush, serif`;
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.25 + i / 3) % 1;
      g.globalAlpha = Math.sin(p * Math.PI) * 0.6;
      g.fillText('之乎者也'[i], x - 10 * sc + p * 30 * sc, gy - 30 * sc - p * 40 * sc);
    }
    g.globalAlpha = 1;
  }
}

// 主角小人：随年纪长大，入道后白衣，筑基后御剑
function drawHero(g: G, x: number, gy: number, sc: number, s: SceneState, t: number) {
  if (s.mode === 'dead') return;
  const st = ageStage(s.age);
  const k = sc * [0.55, 0.72, 0.9, 1, 0.95][st];
  const fly = s.inDao && s.realm >= 2;
  const y = gy - (fly ? 18 * sc + Math.sin(t * 1.6) * 3 : 0);
  g.save();
  g.translate(x, y);
  if (fly) {
    // 御剑：一道长长的青光弧线从身后拖过来，剑身发亮
    g.save();
    g.lineCap = 'round';
    g.shadowColor = C.swordLight;
    g.shadowBlur = 10;
    const tg = g.createLinearGradient(-110 * k, 0, 16 * k, 0);
    tg.addColorStop(0, rgba(C.swordLight, 0));
    tg.addColorStop(0.7, rgba(C.swordLight, 0.55));
    tg.addColorStop(1, rgba('#e8fbff', 0.95));
    g.strokeStyle = tg;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-110 * k, 22 * k + Math.sin(t * 1.6 + 1) * 3);
    g.quadraticCurveTo(-50 * k, 4, 16 * k, 2);
    g.stroke();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-14 * k, 3);
    g.lineTo(18 * k, 1);
    g.stroke();
    g.restore();
  }
  if (s.inDao && s.realm >= 4) {
    const rg = g.createRadialGradient(0, -14 * k, 2, 0, -14 * k, 28 * k);
    rg.addColorStop(0, 'rgba(243,217,138,0.35)');
    rg.addColorStop(1, 'rgba(243,217,138,0)');
    g.fillStyle = rg;
    g.fillRect(-30 * k, -44 * k, 60 * k, 60 * k);
  }
  const robe = s.inDao ? '#f4fafd' : st >= 3 ? '#8f9eab' : '#b3bec6';
  const sway = Math.sin(t * 2.2) * 1.2;
  g.fillStyle = robe;
  g.strokeStyle = rgba(C.line, 0.9);
  g.lineWidth = 1.2;
  if (st === 0) {
    // 襁褓
    g.beginPath();
    g.ellipse(0, -7 * k, 6 * k, 9 * k, 0.3, 0, Math.PI * 2);
    g.fillStyle = '#cbd1d4';
    g.fill();
    g.stroke();
    g.fillStyle = '#e0e6e9';
    g.beginPath();
    g.arc(2 * k, -14 * k, 4 * k, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
    return;
  }
  const bend = st === 4 ? 4 * k : 0;
  g.beginPath();
  g.moveTo(-5 * k + bend, -22 * k);
  g.quadraticCurveTo(-9 * k, -8 * k, -8 * k + sway, 0);
  g.lineTo(8 * k + sway, 0);
  g.quadraticCurveTo(9 * k, -8 * k, 5 * k + bend, -22 * k);
  g.closePath();
  g.fill();
  g.stroke();
  if (s.inDao) {
    g.strokeStyle = rgba(C.stoneBlue, 0.9);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-6 * k + bend, -12 * k);
    g.lineTo(6 * k + bend, -12 * k);
    g.stroke();
    // 飘带
    g.strokeStyle = rgba('#7fd0e6', 0.75);
    g.lineWidth = 1.4;
    for (const off of [0, 5]) {
      g.beginPath();
      g.moveTo(-5 * k, (-12 - off * 0.6) * k);
      g.bezierCurveTo(-14 * k, (-14 - off) * k + Math.sin(t * 2.5 + off) * 4, -24 * k, (-6 - off) * k, -34 * k, (-10 - off) * k + Math.sin(t * 2 + off) * 4);
      g.stroke();
    }
  }
  // 头与发髻
  g.fillStyle = '#dae0e3';
  g.strokeStyle = rgba(C.line, 0.9);
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(bend, -27 * k, 4.6 * k, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = st === 4 ? '#d0d6d9' : C.line;
  g.beginPath();
  g.arc(bend, -32 * k, 2.6 * k, 0, Math.PI * 2);
  g.fill();
  if (st === 4) {
    g.strokeStyle = rgba(C.ochre, 0.95);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(10 * k, 0);
    g.lineTo(12 * k, -24 * k);
    g.stroke();
  }
  g.restore();
}

function drawInkTide(g: G, w: number, h: number, amt: number, t: number) {
  const top = h * (1 - amt);
  g.fillStyle = 'rgba(19,26,35,0.88)';
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const n = Math.sin(x * 0.045 + t * 1.3) * 6 + Math.sin(x * 0.11 - t * 0.8) * 4 + Math.sin(x * 0.013 + t * 0.4) * 10;
    g.lineTo(x, top + n);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  // 晕开的淡墨边
  g.fillStyle = 'rgba(19,26,35,0.25)';
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const n = Math.sin(x * 0.05 - t * 1.1) * 8 + Math.sin(x * 0.017 + t * 0.6) * 12;
    g.lineTo(x, top - 10 + n);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  // 墨点飞溅
  g.fillStyle = 'rgba(19,26,35,0.7)';
  for (let i = 0; i < 8; i++) {
    const p = (t * 0.4 + i * 0.37) % 1;
    const x = ((i * 97) % w) + Math.sin(i) * 10;
    g.beginPath();
    g.arc(x, top - p * 30, 2.2 * (1 - p), 0, Math.PI * 2);
    g.fill();
  }
}

// 轮回井：夜色、石井、井口的光和五盏命灯
function paintWell(g: G, w: number, h: number) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#17202c');
  sky.addColorStop(1, '#2d3a4c');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(222,228,231,0.55)';
  const r = rng(11);
  for (let i = 0; i < 40; i++) g.fillRect(r() * w, r() * h * 0.6, 1.2, 1.2);
  drawRange(g, ridge(r, w, h * 0.7, h * 0.3, 5), h, 'rgba(60,78,96,0.8)', 'rgba(40,52,66,0.5)', 0.2, r);
  const cx = w / 2;
  const gy = h * 0.86;
  const sc = Math.max(0.75, Math.min(1.35, h / 190));
  // 井
  g.fillStyle = '#4d5866';
  g.strokeStyle = 'rgba(7,14,23,0.8)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(cx, gy - 22 * sc, 46 * sc, 12 * sc, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillRect(cx - 46 * sc, gy - 22 * sc, 92 * sc, 24 * sc);
  g.strokeRect(cx - 46 * sc, gy - 22 * sc, 92 * sc, 24 * sc);
  g.fillStyle = '#0c131c';
  g.beginPath();
  g.ellipse(cx, gy - 22 * sc, 38 * sc, 8 * sc, 0, 0, Math.PI * 2);
  g.fill();
  g.font = `${18 * sc}px brush, serif`;
  g.fillStyle = 'rgba(222,228,231,0.85)';
  g.textAlign = 'center';
  g.fillText('轮', w - 22 * sc, 30 * sc);
  g.fillText('回', w - 22 * sc, 50 * sc);
  g.fillText('井', w - 22 * sc, 70 * sc);
  finishPaper(g, w, h);
}
function animWell(g: G, w: number, h: number, t: number) {
  const cx = w / 2;
  const sc = Math.max(0.75, Math.min(1.35, h / 190));
  const gy = h * 0.86;
  lightPillar(g, cx, 0, gy - 22 * sc, 26 * sc + Math.sin(t) * 4, '#9fd6e6', 0.7);
  const cols = ['#f3d98a', '#ffffff', '#e8796b', '#d8b46a', '#9fd6e6'];
  cols.forEach((c, i) => {
    const a = t * 0.35 + (i / 5) * Math.PI * 2;
    const x = cx + Math.cos(a) * 80 * sc;
    const y = h * 0.42 + Math.sin(a) * 18 * sc + Math.sin(t * 2 + i) * 3;
    const rg = g.createRadialGradient(x, y, 0, x, y, 12 * sc);
    rg.addColorStop(0, rgba(c, 0.9));
    rg.addColorStop(1, rgba(c, 0));
    g.fillStyle = rg;
    g.fillRect(x - 12 * sc, y - 12 * sc, 24 * sc, 24 * sc);
  });
  // 司灯：井边提灯的小小人影
  g.fillStyle = 'rgba(222,228,231,0.85)';
  figureOther(g, cx + 64 * sc, gy, sc * 0.9, 'rgba(215,221,224,0.9)');
  lantern(g, cx + 74 * sc, gy - 22 * sc + Math.sin(t * 1.5), sc * 0.9, 1);
}
