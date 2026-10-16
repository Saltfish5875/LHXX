import './style.css';
import './art/art.css';
import { Game, IO, Prompt, skillName } from './game/engine';
import { RollAction, RollView, autoDie, faceName, tileSceneLoc } from './game/board';
import { HOLDINGS } from './data/board';
import { loadLife, loadMeta, resetAll, saveMeta, lampOf } from './game/meta';
import { runBattle } from './battle/view';
import { FATE_BY_ID } from './data/fate';
import { ATTR_NAMES, AttrKey, CN_NUM, REALMS, ROOTS, SCHOOL_NAMES, School, TALENT_BY_ID, Talent, cnAge } from './data/core';
import { COMPANION_NAMES, CompanionId, LEGENDS, MUTATORS, PAGES, VOLUME_NAMES, WISHES } from './data/content';
import type { LifeState, LogEntry, SkillId, Tendency } from './game/types';
import { ERA_BY_ID, HOOKS, RELATION_NAMES, faceKinds } from './data/faces';
import { LOC_BY_ID } from './data/events';
import { Scene } from './art/scene';
import { moment, momentsIdle, setMomentSpeed } from './art/moments';
import { sfx, setSound, soundOn } from './art/sound';
import { Chip, clearOutcome, showOutcome, stampCard, stampOption, sweep } from './art/feedback';

const $ = (id: string) => document.getElementById(id)!;
const scrollEl = $('scroll');
const dealEl = $('deal');
const panelEl = $('panel');
const modalEl = $('modal');
const battleEl = $('battle');
const metaEl = $('meta-info');
const mstatusEl = $('mstatus');
const panelMask = $('panel-mask');
const sceneHost = $('scene');
const scene = new Scene(sceneHost);

// 手机上角色面板是底部抽屉
function togglePanel(open?: boolean) {
  const on = open ?? !panelEl.classList.contains('open');
  panelEl.classList.toggle('open', on);
  panelMask.classList.toggle('open', on);
}
mstatusEl.onclick = () => togglePanel();
panelMask.onclick = () => togglePanel(false);

const meta = loadMeta();
let auto = false;
let game: Game;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const nl = (s: string) => esc(s).replace(/\n/g, '<br>');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------- 弹窗 ----------------
function openModal(html: string, cls = ''): HTMLElement {
  togglePanel(false);
  modalEl.innerHTML = `<div class="modal ${cls}"><div class="modal-box">${html}</div></div>`;
  modalEl.classList.add('show');
  return modalEl.querySelector('.modal-box') as HTMLElement;
}
function closeModal() {
  modalEl.classList.remove('show');
  modalEl.innerHTML = '';
}

async function choose(p: Prompt): Promise<number> {
  settle();
  await momentsIdle();
  if (p.style === 'well' || p.style === 'epitaph') scene.set({ mode: 'well' });
  return new Promise((resolve) => {
    const box = openModal(
      `<h2>${esc(p.title)}</h2><div class="prompt-text">${nl(p.text)}</div><div class="opts"></div><div class="hint">数字键 1～${p.options.length} 快速选择</div>`,
      `style-${p.style ?? 'event'}`,
    );
    const opts = box.querySelector('.opts')!;
    const enabled: number[] = [];
    p.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.disabled = !!o.disabled;
      b.innerHTML = `<b>${i + 1}. ${esc(o.label)}</b>${o.desc ? `<span>${esc(o.desc)}</span>` : ''}`;
      b.onclick = () => done(i);
      opts.appendChild(b);
      if (!o.disabled) enabled.push(i);
    });
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key) - 1;
      if (n >= 0 && n < p.options.length && !p.options[n].disabled) done(n);
      if ((e.key === 'Enter' || e.key === ' ') && p.options.length === 1) done(0);
    };
    window.addEventListener('keydown', onKey);
    let picked = false;
    async function done(i: number) {
      if (picked) return;
      picked = true;
      window.removeEventListener('keydown', onKey);
      sfx.pluck(i + 2, 0.35);
      // 只有两项以上的真选择才落印、记得失；「继续」「开卷」这类单按钮直接过
      if (p.options.length > 1) {
        await stampOption([...opts.querySelectorAll<HTMLElement>('.opt')], i, auto);
        beginChoice(p.options[i].label);
      }
      closeModal();
      resolve(i);
    }
    // 自动模式：坊市等非重事件直接离开
    if (auto && p.key === 'market') setTimeout(() => done(p.options.length - 1), 200);
    // 自动模式：棋盘上的经营类提示（天机格、产业）按默认选择
    else if (auto && p.key && AUTO_KEYS.has(p.key) && p.autoPick !== undefined && !p.options[p.autoPick]?.disabled) setTimeout(() => done(p.autoPick!), 260 / meta.settings.speed);
  });
}

async function pickTalents(cands: Talent[], heritage: string | null): Promise<string[]> {
  await momentsIdle();
  scene.set({ mode: 'well' });
  return new Promise((resolve) => {
    const sel = new Set<string>();
    const box = openModal(`<h2>抽天赋 · ${cands.length} 选 3</h2><div class="talent-grid"></div><div class="row"><span class="picked">已选 0/3</span><button class="btn primary" disabled>确定</button></div>`, 'wide');
    const grid = box.querySelector('.talent-grid')!;
    const ok = box.querySelector('.btn.primary') as HTMLButtonElement;
    const picked = box.querySelector('.picked')!;
    for (const t of cands) {
      const d = document.createElement('button');
      d.className = `talent g-${t.grade}`;
      d.innerHTML = `<b>${t.name}${t.id === heritage ? '<em>传承</em>' : ''}</b><small>${t.grade}${t.school ? ' · ' + SCHOOL_NAMES[t.school] : ''}</small><span>${t.desc}</span>`;
      d.onclick = () => {
        if (sel.has(t.id)) sel.delete(t.id);
        else if (sel.size < 3) sel.add(t.id);
        d.classList.toggle('on', sel.has(t.id));
        sfx.pluck(sel.size + 1, 0.3);
        picked.textContent = `已选 ${sel.size}/3`;
        ok.disabled = sel.size !== 3;
      };
      grid.appendChild(d);
    }
    ok.onclick = () => {
      closeModal();
      resolve([...sel]);
    };
  });
}

async function allocate(points: number, base: Record<AttrKey, number>, origins: string[]): Promise<{ attrs: Record<AttrKey, number>; origin: string | null }> {
  await momentsIdle();
  return new Promise((resolve) => {
    const add: Record<AttrKey, number> = { gen: 5, wu: 5, luck: 5, fam: 5 };
    let left = points - 20;
    const originNames: Record<string, string> = { inkOrphan: '墨门遗孤', dragon: '龙族血脉', painter: '画中仙裔' };
    let origin: string | null = null;
    const box = openModal('', 'mid');
    const render = () => {
      box.innerHTML = `<h2>分配属性 · 剩余 ${left}</h2>
        <div class="attr-list">${(Object.keys(add) as AttrKey[])
          .map((k) => `<div class="attr-row"><b>${ATTR_NAMES[k]}</b><button class="btn sm" data-k="${k}" data-d="-1">－</button><span>${add[k]}${base[k] ? `<i>${base[k] > 0 ? '+' : ''}${base[k]}</i>` : ''}</span><button class="btn sm" data-k="${k}" data-d="1">＋</button><small>${ATTR_DESC[k]}</small></div>`)
          .join('')}</div>
        ${origins.length ? `<div class="origin"><b>出身</b> <label><input type="radio" name="o" value="" ${!origin ? 'checked' : ''}>按家境</label>${origins.map((o) => `<label><input type="radio" name="o" value="${o}" ${origin === o ? 'checked' : ''}>${originNames[o]}</label>`).join('')}</div>` : ''}
        <div class="row"><button class="btn" data-rand>随机</button><button class="btn primary" data-ok ${left !== 0 ? 'disabled' : ''}>入世</button></div>`;
      box.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) => {
        b.onclick = () => {
          const k = b.dataset.k as AttrKey;
          const d = Number(b.dataset.d);
          if (d > 0 && (left <= 0 || add[k] >= 10)) return;
          if (d < 0 && add[k] <= 0) return;
          add[k] += d;
          left -= d;
          render();
        };
      });
      box.querySelectorAll<HTMLInputElement>('input[name=o]').forEach((r) => (r.onchange = () => (origin = r.value || null)));
      (box.querySelector('[data-rand]') as HTMLButtonElement).onclick = () => {
        const ks = Object.keys(add) as AttrKey[];
        for (const k of ks) add[k] = 0;
        left = points;
        while (left > 0) {
          const k = ks[Math.floor(Math.random() * 4)];
          if (add[k] < 10) {
            add[k]++;
            left--;
          }
        }
        render();
      };
      (box.querySelector('[data-ok]') as HTMLButtonElement).onclick = () => {
        closeModal();
        const attrs = { ...add };
        for (const k of Object.keys(attrs) as AttrKey[]) attrs[k] = Math.max(0, attrs[k] + base[k]);
        resolve({ attrs, origin: origin ? originNames[origin] : null });
      };
    };
    render();
  });
}
const ATTR_DESC: Record<AttrKey, string> = { gen: '寿元、气血、凡间存活', wu: '修炼速度、悟道', luck: '灵根、仙缘、改命、暴击', fam: '出身、初始灵石' };

// ---------------- 命途棋盘 ----------------
const TAG_CLASS: Record<string, string> = { 劫: 'tag-jie', 缘: 'tag-yuan', 凶: 'tag-xiong', 平: 'tag-ping', 引: 'tag-yin', 故: 'tag-gu' };
// 十二格绕成一圈：左上角是岁首，顺时针
const RING: [number, number][] = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [3, 1], [2, 1]];
const AUTO_KEYS = new Set(['oracle', 'hold', 'build', 'holdBranch']);

async function roll(v: RollView): Promise<RollAction> {
  settle();
  await momentsIdle();
  setMomentSpeed(auto ? meta.settings.speed * 1.6 : 1);
  const danger = v.gathered ? 1 : v.tiles.some((t) => t.tag === '劫') ? 0.4 : v.tiles.some((t) => t.tag === '凶') ? 0.3 : 0;
  scene.set({ mode: 'life', danger });
  return new Promise((resolve) => {
    let peekMode = false;
    let ruyiMode = false;
    let focus: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let going = false;
    const targetName = (slot: number) => (slot >= 12 ? '过岁首' : slot === v.pos ? '原地' : v.tiles[slot].name);
    const ruyiTargets = [1, 2, 3, 4, 5, 6].map((n) => Math.min(12, v.pos + n));
    const render = () => {
      const targets = ruyiMode ? ruyiTargets : v.targets;
      const info = focus !== null ? v.tiles[focus] : null;
      dealEl.innerHTML = `
        <div class="board${v.gathered ? ' gathered' : ''}${peekMode ? ' peeking' : ''}">
          ${v.tiles
            .map((t) => {
              const [r, c] = RING[t.slot];
              const cls = [
                'tile',
                `k-${t.kind}`,
                t.tag ? TAG_CLASS[t.tag] : '',
                t.slot === v.pos ? 'here' : '',
                targets.includes(t.slot) && t.slot !== v.pos ? 'target' : '',
                t.visited && t.slot !== v.pos ? 'visited' : '',
                peekMode && t.canPeek ? 'peekable' : '',
                t.peek ? 'peeked' : '',
              ].filter(Boolean).join(' ');
              return `<button class="${cls}" data-s="${t.slot}" style="grid-area:${r}/${c}">
                <span class="t-month">${t.month}</span>
                <span class="t-icon">${esc(t.icon)}</span>
                <span class="t-name">${esc(t.name)}</span>
                ${t.tag && t.tag !== '平' ? `<span class="t-tag">${t.tag}</span>` : ''}
                ${t.lv ? `<span class="t-lv">${t.lv}</span>` : ''}
                ${t.slot === v.pos ? '<i class="t-me">你</i>' : ''}
              </button>`;
            })
            .join('')}
          <div class="board-center">
            <div class="sign${v.gathered ? ' gathered' : ''}">${esc(v.sign)}</div>
            <div class="b-info">${
              info
                ? `<b>${esc(info.name)}</b> ${esc(info.peek ? '窥得：' + info.peek : info.hint)}`
                : peekMode
                  ? '点一格地点，窥它这一圈会发生什么'
                  : ruyiMode
                    ? '如意骰：任选点数'
                    : `第 ${v.lap + 1} 圈 · 一圈 ${v.years} 年 · 已停 ${v.stops}/${v.maxStops}`
            }</div>
            <div class="dice">${
              ruyiMode
                ? ruyiTargets.map((s, i) => `<button class="die ruyi" data-r="${i + 1}"><b>${i + 1}</b><small>${esc(targetName(s))}</small></button>`).join('')
                : v.dice
                    .map((d, i) => `<button class="die${d === 0 ? ' f-stop' : d === 7 ? ' f-dun' : d === -1 ? ' f-jie' : ''}" data-d="${i}" style="--i:${i}"><b>${faceName(d)}</b><small>${esc(targetName(v.targets[i]))}</small></button>`)
                    .join('')
            }</div>
          </div>
        </div>
        <div class="deal-actions">
          <button class="btn" data-a="reroll" ${v.rerolls <= 0 ? 'disabled' : ''}>改命·重掷（${v.rerolls}）</button>
          <button class="btn ${peekMode ? 'active' : ''}" data-a="peek" ${v.rerolls <= 0 ? 'disabled' : ''}>改命·窥命</button>
          ${v.ruyi > 0 ? `<button class="btn ${ruyiMode ? 'active' : ''}" data-a="ruyi">如意骰（${v.ruyi}）</button>` : ''}
          ${v.canRewind ? '<button class="btn" data-a="rewind">掌天瓶·回溯</button>' : ''}
          <button class="btn ${auto ? 'active' : ''}" data-a="auto">${auto ? '自动中' : '自动'}（${TEND_NAMES[meta.settings.tendency]}）</button>
        </div>`;
      dealEl.querySelectorAll<HTMLButtonElement>('.tile').forEach((b) => (b.onclick = () => tapTile(Number(b.dataset.s))));
      dealEl.querySelectorAll<HTMLButtonElement>('.die[data-d]').forEach((b) => (b.onclick = () => go(Number(b.dataset.d))));
      dealEl.querySelectorAll<HTMLButtonElement>('.die[data-r]').forEach((b) => (b.onclick = () => go(-1, Number(b.dataset.r))));
      dealEl.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((b) => {
        b.onclick = () => {
          const a = b.dataset.a;
          sfx.tap();
          if (a === 'reroll') finish({ action: 'reroll' });
          else if (a === 'peek') {
            peekMode = !peekMode;
            ruyiMode = false;
            render();
          } else if (a === 'ruyi') {
            ruyiMode = !ruyiMode;
            peekMode = false;
            render();
          } else if (a === 'rewind') finish({ action: 'rewind' });
          else if (a === 'auto') {
            auto = !auto;
            render();
            if (auto) scheduleAuto();
          }
        };
      });
    };
    const tapTile = (slot: number) => {
      if (going) return;
      const t = v.tiles[slot];
      if (peekMode) {
        if (t.canPeek) finish({ action: 'peek', slot });
        return;
      }
      if (ruyiMode) {
        const n = ruyiTargets.indexOf(slot);
        if (n >= 0 && slot !== v.pos) return go(-1, n + 1);
      } else {
        const i = v.targets.indexOf(slot);
        if (i >= 0 && slot !== v.pos && focus === slot) return go(i);
      }
      focus = focus === slot ? null : slot;
      render();
    };
    // 落子：棋子一格一格走过去，再盖「定」字
    const go = async (die: number, ruyi?: number) => {
      if (going) return;
      going = true;
      const to = ruyi ? ruyiTargets[ruyi - 1] : v.targets[die];
      const face = ruyi ?? v.dice[die];
      sfx.pluck(Math.max(0, Math.min(6, face)), 0.45);
      clearOutcome();
      const tiles = [...dealEl.querySelectorAll<HTMLButtonElement>('.tile')];
      const step = auto ? 50 / meta.settings.speed : 110;
      for (let s = v.pos + 1; s <= Math.min(to, 11); s++) {
        tiles.forEach((el) => el.classList.remove('here'));
        tiles[s]?.classList.add('here', 'passing');
        await sleep(step);
      }
      const act: RollAction = ruyi ? { action: 'ruyi', value: ruyi } : { action: 'go', die };
      if (to < 12 && to !== v.pos) {
        const t = v.tiles[to];
        await stampCard([tiles[to]], 0, auto);
        sweep(sceneHost);
        scene.set({ loc: tileSceneLoc(t, v.stage), locName: t.name, danger: t.tag === '劫' ? 0.55 : t.tag === '凶' ? 0.3 : 0 });
        beginChoice(t.name);
      }
      finish(act);
    };
    const onKey = (e: KeyboardEvent) => {
      if (modalEl.classList.contains('show') || battleEl.classList.contains('show')) return;
      const n = Number(e.key) - 1;
      if (ruyiMode && n >= 0 && n < 6) go(-1, n + 1);
      else if (n >= 0 && n < v.dice.length) go(n);
    };
    window.addEventListener('keydown', onKey);
    function finish(a: RollAction) {
      if (timer) clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      dealEl.innerHTML = '';
      resolve(a);
    }
    function scheduleAuto() {
      const L = game.L;
      const reach = v.targets.filter((s) => s < 12).map((s) => v.tiles[s]);
      const lowHp = L.hp < L.maxHp * 0.3 && reach.some((t) => t.tag === '劫');
      const story = reach.find((t) => t.tag === '引' || t.tag === '故' || t.kind === 'ruin');
      if ((v.gathered && v.stops === 0) || lowHp || story) {
        auto = false;
        render();
        flash(story ? `「${story.name}」就在前面，自动暂停` : lowHp ? '气血低于三成，自动暂停' : '劫气积聚，自动暂停');
        return;
      }
      timer = setTimeout(() => {
        if (!going) void go(autoDie(v, meta.settings.tendency, L, Math.random));
      }, 380 / meta.settings.speed);
    }
    render();
    if (auto) scheduleAuto();
  });
}

const TEND_NAMES: Record<Tendency, string> = { safe: '稳健', chance: '求缘', war: '好战' };

function flash(msg: string) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2200);
}

// ---------------- 选择反馈：落印 → 落笔 ----------------
interface Stats {
  life: number;
  age: number;
  realm: number;
  inDao: boolean;
  hp: number;
  maxHp: number;
  xp: number;
  span: number;
  stones: number;
  merit: number;
  favor: number;
  kills: number;
  injuries: number;
  attrs: Record<AttrKey, number>;
  talents: string[];
  skills: Record<string, number>;
  traces: number;
}
function stats(): Stats | null {
  const L = game?.L;
  if (!L) return null;
  return {
    life: L.lifeNo,
    age: L.age,
    realm: L.realm,
    inDao: L.inDao,
    hp: L.hp,
    maxHp: L.maxHp,
    xp: L.xp,
    span: game.lifespan(),
    stones: L.stones,
    merit: L.merit,
    favor: L.favor,
    kills: L.kills,
    injuries: L.injuries,
    attrs: { ...L.attrs },
    talents: [...L.talents],
    skills: Object.fromEntries(L.skills.map((s) => [s.id, s.lvl])),
    traces: L.traces.length,
  };
}
let pending: { snap: Stats; label: string; caption: string | null } | null = null;
function beginChoice(label: string) {
  if (replaying) return;
  const snap = stats();
  if (snap) pending = { snap, label, caption: null };
}
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
function diffChips(a: Stats, b: Stats): Chip[] {
  const out: Chip[] = [];
  const num = (name: string, d: number, goodUp = true) => {
    d = Math.round(d);
    if (!d) return;
    out.push({ text: `${name} ${sign(d)}`, tone: d > 0 === goodUp ? 'up' : 'down' });
  };
  if (b.age > a.age) out.push({ text: `光阴 ${b.age - a.age} 年`, tone: 'neutral' });
  if (b.inDao && a.inDao && b.realm === a.realm) num('修为', b.xp - a.xp);
  num('气血', b.hp - a.hp);
  if (b.maxHp !== a.maxHp) num('气血上限', b.maxHp - a.maxHp);
  num('寿元', b.span - a.span);
  (Object.keys(ATTR_NAMES) as AttrKey[]).forEach((k) => num(ATTR_NAMES[k], b.attrs[k] - a.attrs[k]));
  num('灵石', b.stones - a.stones);
  num('功德', b.merit - a.merit);
  num('人情', b.favor - a.favor);
  num('斩墨', b.kills - a.kills);
  num('暗伤', b.injuries - a.injuries, false);
  for (const t of b.talents) if (!a.talents.includes(t)) out.push({ text: `得天赋「${TALENT_BY_ID[t]?.name ?? t}」`, tone: 'gold' });
  for (const [id, lvl] of Object.entries(b.skills)) {
    if (!a.skills[id]) out.push({ text: `得法宝「${skillName(id as SkillId)}」`, tone: 'gold' });
    else if (lvl > a.skills[id]) out.push({ text: `${skillName(id as SkillId)} 升${CN_NUM[lvl]}阶`, tone: 'gold' });
  }
  if (b.traces > a.traces) out.push({ text: '留下一道痕迹', tone: 'neutral' });
  return out.slice(0, 7);
}
// 一个选择的结果落定：在画卷上写一句结果、摆出得失
function settle() {
  if (!pending || replaying) return;
  const p = pending;
  pending = null;
  const now = stats();
  if (!now || now.life !== p.snap.life) return;
  const chips = diffChips(p.snap, now);
  let line = p.caption;
  if (line && line.length > 46) line = line.slice(0, 45) + '…';
  showOutcome(sceneHost, line, chips, auto ? meta.settings.speed * 1.6 : 1);
}

// ---------------- 卷轴与面板 ----------------
let lastAge = -1;
let replaying = false; // 续档、回溯时整段重放日志，不放演出
let seen = { life: -1, root: '', inDao: false, realm: 0 };
function watchState() {
  const L = game?.L;
  if (!L || replaying) return;
  if (seen.life !== L.lifeNo) {
    seen = { life: L.lifeNo, root: L.root, inDao: L.inDao, realm: L.realm };
    return;
  }
  if (seen.root !== L.root && seen.root === 'unknown') {
    const r = ROOTS.find((x) => x.id === L.root);
    if (r) moment({ kind: 'root', big: r.name, sub: '测灵根', line: r.id === 'none' ? '测灵石一点光也没亮。' : '测灵石亮了。', seal: r.id === 'none' ? '凡' : '灵' });
  }
  if (!seen.inDao && L.inDao) moment({ kind: 'dao', big: '入道', sub: `${cnAge(L.age)}岁`, line: L.route === 'sect' ? '拜入宗门，从此踏上仙途。' : '随散修云游，从此踏上仙途。', seal: '仙' });
  if (L.inDao && L.realm > seen.realm && seen.inDao) moment({ kind: 'realm', big: REALMS[L.realm].name, sub: '破境', line: `渡${REALMS[L.realm - 1].trial}，寿元大增。`, seal: '破' });
  seen = { life: L.lifeNo, root: L.root, inDao: L.inDao, realm: L.realm };
}
function log(e: LogEntry) {
  if (!e.text) return;
  watchState();
  if (!replaying) {
    if (e.kind === 'death') {
      pending = null;
      clearOutcome();
      const L = game.L;
      const big = e.text.startsWith('隐藏结局') ? e.text.replace('隐藏结局 · ', '') : L.ended === '叩门' ? '叩门' : L.deathCause ?? '卒';
      moment({ kind: 'death', big, sub: `第 ${L.lifeNo} 世 · ${cnAge(L.age)}岁`, line: e.text, seal: L.ended === '叩门' ? '门' : '卒' });
      scene.set({ mode: 'dead' });
    } else if (e.kind === 'page') {
      const n = e.text.match(/第 (\d+) 页/)?.[1];
      moment({ kind: 'page', big: '天书', sub: n ? `第 ${n} 页` : '', line: e.text.replace(/^天书第 \d+ 页/, '').replace(/^：/, ''), dur: 1500 });
    }
  }
  if (e.age !== lastAge) {
    const h = document.createElement('div');
    h.className = 'age';
    h.textContent = `${cnAge(e.age)}岁`;
    scrollEl.appendChild(h);
    lastAge = e.age;
  }
  if (pending && !replaying && !pending.caption && e.kind !== 'fate' && e.kind !== 'death') pending.caption = e.text;
  const d = document.createElement('div');
  d.className = `entry k-${e.kind ?? 'normal'}${replaying ? '' : ' fresh'}`;
  d.textContent = e.text;
  scrollEl.appendChild(d);
  scrollEl.scrollTop = scrollEl.scrollHeight;
}
function clearLog() {
  scrollEl.innerHTML = '';
  lastAge = -1;
  replaying = true;
}

function bar(cur: number, max: number, cls: string, label: string) {
  const p = Math.max(0, Math.min(100, (cur / Math.max(1, max)) * 100));
  return `<div class="bar ${cls}"><div style="width:${p}%"></div><em>${label}</em></div>`;
}

function faceBlock(L: LifeState) {
  const era = L.era ? ERA_BY_ID[L.era] : null;
  let hook = '';
  if (L.hook) {
    const h = HOOKS.find((x) => x.id === L.hook!.id)!;
    const st = L.hook.outcome === 'done' ? '已了结' : L.hook.outcome === 'open' ? '未了' : `${['起', '转', '结'][L.hook.beat]}拍 · ${L.age >= L.hook.due ? '到期' : cnAge(L.hook.due) + '岁前后'}`;
    hook = `<div class="hookline"><b>引</b>「${h.name}」<span>${st}</span></div>`;
  }
  const met = L.acqMet?.length ? `<div class="hookline"><b class="gu">故</b>本世再遇 ${L.acqMet.length} 位故人</div>` : '';
  return era ? `<div class="era"><b>${era.name}</b><span>${era.note}</span></div>${hook}${met}` : '';
}

// 命途：骰子、本命格、产业
function boardBlock(L: LifeState): string {
  const d = L.dice;
  if (!d) return '';
  const chips = [`<span class="chip">骰 ${d.n} 颗${d.stopFace ? '·止遁' : ''}</span>`];
  if (d.ruyi) chips.push(`<span class="chip">如意骰 ${d.ruyi}</span>`);
  if (L.fateTile) chips.push(`<span class="chip">本命格 ${L.fateTile.lv} 级${L.fateTile.dusty ? '·蒙尘' : ''}</span>`);
  for (const h of L.holdings ?? []) chips.push(`<span class="chip hold" title="${esc(HOLDINGS[h.type].yieldText)}">${esc(h.name)} ${h.lv} 级${h.branch !== undefined ? '·' + HOLDINGS[h.type].branches[h.branch].label : ''}</span>`);
  return `<h4>命途</h4><div class="chips">${chips.join('')}</div>`;
}

function refresh() {
  const L = game?.L;
  if (L && replaying) {
    replaying = false;
    const born = seen.life !== L.lifeNo && L.age === 0;
    seen = { life: L.lifeNo, root: L.root, inDao: L.inDao, realm: L.realm };
    if (born) {
      const era = L.era ? ERA_BY_ID[L.era] : null;
      moment({ kind: 'birth', big: `第${cnAge(L.lifeNo)}世`, sub: era ? `画卷 · ${era.name}` : '入世', line: era?.open, seal: '生' });
    }
  } else watchState();
  if (L) {
    const lastLoc = [...L.log].reverse().find((x) => x.loc)?.loc;
    const dead = !!(L.deathCause || L.ended);
    scene.set({
      lifeNo: L.lifeNo,
      age: L.age,
      realm: L.realm,
      inDao: L.inDao,
      era: L.era ?? 'E1',
      hpLow: L.hp < L.maxHp * 0.3,
      mode: dead ? (scene.st.mode === 'well' ? 'well' : 'dead') : 'life',
      ...(scene.st.lifeNo !== L.lifeNo ? { loc: lastLoc ?? 'home', locName: locName(lastLoc ?? 'home', L.era) } : {}),
    });
  }
  metaEl.innerHTML = `第 ${meta.lives} 世${L?.era ? " · " + ERA_BY_ID[L.era].name : ""} · ${VOLUME_NAMES[meta.saga.volume]} · 天书 ${meta.saga.pages.length + (L ? L.pagesGot.filter((p) => !meta.saga.pages.includes(p)).length : 0)}/27 · 宿慧 ${meta.insight}`;
  if (!L) return;
  const realm = L.inDao ? REALMS[L.realm].name : '凡人';
  const span = game.lifespan();
  const need = L.inDao ? REALMS[L.realm].need : 0;
  const root = ROOTS.find((r) => r.id === L.root)?.name ?? (L.root === 'unknown' ? '未测' : L.root);
  const wish = L.wish ? WISHES.find((w) => w.id === L.wish!.id) : null;
  const lamps = (['silu', 'fox', 'chiyi', 'danzun', 'bottle'] as CompanionId[]).map((c) => `<span class="lamp" style="--l:${lampOf(meta, L, c) / 9}">${COMPANION_NAMES[c]}<i>${lampOf(meta, L, c)}</i></span>`).join('');
  const sch = L.schoolCur ? SCHOOL_NAMES[L.schoolCur] : '未定';
  const topSch = (Object.keys(L.school) as School[]).sort((a, b) => L.school[b] - L.school[a]).slice(0, 2).map((s) => `${SCHOOL_NAMES[s]} ${L.school[s]}`).join('、');
  const fate = L.fate ? FATE_BY_ID[L.fate] : null;
  const daoji = (L.daoji ? SCHOOL_NAMES[L.daoji] : '未铸') + (L.cap != null ? ` · 止于${REALMS[L.cap].name}` : '') + (L.stall ? ' · 道心蒙尘' : '') + (L.retired ? ' · 安度余生' : '');
  const hpLow = L.hp < L.maxHp * 0.3;
  mstatusEl.innerHTML = `
    <span class="ms-seal">${realm}</span>
    <span class="ms-age"><b>${cnAge(L.age)}岁</b><small>寿 ${span}</small></span>
    <span class="ms-bars">${bar(L.hp, L.maxHp, 'hp' + (hpLow ? ' low' : ''), `气血 ${Math.ceil(L.hp)}/${L.maxHp}${L.injuries ? ` · 伤${L.injuries}` : ''}`)}${L.inDao ? bar(L.xp, need, 'xp', `修为 ${Math.floor(L.xp)}/${need}`) : `<div class="ms-meta">${esc(metaEl.textContent ?? '')}</div>`}</span>
    <span class="ms-more">详情</span>`;
  panelEl.innerHTML = `
    <div class="sheet-head m-only"><b>角色</b><button class="btn sm" data-close>收起</button></div>
    <div class="m-only muted sheet-meta">${esc(metaEl.textContent ?? '')}</div>
    <div class="m-only">${faceBlock(L)}</div>
    <div class="seal">${realm}</div>
    <div class="p-row"><b>${cnAge(L.age)}岁</b><span>寿元 ${span}</span></div>
    ${L.inDao ? bar(L.xp, need, 'xp', `修为 ${Math.floor(L.xp)}/${need}`) : ''}
    ${bar(L.hp, L.maxHp, 'hp', `气血 ${Math.ceil(L.hp)}/${L.maxHp}${L.injuries ? ` · 暗伤 ${L.injuries}` : ''}`)}
    <div class="attrs">${(Object.keys(ATTR_NAMES) as AttrKey[]).map((k) => `<span>${ATTR_NAMES[k]}<b>${L.attrs[k]}</b></span>`).join('')}</div>
    <div class="p-grid">
      <span>出身</span><b>${L.origin}</b>
      <span>灵根</span><b>${root}</b>
      <span>${L.inDao ? '灵石' : '银两'}</span><b>${L.stones}</b>
      <span>功德</span><b>${L.merit}</b>
      <span>人情</span><b>${L.favor}</b>
      <span>斩墨</span><b>${L.kills}</b>
      <span>命格</span><b title="${fate ? esc(fate.short) : ''}">${fate?.name ?? '未知'}</b>
      <span>道基</span><b class="small">${daoji}</b>
      <span>流派</span><b>${sch}</b>
      <span>道途</span><b class="small">${topSch}</b>
    </div>
    <div class="d-only">${faceBlock(L)}</div>
    <h4>天赋</h4><div class="chips">${L.talents.map((t) => `<span class="chip g-${TALENT_BY_ID[t].grade}" title="${TALENT_BY_ID[t].desc}">${TALENT_BY_ID[t].name}</span>`).join('')}</div>
    ${boardBlock(L)}
    ${L.skills.length ? `<h4>法宝</h4><div class="chips">${L.skills.map((s) => `<span class="chip">${skillName(s.id)} ${CN_NUM[s.lvl]}阶</span>`).join('')}</div>` : ''}
    ${wish ? `<h4>心愿</h4><div class="wish ${L.wish!.done ? 'done' : ''}">「${wish.name}」${wish.cond}<br>${bar(L.wish!.progress, 1, 'wishbar', L.wish!.done ? '圆满' : Math.round(L.wish!.progress * 100) + '%')}</div>` : ''}
    ${L.traces.length ? `<h4>本世痕迹</h4><div class="chips">${L.traces.map((t) => `<span class="chip trace" title="${MUTATORS.find((m) => m.trace === t.tag)?.name ?? ''}">${MUTATORS.find((m) => m.trace === t.tag)?.name ?? t.tag}</span>`).join('')}</div>` : ''}
    <h4>命灯</h4><div class="lamps">${lamps}</div>`;
  const close = panelEl.querySelector<HTMLButtonElement>('[data-close]');
  if (close) close.onclick = () => togglePanel(false);
}

function locName(id: string, era?: string | null) {
  return (era && ERA_BY_ID[era]?.rename?.[id]?.name) ?? LOC_BY_ID[id]?.name ?? '人间';
}

async function pace() {
  settle();
  await momentsIdle();
  if (!game) return;
  if (game.L.age <= 5) await sleep(auto ? 120 / meta.settings.speed : 260);
  else if (auto) await sleep(150 / meta.settings.speed);
}

// ---------------- 侧栏弹窗：天书 / 命灯 / 前世书 / 设置 ----------------
function showBook() {
  const L = game?.L;
  const has = (n: number) => meta.saga.pages.includes(n) || !!L?.pagesGot.includes(n);
  const vols = [1, 2, 3]
    .map((v) => {
      const items = PAGES.filter((p) => p.vol === v)
        .map((p) => {
          const got = has(p.n);
          const sealed = got && p.vol > meta.saga.volume;
          return `<div class="page ${got ? 'got' : ''}"><b>第 ${p.n} 页</b><span class="cond">${p.cond}</span>${got ? `<p>${sealed ? '（封印中）' : esc(p.text)}</p>` : ''}</div>`;
        })
        .join('');
      return `<h3>${VOLUME_NAMES[v]}${v > meta.saga.volume ? '（未解锁）' : ''}</h3><div class="pages">${items}</div>`;
    })
    .join('');
  const box = openModal(`<h2>天书</h2>${vols}<div class="row"><button class="btn primary">合上</button></div>`, 'wide');
  (box.querySelector('.btn.primary') as HTMLButtonElement).onclick = closeModal;
}

function showLamps() {
  const L = game?.L ?? null;
  const rows = (['silu', 'fox', 'chiyi', 'danzun', 'bottle'] as CompanionId[])
    .map((c) => `<div class="lamp-row"><b>${COMPANION_NAMES[c]}</b><div class="lamp-dots">${Array.from({ length: 9 }, (_, i) => `<i class="${i < lampOf(meta, L, c) ? 'on' : ''}"></i>`).join('')}</div><span>${lampOf(meta, L, c)}/9</span></div>`)
    .join('');
  const regrets = meta.regrets.length ? meta.regrets.map((r) => `<li>${esc(r.text)}（第 ${r.expires} 世前弥补）</li>`).join('') : '<li>暂无</li>';
  const disc = [...LEGENDS.map((l) => ({ id: l.id, name: l.name, hint: l.hint })), { id: 'H1', name: '人间一世', hint: '有人一辈子没修仙，也活成了传说。' }, { id: 'H2', name: '长河', hint: '河里有人叫了你三次。' }, { id: 'H3', name: '井底', hint: '井还有底吗？' }]
    .map((d) => `<li>${meta.discoveries.includes(d.id) ? `<b>${d.name}</b>` : `？ <small>${d.hint}</small>`}</li>`)
    .join('');
  const endings = ['A', 'B', 'C', 'T'].map((k) => ({ A: '封门守世', B: '大开天门', C: '化墨', T: '重画天门' })[k as 'A']).map((n, i) => `<li>${meta.saga.endings.includes(['A', 'B', 'C', 'T'][i]) ? `<b>${n}</b>` : '？'}</li>`).join('');
  const box = openModal(`<h2>命灯与因果</h2>${rows}<h3>前世遗憾</h3><ul>${regrets}</ul><h3>主线结局</h3><ul class="inline">${endings}</ul><h3>稀有发现</h3><ul>${disc}</ul><p class="muted">叩门 ${meta.saga.knocks} 次 · 飞升 ${meta.ascensions} 次 · 河伯 ${meta.hebo}/3</p><div class="row"><button class="btn primary">关闭</button></div>`, 'wide');
  (box.querySelector('.btn.primary') as HTMLButtonElement).onclick = closeModal;
}

function showPast() {
  const list = meta.epitaphs.length
    ? meta.epitaphs.map((e) => `<div class="epi"><b>第 ${e.life} 世 · ${esc(e.title)}</b> <em>${e.grade}</em><p>${e.lines.map(esc).join('<br>')}<br>${esc(e.death)}</p></div>`).join('')
    : '<p class="muted">还没有前世。</p>';
  const faces = meta.faces ?? [];
  const kinds = faceKinds(meta);
  const faceGrid = HOOKS.map((h) => {
    const eras = faces.filter((f) => f.hook === h.id).map((f) => ERA_BY_ID[f.era]?.name ?? f.era);
    return `<div class="face ${eras.length ? 'got' : ''}"><b>${h.id} ${h.name}</b><span>${eras.length ? eras.join('、') : h.condText}</span></div>`;
  }).join('');
  const acqs = (meta.acquaintances ?? []).filter((a) => !a.resolved);
  const acqList = acqs.length
    ? `<ul>${acqs.map((a) => `<li><b>${esc(a.name)}</b>（${RELATION_NAMES[a.relation]}）· 第 ${a.life} 世 · ${ERA_BY_ID[a.era]?.name ?? a.era} · 已 ${meta.lives - a.lastSeen} 世未见</li>`).join('')}</ul>`
    : '<p class="muted">还没有欠着谁，也没有谁欠着你。</p>';
  const legs = meta.legacies ?? [];
  const legList = legs.length
    ? `<ul>${legs.map((l) => `<li><b>${esc(l.name)}</b>（${HOLDINGS[l.type].name} ${l.lv} 级）· 第 ${l.life} 世 · ${ERA_BY_ID[l.era]?.name ?? l.era}${l.keep ? ' · 秘藏留给了后人' : ''}</li>`).join('')}</ul>`
    : '<p class="muted">还没有留下什么。把产业经营到三级以上，死后会变成后世路上的遗迹。</p>';
  const box = openModal(`<h2>前世书</h2>
    <h3>千面录 · ${kinds}/16 种引子</h3><p class="muted">集齐 3 种出现「说书人」，6 种开启轮回盘「择世」，12 种得称号「一人千面」。</p><div class="faces">${faceGrid}</div>
    <h3>故人 · ${acqs.length}/8</h3>${acqList}
    <h3>遗泽 · ${legs.length}/6</h3>${legList}
    <h3>墓志铭</h3><div class="epis">${list}</div><div class="row"><button class="btn primary">关闭</button></div>`, 'wide');
  (box.querySelector('.btn.primary') as HTMLButtonElement).onclick = closeModal;
}

function showSettings() {
  const box = openModal(`<h2>设置</h2>
    <div class="set-row"><b>自动倾向</b>${(['safe', 'chance', 'war'] as Tendency[]).map((t) => `<label><input type="radio" name="t" value="${t}" ${meta.settings.tendency === t ? 'checked' : ''}>${TEND_NAMES[t]}</label>`).join('')}</div>
    <div class="set-row"><b>音效</b><label><input type="radio" name="snd" value="on" ${soundOn() ? 'checked' : ''}>开</label><label><input type="radio" name="snd" value="off" ${!soundOn() ? 'checked' : ''}>关</label></div>
    <div class="set-row"><b>自动速度</b>${[1, 2, 4].map((s) => `<label><input type="radio" name="s" value="${s}" ${meta.settings.speed === s ? 'checked' : ''}>${s}×</label>`).join('')}</div>
    <p class="muted">自动模式替你掷骰选格、打理产业和天机格；抉择、遗迹、引子与故人、出征准备、劫气积聚的岁首和气血不足时会停下来等你。战斗：WASD / 方向键移动，触屏拖动；Q 收剑（不杀生），P 暂停。</p>
    <div class="row"><button class="btn danger" data-reset>清空存档</button><button class="btn primary" data-ok>好</button></div>`, 'mid');
  box.querySelectorAll<HTMLInputElement>('input[name=t]').forEach((r) => (r.onchange = () => { meta.settings.tendency = r.value as Tendency; saveMeta(meta); }));
  box.querySelectorAll<HTMLInputElement>('input[name=s]').forEach((r) => (r.onchange = () => { meta.settings.speed = Number(r.value); saveMeta(meta); }));
  box.querySelectorAll<HTMLInputElement>('input[name=snd]').forEach((r) => (r.onchange = () => setSound(r.value === 'on')));
  (box.querySelector('[data-ok]') as HTMLButtonElement).onclick = closeModal;
  (box.querySelector('[data-reset]') as HTMLButtonElement).onclick = () => {
    if (confirm('确定清空全部轮回数据？')) {
      resetAll();
      location.reload();
    }
  };
}

document.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((b) => {
  b.onclick = () => {
    if (modalEl.classList.contains('show') || battleEl.classList.contains('show')) return;
    if (b.dataset.open === 'panel') return togglePanel();
    togglePanel(false);
    ({ book: showBook, lamps: showLamps, past: showPast, settings: showSettings })[b.dataset.open as 'book']();
  };
});

// ---------------- 启动 ----------------
const io: IO = {
  choose,
  roll,
  battle: async (spec) => {
    await momentsIdle();
    const KIND: Record<string, string> = { beast: '妖潮', duel: '斗法', trial: '天劫' };
    moment({ kind: 'battle', big: spec.title, sub: KIND[spec.kind] ?? '劫难', line: spec.mutators.length ? `词条：${spec.mutators.map((m) => m.name).join('、')}` : '墨潮涌来。', seal: '劫' });
    await momentsIdle();
    scene.paused = true;
    const res = await runBattle(spec, battleEl, game.L.era ?? 'E1');
    scene.paused = false;
    scene.start();
    return res;
  },
  pickTalents,
  allocate,
  log,
  refresh,
  pace,
  clearLog,
};

async function main() {
  game = new Game(meta, io);
  const nextWish = (meta as typeof meta & { nextWish?: string | null }).nextWish;
  if (nextWish) game.pendingWish = nextWish;
  refresh();
  const saved = loadLife();
  if (saved) {
    const i = await choose({ title: '续档', text: `你还有一世没有过完：第 ${saved.lifeNo} 世，${cnAge(saved.age)}岁。`, options: [{ label: '继续这一世' }, { label: '放弃，重新入世' }], style: 'well' });
    if (i === 0) {
      game.L = saved;
      await game.runLife(true);
    } else {
      meta.lives = Math.max(0, saved.lifeNo - 1);
    }
  }
  for (;;) {
    const nw = (meta as typeof meta & { nextWish?: string | null }).nextWish;
    if (nw) game.pendingWish = nw;
    (meta as typeof meta & { nextWish?: string | null }).nextWish = null;
    await game.runLife(false);
    refresh();
  }
}

main();
