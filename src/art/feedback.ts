// 选择反馈：选中的去向卡 / 选项先「落印」，结果再在画卷上「落笔」——一句结果加一排得失小签。
import { sfx } from './sound';

export interface Chip {
  text: string;
  tone: 'up' | 'down' | 'gold' | 'neutral';
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 选中的去向卡：其余卡退下，这张卡上浮、盖一枚朱砂「定」字印
export async function stampCard(cards: HTMLButtonElement[], idx: number, fast: boolean) {
  cards.forEach((c, i) => {
    c.disabled = true;
    c.classList.add(i === idx ? 'chosen' : 'dismissed');
  });
  const chosen = cards[idx];
  if (chosen) {
    const s = document.createElement('i');
    s.className = 'pick-seal';
    s.textContent = '定';
    chosen.appendChild(s);
  }
  await wait(fast ? 160 : 520);
}

// 选中的选项：亮起、盖「择」字印，其余淡去
export async function stampOption(opts: HTMLElement[], idx: number, fast: boolean) {
  opts.forEach((o, i) => {
    (o as HTMLButtonElement).disabled = true;
    o.classList.add(i === idx ? 'chosen' : 'dismissed');
  });
  const chosen = opts[idx];
  if (chosen) {
    const s = document.createElement('i');
    s.className = 'pick-seal';
    s.textContent = '择';
    chosen.appendChild(s);
  }
  await wait(fast ? 120 : 380);
}

// 画卷翻到新地方：一道墨笔从左扫到右
export function sweep(host: HTMLElement) {
  host.classList.remove('sweep');
  void host.offsetWidth;
  host.classList.add('sweep');
}

let layer: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

// 在画卷上落一句结果和一排得失小签；下一次选择时自动收起
export function showOutcome(host: HTMLElement, caption: string | null, chips: Chip[], speed = 1) {
  if (!caption && !chips.length) return;
  clearOutcome();
  layer = document.createElement('div');
  layer.className = 'outcome';
  layer.innerHTML = `
    ${caption ? `<div class="oc-line">${esc(caption)}</div>` : ''}
    ${chips.length ? `<div class="oc-chips">${chips.map((c, i) => `<span class="oc-chip ${c.tone}" style="--i:${i}">${esc(c.text)}</span>`).join('')}</div>` : ''}`;
  host.appendChild(layer);
  const gain = chips.some((c) => c.tone === 'up' || c.tone === 'gold');
  const loss = chips.some((c) => c.tone === 'down');
  if (gain && !loss) sfx.arpeggio([4, 7], 0.07, 0.25);
  else if (loss && !gain) sfx.pluck(-3, 0.4);
  else if (chips.length) sfx.pluck(2, 0.3);
  hideTimer = setTimeout(clearOutcome, Math.max(1600, 3600 / speed));
}

export function clearOutcome() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  if (!layer) return;
  const el = layer;
  layer = null;
  el.classList.add('out');
  setTimeout(() => el.remove(), 320);
}

// ---------- 结果动效：东西飞进行囊、受伤闪红、修为推进、结识的人进角色栏 ----------
const visible = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) ?? null;
const pulse = (el: HTMLElement | null, cls = 'fx-pulse', ms = 900) => {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
};

interface Flight {
  chip: Chip;
  to: string; // 目标选择器（取第一个看得见的）
}
function flightsOf(chips: Chip[]): Flight[] {
  const out: Flight[] = [];
  for (const c of chips) {
    const t = c.text;
    if (c.tone === 'gold' && /法宝|功法|习得|附诀|残页|层|圆满/.test(t)) out.push({ chip: c, to: '.bag-top-btn' });
    else if (/道侣|灵宠|故人|收徒|得「|缘/.test(t)) out.push({ chip: c, to: '[data-open="panel"], #panel .seal' });
    else if (/^(灵石|银两) \+/.test(t)) out.push({ chip: c, to: '#mstatus .ms-seal, #panel .p-grid' });
  }
  return out.slice(0, 3);
}

export function playResult(chips: Chip[], from: DOMRect | null, fallback: HTMLElement, speed = 1) {
  if (!chips.length) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const hurt = chips.some((c) => /^气血 -|^暗伤 \+|受伤/.test(c.text));
  const grow = chips.some((c) => /^修为 \+|^修为精进/.test(c.text));
  const dur = Math.max(260, 900 / speed);
  if (hurt) {
    document.body.classList.remove('fx-hurt');
    void document.body.offsetWidth;
    document.body.classList.add('fx-hurt');
    setTimeout(() => document.body.classList.remove('fx-hurt'), 800);
    pulse(visible('#mstatus .bar.hp, #panel .bar.hp'), 'fx-drop', 900);
  }
  if (grow) setTimeout(() => pulse(visible('#mstatus .bar.xp, #panel .bar.xp'), 'fx-glow', 1300), dur * 0.6);
  if (reduce) return;
  const src = from ?? fallback.getBoundingClientRect();
  flightsOf(chips).forEach((f, i) => {
    const target = visible(f.to);
    if (!target) return;
    const to = target.getBoundingClientRect();
    const tok = document.createElement('div');
    tok.className = `fly-tok ${f.chip.tone}`;
    tok.textContent = f.chip.text;
    document.body.appendChild(tok);
    const x0 = src.left + src.width / 2;
    const y0 = src.top + src.height / 2;
    const x1 = to.left + to.width / 2;
    const y1 = to.top + to.height / 2;
    const mx = (x0 + x1) / 2 + (x1 > x0 ? -40 : 40);
    const my = Math.min(y0, y1) - 70;
    const anim = tok.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) translate(-50%, -50%) scale(0.6)`, opacity: 0 },
        { transform: `translate(${x0}px, ${y0 - 18}px) translate(-50%, -50%) scale(1.1)`, opacity: 1, offset: 0.22 },
        { transform: `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(0.95)`, opacity: 1, offset: 0.62 },
        { transform: `translate(${x1}px, ${y1}px) translate(-50%, -50%) scale(0.35)`, opacity: 0.2 },
      ],
      { duration: dur * 1.3, delay: 260 / speed + i * 140, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'both' },
    );
    anim.onfinish = () => {
      tok.remove();
      pulse(target);
    };
  });
}
