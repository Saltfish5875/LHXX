// 大世界地图：淡彩青绿的一州山水，摇杆 / WASD 自由行走，迷雾随脚步散开
// 「动则流时」：走动时日子才过，站着不动世界就停住
import type { ExploreAction, ExplorePoint, ExploreView } from '../game/explore';
import { DAYS_PER_SEC, YEAR_DAYS, autoTarget, exploredRatio, fogAt, reveal } from '../game/explore';
import type { Site, World } from '../game/world';
import { LAYER_NAMES } from '../game/world';
import type { Tendency } from '../game/types';
import type { BattleStage } from '../battle/view';
import { C } from '../art/palette';
import { cnAge } from '../data/core';
import type { Chip } from '../art/feedback';
import { mulberry } from '../game/world';

const MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const TAG_COLOR: Record<string, string> = { 劫: '#a45248', 凶: '#6b2f2f', 缘: '#967b4b', 引: '#4a6a8a', 故: '#796e87', 平: '#386e68' };
const TAG_WORD: Record<string, string> = { 劫: '劫难', 凶: '凶险', 缘: '有缘', 引: '引子', 故: '故人', 平: '平安' };
const FONT = (px: number, w = 600) => `${w} ${px}px wenkai, "LXGW WenKai", "Kaiti SC", KaiTi, serif`;
const REACH = 64; // 走到多近算到了
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function hash(n: number) {
  n = Math.imul(n ^ (n >>> 15), 2246822507);
  n = Math.imul(n ^ (n >>> 13), 3266489909);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

interface Mob { x: number; y: number; ax: number; ay: number; ph: number }

export interface WorldMapOpts {
  auto: () => boolean;
  tend: () => Tendency;
  flash: (msg: string) => void;
}

export class WorldMap {
  el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hudTop: HTMLElement;
  private ctxBox: HTMLElement;
  private actions: HTMLElement;
  private signEl: HTMLElement;
  private world: World | null = null;
  private terrain: HTMLCanvasElement | null = null;
  private tscale = 1;
  private fogC = document.createElement('canvas');
  private fogDirty = true;
  private v: ExploreView | null = null;
  private resolve: ((a: ExploreAction) => void) | null = null;
  private keys = new Set<string>();
  private joy: { ox: number; oy: number; x: number; y: number; id: number; moved: boolean; t0: number } | null = null;
  private target: { x: number; y: number; id?: string } | null = null;
  private overview = false;
  private zoomMul = 1;
  private cam = { x: 0, y: 0, z: 1 };
  private t = 0;
  private last = 0;
  private raf = 0;
  private mobs = new Map<string, Mob>();
  private trail: { x: number; y: number }[] = [];
  private walking = false;
  private hudKey = '';
  private ctxKey = '';
  private restArmed = 0;
  paused = false;

  constructor(private opts: WorldMapOpts) {
    this.el = document.createElement('div');
    this.el.className = 'world';
    this.el.innerHTML = `
      <canvas class="world-canvas" aria-label="大世界地图"></canvas>
      <div class="wm-top"></div>
      <div class="wm-sign"></div>
      <div class="wm-note"></div>
      <div class="wm-bottom">
        <div class="wm-ctx"></div>
        <div class="wm-actions">
          <button class="btn sm" data-a="find" title="寻路（F）">寻路</button>
          <button class="btn sm" data-a="full" title="全图（M）">全图</button>
          <button class="btn sm" data-a="rest">歇到岁末</button>
        </div>
      </div>
      <div class="wm-tip">按住地图拖动行走 · 点地点自动走过去</div>`;
    this.canvas = this.el.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.hudTop = this.el.querySelector('.wm-top')!;
    this.ctxBox = this.el.querySelector('.wm-ctx')!;
    this.actions = this.el.querySelector('.wm-actions')!;
    this.signEl = this.el.querySelector('.wm-sign')!;
    if (matchMedia('(pointer: fine)').matches) this.el.querySelector('.wm-tip')!.textContent = 'WASD / 方向键行走 · E 进入 · F 寻路 · M 全图';
    this.actions.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => this.action(b.dataset.a!)));
    this.canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', () => (this.joy = null));
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomMul = Math.max(0.55, Math.min(1.9, this.zoomMul * (e.deltaY > 0 ? 0.9 : 1.1)));
    }, { passive: false });
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    new ResizeObserver(() => this.resize()).observe(this.el);
  }

  // ---------------- 对外 ----------------
  get awaiting() {
    return !!this.resolve;
  }
  mount(host: HTMLElement) {
    if (this.el.parentElement !== host) {
      host.innerHTML = '';
      host.appendChild(this.el);
    }
    this.resize();
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }
  }
  show(v: ExploreView, host: HTMLElement): Promise<ExploreAction> {
    this.setView(v);
    this.mount(host);
    this.el.classList.remove('idle');
    this.restArmed = 0;
    this.renderHud(true);
    return new Promise((r) => (this.resolve = r));
  }
  // 刚办完的事：结果小签浮在地图上
  note(line: string | null, chips: Chip[]) {
    const el = this.noteEl();
    if (!line && !chips.length) return;
    el.innerHTML = `${line ? `<p>${esc(line)}</p>` : ''}${chips.length ? `<div>${chips.map((c) => `<span class="${c.tone}">${esc(c.text)}</span>`).join('')}</div>` : ''}`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }
  noteEl(): HTMLElement {
    return this.el.querySelector('.wm-note')!;
  }
  // 事件、战斗进行中：地图留着，但不能走
  idle() {
    this.el.classList.add('idle');
  }
  setView(v: ExploreView) {
    const fresh = !this.world || this.world.seed !== v.world.seed || this.world.layer !== v.world.layer;
    this.v = v;
    if (fresh) {
      this.world = v.world;
      this.buildTerrain();
      this.cam = { x: v.E.px, y: v.E.py, z: this.baseZoom() };
      this.trail = [];
      this.overview = false;
    }
    this.mobs.clear();
    for (const p of v.points) if (p.kind === 'mob') this.mobs.set(p.id, { x: p.x, y: p.y, ax: p.x, ay: p.y, ph: Math.random() * 6 });
    this.fogDirty = true;
  }
  // 开打时：以当前位置为圆心，把地图当战场的底
  stage(): BattleStage | undefined {
    const v = this.v;
    if (!v || !this.terrain) return undefined;
    const ox = v.E.px;
    const oy = v.E.py;
    const f = v.world.layer ? 0.7 : 0.45; // 战斗里一个单位 = 地图上多少
    return {
      draw: (ctx, w, h, camX, camY, _t, zoom) => {
        const z = zoom / f;
        ctx.fillStyle = '#e4eeea';
        ctx.fillRect(0, 0, w, h);
        this.drawTerrain(ctx, w, h, ox + camX * f, oy + camY * f, z);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(z, z);
        ctx.translate(-(ox + camX * f), -(oy + camY * f));
        for (const s of v.world.sites) if (!s.hidden && Math.hypot(s.x - ox, s.y - oy) < 900) this.drawSiteWorld(ctx, s, z);
        ctx.restore();
      },
    };
  }

  // ---------------- 输入 ----------------
  private onKey(e: KeyboardEvent, down: boolean) {
    if (!this.el.isConnected) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.modal-root.show, .battle-root.show')) return this.keys.clear();
    const k = e.key.toLowerCase();
    if (down) {
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.keys.add(k);
        this.target = null;
        e.preventDefault();
      } else if ((k === 'e' || k === ' ' || k === 'enter') && this.resolve) {
        const p = this.inRange()[0];
        if (p) {
          e.preventDefault();
          this.enter(p);
        }
      } else if (k === 'f') this.action('find');
      else if (k === 'm') this.action('full');
    } else this.keys.delete(k);
  }
  private onDown(e: PointerEvent) {
    if (this.joy) return;
    this.joy = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, t0: performance.now() };
  }
  private onMove(e: PointerEvent) {
    const j = this.joy;
    if (!j || e.pointerId !== j.id) return;
    j.x = e.clientX;
    j.y = e.clientY;
    if (!j.moved && Math.hypot(j.x - j.ox, j.y - j.oy) > 12) {
      j.moved = true;
      this.target = null;
      if (this.overview) this.overview = false;
    }
  }
  private onUp(e: PointerEvent) {
    const j = this.joy;
    if (!j || e.pointerId !== j.id) return;
    this.joy = null;
    if (j.moved) return;
    // 轻点：点到事件就走过去进去，点到空地就走到那儿
    const r = this.canvas.getBoundingClientRect();
    const sx = j.ox - r.left;
    const sy = j.oy - r.top;
    const wx = this.cam.x + (sx - r.width / 2) / this.cam.z;
    const wy = this.cam.y + (sy - r.height / 2) / this.cam.z;
    let best: ExplorePoint | null = null;
    let bd = 34 / this.cam.z;
    for (const p of this.visiblePoints()) {
      const d = Math.hypot(p.x - wx, p.y - (wy + 14 / this.cam.z));
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best) this.target = { x: best.x, y: best.y, id: best.id };
    else if (this.world) this.target = { x: Math.max(20, Math.min(this.world.w - 20, wx)), y: Math.max(20, Math.min(this.world.h - 20, wy)) };
    if (this.overview) this.overview = false;
  }
  private action(a: string) {
    if (!this.resolve || !this.v) return;
    if (a === 'full') {
      this.overview = !this.overview;
      return;
    }
    if (a === 'find') {
      const p = autoTarget(this.v, this.opts.tend());
      if (!p) return this.opts.flash(this.v.stopsLeft <= 0 ? '今年的心力已经用尽，四处走走或歇到岁末吧' : '眼下没有要紧的去处，去雾里找找');
      this.target = { x: p.x, y: p.y, id: p.id };
      this.overview = false;
      return;
    }
    if (a === 'rest') {
      if (performance.now() - this.restArmed > 3000) {
        this.restArmed = performance.now();
        const b = this.actions.querySelector<HTMLButtonElement>('[data-a="rest"]')!;
        b.textContent = '确定歇到岁末？';
        b.classList.add('armed');
        setTimeout(() => {
          b.textContent = '歇到岁末';
          b.classList.remove('armed');
        }, 3000);
        return;
      }
      this.done({ kind: 'end', rest: true });
    }
  }
  private enter(p: ExplorePoint) {
    if (!this.resolve || !this.v) return;
    if (p.kind === 'mark' && this.v.stopsLeft <= 0) return this.opts.flash('今年已经办了够多的事，心力不济了');
    this.done({ kind: 'enter', id: p.id });
  }
  private done(a: ExploreAction) {
    const r = this.resolve;
    if (!r) return;
    this.resolve = null;
    this.keys.clear();
    this.target = null;
    this.walking = false;
    this.idle();
    this.ctxKey = '';
    this.ctxBox.innerHTML = '';
    r(a);
  }

  // ---------------- 每帧 ----------------
  private frame(now: number) {
    this.raf = 0;
    if (!this.el.isConnected) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && !document.hidden) {
      this.t += dt;
      if (this.resolve) this.update(dt);
      this.draw();
      this.renderHud(false);
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private update(dt: number) {
    const v = this.v!;
    const E = v.E;
    const w = this.world!;
    let mx = 0;
    let my = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    const j = this.joy;
    if (j?.moved) {
      const dx = j.x - j.ox;
      const dy = j.y - j.oy;
      const l = Math.hypot(dx, dy);
      if (l > 8) {
        mx = dx / Math.max(l, 50);
        my = dy / Math.max(l, 50);
      }
    }
    const auto = this.opts.auto();
    if (!mx && !my && !this.target && auto && !j) {
      const p = autoTarget(v, this.opts.tend());
      if (!p) return this.done({ kind: 'end' });
      this.target = { x: p.x, y: p.y, id: p.id };
    }
    if (!mx && !my && this.target) {
      const dx = this.target.x - E.px;
      const dy = this.target.y - E.py;
      const l = Math.hypot(dx, dy);
      const id = this.target.id;
      const arriveAt = id ? REACH * 0.6 : 6;
      if (l <= arriveAt) {
        this.target = null;
        if (id) {
          const p = v.points.find((x) => x.id === id);
          if (p && !p.done) return this.enter(p);
        }
      } else {
        mx = dx / l;
        my = dy / l;
      }
    }
    const ml = Math.hypot(mx, my);
    this.walking = ml > 0.05;
    if (!this.walking) return;
    if (ml > 1) {
      mx /= ml;
      my /= ml;
    }
    const sp = v.speed * (auto ? 2.5 : 1);
    const nx = Math.max(16, Math.min(w.w - 16, E.px + mx * sp * dt));
    const ny = Math.max(16, Math.min(w.h - 16, E.py + my * sp * dt));
    const moved = Math.hypot(nx - E.px, ny - E.py);
    E.px = nx;
    E.py = ny;
    if (moved <= 0) return;
    E.day += (moved / v.speed) * DAYS_PER_SEC;
    if (reveal(E, w, E.px, E.py, v.reveal, 2)) this.fogDirty = true;
    this.trail.push({ x: E.px, y: E.py });
    if (this.trail.length > 14) this.trail.shift();
    // 妖兽：随时间游荡，看见你就追；撞上就开打
    const wdt = (moved / sp) * (auto ? 2.5 : 1);
    for (const p of v.points) {
      if (p.kind !== 'mob' || p.done) continue;
      const m = this.mobs.get(p.id)!;
      const d = Math.hypot(E.px - m.x, E.py - m.y);
      if (d < 230 && fogAt(E, w, m.x, m.y) === 2) {
        const s = v.speed * 0.55 * wdt;
        m.x += ((E.px - m.x) / d) * s;
        m.y += ((E.py - m.y) / d) * s;
      } else {
        m.ph += wdt * 0.8;
        m.x += (m.ax + Math.cos(m.ph) * 60 - m.x) * Math.min(1, wdt * 2);
        m.y += (m.ay + Math.sin(m.ph * 1.3) * 40 - m.y) * Math.min(1, wdt * 2);
      }
      p.x = m.x;
      p.y = m.y;
      if (d < 34) return this.done({ kind: 'enter', id: p.id });
    }
    // 隐秘之地：只有走到跟前才会发现
    for (const p of v.points) if (p.kind === 'secret' && !p.done && Math.hypot(p.x - E.px, p.y - E.py) < 70) return this.done({ kind: 'enter', id: p.id });
    if (E.day >= YEAR_DAYS) return this.done({ kind: 'end' });
  }

  // ---------------- 可见与可进 ----------------
  private visiblePoints(): ExplorePoint[] {
    const v = this.v;
    if (!v) return [];
    return v.points.filter((p) => {
      if (p.done || p.hidden) return false;
      const f = fogAt(v.E, v.world, p.x, p.y);
      if (p.kind === 'mob') return f === 2;
      return f >= 1 || (p.kind === 'mark' && p.story);
    });
  }
  private inRange(): ExplorePoint[] {
    const v = this.v;
    if (!v) return [];
    return this.visiblePoints()
      .filter((p) => p.kind !== 'mob' && Math.hypot(p.x - v.E.px, p.y - v.E.py) < REACH)
      .sort((a, b) => Math.hypot(a.x - v.E.px, a.y - v.E.py) - Math.hypot(b.x - v.E.px, b.y - v.E.py))
      .slice(0, matchMedia('(max-width: 760px)').matches ? 2 : 3);
  }

  // ---------------- HUD ----------------
  private renderHud(force: boolean) {
    const v = this.v;
    if (!v) return;
    const E = v.E;
    const day = Math.min(YEAR_DAYS, E.day);
    const mon = MONTHS[Math.min(11, Math.floor(day / 30))];
    const ratio = Math.round(exploredRatio(E) * 100);
    const span = v.step > 1 ? `<small>此行 ${v.step} 年</small>` : '';
    const left = v.stopsLeft > 0 ? `还能办 ${v.stopsLeft} 件事` : '心力已尽';
    const key = `${v.age}|${mon}|${Math.floor(day / 3)}|${ratio}|${v.stopsLeft}|${v.world.name}`;
    if (force || key !== this.hudKey) {
      this.hudKey = key;
      this.hudTop.innerHTML = `
        <div class="wm-year"><b>${cnAge(v.age)}岁</b><span>${mon}</span>${span}<i class="wm-bar"><em style="width:${(day / YEAR_DAYS) * 100}%"></em></i></div>
        <div class="wm-meta"><b>${esc(v.world.name)}</b><span>${LAYER_NAMES[v.world.layer]}</span><span>探明 ${ratio}%</span><span class="${v.stopsLeft > 0 ? '' : 'off'}">${left}</span></div>`;
      this.signEl.textContent = v.sign;
    }
    const near = this.resolve ? this.inRange() : [];
    const ck = near.map((p) => p.id).join(',') + '|' + v.stopsLeft + '|' + !!this.resolve;
    if (ck === this.ctxKey) return;
    this.ctxKey = ck;
    if (!near.length) {
      this.ctxBox.innerHTML = '';
      return;
    }
    this.ctxBox.innerHTML = near
      .map((p, i) => {
        const tag = p.kind === 'mark' && p.tag && p.tag !== '平' ? `<em class="wm-tag" style="--c:${TAG_COLOR[p.tag]}">${TAG_WORD[p.tag]}</em>` : '';
        const off = p.kind === 'mark' && v.stopsLeft <= 0;
        return `<button class="wm-go${off ? ' off' : ''}" data-i="${i}"><i style="--c:${p.kind === 'mark' ? TAG_COLOR[p.tag ?? '平'] : '#477c83'}">${esc(p.icon)}</i><span><b>${esc(p.name)}</b>${tag}<small>${esc(p.hint)}</small></span><u>${p.kind === 'mark' ? '进入' : '前往'}</u></button>`;
      })
      .join('');
    this.ctxBox.querySelectorAll<HTMLButtonElement>('.wm-go').forEach((b) => (b.onclick = () => this.enter(near[Number(b.dataset.i)])));
  }

  // ---------------- 画面 ----------------
  private baseZoom() {
    const r = this.canvas.getBoundingClientRect();
    const m = Math.min(r.width || 400, r.height || 400);
    const span = this.world?.layer ? 820 : 640;
    return Math.max(0.42, Math.min(1.0, m / span)) * this.zoomMul;
  }
  private resize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.canvas.style.width = r.width + 'px';
    this.canvas.style.height = r.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private draw() {
    const v = this.v;
    const w = this.world;
    if (!v || !w || !this.terrain) return;
    const ctx = this.ctx;
    const W = this.canvas.width / Math.min(2, window.devicePixelRatio || 1);
    const H = this.canvas.height / Math.min(2, window.devicePixelRatio || 1);
    // 镜头：跟着人走；全图时看整张
    let tz: number;
    let tx: number;
    let ty: number;
    if (this.overview) {
      tz = Math.min(W / w.w, H / w.h) * 0.94;
      tx = w.w / 2;
      ty = w.h / 2;
    } else {
      tz = this.baseZoom();
      tx = v.E.px;
      ty = v.E.py;
      const hw = W / 2 / tz;
      const hh = H / 2 / tz;
      tx = hw * 2 >= w.w ? w.w / 2 : Math.max(hw - 60, Math.min(w.w - hw + 60, tx));
      ty = hh * 2 >= w.h ? w.h / 2 : Math.max(hh - 60, Math.min(w.h - hh + 60, ty));
    }
    const k = 0.18;
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.z += (tz - this.cam.z) * k;
    const { x: cx, y: cy, z } = this.cam;
    ctx.fillStyle = '#e1ebe7';
    ctx.fillRect(0, 0, W, H);
    this.drawTerrain(ctx, W, H, cx, cy, z);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
    // 地点：有图或亲至才画
    const E = v.E;
    for (const s of w.sites) {
      if (s.hidden && !E.found.includes(s.id)) continue;
      if (fogAt(E, w, s.x, s.y) === 0) continue;
      this.drawSiteWorld(ctx, s, z);
    }
    // 走过的足迹（剑光）
    if (this.trail.length > 1 && v.inDao) {
      ctx.strokeStyle = 'rgba(127,224,255,0.35)';
      ctx.lineWidth = 6 / z;
      ctx.lineCap = 'round';
      ctx.beginPath();
      this.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.restore();

    // 迷雾
    this.drawFog(ctx, W, H, cx, cy, z);

    // 雾上的东西：事件标记、妖兽、自己（屏幕尺寸固定）
    const toS = (x: number, y: number) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z] as const;
    for (const s of w.sites) {
      if (s.hidden && !E.found.includes(s.id)) continue;
      if (fogAt(E, w, s.x, s.y) === 0) continue;
      const [sx, sy] = toS(s.x, s.y);
      if (sx < -80 || sy < -60 || sx > W + 80 || sy > H + 60) continue;
      this.label(ctx, s.name, sx, sy + 22, fogAt(E, w, s.x, s.y) === 2 ? 1 : 0.6, s.kind === 'base' ? C.cinnabar : C.ink, s.kind === 'base' || s.kind === 'sect' || s.kind === 'market' ? 14 : 12);
    }
    for (const p of v.points) {
      if (p.done || p.hidden || p.kind === 'base' || p.kind === 'market' || p.kind === 'peak') continue;
      const f = fogAt(E, w, p.x, p.y);
      const [sx, sy] = toS(p.x, p.y);
      if (sx < -40 || sy < -40 || sx > W + 40 || sy > H + 40) continue;
      if (p.kind === 'mob') {
        if (f === 2) this.drawMob(ctx, sx, sy, p.name);
        continue;
      }
      if (f >= 1) {
        // 落在地点上、又和地点同名的，不再重复写名字
        const site = p.site ? w.sites.find((x) => x.id === p.site) : undefined;
        const named = Math.hypot(p.x - E.px, p.y - E.py) < 420 && !this.overview && (!site || site.name !== p.name);
        this.drawMark(ctx, sx, sy, p, named);
      }
      else if (p.story) this.drawRumor(ctx, sx, sy);
    }
    if (this.target) {
      const [sx, sy] = toS(this.target.x, this.target.y);
      ctx.strokeStyle = 'rgba(56,110,104,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(sx, sy, 12 + Math.sin(this.t * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const [px, py] = toS(E.px, E.py);
    this.drawPlayer(ctx, px, py, v.inDao);
    // 摇杆
    const j = this.joy;
    if (j?.moved) {
      const r = this.canvas.getBoundingClientRect();
      const ox = j.ox - r.left;
      const oy = j.oy - r.top;
      const dx = j.x - j.ox;
      const dy = j.y - j.oy;
      const l = Math.min(50, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      ctx.fillStyle = 'rgba(250,251,246,0.45)';
      ctx.strokeStyle = 'rgba(56,110,104,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(56,110,104,0.6)';
      ctx.beginPath();
      ctx.arc(ox + Math.cos(a) * l, oy + Math.sin(a) * l, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, z: number) {
    const t = this.terrain!;
    const s = this.tscale;
    const w = this.world!;
    // 视野对应的世界范围
    const x0 = cx - W / 2 / z;
    const y0 = cy - H / 2 / z;
    const x1 = cx + W / 2 / z;
    const y1 = cy + H / 2 / z;
    const sx0 = Math.max(0, x0);
    const sy0 = Math.max(0, y0);
    const sx1 = Math.min(w.w, x1);
    const sy1 = Math.min(w.h, y1);
    if (sx1 <= sx0 || sy1 <= sy0) return;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(t, sx0 * s, sy0 * s, (sx1 - sx0) * s, (sy1 - sy0) * s, (sx0 - x0) * z, (sy0 - y0) * z, (sx1 - sx0) * z, (sy1 - sy0) * z);
  }

  private drawFog(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, z: number) {
    const v = this.v!;
    const w = this.world!;
    const sub = 2; // 每格再细分，雾边带点云絮
    if (this.fogDirty) {
      this.fogDirty = false;
      const fc = this.fogC;
      if (fc.width !== w.cols * sub || fc.height !== w.rows * sub) {
        fc.width = w.cols * sub;
        fc.height = w.rows * sub;
      }
      const g = fc.getContext('2d')!;
      const img = g.createImageData(fc.width, fc.height);
      const d = img.data;
      for (let y = 0; y < fc.height; y++) {
        for (let x = 0; x < fc.width; x++) {
          const f = v.E.fog[Math.floor(y / sub) * w.cols + Math.floor(x / sub)] ?? 0;
          const n = hash(x * 7919 + y * 104729 + w.seed);
          const a = f === 2 ? 0 : f === 1 ? 70 + n * 30 : 214 + n * 41;
          const i = (y * fc.width + x) * 4;
          d[i] = 243 - n * 8;
          d[i + 1] = 247 - n * 5;
          d[i + 2] = 245 - n * 4;
          d[i + 3] = a;
        }
      }
      g.putImageData(img, 0, 0);
    }
    const x0 = W / 2 + (0 - cx) * z;
    const y0 = H / 2 + (0 - cy) * z;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogC, x0, y0, w.cols * w.cell * z, w.rows * w.cell * z);
    // 地图之外：云海结界
    ctx.fillStyle = 'rgba(238,244,241,0.92)';
    const ww = w.w * z;
    const hh = w.h * z;
    if (x0 > 0) ctx.fillRect(0, 0, x0, H);
    if (y0 > 0) ctx.fillRect(0, 0, W, y0);
    if (x0 + ww < W) ctx.fillRect(x0 + ww, 0, W - x0 - ww, H);
    if (y0 + hh < H) ctx.fillRect(0, y0 + hh, W, H - y0 - hh);
    ctx.strokeStyle = 'rgba(43,93,102,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, ww, hh);
  }

  // ---------------- 地形底图（每张世界只画一次） ----------------
  private buildTerrain() {
    const w = this.world!;
    const s = w.layer ? 0.75 : 1;
    this.tscale = s;
    const c = document.createElement('canvas');
    c.width = Math.round(w.w * s);
    c.height = Math.round(w.h * s);
    const g = c.getContext('2d')!;
    g.scale(s, s);
    const r = mulberry(w.seed ^ 0x9e3779b9);
    // 纸面与淡彩晕染
    const bg = g.createLinearGradient(0, 0, 0, w.h);
    bg.addColorStop(0, '#eaf3ee');
    bg.addColorStop(1, '#e3eee7');
    g.fillStyle = bg;
    g.fillRect(0, 0, w.w, w.h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w.w;
      const y = r() * w.h;
      const rad = 120 + r() * 380;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const tint = r() < 0.5 ? '178,208,197' : '214,226,206';
      gr.addColorStop(0, `rgba(${tint},0.28)`);
      gr.addColorStop(1, `rgba(${tint},0)`);
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const k = w.layer ? 2 : 1;
    // 湖
    for (const l of w.lakes) {
      g.fillStyle = 'rgba(160,203,208,0.7)';
      g.strokeStyle = 'rgba(71,124,131,0.45)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(l.x - l.rx * 0.1, l.y - l.ry * 0.2 + i * 8 * k, l.rx * 0.45, l.ry * 0.12, 0, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
    }
    // 河
    for (const rv of w.rivers) {
      const path = () => {
        g.beginPath();
        rv.pts.forEach(([x, y], i) => {
          if (!i) return g.moveTo(x, y);
          const [px, py] = rv.pts[i - 1];
          g.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        });
      };
      g.lineCap = 'round';
      g.lineJoin = 'round';
      path();
      g.strokeStyle = 'rgba(71,124,131,0.4)';
      g.lineWidth = rv.w + 5;
      g.stroke();
      path();
      g.strokeStyle = '#b4d6da';
      g.lineWidth = rv.w;
      g.stroke();
      path();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = rv.w * 0.3;
      g.stroke();
    }
    // 路
    for (const rd of w.roads) {
      g.beginPath();
      rd.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokeStyle = 'rgba(176,152,108,0.32)';
      g.lineWidth = 9 * k;
      g.stroke();
      g.strokeStyle = 'rgba(140,113,66,0.45)';
      g.lineWidth = 1.6 * k;
      g.setLineDash([10 * k, 8 * k]);
      g.stroke();
      g.setLineDash([]);
    }
    // 林子：一簇簇小树
    const trees: { x: number; y: number; s: number; c: number }[] = [];
    for (const f of w.forests) {
      const n = Math.round((f.r * f.r) / (36 * 36 * k * k));
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * f.r;
        trees.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d * 0.8, s: (7 + r() * 6) * k, c: r() });
      }
    }
    trees.sort((a, b) => a.y - b.y);
    for (const t of trees) {
      g.strokeStyle = 'rgba(36,63,64,0.55)';
      g.lineWidth = 1.2 * k;
      g.beginPath();
      g.moveTo(t.x, t.y);
      g.lineTo(t.x, t.y - t.s * 1.2);
      g.stroke();
      g.fillStyle = t.c < 0.33 ? '#6f9d8f' : t.c < 0.66 ? '#5f8f86' : '#86ad9c';
      g.beginPath();
      g.arc(t.x, t.y - t.s * 1.3, t.s, 0, Math.PI * 2);
      g.arc(t.x - t.s * 0.6, t.y - t.s * 0.9, t.s * 0.7, 0, Math.PI * 2);
      g.arc(t.x + t.s * 0.6, t.y - t.s * 0.9, t.s * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    // 山：石绿受光、石青背光，深青勾线
    const peaks = w.peaks.slice().sort((a, b) => a.y - b.y);
    for (const p of peaks) {
      const { x, y, r: pr, h } = p;
      g.fillStyle = 'rgba(36,63,64,0.10)';
      g.beginPath();
      g.ellipse(x + pr * 0.15, y + 4, pr * 1.05, pr * 0.22, 0, 0, Math.PI * 2);
      g.fill();
      const tipX = x + (p.tone - 0.5) * pr * 0.5;
      const body = () => {
        g.beginPath();
        g.moveTo(x - pr, y);
        g.bezierCurveTo(x - pr * 0.75, y - h * 0.45, tipX - pr * 0.35, y - h * 0.95, tipX, y - h);
        g.bezierCurveTo(tipX + pr * 0.35, y - h * 0.95, x + pr * 0.7, y - h * 0.4, x + pr, y);
        g.closePath();
      };
      const gr = g.createLinearGradient(x - pr, y - h, x + pr, y);
      gr.addColorStop(0, '#c4dccf');
      gr.addColorStop(0.45, p.tone < 0.5 ? '#8fb7a8' : '#9cc0b0');
      gr.addColorStop(1, p.tone < 0.5 ? '#4f8380' : '#5d8f87');
      body();
      g.fillStyle = gr;
      g.fill();
      // 背光面压一层石青
      g.save();
      body();
      g.clip();
      g.fillStyle = 'rgba(71,124,131,0.35)';
      g.beginPath();
      g.moveTo(tipX, y - h);
      g.bezierCurveTo(tipX + pr * 0.1, y - h * 0.5, x + pr * 0.2, y - h * 0.2, x + pr * 0.3, y + 2);
      g.lineTo(x + pr * 1.1, y + 2);
      g.lineTo(x + pr * 1.1, y - h);
      g.closePath();
      g.fill();
      // 皴：几道短线
      g.strokeStyle = 'rgba(43,93,102,0.45)';
      g.lineWidth = 1.2 * k;
      for (let i = 0; i < 3; i++) {
        const sx = x - pr * 0.5 + r() * pr;
        const sy = y - h * (0.2 + r() * 0.5);
        g.beginPath();
        g.moveTo(sx, sy);
        g.quadraticCurveTo(sx + pr * 0.1, sy + h * 0.1, sx + pr * 0.05, sy + h * 0.22);
        g.stroke();
      }
      // 山脚薄雾
      const mist = g.createLinearGradient(0, y - h * 0.25, 0, y);
      mist.addColorStop(0, 'rgba(240,247,243,0)');
      mist.addColorStop(1, 'rgba(240,247,243,0.75)');
      g.fillStyle = mist;
      g.fillRect(x - pr * 1.2, y - h * 0.25, pr * 2.4, h * 0.25 + 2);
      g.restore();
      body();
      g.strokeStyle = 'rgba(43,93,102,0.6)';
      g.lineWidth = 1.6 * k;
      g.stroke();
    }
    this.terrain = c;
  }

  // ---------------- 小画 ----------------
  private drawSiteWorld(ctx: CanvasRenderingContext2D, s: Site, z: number) {
    const k = Math.max(0.7, Math.min(1.6, 1 / z)) * 1.05; // 缩小时地点不至于看不见
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(k, k);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = C.line;
    const roof = (x: number, y: number, w: number, col = '#4f7d78') => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.62, y);
      ctx.quadraticCurveTo(x, y - w * 0.45, x + w * 0.62, y);
      ctx.lineTo(x + w * 0.4, y - w * 0.22);
      ctx.lineTo(x - w * 0.4, y - w * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    const wall = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = '#fafbf6';
      ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.strokeRect(x - w / 2, y - h, w, h);
    };
    switch (s.look) {
      case 'house':
        wall(0, 6, 18, 10);
        roof(0, -4, 22);
        if (s.kind === 'base') {
          ctx.fillStyle = C.cinnabar;
          ctx.fillRect(-2, -1, 4, 7);
        }
        break;
      case 'town':
        ctx.strokeStyle = 'rgba(43,93,102,0.5)';
        ctx.strokeRect(-20, -14, 40, 24);
        ctx.strokeStyle = C.line;
        wall(-9, 6, 12, 9);
        roof(-9, -3, 15);
        wall(8, 6, 12, 11);
        roof(8, -5, 15, '#967b4b');
        break;
      case 'temple':
      case 'shrine':
        wall(0, 7, 14, 9);
        roof(0, -2, 22, s.look === 'temple' ? '#a45248' : '#4f7d78');
        roof(0, -9, 15, s.look === 'temple' ? '#a45248' : '#4f7d78');
        break;
      case 'pavilion':
        ctx.fillStyle = '#f4f1e6';
        ctx.fillRect(-18, 4, 36, 5);
        ctx.strokeRect(-18, 4, 36, 5);
        wall(0, 4, 20, 10);
        roof(0, -6, 30, '#967b4b');
        roof(0, -14, 18, '#967b4b');
        break;
      case 'cave':
        ctx.fillStyle = '#7fa498';
        ctx.beginPath();
        ctx.ellipse(0, 2, 20, 14, 0, Math.PI, 0);
        ctx.lineTo(20, 6);
        ctx.lineTo(-20, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(0, 6, 7, 9, 0, Math.PI, 0);
        ctx.fill();
        break;
      case 'dock':
        ctx.fillStyle = '#b0986c';
        ctx.fillRect(-14, 0, 22, 4);
        ctx.fillStyle = '#5c4a35';
        ctx.beginPath();
        ctx.moveTo(-2, 8);
        ctx.quadraticCurveTo(8, 14, 18, 8);
        ctx.closePath();
        ctx.fill();
        break;
      case 'gate':
        ctx.fillStyle = C.cinnabar;
        ctx.fillRect(-12, -10, 4, 18);
        ctx.fillRect(8, -10, 4, 18);
        ctx.fillRect(-16, -14, 32, 4);
        break;
      case 'dark': {
        const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
        gr.addColorStop(0, 'rgba(30,34,40,0.85)');
        gr.addColorStop(1, 'rgba(30,34,40,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.cinnabar;
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'peak':
        ctx.strokeStyle = C.ink;
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.lineTo(0, -14);
        ctx.stroke();
        ctx.fillStyle = C.cinnabar;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.quadraticCurveTo(7, -12 + Math.sin(this.t * 3) * 2, 13, -10);
        ctx.lineTo(0, -6);
        ctx.closePath();
        ctx.fill();
        break;
      case 'plot':
        ctx.fillStyle = 'rgba(134,173,156,0.6)';
        ctx.fillRect(-14, -8, 28, 16);
        ctx.strokeRect(-14, -8, 28, 16);
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(14, 0);
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 8);
        ctx.stroke();
        break;
      case 'road':
        wall(0, 6, 12, 8);
        roof(0, -2, 18, '#8a7a68');
        break;
      case 'secret':
        ctx.fillStyle = C.gold;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + this.t;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
    ctx.restore();
  }

  private label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha: number, color: string, px = 12) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = FONT(px);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(244,248,243,0.92)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, p: ExplorePoint, named: boolean) {
    const bob = Math.sin(this.t * 2.4 + x * 0.05) * 2.5;
    const cy = y - 30 + bob;
    const col = TAG_COLOR[p.tag ?? '平'];
    ctx.save();
    ctx.fillStyle = 'rgba(36,63,64,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, cy + 12);
    ctx.stroke();
    if (p.tag === '劫' || p.tag === '缘' || p.tag === '引' || p.tag === '故') {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.18 + Math.sin(this.t * 3) * 0.08;
      ctx.beginPath();
      ctx.arc(x, cy, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = '#fafbf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fafbf6';
    ctx.font = FONT(15, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.icon.slice(0, 1), x, cy + 1);
    if (p.tag && p.tag !== '平') {
      ctx.fillStyle = '#fafbf6';
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 12, cy - 11, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = FONT(10, 700);
      ctx.fillText(p.tag, x + 12, cy - 10.5);
    }
    ctx.restore();
    if (named) this.label(ctx, p.name, x, cy - 24, 0.95, col, 12);
  }
  private drawRumor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const cy = y - 18 + Math.sin(this.t * 2 + x) * 2;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgba(250,251,246,0.9)';
    ctx.strokeStyle = '#4a6a8a';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4a6a8a';
    ctx.font = FONT(14, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x, cy + 1);
    ctx.restore();
  }
  private drawMob(ctx: CanvasRenderingContext2D, x: number, y: number, name: string) {
    const t = this.t;
    ctx.save();
    ctx.fillStyle = 'rgba(164,82,72,0.16)';
    ctx.beginPath();
    ctx.arc(x, y, 24 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2a2c';
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 14, y + 6 + Math.sin(a) * 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e06a4a';
    ctx.beginPath();
    ctx.arc(x - 4, y - 2, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.label(ctx, name, x, y - 22, 0.95, C.cinnabar, 12);
  }
  private drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dao: boolean) {
    const t = this.t;
    const step = this.walking ? Math.sin(t * 12) * 1.6 : 0;
    ctx.save();
    ctx.translate(x, y);
    const aura = ctx.createRadialGradient(0, -6, 2, 0, -6, 30);
    aura.addColorStop(0, dao ? 'rgba(127,224,255,0.4)' : 'rgba(255,248,230,0.55)');
    aura.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -6, 30, 0, Math.PI * 2);
    ctx.fill();
    if (dao) {
      ctx.strokeStyle = 'rgba(127,224,255,0.55)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14, 6);
      ctx.lineTo(14, 5);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(36,63,64,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const lift = dao ? -4 + Math.sin(t * 2.5) * 1.5 : step * 0.4;
    ctx.translate(0, lift);
    ctx.fillStyle = '#fbfdff';
    ctx.strokeStyle = '#1f6f86';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.quadraticCurveTo(-10, 2, -7 + step, 4);
    ctx.lineTo(7 - step, 4);
    ctx.quadraticCurveTo(10, 2, 6, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -13, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0, -15, 4, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }
}
