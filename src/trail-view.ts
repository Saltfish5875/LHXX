// 经历图谱：经历过的事按年岁排成一列；同一条线索占一条竖线，前因后果用弧线连起来。
// 没经历过的事不显示。点一件事看它的前因与后果。
// 「此世」「前世」看一世的全部经历；「轮回」把最近几世接成一卷，只留跨世的牵连和生死大事。
// 图谱是独立浮层：结算弹窗开着时也能打开（墓志铭里的「复盘此生」）。
import './trail.css';
import type { LifeState, MetaState, TrailKind, TrailLink, TrailNode } from './game/types';
import { CROSS_THREAD, TRAIL_KIND_NAMES, locName, trailMigrate } from './game/trail';
import { cnAge } from './data/core';
import { ERA_BY_ID } from './data/faces';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const LANE_W = 13;
const LANE_MAX = 7;
const WHYS: TrailLink['why'][] = ['承', '因', '引发', '余波', '旧事', '前世'];
const WHY_HINT: Record<TrailLink['why'], string> = {
  承: '同一段缘的上一拍',
  因: '前面留下的事让它出现',
  引发: '当场引出',
  余波: '几圈后兑现的余波',
  旧事: '旧事长成的后果格',
  前世: '前世留下、这一世回来的牵连',
};

interface Life {
  life: number;
  era?: string;
  age?: number;
  end?: string;
  nodes: TrailNode[];
  current: boolean;
}
interface V {
  n: TrailNode;
  life: number;
  key: string;
}
type Row = V | { head: Life };
interface Edge {
  from: string;
  to: string;
  why: TrailLink['why'];
}
type Effects = Map<string, { key: string; why: TrailLink['why'] }[]>;

const keyOf = (life: number, id: number) => `${life}:${id}`;
const srcKey = (life: number, l: TrailLink) => keyOf(l.life ?? life, l.from);
const pref = { flavor: false, sagaAll: false };

let root: HTMLElement | null = null;
let ctx: { all: Map<string, V>; effects: Effects; openLife: (life: number) => void } | null = null;

export function closeTrail() {
  root?.remove();
  root = null;
}
export const trailShown = () => !!root;

export function openTrail(M: MetaState, L: LifeState | null, opt: { mode?: 'life' | 'saga'; fromTop?: boolean } = {}) {
  closeTrail();
  trailMigrate(M);
  const lives: Life[] = [];
  if (L?.trail?.nodes.length) lives.push({ life: L.lifeNo, era: L.era, age: L.age, end: L.deathCause ?? undefined, nodes: L.trail.nodes, current: true });
  for (const p of M.pastTrails ?? []) if (p.life !== L?.lifeNo) lives.push({ ...p, current: false });
  const byLife = new Map(lives.map((x) => [x.life, x]));
  const all = new Map<string, V>();
  for (const lf of lives) for (const n of lf.nodes) all.set(keyOf(lf.life, n.id), { n, life: lf.life, key: keyOf(lf.life, n.id) });
  // 每件事被哪些事连着（本世的、后世的都算）
  const effects: Effects = new Map();
  const crossKeys = new Set<string>();
  for (const v of all.values())
    for (const l of v.n.links) {
      const k = srcKey(v.life, l);
      if (!effects.has(k)) effects.set(k, []);
      effects.get(k)!.push({ key: v.key, why: l.why });
      if (l.life != null && l.life !== v.life) {
        crossKeys.add(v.key);
        crossKeys.add(k);
      }
    }

  root = document.createElement('div');
  root.className = 'trail-root';
  root.innerHTML = `<div class="modal trail"><div class="modal-box"></div></div>`;
  document.body.appendChild(root);
  const host = root.querySelector('.modal-box') as HTMLElement;
  root.querySelector('.modal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTrail();
  });

  let mode: 'life' | 'saga' = opt.mode ?? 'life';
  let lifeNo = lives[0]?.life ?? 0;
  let sel: string | null = null;

  const linkedIn = (lf: Life) => new Set(lf.nodes.filter((n) => n.links.length || effects.has(keyOf(lf.life, n.id))).map((n) => keyOf(lf.life, n.id)));
  const lifeRows = (lf: Life): V[] => {
    const linked = linkedIn(lf);
    return lf.nodes.map((n) => all.get(keyOf(lf.life, n.id))!).filter((v) => pref.flavor || v.n.kind !== 'flavor' || linked.has(v.key));
  };
  const KEEP: TrailKind[] = ['birth', 'death', 'bond', 'acq'];
  const sagaRows = (): Row[] => {
    const out: Row[] = [];
    for (const lf of [...lives].sort((a, b) => a.life - b.life)) {
      out.push({ head: lf });
      out.push(...(pref.sagaAll ? lifeRows(lf) : lf.nodes.map((n) => all.get(keyOf(lf.life, n.id))!).filter((v) => KEEP.includes(v.n.kind) || crossKeys.has(v.key))));
    }
    return out;
  };
  const summary = (lf: Life) => {
    const c = (k: TrailKind) => lf.nodes.filter((n) => n.kind === k).length;
    const threads = new Set(lf.nodes.filter((n) => n.thread).map((n) => n.thread));
    const links = lf.nodes.reduce((a, n) => a + n.links.length, 0);
    const cross = lf.nodes.filter((n) => crossKeys.has(keyOf(lf.life, n.id))).length;
    const last = lf.nodes[lf.nodes.length - 1];
    return `经历 ${lf.nodes.length} 件（抉择 ${c('choice')}、劫难 ${c('battle')}），线索 ${threads.size} 条，因果 ${links} 处${cross ? `，与别的世相牵 ${cross} 件` : ''}${last ? `；${lf.end ? '终于' : '走到'}${cnAge(last.age)}岁` : ''}。`;
  };
  const sagaSummary = () => {
    let cross = 0;
    for (const v of all.values()) cross += v.n.links.filter((l) => l.life != null && l.life !== v.life).length;
    return `最近 ${lives.length} 世，跨世牵连 ${cross} 处。点一世的标题，看那一世的全部经历。`;
  };

  const render = (scrollTo?: string) => {
    if (!lives.length) {
      host.innerHTML = `<h2>经历图谱</h2><p class="muted">还没有经历。走几步再来看。</p><div class="row"><button class="btn primary" data-close>合上</button></div>`;
      (host.querySelector('[data-close]') as HTMLButtonElement).onclick = closeTrail;
      return;
    }
    const lf = byLife.get(lifeNo) ?? lives[0];
    const cur = lives[0].current ? lives[0] : null;
    const past = lives.filter((x) => !x.current);
    const onPast = mode === 'life' && !lf.current;
    const tabs = `<div class="tr-tabs">
        ${cur ? `<button class="btn ghost ${mode === 'life' && lf.current ? 'active' : ''}" data-life="${cur.life}">此世</button>` : ''}
        ${past.length ? `<select class="tr-pick-life ${onPast ? 'active' : ''}" data-past>${onPast ? '' : '<option value="">前世…</option>'}${past.map((x) => `<option value="${x.life}" ${onPast && x.life === lf.life ? 'selected' : ''}>第 ${x.life} 世${x.end ? ` · ${esc(x.end)}` : ''}</option>`).join('')}</select>` : ''}
        ${lives.length > 1 ? `<button class="btn ghost ${mode === 'saga' ? 'active' : ''}" data-saga>轮回</button>` : ''}
      </div>`;
    const rows: Row[] = mode === 'saga' ? sagaRows() : lifeRows(lf);
    const title = mode === 'saga' ? `经历图谱 · 轮回 ${lives.length} 世` : `经历图谱 · ${lf.current ? '此世' : `第 ${lf.life} 世`}${lf.era && ERA_BY_ID[lf.era] ? ` · ${ERA_BY_ID[lf.era].name}` : ''}`;
    const toggle = mode === 'saga'
      ? `<label><input type="checkbox" data-all ${pref.sagaAll ? 'checked' : ''}>每世全部经历</label>`
      : `<label><input type="checkbox" data-flavor ${pref.flavor ? 'checked' : ''}>显示流水小事</label>`;
    host.innerHTML = `<h2>${title}</h2>${tabs}
      <p class="muted tr-sum">${mode === 'saga' ? sagaSummary() : summary(lf)}</p>
      <div class="tr-bar">${toggle}<span class="tr-legend">${WHYS.filter((w) => w !== '前世' || crossKeys.size).map((w) => `<i class="lk lk-${w}" title="${WHY_HINT[w]}">${w}</i>`).join('')}</span></div>
      <div class="tr-graph" data-graph></div>
      <div class="row tr-foot"><button class="btn primary" data-close>合上</button></div>`;
    (host.querySelector('[data-close]') as HTMLButtonElement).onclick = closeTrail;
    host.querySelectorAll<HTMLButtonElement>('[data-life]').forEach((b) => (b.onclick = () => { mode = 'life'; lifeNo = Number(b.dataset.life); sel = null; render(); }));
    const ps = host.querySelector<HTMLSelectElement>('[data-past]');
    if (ps) ps.onchange = () => { if (!ps.value) return; mode = 'life'; lifeNo = Number(ps.value); sel = null; render('top'); };
    host.querySelector<HTMLButtonElement>('[data-saga]')?.addEventListener('click', () => { mode = 'saga'; sel = null; render(); });
    host.querySelector<HTMLInputElement>('[data-flavor]')?.addEventListener('change', (e) => { pref.flavor = (e.target as HTMLInputElement).checked; render(); });
    host.querySelector<HTMLInputElement>('[data-all]')?.addEventListener('change', (e) => { pref.sagaAll = (e.target as HTMLInputElement).checked; render(); });
    const graph = host.querySelector('[data-graph]') as HTMLElement & { _paint?: () => void };
    drawGraph(graph, rows, mode, () => sel, (k) => { sel = sel === k ? null : k; markSel(graph, sel, all, effects); }, jump);
    markSel(graph, sel, all, effects);
    requestAnimationFrame(() => {
      const row = scrollTo && scrollTo !== 'top' ? graph.querySelector(`[data-row="${scrollTo}"]`) : null;
      if (row) row.scrollIntoView({ block: 'center' });
      else if (scrollTo === 'top') host.scrollTop = 0;
      else host.scrollTop = host.scrollHeight; // 默认停在最近的事
    });
  };

  // 跳到另一件事：不在眼前就切到它那一世
  const jump = (k: string) => {
    const v = all.get(k);
    if (!v) return;
    sel = k;
    if (!host.querySelector(`[data-row="${k}"]`)) {
      mode = 'life';
      lifeNo = v.life;
    }
    render(k);
  };

  ctx = { all, effects, openLife: (life) => { mode = 'life'; lifeNo = life; sel = null; render('top'); } };
  render(opt.fromTop ? 'top' : undefined);
}

// 线索的颜色（按种类）
const toneOf = (n: TrailNode) => {
  if (n.thread) {
    if (n.thread.startsWith('hook:')) return 'gold';
    if (n.thread.startsWith('acq:')) return 'purple';
    if (n.thread.startsWith('bond:')) return 'red';
    if (n.thread.startsWith('legacy:')) return 'brown';
    return 'teal';
  }
  if (n.kind === 'battle') return 'ink';
  if (n.kind === 'realm' || n.kind === 'birth' || n.kind === 'death') return 'blue';
  if (n.kind === 'hold' || n.kind === 'ruin') return 'brown';
  return 'gray';
};

function chipTone(c: string) {
  if (c === '未战') return 'flat';
  if (/-\d|^败|伤 \+|断/.test(c)) return 'down';
  if (/^(入|得|灵宠|结为|收徒|新功法|了结|胜)|命灯/.test(c)) return 'gold';
  return 'up';
}

function relButton(k: string, why: TrailLink['why'], here: number) {
  const v = ctx?.all.get(k);
  const life = Number(k.split(':')[0]);
  if (!v) return `<span class="tr-jump gone"><i class="lk lk-${why}">${why}</i>第 ${life} 世（已散佚）</span>`;
  return `<button class="tr-jump" data-jump="${k}"><i class="lk lk-${why}">${why}</i>${life !== here ? `第 ${life} 世 · ` : ''}${cnAge(v.n.age)}岁 · ${esc(v.n.title)}</button>`;
}

function cardHtml(v: V) {
  const n = v.n;
  const tone = toneOf(n);
  const loc = locName(n.loc);
  const beat = n.beat ? `<em class="tr-beat t-${tone}">${esc(n.beat)}</em>` : '';
  const thread = n.threadName ? `<span class="tr-thread t-${tone}">${esc(n.threadName)}</span>` : '';
  const outs = ctx?.effects.get(v.key) ?? [];
  const crossIn = n.links.some((l) => l.life != null && l.life !== v.life);
  const crossOut = outs.some((e) => !e.key.startsWith(`${v.life}:`));
  const badge = crossIn ? '<em class="tr-cross">前世牵连</em>' : crossOut ? '<em class="tr-cross">留给后世</em>' : '';
  const pick = n.pick ? `<div class="tr-pick">你选了「${esc(n.pick)}」</div>` : '';
  const chips = n.chips.length ? `<div class="tr-chips">${n.chips.map((c) => `<i class="${chipTone(c)}">${esc(c)}</i>`).join('')}</div>` : '';
  const causes = n.links.map((l) => relButton(srcKey(v.life, l), l.why, v.life)).join('');
  const effs = outs.map((e) => relButton(e.key, e.why, v.life)).join('');
  const detail = `<div class="tr-detail">
      ${n.text ? `<p>${esc(n.text)}</p>` : ''}
      ${n.lines.length ? `<p class="tr-lines">${n.lines.map(esc).join('<br>')}</p>` : ''}
      ${causes ? `<div class="tr-rel"><b>前因</b>${causes}</div>` : ''}
      ${effs ? `<div class="tr-rel"><b>后果</b>${effs}</div>` : ''}
      ${!causes && !effs ? '<p class="muted">这件事和别的事没有牵连。</p>' : ''}
    </div>`;
  return `<button class="tr-card k-${n.kind}" data-node="${v.key}">
      <div class="tr-head"><span class="tr-kind t-${tone}">${TRAIL_KIND_NAMES[n.kind]}</span><b>${esc(n.title)}</b>${beat}${loc ? `<small>${esc(loc)}</small>` : ''}${badge}</div>
      ${thread}${pick}${chips}
    </button>${detail}`;
}

function laneOf(rows: V[], mode: 'life' | 'saga'): Map<string, number> {
  // 轮回长卷里，只有跨世的线索（伙伴、故人、遗泽）连成一条；其余线索每世各算各的
  const tk = (v: V) => (v.n.thread ? (mode === 'saga' && !CROSS_THREAD.test(v.n.thread) ? `${v.life}:${v.n.thread}` : v.n.thread) : null);
  const out = new Map<string, number>();
  const lastIdx = new Map<string, number>();
  rows.forEach((v, i) => {
    const t = tk(v);
    if (t) lastIdx.set(t, i);
  });
  const busy: (string | null)[] = [];
  const at = new Map<string, number>();
  rows.forEach((v, i) => {
    const t = tk(v);
    if (!t) return out.set(v.key, 0);
    let lane = at.get(t);
    if (lane == null) {
      lane = 1;
      while (lane < LANE_MAX && busy[lane]) lane++;
      busy[lane] = t;
      at.set(t, lane);
    }
    out.set(v.key, lane);
    if (lastIdx.get(t) === i) {
      busy[lane] = null;
      at.delete(t);
    }
  });
  return out;
}

function drawGraph(el: HTMLElement & { _paint?: () => void }, rows: Row[], mode: 'life' | 'saga', getSel: () => string | null, onPick: (k: string) => void, jump: (k: string) => void) {
  const nodes = rows.filter((r): r is V => 'n' in r);
  const lanes = laneOf(nodes, mode);
  const nLanes = Math.max(1, ...lanes.values()) + 1;
  el.style.setProperty('--lanes', `${nLanes * LANE_W + 24}px`);
  let prevAge = -1;
  el.innerHTML =
    rows
      .map((r) => {
        if ('head' in r) {
          prevAge = -1;
          const lf = r.head;
          return `<div class="tr-life"><button class="btn ghost" data-open-life="${lf.life}">${lf.current ? `此世（第 ${lf.life} 世）` : `第 ${lf.life} 世`}${lf.era && ERA_BY_ID[lf.era] ? ` · ${ERA_BY_ID[lf.era].name}` : ''}${lf.end ? ` · ${esc(lf.end)}` : ''}${lf.age != null ? ` · ${cnAge(lf.age)}岁` : ''}</button></div>`;
        }
        const age = r.n.age !== prevAge ? `<span class="tr-age">${r.n.age === 0 ? '出生' : `${cnAge(r.n.age)}岁`}</span>` : '';
        prevAge = r.n.age;
        return `<div class="tr-row" data-row="${r.key}"><div class="tr-body">${age}${cardHtml(r)}</div></div>`;
      })
      .join('') + '<svg class="tr-svg" aria-hidden="true"></svg>';
  el.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((b) => (b.onclick = () => onPick(b.dataset.node!)));
  el.querySelectorAll<HTMLButtonElement>('[data-open-life]').forEach((b) => (b.onclick = () => ctx?.openLife(Number(b.dataset.openLife))));
  el.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        const k = b.dataset.jump!;
        const row = el.querySelector(`[data-row="${k}"]`);
        if (!row) return jump(k);
        if (getSel() !== k) onPick(k);
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }),
  );
  const edges: Edge[] = [];
  for (const v of nodes) for (const l of v.n.links) edges.push({ from: srcKey(v.life, l), to: v.key, why: l.why });
  const paint = () => paintEdges(el, nodes, lanes, edges, getSel());
  requestAnimationFrame(paint);
  el._paint = paint;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => paint()).observe(el);
}

function paintEdges(el: HTMLElement, nodes: V[], lanes: Map<string, number>, edges: Edge[], sel: string | null) {
  const svg = el.querySelector('.tr-svg') as SVGSVGElement | null;
  if (!svg) return;
  const pos = new Map<string, { x: number; y: number }>();
  const base = el.getBoundingClientRect();
  for (const v of nodes) {
    const card = el.querySelector(`[data-node="${v.key}"]`) as HTMLElement | null;
    if (!card) continue;
    const r = card.getBoundingClientRect();
    pos.set(v.key, { x: 6 + (lanes.get(v.key) ?? 0) * LANE_W + LANE_W / 2, y: r.top - base.top + 17 });
  }
  svg.setAttribute('height', String(el.scrollHeight));
  svg.setAttribute('width', String(parseFloat(getComputedStyle(el).getPropertyValue('--lanes')) || 120));
  const parts: string[] = [];
  // 主线：每一世从出生到最后各一段
  const mains = new Map<number, V[]>();
  for (const v of nodes) {
    if ((lanes.get(v.key) ?? 0) !== 0) continue;
    if (!mains.has(v.life)) mains.set(v.life, []);
    mains.get(v.life)!.push(v);
  }
  for (const list of mains.values()) {
    if (list.length < 2) continue;
    const a = pos.get(list[0].key)!;
    const b = pos.get(list[list.length - 1].key)!;
    parts.push(`<line class="e-main" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
  }
  const tone = new Map(nodes.map((v) => [v.key, toneOf(v.n)]));
  for (const e of edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;
    const on = sel != null ? (e.from === sel || e.to === sel ? ' on' : ' off') : '';
    if ((e.why === '承' || e.why === '前世') && a.x === b.x) {
      parts.push(`<line class="e e-${e.why} line t-${tone.get(e.to)}${on}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
      continue;
    }
    // 其余的连线向右鼓出一道弧，越远鼓得越多
    const bulge = Math.min(22, 8 + Math.abs(b.y - a.y) / 40);
    const cx = Math.max(a.x, b.x) + bulge;
    parts.push(`<path class="e e-${e.why}${on}" d="M${a.x} ${a.y} C${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}"/>`);
  }
  for (const v of nodes) {
    const p = pos.get(v.key);
    if (!p) continue;
    const n = v.n;
    const big = n.kind === 'realm' || n.kind === 'birth' || n.kind === 'death';
    const cls = `d t-${toneOf(n)}${sel === v.key ? ' sel' : ''}`;
    parts.push(n.kind === 'battle' ? `<rect class="${cls}" x="${p.x - 4}" y="${p.y - 4}" width="8" height="8" transform="rotate(45 ${p.x} ${p.y})"/>` : `<circle class="${cls}${n.kind === 'flavor' ? ' small' : ''}" cx="${p.x}" cy="${p.y}" r="${big ? 5.5 : n.kind === 'flavor' ? 2.5 : 4}"/>`);
  }
  svg.innerHTML = parts.join('');
}

function markSel(graph: HTMLElement & { _paint?: () => void }, sel: string | null, all: Map<string, V>, effects: Effects) {
  const rel = new Set<string>();
  if (sel != null) {
    const v = all.get(sel);
    v?.n.links.forEach((l) => rel.add(srcKey(v.life, l)));
    (effects.get(sel) ?? []).forEach((e) => rel.add(e.key));
  }
  graph.classList.toggle('has-sel', sel != null);
  graph.querySelectorAll<HTMLElement>('[data-row]').forEach((r) => {
    const k = r.dataset.row!;
    r.classList.toggle('sel', k === sel);
    r.classList.toggle('rel', rel.has(k));
  });
  graph._paint?.();
}
