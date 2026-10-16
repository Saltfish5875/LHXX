// 音效：全部用 WebAudio 现场合成，不带音频文件。古琴拨弦用 Karplus-Strong，钟磬用非整数倍泛音。
let ac: AudioContext | null = null;
let master: GainNode | null = null;
const KEY = 'lhxx.web.sound';
let on = (() => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
})();

export const soundOn = () => on;
export function setSound(v: boolean) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? 'on' : 'off');
  } catch {
    /* 隐私模式下存不了，忽略 */
  }
  if (v) unlock();
}

// 浏览器要求先有一次点按才能出声
export function unlock() {
  if (!on) return;
  if (!ac) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') void ac.resume();
}
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

function ready() {
  return on && ac && master && ac.state === 'running' ? ac : null;
}

const cache = new Map<string, AudioBuffer>();
function pluckBuffer(a: AudioContext, freq: number, dur: number, bright: number) {
  const k = `${Math.round(freq)}|${dur}|${bright}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const sr = a.sampleRate;
  const n = Math.floor(sr * dur);
  const buf = a.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  const p = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(p);
  for (let i = 0; i < p; i++) ring[i] = (Math.random() * 2 - 1) * (1 - i / p * (1 - bright));
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const nx = (idx + 1) % p;
    const v = (ring[idx] + ring[nx]) * 0.4985;
    d[i] = ring[idx];
    ring[idx] = v;
    idx = nx;
  }
  cache.set(k, buf);
  return buf;
}

function play(buf: AudioBuffer, vol: number, when = 0, rate = 1) {
  const a = ready();
  if (!a) return;
  const s = a.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = rate;
  const g = a.createGain();
  g.gain.value = vol;
  s.connect(g).connect(master!);
  s.start(a.currentTime + when);
}

function tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', when = 0, slideTo?: number) {
  const a = ready();
  if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master!);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol: number, freq: number, q = 1, when = 0) {
  const a = ready();
  if (!a) return;
  const t0 = a.currentTime + when;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(master!);
  s.start(t0);
}

// 五声音阶（宫商角徵羽），D 调
const PENTA = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0];

export const sfx = {
  // 拨一声琴：选卡、翻页
  pluck(step = Math.floor(Math.random() * 6), vol = 0.5) {
    const a = ready();
    if (!a) return;
    play(pluckBuffer(a, PENTA[Math.max(0, Math.min(PENTA.length - 1, step))], 1.6, 0.6), vol);
  },
  // 一串琴音：入世、展卷
  arpeggio(steps = [0, 2, 4, 5, 7], gap = 0.11, vol = 0.4) {
    const a = ready();
    if (!a) return;
    steps.forEach((s, i) => play(pluckBuffer(a, PENTA[s % PENTA.length] * (s >= PENTA.length ? 2 : 1), 2.2, 0.55), vol, i * gap));
  },
  // 木鱼：按钮
  tap() {
    tone(720, 0.09, 0.18, 'sine', 0, 520);
    noise(0.03, 0.08, 1800, 2);
  },
  // 磬：破境、天书
  bell(base = 523, vol = 0.22) {
    for (const [m, v, d] of [[1, 1, 3.2], [2.76, 0.45, 2], [5.4, 0.25, 1.2], [8.9, 0.12, 0.7]] as const) tone(base * m, d, vol * v);
  },
  // 鼓：劫难开场
  drum(vol = 0.5) {
    tone(110, 0.5, vol, 'sine', 0, 45);
    noise(0.18, vol * 0.4, 180, 0.8);
    tone(110, 0.5, vol * 0.7, 'sine', 0.32, 45);
    noise(0.18, vol * 0.3, 180, 0.8, 0.32);
  },
  // 锣：身死
  gong() {
    for (const [m, v] of [[1, 1], [1.48, 0.6], [2.03, 0.4], [2.9, 0.25]] as const) tone(98 * m, 4.5, 0.18 * v, 'sine', 0, 98 * m * 0.97);
    noise(0.6, 0.06, 400, 0.6);
  },
  // 风：转场
  whoosh(vol = 0.12) {
    noise(0.7, vol, 600, 0.4);
  },
  // 战斗里的剑鸣和受击（节流，避免满屏噪音）
  hit: throttle(() => noise(0.05, 0.08, 2600, 3), 70),
  hurt: throttle(() => tone(160, 0.18, 0.2, 'triangle', 0, 90), 220),
  kill: throttle(() => {
    const a = ready();
    if (!a) return;
    play(pluckBuffer(a, PENTA[5 + Math.floor(Math.random() * 4)], 0.6, 0.9), 0.12);
  }, 90),
  thunder() {
    noise(1.2, 0.35, 120, 0.5);
    noise(0.25, 0.25, 1400, 0.7);
  },
};

function throttle(f: () => void, ms: number) {
  let last = 0;
  return () => {
    const n = performance.now();
    if (n - last < ms) return;
    last = n;
    f();
  };
}
