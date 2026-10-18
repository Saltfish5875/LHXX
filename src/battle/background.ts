import { ERA_LOOK, rgba } from '../art/palette';
import { pillarPeak, cloudBank, rng } from '../art/scene';

// URL 由 Vite 加入构建清单，兼容 GitHub Pages 的仓库子路径。
const sources = {
  landscape: new URL('../art/backgrounds/celestial-landscape.webp', import.meta.url).href,
  portrait: new URL('../art/backgrounds/celestial-portrait.webp', import.meta.url).href,
};
const images = new Map<string, HTMLImageElement>();

function illustration(portrait: boolean) {
  const url = portrait ? sources.portrait : sources.landscape;
  let image = images.get(url);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.src = url;
    images.set(url, image);
  }
  return image;
}

/** 每场战斗持有自己的取景缓存；图片跨战斗复用，只请求当前朝向。 */
export class BattleBackdrop {
  private plate = document.createElement('canvas');
  private mist = document.createElement('canvas');
  private key = '';
  private ready: HTMLImageElement | null = null;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private look: typeof ERA_LOOK[string];
  private margin = 24;

  constructor(era: string) {
    this.look = ERA_LOOK[era] ?? ERA_LOOK.E1;
    this.mist.width = 512;
    this.mist.height = 128;
    const g = this.mist.getContext('2d')!;
    // 缓存柔边云丝，不在每帧创建滤镜或大面积渐变。
    g.scale(4, 1);
    const fog = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    fog.addColorStop(0, 'rgba(255,255,255,.65)');
    fog.addColorStop(.45, 'rgba(239,249,255,.3)');
    fog.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fog;
    g.fillRect(0, 0, 128, 128);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, t: number, kind: string) {
    if (w <= 0 || h <= 0) return;
    const image = illustration(h > w);
    if (image.complete && image.naturalWidth > 0) this.ready = image;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = `${w}|${h}|${dpr}|${this.ready?.src ?? 'fallback'}|${kind}`;
    if (key !== this.key) {
      this.key = key;
      this.compose(w, h, dpr, kind);
    }
    const still = this.motion.matches;
    // 预留四周出血并限制位移，走到战场边缘也不会露出底色。
    const dx = still ? 0 : Math.tanh(x / 650) * this.margin * .7;
    const dy = still ? 0 : Math.tanh(y / 650) * this.margin * .5;
    ctx.drawImage(this.plate, -this.margin - dx, -this.margin - dy, w + this.margin * 2, h + this.margin * 2);
    const clock = still ? 0 : t;
    for (let i = 0; i < 3; i++) {
      const drift = Math.sin(clock * .035 + i * 2.1) * w * .14;
      const cx = w * (.12 + i * .38) + drift - dx * 2;
      const cy = h * (.45 + i * .2) - dy * 2;
      ctx.drawImage(this.mist, cx - w * .34, cy, w * .68, Math.min(110, h * .13));
    }
  }

  private compose(w: number, h: number, dpr: number, kind: string) {
    const W = w + this.margin * 2, H = h + this.margin * 2;
    this.plate.width = Math.ceil(W * dpr);
    this.plate.height = Math.ceil(H * dpr);
    const g = this.plate.getContext('2d')!;
    g.scale(dpr, dpr);
    if (this.ready) {
      const scale = Math.max(W / this.ready.naturalWidth, H / this.ready.naturalHeight);
      const iw = this.ready.naturalWidth * scale, ih = this.ready.naturalHeight * scale;
      // 极宽屏靠上取景保留天宫；竖屏使用专门构图，不拉伸图片。
      g.drawImage(this.ready, (W - iw) / 2, (H - ih) * .22, iw, ih);
    } else {
      this.fallback(g, W, H);
    }
    // 年代仅轻染天色；中央保持明亮，墨色敌人和危险圈不被背景吞没。
    g.fillStyle = rgba(this.look.sky[0], this.look.night ? .1 : .035);
    g.fillRect(0, 0, W, H);
    const veil = g.createRadialGradient(W / 2, H * .56, 0, W / 2, H * .56, Math.max(W, H) * .52);
    veil.addColorStop(0, 'rgba(245,251,255,.22)');
    veil.addColorStop(.5, 'rgba(245,251,255,.08)');
    veil.addColorStop(1, 'rgba(245,251,255,0)');
    g.fillStyle = veil;
    g.fillRect(0, 0, W, H);
    if (kind === 'trial') {
      const storm = g.createLinearGradient(0, 0, 0, H * .55);
      storm.addColorStop(0, 'rgba(65,85,125,.22)');
      storm.addColorStop(1, 'rgba(65,85,125,0)');
      g.fillStyle = storm;
      g.fillRect(0, 0, W, H * .55);
    }
  }

  private fallback(g: CanvasRenderingContext2D, w: number, h: number) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#91cdee');
    sky.addColorStop(.48, '#e9f5fc');
    sky.addColorStop(1, '#f6fafb');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    const r = rng(137);
    for (let i = 0; i < 8; i++) {
      const x = w * (i / 7);
      const base = h * (.37 + r() * .12);
      pillarPeak(g, x, base, base - h * (.13 + r() * .15), w * (.035 + r() * .025), '#92bdd0', '#5d9bb4', .35, r, { pines: true, fall: true });
    }
    cloudBank(g, w, h * .42, h * .06, Math.min(w, h) / 600, r, false);
  }
}
