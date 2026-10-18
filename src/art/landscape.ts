// 共用青绿山水底画：与战斗同源，横幅、事件与轮回井各自按比例取景。
import { C, rgba, type EraLook } from './palette';

let painting: HTMLImageElement | null = null;
let loading: Promise<void> | null = null;

export function loadLandscape(): Promise<void> {
  if (!loading) loading = new Promise((resolve) => {
    painting = new Image();
    painting.decoding = 'async';
    painting.onload = () => resolve();
    painting.onerror = () => resolve();
    painting.src = new URL('./backgrounds/celestial-landscape.webp', import.meta.url).href;
  });
  return loading;
}

export function paintLandscape(g: CanvasRenderingContext2D, w: number, h: number, look: EraLook, quiet = false) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#c7dfe0');
  sky.addColorStop(1, '#eef6f1');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  if (painting?.complete && painting.naturalWidth) {
    const scale = Math.max(w / painting.naturalWidth, h / painting.naturalHeight);
    const iw = painting.naturalWidth * scale, ih = painting.naturalHeight * scale;
    g.drawImage(painting, (w - iw) / 2, (h - ih) * .16, iw, ih);
  } else {
    // 图片缺失仍保留淡彩层山，不阻塞人生流程。
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = ['#bed8d7', '#a4c7c5', '#8db7b4'][layer];
      g.beginPath();
      g.moveTo(0, h);
      for (let i = 0; i <= 8; i++) {
        const x = i * w / 8;
        const y = h * (.48 + layer * .12 - Math.sin(i * 2.3 + layer) * .16);
        g.quadraticCurveTo(x - w / 16, y - h * .18, x, y);
      }
      g.lineTo(w, h); g.closePath(); g.fill();
    }
  }
  g.fillStyle = rgba(look.sky[0], look.night ? .16 : .06);
  g.fillRect(0, 0, w, h);
  const mist = g.createLinearGradient(0, h * .15, 0, h);
  mist.addColorStop(0, 'rgba(237,245,239,0)');
  mist.addColorStop(.65, 'rgba(237,245,239,.4)');
  mist.addColorStop(1, 'rgba(237,245,239,.94)');
  g.fillStyle = mist;
  g.fillRect(0, 0, w, h);
  if (quiet) {
    g.fillStyle = rgba(C.ink, .12);
    g.fillRect(0, 0, w, h);
  }
}
