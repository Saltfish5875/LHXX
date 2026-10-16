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
