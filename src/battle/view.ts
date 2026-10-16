// 劫难战斗画面：云海浮峰的仙境战场（Canvas2D），键盘 WASD / 方向键，触屏拖动
import { BattleSim, ARENA } from './sim';
import type { BattleSpec, BattleResult } from './spec';
import { ERA_LOOK, mix, rgba } from '../art/palette';
import { sfx } from '../art/sound';
import { pillarPeak, cloudBank, rng } from '../art/scene';

const INK = '#1d2a38';
const BLUE_INK = '#3A6080';
const PALE = '#98BACE';

let paperPattern: CanvasPattern | null = null;

function makePaper(ctx: CanvasRenderingContext2D) {
  if (paperPattern) return paperPattern;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#eef6fa';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(86,109,138,${Math.random() * 0.018})`;
    g.beginPath();
    g.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 40, 6 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = `rgba(61,96,116,${Math.random() * 0.035})`;
    g.lineWidth = Math.random() * 1.2;
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const a = Math.random() * Math.PI;
    const l = 4 + Math.random() * 14;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  paperPattern = ctx.createPattern(c, 'repeat');
  return paperPattern;
}

// 远景：云海里的石柱仙峰，年代定色，境界越高越浓。两条横幅预先画好，按视差平移、首尾相接
const REALM_SAT = [0.7, 0.75, 0.85, 0.92, 1, 1];
let look = ERA_LOOK.E1;
let strips: { key: string; far: HTMLCanvasElement; mid: HTMLCanvasElement; H: number } | null = null;

function buildStrip(W: number, H: number, mid: boolean, sat: number, seed: number) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = rng(seed);
  const desat = (col: string, k = 1) => mix(col, '#b4c0c8', (1 - sat) * k);
  const lit = mid ? desat(look.hills[0]) : mix(desat(look.hills[0]), look.sky[1], 0.5);
  const dark = mid ? desat(look.hills[1], 0.8) : mix(desat(look.hills[1]), look.sky[1], 0.58);
  const n = mid ? 6 : 11;
  const sc = H / 260;
  // 两端各留一截空隙，平铺时接缝落在云里
  for (let i = 0; i < n; i++) {
    const x = W * (0.04 + (i + r() * 0.6) / n * 0.92);
    const wd = (mid ? 70 + r() * 50 : 30 + r() * 30) * sc;
    const top = H * (mid ? 0.08 + r() * 0.3 : 0.3 + r() * 0.25);
    if (mid && r() < 0.6) pillarPeak(g, x + (r() < 0.5 ? -1 : 1) * wd * 0.55, H * 0.98, top + (H - top) * 0.35, wd * 0.6, mix(lit, look.sky[1], 0.2), mix(dark, look.sky[1], 0.2), 0.6, r, { pines: true });
    pillarPeak(g, x, H * (mid ? 0.98 : 0.86), top, wd, lit, dark, mid ? 0.75 : 0.3, r, { pines: true, fall: mid && r() < 0.6 });
  }
  cloudBank(g, W, H * (mid ? 0.93 : 0.8), H * 0.08, sc, r, !!look.night);
  return c;
}

function drawMountains(ctx: CanvasRenderingContext2D, w: number, h: number, camX: number, camY: number, realm: number, kind: string) {
  const sat = REALM_SAT[realm] ?? 0.6;
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, rgba(look.sky[0], 0.95));
  sky.addColorStop(1, rgba(look.sky[1], 0));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.55);
  const H = Math.round(Math.min(380, h * 0.36));
  const W = Math.max(1600, Math.round(w * 1.6));
  const key = `${look.sky[0]}|${realm}|${W}|${H}`;
  if (!strips || strips.key !== key) {
    const seed = realm * 977 + W + H;
    strips = { key, H, far: buildStrip(W, H, false, sat, seed), mid: buildStrip(W, H, true, sat, seed + 1) };
  }
  const layers = [
    { img: strips.far, par: 0.05, bottom: Math.min(0.3, 260 / h) },
    { img: strips.mid, par: 0.1, bottom: Math.min(0.42, 360 / h) },
  ];
  for (const L of layers) {
    const y = h * L.bottom - camY * L.par * 0.3 - H;
    let x = -(((camX * L.par) % W) + W) % W;
    for (; x < w; x += W) ctx.drawImage(L.img, Math.round(x), Math.round(y));
    // 峰脚以下接一片云海
    const cy = y + H - 2;
    const cg = ctx.createLinearGradient(0, cy, 0, cy + 120);
    cg.addColorStop(0, 'rgba(255,255,255,0.7)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, cy, w, 120);
  }
  // 天光
  const hg = ctx.createRadialGradient(w * 0.75, 0, 4, w * 0.75, 0, h * 0.6);
  hg.addColorStop(0, look.night ? 'rgba(240,246,250,0.15)' : 'rgba(255,252,236,0.6)');
  hg.addColorStop(1, 'rgba(255,252,236,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h * 0.6);
  // 地面淡淡一层青
  const gr = ctx.createLinearGradient(0, h * 0.45, 0, h);
  gr.addColorStop(0, rgba(look.hills[0], 0));
  gr.addColorStop(1, rgba(mix(look.hills[0], '#d6ece6', 1 - sat), kind === 'trial' ? 0.12 : 0.2));
  ctx.fillStyle = gr;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);
}

// 地上的草石：按格子取种子，跟着镜头走，给移动一个参照
function drawGround(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number) {
  const cell = 90;
  const x0 = Math.floor((camX - vw) / cell);
  const x1 = Math.ceil((camX + vw) / cell);
  const y0 = Math.floor((camY - vh) / cell);
  const y1 = Math.ceil((camY + vh) / cell);
  for (let gx = x0; gx <= x1; gx++)
    for (let gy = y0; gy <= y1; gy++) {
      let hsh = Math.imul(gx * 73856093 ^ gy * 19349663, 2654435761) >>> 0;
      const rnd = () => ((hsh = Math.imul(hsh ^ (hsh >>> 15), 2246822519) >>> 0) % 1000) / 1000;
      if (rnd() > 0.45) continue;
      const x = gx * cell + rnd() * cell;
      const y = gy * cell + rnd() * cell;
      const k = rnd();
      if (k > 0.55) {
        // 脚下飘着的小团云
        const rr = 10 + rnd() * 14;
        ctx.fillStyle = 'rgba(207,226,238,0.55)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x + (i - 1) * rr * 0.8, y + 3, rr * (i === 1 ? 0.8 : 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x + (i - 1) * rr * 0.8, y, rr * (i === 1 ? 0.75 : 0.55), 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }
      ctx.strokeStyle = `rgba(43,93,102,${0.2 + rnd() * 0.15})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (k < 0.4) {
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(x + i * 3, y);
          ctx.quadraticCurveTo(x + i * 4, y - 6, x + i * 6, y - 9 - rnd() * 4);
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(look.hills[0], 0.3);
        ctx.ellipse(x, y, 10 + rnd() * 8, 5 + rnd() * 3, 0, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
      }
    }
}

// 斩墨后留在纸上的墨渍，慢慢淡去
interface Splat { x: number; y: number; r: number; t: number; seed: number }
function drawSplats(ctx: CanvasRenderingContext2D, splats: Splat[]) {
  for (const sp of splats) {
    const a = Math.max(0, 1 - sp.t / 9) * 0.32;
    if (a <= 0) continue;
    ctx.fillStyle = `rgba(19,26,35,${a})`;
    let hsh = sp.seed;
    const rnd = () => ((hsh = Math.imul(hsh ^ (hsh >>> 13), 1274126177) >>> 0) % 1000) / 1000;
    ctx.beginPath();
    ctx.ellipse(sp.x, sp.y, sp.r, sp.r * 0.7, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const ang = rnd() * Math.PI * 2;
      const d = sp.r * (1.1 + rnd() * 1.2);
      ctx.beginPath();
      ctx.arc(sp.x + Math.cos(ang) * d, sp.y + Math.sin(ang) * d * 0.7, 1.5 + rnd() * sp.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function inkFigure(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, opts: { color?: string; elite?: boolean; wings?: boolean; flash?: boolean; frozen?: boolean; ghost?: boolean }) {
  const c = opts.flash ? '#5a86b5' : opts.frozen ? '#7fb2d6' : opts.color ?? INK;
  ctx.save();
  ctx.translate(x, y);
  if (opts.elite) {
    ctx.fillStyle = 'rgba(176,48,48,0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // 墨点飞散
  ctx.fillStyle = c;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + i * 2.1;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 1.1, r * 0.6 + Math.sin(a) * r * 0.3, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.92;
  if (opts.wings) {
    const flap = Math.sin(t * 14) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 1.4, -r * 0.6 - flap, -r * 1.8, flap * 0.3);
    ctx.quadraticCurveTo(-r * 0.6, 0, 0, r * 0.3);
    ctx.quadraticCurveTo(r * 0.6, 0, r * 1.8, flap * 0.3);
    ctx.quadraticCurveTo(r * 1.4, -r * 0.6 - flap, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 袍身：上实下虚
    const grd = ctx.createLinearGradient(0, -r, 0, r * 1.2);
    grd.addColorStop(0, c);
    grd.addColorStop(1, 'rgba(29,42,56,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.3);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.6, -r * 0.7 + Math.sin(t * 5) * 3, r * 1.2);
    ctx.lineTo(r * 0.7 + Math.sin(t * 5 + 1) * 3, r * 1.2);
    ctx.quadraticCurveTo(r * 0.9, r * 0.6, r * 0.5, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, -r * 0.6, r * (opts.ghost ? 0.5 : 0.38), 0, Math.PI * 2);
    ctx.fill();
    if (opts.ghost) {
      ctx.fillStyle = '#e8a04a';
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.6, 2, 0, Math.PI * 2);
      ctx.arc(r * 0.15, -r * 0.6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (opts.elite) {
    ctx.strokeStyle = '#b03030';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.2);
    ctx.quadraticCurveTo(-r * 1.5, Math.sin(t * 4) * r * 0.5, -r * 1.9, r * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, hurt: boolean) {
  ctx.save();
  ctx.translate(x, y);
  const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  aura.addColorStop(0, 'rgba(159,224,240,0.45)');
  aura.addColorStop(1, 'rgba(159,214,230,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  // 脚下飞剑：发光的青白剑身
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(127,224,255,0.45)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-22, 16);
  ctx.lineTo(22, 15);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 白衣
  ctx.fillStyle = hurt ? '#ffd9d9' : '#fbfdff';
  ctx.strokeStyle = '#1f6f86';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(-14, 8, -10 + Math.sin(t * 6) * 2, 14);
  ctx.lineTo(10 + Math.sin(t * 6 + 1) * 2, 14);
  ctx.quadraticCurveTo(14, 8, 8, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -12, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 黑发与飘带
  ctx.fillStyle = '#1f2a33';
  ctx.beginPath();
  ctx.arc(0, -15, 4.5, Math.PI, 0);
  ctx.quadraticCurveTo(-8, -6, -16 + Math.sin(t * 4) * 2, -2);
  ctx.quadraticCurveTo(-8, -10, -4.5, -15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(127,208,230,0.75)';
  ctx.lineWidth = 1.6;
  for (const off of [0, 6]) {
    ctx.beginPath();
    ctx.moveTo(-6, -4 + off * 0.3);
    ctx.bezierCurveTo(-18, -2 + off + Math.sin(t * 3 + off) * 5, -28, 4 + off, -40, off + Math.sin(t * 2.4 + off) * 6);
    ctx.stroke();
  }
  ctx.restore();
}

function shotStroke(ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, color: string, r: number) {
  // 剑光：一道拖得很长、往尾巴淡去的青光，头上一点白
  const l = Math.hypot(vx, vy) || 1;
  const ux = vx / l;
  const uy = vy / l;
  const tail = r * 7;
  const hx = x + ux * r * 0.8;
  const hy = y + uy * r * 0.8;
  const g = ctx.createLinearGradient(x - ux * tail, y - uy * tail, hx, hy);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.75, rgba(color, 0.55));
  g.addColorStop(1, rgba(color, 0.9));
  ctx.lineCap = 'round';
  ctx.strokeStyle = g;
  ctx.lineWidth = r * 1.6;
  ctx.beginPath();
  ctx.moveTo(x - ux * tail, y - uy * tail);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = r * 0.45;
  ctx.beginPath();
  ctx.moveTo(x - ux * r * 2.5, y - uy * r * 2.5);
  ctx.lineTo(hx, hy);
  ctx.stroke();
}

export function runBattle(spec: BattleSpec, root: HTMLElement, era = 'E1'): Promise<BattleResult> {
  look = ERA_LOOK[era] ?? ERA_LOOK.E1;
  return new Promise((resolve) => {
    const sim = new BattleSim(spec);
    const fxState: FxState = { seen: new WeakSet(), splats: [], shake: 0, flash: 0, lastHp: sim.hp };
    root.innerHTML = '';
    root.classList.add('show');
    const canvas = document.createElement('canvas');
    canvas.className = 'battle-canvas';
    root.appendChild(canvas);
    const hud = document.createElement('div');
    hud.className = 'battle-hud';
    root.appendChild(hud);
    const lvl = document.createElement('div');
    lvl.className = 'level-up hidden';
    root.appendChild(lvl);
    const ctx = canvas.getContext('2d')!;
    const keys = new Set<string>();
    let joy: { ox: number; oy: number; x: number; y: number } | null = null;
    let paused = false;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = root.clientWidth * dpr;
      canvas.height = root.clientHeight * dpr;
      canvas.style.width = root.clientWidth + 'px';
      canvas.style.height = root.clientHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.type === 'keydown') {
        keys.add(k);
        if (sim.levelUp && ['1', '2', '3', '4'].includes(k)) pickLevel(Number(k) - 1);
        if (k === 'q') toggleHold();
        if (k === 'p' || k === 'escape') {
          paused = !paused;
          pauseBtn.textContent = paused ? '继续' : '暂停';
        }
      } else keys.delete(k);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, .level-up')) return;
      joy = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (joy) {
        joy.x = e.clientX;
        joy.y = e.clientY;
      }
    };
    const onUp = () => (joy = null);
    const touch = window.matchMedia('(pointer: coarse)').matches;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('resize', resize);
    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const hold = document.createElement('button');
    hold.className = 'btn hold-btn';
    const keyHint = (k: string) => (touch ? '' : ` (${k})`);
    hold.textContent = '收剑' + keyHint('Q');
    hold.onclick = () => toggleHold();
    root.appendChild(hold);
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'btn pause-btn';
    pauseBtn.textContent = '暂停';
    pauseBtn.onclick = () => {
      paused = !paused;
      pauseBtn.textContent = paused ? '继续' : '暂停';
    };
    root.appendChild(pauseBtn);
    if (touch) {
      const tip = document.createElement('div');
      tip.className = 'touch-tip';
      tip.textContent = '按住屏幕任意处拖动即可移动';
      root.appendChild(tip);
      setTimeout(() => tip.remove(), 3500);
    }
    function toggleHold() {
      sim.holdFire = !sim.holdFire;
      hold.textContent = (sim.holdFire ? '出剑' : '收剑') + keyHint('Q');
      hold.classList.toggle('active', sim.holdFire);
    }

    function pickLevel(i: number) {
      sim.chooseLevel(i);
      renderLevel();
    }
    function renderLevel() {
      if (!sim.levelUp) {
        lvl.classList.add('hidden');
        return;
      }
      lvl.classList.remove('hidden');
      lvl.innerHTML = `<div class="lv-title">悟道 · 第 ${sim.level} 重</div>`;
      sim.levelUp.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'lv-opt';
        b.innerHTML = `<b>${i + 1}. ${o.label}</b><span>${o.desc}</span>`;
        b.onclick = () => pickLevel(i);
        lvl.appendChild(b);
      });
    }

    let last = performance.now();
    let lvShown = false;
    let endTimer = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let mx = 0;
      let my = 0;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      if (joy) {
        const dx = joy.x - joy.ox;
        const dy = joy.y - joy.oy;
        const l = Math.hypot(dx, dy);
        if (l > 6) {
          mx = dx / Math.max(l, 40);
          my = dy / Math.max(l, 40);
        }
      }
      if (!paused) sim.update(dt, mx, my);
      if (!!sim.levelUp !== lvShown) {
        lvShown = !!sim.levelUp;
        renderLevel();
      }
      fxUpdate(fxState, sim, dt);
      draw(ctx, sim, root.clientWidth, root.clientHeight, joy, fxState);
      drawHud(hud, sim, paused);
      if (sim.done) {
        endTimer += dt;
        if (endTimer > 1.2) {
          cleanup();
          resolve(sim.result!);
          return;
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    function cleanup() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('resize', resize);
      root.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      root.classList.remove('show');
      root.innerHTML = '';
    }
  });
}

function drawHud(hud: HTMLElement, sim: BattleSim, paused: boolean) {
  const s = sim.spec;
  const hpPct = Math.max(0, sim.hp / sim.maxHp) * 100;
  const xpPct = (sim.xp / sim.levelNeed) * 100;
  const muts = s.mutators.map((m) => `<span class="mut" title="利：${m.pro}；弊：${m.con}">${m.name}</span>`).join('');
  const parts = sim.partners.map((p) => `<span class="mut ${p.down ? 'down' : ''}">${p.name}${p.down ? '·倒' : ''}</span>`).join('');
  const sk = sim.skills.map((k) => `<span class="sk">${skillShort(k.id)}<i>${k.lvl}</i></span>`).join('');
  const html = `
    <div class="hud-top"><b>${s.title}</b><span>${sim.objective()}</span>${muts}${parts}</div>
    <div class="hud-bottom">
      <div class="bar hp"><div style="width:${hpPct}%"></div><em>气血 ${Math.ceil(sim.hp)}/${Math.round(sim.maxHp)}${sim.shield > 0 ? ` · 护盾 ${Math.round(sim.shield)}` : ''}</em></div>
      <div class="bar xp"><div style="width:${xpPct}%"></div><em>悟道 ${sim.level} 重</em></div>
      <div class="skills">${sk}</div>
    </div>
    ${sim.messageT > 0 ? `<div class="hud-msg">${sim.message}</div>` : ''}
    ${paused ? '<div class="hud-msg">暂停中</div>' : ''}
    ${sim.done ? `<div class="hud-msg big">${sim.result?.win || sim.result?.survivedKnock ? (sim.result?.survivedKnock ? '叩门' : '劫过') : '败'}</div>` : ''}`;
  if (hud.dataset.last !== html) {
    hud.innerHTML = html;
    hud.dataset.last = html;
  }
}

const SK: Record<string, string> = { sword: '剑', orbit: '印', thunder: '雷', fire: '火', frost: '冰', ink: '幡', art: '法' };
const skillShort = (id: string) => SK[id] ?? id;

interface FxState { seen: WeakSet<object>; splats: Splat[]; shake: number; flash: number; lastHp: number }

// 读战斗里新出的特效，转成墨渍、震屏、闪白和音效
function fxUpdate(st: FxState, sim: BattleSim, dt: number) {
  for (const f of sim.fx) {
    if (st.seen.has(f)) continue;
    st.seen.add(f);
    if (f.kind === 'kill') {
      st.splats.push({ x: f.x, y: f.y, r: 8 + Math.random() * 8, t: 0, seed: (Math.random() * 1e9) | 0 });
      sfx.kill();
    } else if (f.kind === 'bolt') {
      st.flash = Math.max(st.flash, 0.5);
      st.shake = Math.max(st.shake, 0.25);
      sfx.thunder();
    } else if (f.kind === 'arc' || f.kind === 'slash') sfx.hit();
  }
  if (st.splats.length > 80) st.splats.splice(0, st.splats.length - 80);
  for (const sp of st.splats) sp.t += dt;
  if (sim.hp < st.lastHp - 0.5) {
    st.shake = Math.max(st.shake, Math.min(0.35, (st.lastHp - sim.hp) / sim.maxHp * 3 + 0.12));
    sfx.hurt();
  }
  st.lastHp = sim.hp;
  st.shake = Math.max(0, st.shake - dt);
  st.flash = Math.max(0, st.flash - dt * 2);
}

function draw(ctx: CanvasRenderingContext2D, sim: BattleSim, w: number, h: number, joy: { ox: number; oy: number; x: number; y: number } | null, fx: FxState) {
  const camX = sim.px + (fx.shake > 0 ? (Math.random() - 0.5) * fx.shake * 28 : 0);
  const camY = sim.py + (fx.shake > 0 ? (Math.random() - 0.5) * fx.shake * 28 : 0);
  const zoom = Math.min(1, Math.max(0.62, Math.min(w, h) / 760));
  ctx.fillStyle = makePaper(ctx) ?? '#eef6fa';
  ctx.fillRect(0, 0, w, h);
  drawMountains(ctx, w, h, camX, camY, sim.spec.realm, sim.spec.kind);
  if (sim.spec.kind === 'trial') {
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    g.addColorStop(0, 'rgba(70,70,95,0.16)');
    g.addColorStop(1, 'rgba(70,70,95,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * 0.5);
  }
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-camX, -camY);
  const t = sim.t;
  drawGround(ctx, camX, camY, w / zoom / 2 + 90, h / zoom / 2 + 90);
  drawSplats(ctx, fx.splats);

  // 场地结界（靠近才显示）
  const dEdge = sim.arena - Math.hypot(sim.px, sim.py);
  if (dEdge < 320 || sim.phase === 2) {
    ctx.strokeStyle = sim.phase === 2 ? 'rgba(17,24,33,0.7)' : `rgba(58,96,128,${0.6 * (1 - Math.max(0, dEdge) / 320)})`;
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = sim.phase === 2 ? 6 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, sim.arena, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (sim.phase === 2) {
      ctx.fillStyle = 'rgba(20,27,36,0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, ARENA * 2, 0, Math.PI * 2);
      ctx.arc(0, 0, sim.arena, 0, Math.PI * 2, true);
      ctx.fill();
    }
  }

  // 纸色薄雾（视差）
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 6; i++) {
    const mx = ((i * 640 + t * 20) % 2400) - 1200;
    const my = ((i * 410) % 1800) - 900;
    ctx.beginPath();
    ctx.ellipse(mx, my, 220, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 区域
  for (const z of sim.zones) {
    const a = Math.min(1, z.life / 0.5);
    if (z.kind === 'fire') ctx.fillStyle = `rgba(232,120,60,${0.28 * a})`;
    else if (z.kind === 'firewell') ctx.fillStyle = 'rgba(200,80,40,0.3)';
    else if (z.kind === 'ink') ctx.fillStyle = 'rgba(29,36,45,0.25)';
    else ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 灵气
  for (const o of sim.orbs) {
    ctx.fillStyle = o.kind === 'xp' ? '#5fb3c8' : '#5fbf7a';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.kind === 'xp' ? 4 : 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // 敌人
  for (const e of sim.enemies) {
    const opts = { elite: e.elite || e.tag === 'righteous', flash: e.hitFlash > 0, frozen: e.frozen > 0 };
    if (e.type === 'crow') inkFigure(ctx, e.x, e.y, e.r, e.t, { ...opts, wings: true });
    else if (e.type === 'ghost') inkFigure(ctx, e.x, e.y, e.r, e.t, { ...opts, ghost: true });
    else if (e.type === 'lost') inkFigure(ctx, e.x, e.y, e.r, e.t, { color: '#7d93a8' });
    else if (e.type === 'mirror') inkFigure(ctx, e.x, e.y, e.r, e.t, { ...opts, color: '#2a3550' });
    else if (e.type === 'general') inkFigure(ctx, e.x, e.y, e.r, e.t, { ...opts, color: '#8a6d2a' });
    else if (e.type === 'lord') inkFigure(ctx, e.x, e.y, e.r, e.t, { ...opts, color: e.invuln ? '#3b3b55' : '#121922' });
    else if (e.type === 'inkeye' || e.type === 'puppet') {
      ctx.fillStyle = e.hitFlash > 0 ? '#5a86b5' : INK;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.r, e.r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'banner') {
      inkFigure(ctx, e.x, e.y, e.r, e.t, opts);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x + 14, e.y + 20);
      ctx.lineTo(e.x + 14, e.y - 40);
      ctx.stroke();
      ctx.fillStyle = 'rgba(80,40,90,0.7)';
      ctx.fillRect(e.x + 14, e.y - 40, 22, 30);
    } else inkFigure(ctx, e.x, e.y, e.r, e.t, { ...opts, color: e.type === 'chiyi' ? '#7a1f1f' : e.type === 'mage' ? '#2b3d5c' : e.type === 'hebo' ? '#2c5a6a' : INK });
    if (e.hitFlash > 0) {
      // 命中：一点青白星芒
      ctx.strokeStyle = 'rgba(214,240,248,0.95)';
      ctx.lineWidth = 2;
      const s2 = e.r * 0.9;
      ctx.beginPath();
      ctx.moveTo(e.x - s2, e.y - e.r * 0.3);
      ctx.lineTo(e.x + s2, e.y - e.r * 0.3);
      ctx.moveTo(e.x, e.y - e.r * 0.3 - s2);
      ctx.lineTo(e.x, e.y - e.r * 0.3 + s2);
      ctx.stroke();
    }
    if (e.state === 1) {
      ctx.strokeStyle = 'rgba(192,57,43,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.tx ?? e.x, e.ty ?? e.y);
      ctx.stroke();
    }
    if (e.elite || e.required || e.type === 'inkeye') {
      ctx.fillStyle = 'rgba(0,1,10,0.2)';
      ctx.fillRect(e.x - 26, e.y - e.r - 16, 52, 5);
      ctx.fillStyle = e.invuln ? '#777' : '#b03030';
      ctx.fillRect(e.x - 26, e.y - e.r - 16, 52 * Math.max(0, e.hp / e.maxHp), 5);
    }
  }
  // 伙伴
  for (const p of sim.partners) {
    if (p.down) continue;
    if (p.id === 'fox') {
      for (let k = 0; k < 3; k++) {
        const a = t * 2.4 + (k / 3) * Math.PI * 2;
        ctx.fillStyle = 'rgba(120,200,230,0.8)';
        ctx.beginPath();
        ctx.arc(sim.px + Math.cos(a) * 110, sim.py + Math.sin(a) * 110, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = p.id === 'fox' ? '#ffffff' : p.id === 'chiyi' ? '#9c2a2a' : p.id === 'danzun' ? 'rgba(200,170,90,0.6)' : '#5fae8a';
    ctx.strokeStyle = BLUE_INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 环身剑印
  const orbitLvl = sim.skillLvl('orbit');
  if (orbitLvl && !sim.holdFire) {
    const n = 2 + orbitLvl;
    for (let i = 0; i < n; i++) {
      const a = t * 3 + (i / n) * Math.PI * 2;
      const ox = sim.px + Math.cos(a) * 78;
      const oy = sim.py + Math.sin(a) * 78;
      shotStroke(ctx, ox, oy, -Math.sin(a), Math.cos(a), '#4fd2f5', 6);
    }
  }
  drawPlayer(ctx, sim.px, sim.py, t, sim.iframes > 0.3);
  // 弹道
  for (const s of sim.shots) {
    if (s.enemy) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else shotStroke(ctx, s.x, s.y, s.vx, s.vy, s.color, s.r);
  }
  // 预警
  for (const wv of sim.warns) {
    const p = wv.t / wv.max;
    ctx.fillStyle = wv.kind === 'strike' ? 'rgba(192,57,43,0.18)' : 'rgba(192,57,43,0.12)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(wv.x, wv.y, wv.r, wv.r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(wv.x, wv.y, wv.r * 0.53, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.stroke();
    if (wv.kind === 'strike') {
      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText((wv.max - wv.t).toFixed(1), wv.x, wv.y + 5);
    }
  }
  // 特效
  for (const f of sim.fx) {
    const a = 1 - f.t / f.max;
    if (f.kind === 'bolt') {
      ctx.strokeStyle = `rgba(120,110,200,${a})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(f.x + 10, f.y - 600);
      ctx.lineTo(f.x - 12, f.y - 300);
      ctx.lineTo(f.x + 8, f.y - 150);
      ctx.lineTo(f.x, f.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (f.kind === 'kill') {
      ctx.fillStyle = `rgba(19,26,35,${0.6 * a})`;
      for (let i = 0; i < 8; i++) {
        const ang = i * 0.79 + f.x;
        const d = 34 * (1 - a) * (0.6 + (i % 3) * 0.25);
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d, 3.5 * a + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (f.kind === 'text') {
      ctx.fillStyle = f.color ?? '#23305c';
      ctx.globalAlpha = a;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text ?? '', f.x, f.y - 20 * (1 - a));
      ctx.fillText(f.text ?? '', f.x, f.y - 20 * (1 - a));
      ctx.globalAlpha = 1;
    } else if (f.kind === 'slash' || f.kind === 'arc') {
      ctx.strokeStyle = f.kind === 'slash' ? `rgba(176,48,48,${a})` : `rgba(58,167,201,${a * 0.7})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const mx = ((f.x + (f.x2 ?? f.x)) / 2) + 30;
      const my = ((f.y + (f.y2 ?? f.y)) / 2) - 30;
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(mx, my, f.x2 ?? f.x, f.y2 ?? f.y);
      ctx.stroke();
    }
  }
  ctx.restore();

  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(241,247,250,${fx.flash * 0.6})`;
    ctx.fillRect(0, 0, w, h);
  }
  // 河雾的视野暗角
  if (sim.mods.M03) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(40,50,60,0)');
    g.addColorStop(1, 'rgba(40,50,60,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // 低血红晕
  if (sim.hp < sim.maxHp * 0.3) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(176,48,48,0)');
    g.addColorStop(1, 'rgba(176,48,48,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (joy) {
    ctx.strokeStyle = 'rgba(58,96,128,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joy.ox, joy.oy, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(58,96,128,0.4)';
    ctx.beginPath();
    const dx = joy.x - joy.ox;
    const dy = joy.y - joy.oy;
    const l = Math.min(40, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx);
    ctx.arc(joy.ox + Math.cos(a) * l, joy.oy + Math.sin(a) * l, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  void PALE;
}
