// 关键时刻的全屏演出：入世展卷、测灵根、入道、破境、劫难开场、身死、得天书。
// 演出排队播放；弹窗、去向卡、战斗都会先等演出放完。点按可跳过。
import { sfx } from './sound';

export type MomentKind = 'birth' | 'root' | 'dao' | 'realm' | 'battle' | 'death' | 'page' | 'win' | 'lose' | 'ending';

export interface Moment {
  kind: MomentKind;
  big: string; // 大字（毛笔）
  sub?: string; // 小标题
  line?: string; // 一句旁白
  seal?: string; // 朱砂印文
  dur?: number; // 毫秒
}

const root = document.createElement('div');
root.className = 'moment-root';
document.body.appendChild(root);

let queue: Moment[] = [];
let playing = false;
let idleWaiters: (() => void)[] = [];
let speed = 1;
export function setMomentSpeed(s: number) {
  speed = s;
}

export function moment(m: Moment) {
  queue.push(m);
  if (!playing) void run();
}

export function momentsIdle(): Promise<void> {
  if (!playing && !queue.length) return Promise.resolve();
  return new Promise((r) => idleWaiters.push(r));
}

const SOUND: Record<MomentKind, () => void> = {
  birth: () => sfx.arpeggio([0, 2, 4, 5, 7]),
  root: () => sfx.bell(659, 0.16),
  dao: () => sfx.arpeggio([2, 4, 5, 7, 9], 0.09),
  realm: () => {
    sfx.bell(440, 0.24);
    sfx.whoosh(0.1);
  },
  battle: () => sfx.drum(),
  death: () => sfx.gong(),
  page: () => sfx.bell(880, 0.14),
  win: () => sfx.arpeggio([4, 5, 7], 0.08, 0.3),
  lose: () => sfx.pluck(0, 0.5),
  ending: () => sfx.bell(330, 0.28),
};

const BASE_DUR: Record<MomentKind, number> = { birth: 2600, root: 1700, dao: 2000, realm: 2300, battle: 1500, death: 2800, page: 1600, win: 1100, lose: 1300, ending: 3000 };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function run() {
  playing = true;
  while (queue.length) {
    const m = queue.shift()!;
    await show(m);
  }
  playing = false;
  const ws = idleWaiters;
  idleWaiters = [];
  ws.forEach((w) => w());
}

function show(m: Moment): Promise<void> {
  return new Promise((resolve) => {
    const dur = Math.max(700, (m.dur ?? BASE_DUR[m.kind]) / speed);
    const el = document.createElement('div');
    el.className = `moment m-${m.kind}`;
    el.style.setProperty('--dur', `${dur}ms`);
    const chars = [...m.big].map((c, i) => `<span style="--i:${i}">${esc(c)}</span>`).join('');
    el.innerHTML = `
      <svg class="m-blot" viewBox="0 0 200 200" aria-hidden="true">
        <defs><filter id="inkbleed-${m.kind}"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="${Math.floor(Math.random() * 99)}"/><feDisplacementMap in="SourceGraphic" scale="34"/></filter></defs>
        <circle cx="100" cy="100" r="82" filter="url(#inkbleed-${m.kind})"/>
      </svg>
      <div class="m-rays"></div>
      <div class="m-body">
        ${m.sub ? `<div class="m-sub">${esc(m.sub)}</div>` : ''}
        <div class="m-big">${chars}</div>
        ${m.line ? `<div class="m-line">${esc(m.line)}</div>` : ''}
        ${m.seal ? `<div class="m-seal">${esc(m.seal)}</div>` : ''}
      </div>
      <div class="m-skip">点按跳过</div>`;
    root.appendChild(el);
    SOUND[m.kind]();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.add('out');
      setTimeout(() => {
        el.remove();
        resolve();
      }, 380);
    };
    const timer = setTimeout(finish, dur);
    el.addEventListener('pointerdown', () => {
      clearTimeout(timer);
      finish();
    });
  });
}
