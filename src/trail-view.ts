// 经历图谱：这一世经历过的事，按年岁排成一列；同一条线索占一条竖线，
// 前因后果用弧线连起来。没经历过的事不显示。点一件事看它的前因与后果。
import './trail.css';
import type { LifeState, MetaState, TrailKind, TrailLink, TrailNode } from './game/types';
import { TRAIL_KIND_NAMES, locName } from './game/trail';
import { cnAge } from './data/core';
import { ERA_BY_ID } from './data/faces';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const LANE_W = 13;
const LANE_MAX = 7;

// 线索的颜色（按种类）
const THREAD_TONE: Record<string, string> = { chain: 'teal', hook: 'gold', acq: 'purple', bond: 'red' };
const WHY_NAMES: Record<TrailLink['why'], string> = { 承: '承', 因: '因', 引发: '引发', 余波: '余波', 旧事: '旧事' };
const WHY_HINT: Record<TrailLink['why'], string> = {
  承: '同一段缘的上一拍',
  因: '前面留下的事让它出现',
  引发: '当场引出',
  余波: '几圈后兑现的余波',
  旧事: '旧事长成的后果格',
};

interface View {
  nodes: TrailNode[];
  life: number;
  era?: string;
  current: boolean;
}

const pref = { flavor: false };

export function openTrail(host: HTMLElement, M: MetaState, L: LifeState | null, close: () => void) {
  const views: View[] = [];
  if (L?.trail?.nodes.length) views.push({ nodes: L.trail.nodes, life: L.lifeNo, era: L.era, current: true });
  if (M.lastTrail && M.lastTrail.life !== L?.lifeNo) views.push({ nodes: M.lastTrail.nodes, life: M.lastTrail.life, era: M.lastTrail.era, current: false });
  let vi = 0;
  let sel: number | null = null;

  const render = () => {
    const v = views[vi];
    const tabs = views.length > 1 ? `<div class="tr-tabs">${views.map((x, i) => `<button class="btn ghost ${i === vi ? 'active' : ''}" data-tab="${i}">${x.current ? '此世' : '上一世'}（第 ${x.life} 世）</button>`).join('')}</div>` : '';
    if (!v) {
      host.innerHTML = `<h2>经历图谱</h2><p class="muted">还没有经历。走几步再来看。</p><div class="row"><button class="btn primary" data-close>关闭</button></div>`;
      (host.querySelector('[data-close]') as HTMLButtonElement).onclick = close;
      return;
    }
    const shown = visible(v.nodes);
    const sum = summary(v.nodes);
    host.innerHTML = `<h2>经历图谱 · 第 ${v.life} 世${v.era && ERA_BY_ID[v.era] ? ` · ${ERA_BY_ID[v.era].name}` : ''}</h2>
      ${tabs}
      <p class="muted tr-sum">${sum}</p>
      <div class="tr-bar">
        <label><input type="checkbox" data-flavor ${pref.flavor ? 'checked' : ''}>显示流水小事</label>
        <span class="tr-legend">${(['承', '因', '引发', '余波', '旧事'] as TrailLink['why'][]).map((w) => `<i class="lk lk-${w}" title="${WHY_HINT[w]}">${WHY_NAMES[w]}</i>`).join('')}</span>
      </div>
      <div class="tr-graph" data-graph></div>
      <div class="row"><button class="btn primary" data-close>合上</button></div>`;
    (host.querySelector('[data-close]') as HTMLButtonElement).onclick = close;
    host.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => (b.onclick = () => { vi = Number(b.dataset.tab); sel = null; render(); }));
    (host.querySelector('[data-flavor]') as HTMLInputElement).onchange = (e) => { pref.flavor = (e.target as HTMLInputElement).checked; render(); };
    drawGraph(host.querySelector('[data-graph]') as HTMLElement, shown, v.nodes, () => sel, (id) => { sel = sel === id ? null : id; mark(); });
    const mark = () => markSel(host, v.nodes, sel);
    mark();
    // 打开时停在最近的几件事
    if (v.current && sel == null) requestAnimationFrame(() => (host.scrollTop = host.scrollHeight));
  };
  render();
}

// 流水小事：没有连线的不显示（除非打开开关）
function visible(all: TrailNode[]): TrailNode[] {
  const linked = new Set<number>();
  for (const n of all) for (const l of n.links) { linked.add(l.from); linked.add(n.id); }
  return all.filter((n) => pref.flavor || n.kind !== 'flavor' || linked.has(n.id));
}

function summary(all: TrailNode[]): string {
  const c = (k: TrailKind) => all.filter((n) => n.kind === k).length;
  const threads = new Set(all.filter((n) => n.thread).map((n) => n.thread));
  const links = all.reduce((a, n) => a + n.links.length, 0);
  const last = all[all.length - 1];
  return `经历 ${all.length} 件（抉择 ${c('choice')}、劫难 ${c('battle')}），线索 ${threads.size} 条，因果 ${links} 处${last ? `；走到${cnAge(last.age)}岁` : ''}。`;
}

function laneOf(nodes: TrailNode[]): Map<number, number> {
  const out = new Map<number, number>();
  const lastIdx = new Map<string, number>();
  nodes.forEach((n, i) => n.thread && lastIdx.set(n.thread, i));
  const busy: (string | null)[] = [];
  const at = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (!n.thread) return out.set(n.id, 0);
    let lane = at.get(n.thread);
    if (lane == null) {
      lane = 1;
      while (lane < LANE_MAX && busy[lane]) lane++;
      busy[lane] = n.thread;
      at.set(n.thread, lane);
    }
    out.set(n.id, lane);
    if (lastIdx.get(n.thread) === i) {
      busy[lane] = null;
      at.delete(n.thread);
    }
  });
  return out;
}

const toneOf = (n: TrailNode) => (n.thread ? THREAD_TONE[n.kind] ?? (n.thread.startsWith('hook:') ? 'gold' : n.thread.startsWith('acq:') ? 'purple' : n.thread.startsWith('bond:') ? 'red' : 'teal') : n.kind === 'battle' ? 'ink' : n.kind === 'realm' || n.kind === 'birth' || n.kind === 'death' ? 'blue' : 'gray');

function chipTone(c: string) {
  if (c === '未战') return 'flat';
  if (/-\d|^败|伤 \+|断/.test(c)) return 'down';
  if (/^(入|得|灵宠|结为|收徒|新功法|了结|胜)|命灯/.test(c)) return 'gold';
  return 'up';
}

function cardHtml(n: TrailNode, all: TrailNode[]) {
  const tone = toneOf(n);
  const loc = locName(n.loc);
  const beat = n.beat ? `<em class="tr-beat t-${tone}">${esc(n.beat)}</em>` : '';
  const thread = n.threadName ? `<span class="tr-thread t-${tone}">${esc(n.threadName)}</span>` : '';
  const pick = n.pick ? `<div class="tr-pick">你选了「${esc(n.pick)}」</div>` : '';
  const chips = n.chips.length ? `<div class="tr-chips">${n.chips.map((c) => `<i class="${chipTone(c)}">${esc(c)}</i>`).join('')}</div>` : '';
  const causes = n.links.map((l) => {
    const s = all.find((x) => x.id === l.from);
    return s ? `<button class="tr-jump" data-jump="${s.id}"><i class="lk lk-${l.why}">${l.why}</i>${cnAge(s.age)}岁 · ${esc(s.title)}</button>` : '';
  }).join('');
  const effects = all.filter((x) => x.links.some((l) => l.from === n.id)).map((x) => {
    const l = x.links.find((y) => y.from === n.id)!;
    return `<button class="tr-jump" data-jump="${x.id}"><i class="lk lk-${l.why}">${l.why}</i>${cnAge(x.age)}岁 · ${esc(x.title)}</button>`;
  }).join('');
  const detail = `<div class="tr-detail">
      ${n.text ? `<p>${esc(n.text)}</p>` : ''}
      ${n.lines.length ? `<p class="tr-lines">${n.lines.map(esc).join('<br>')}</p>` : ''}
      ${causes ? `<div class="tr-rel"><b>前因</b>${causes}</div>` : ''}
      ${effects ? `<div class="tr-rel"><b>后果</b>${effects}</div>` : ''}
      ${!causes && !effects ? '<p class="muted">这件事和别的事没有牵连。</p>' : ''}
    </div>`;
  return `<button class="tr-card k-${n.kind}" data-node="${n.id}">
      <div class="tr-head"><span class="tr-kind t-${tone}">${TRAIL_KIND_NAMES[n.kind]}</span><b>${esc(n.title)}</b>${beat}${loc ? `<small>${esc(loc)}</small>` : ''}</div>
      ${thread}${pick}${chips}
    </button>${detail}`;
}

function drawGraph(el: HTMLElement, nodes: TrailNode[], all: TrailNode[], getSel: () => number | null, onPick: (id: number) => void) {
  const lanes = laneOf(nodes);
  const nLanes = Math.max(1, ...lanes.values()) + 1;
  const laneArea = nLanes * LANE_W + 24;
  el.style.setProperty('--lanes', `${laneArea}px`);
  let prevAge = -1;
  el.innerHTML = nodes
    .map((n) => {
      const age = n.age !== prevAge ? `<span class="tr-age">${n.age === 0 ? '出生' : `${cnAge(n.age)}岁`}</span>` : '';
      prevAge = n.age;
      return `<div class="tr-row" data-row="${n.id}"><div class="tr-body">${age}${cardHtml(n, all)}</div></div>`;
    })
    .join('') + '<svg class="tr-svg" aria-hidden="true"></svg>';
  el.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((b) => (b.onclick = () => onPick(Number(b.dataset.node))));
  el.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    const id = Number(b.dataset.jump);
    onPick(id);
    el.querySelector(`[data-row="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }));
  const paint = () => paintEdges(el, nodes, lanes, getSel());
  requestAnimationFrame(paint);
  (el as HTMLElement & { _paint?: () => void })._paint = paint;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => paint()).observe(el);
}

function paintEdges(el: HTMLElement, nodes: TrailNode[], lanes: Map<number, number>, sel: number | null) {
  const svg = el.querySelector('.tr-svg') as SVGSVGElement | null;
  if (!svg) return;
  const pos = new Map<number, { x: number; y: number }>();
  const base = el.getBoundingClientRect();
  for (const n of nodes) {
    const card = el.querySelector(`[data-node="${n.id}"]`) as HTMLElement | null;
    if (!card) continue;
    const r = card.getBoundingClientRect();
    pos.set(n.id, { x: 6 + (lanes.get(n.id) ?? 0) * LANE_W + LANE_W / 2, y: r.top - base.top + 17 });
  }
  const h = el.scrollHeight;
  svg.setAttribute('height', String(h));
  svg.setAttribute('width', String(parseFloat(getComputedStyle(el).getPropertyValue('--lanes')) || 120));
  const parts: string[] = [];
  // 主线：从出生到最后
  const main = nodes.filter((n) => (lanes.get(n.id) ?? 0) === 0);
  if (main.length > 1) {
    const a = pos.get(main[0].id)!;
    const b = pos.get(main[main.length - 1].id)!;
    parts.push(`<line class="e-main" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
  }
  const rel = (n: TrailNode, l: TrailLink) => sel != null && (n.id === sel || l.from === sel);
  for (const n of nodes) {
    const b = pos.get(n.id);
    if (!b) continue;
    for (const l of n.links) {
      const a = pos.get(l.from);
      if (!a) continue;
      const on = rel(n, l) ? ' on' : sel != null ? ' off' : '';
      if (l.why === '承' && a.x === b.x) {
        parts.push(`<line class="e e-承 t-${toneOf(n)}${on}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
        continue;
      }
      // 其余的连线向右鼓出一道弧，越远鼓得越多
      const bulge = Math.min(22, 8 + Math.abs(b.y - a.y) / 40);
      const cx = Math.max(a.x, b.x) + bulge;
      parts.push(`<path class="e e-${l.why}${on}" d="M${a.x} ${a.y} C${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}"/>`);
    }
  }
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const big = n.kind === 'realm' || n.kind === 'birth' || n.kind === 'death';
    const cls = `d t-${toneOf(n)}${sel === n.id ? ' sel' : ''}`;
    parts.push(n.kind === 'battle' ? `<rect class="${cls}" x="${p.x - 4}" y="${p.y - 4}" width="8" height="8" transform="rotate(45 ${p.x} ${p.y})"/>` : `<circle class="${cls}${n.kind === 'flavor' ? ' small' : ''}" cx="${p.x}" cy="${p.y}" r="${big ? 5.5 : n.kind === 'flavor' ? 2.5 : 4}"/>`);
  }
  svg.innerHTML = parts.join('');
}

function markSel(host: HTMLElement, all: TrailNode[], sel: number | null) {
  const graph = host.querySelector('[data-graph]') as (HTMLElement & { _paint?: () => void }) | null;
  if (!graph) return;
  const relIds = new Set<number>();
  if (sel != null) {
    relIds.add(sel);
    const n = all.find((x) => x.id === sel);
    n?.links.forEach((l) => relIds.add(l.from));
    all.forEach((x) => x.links.some((l) => l.from === sel) && relIds.add(x.id));
  }
  graph.classList.toggle('has-sel', sel != null);
  graph.querySelectorAll<HTMLElement>('[data-row]').forEach((r) => {
    const id = Number(r.dataset.row);
    r.classList.toggle('sel', id === sel);
    r.classList.toggle('rel', relIds.has(id) && id !== sel);
  });
  graph._paint?.();
}
