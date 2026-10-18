import './style.css';
import './art/art.css';
import './art/cards.css';
import { Game, IO, Prompt, skillName } from './game/engine';
import { BEAT_LABELS, CHAIN_BY_ID, activeChains } from './game/chains';
import { RollAction, RollView, autoAgain, autoDie, autoNudge, faceName, tileSceneLoc } from './game/board';
import { HOLDINGS } from './data/board';
import { loadLife, loadMeta, resetAll, saveMeta, lampOf } from './game/meta';
import { OFFER_KEY, PRESETS, SLOT_COUNT, SaveFile, applySave, currentSave, deleteSlot, fetchPreset, fileName, hasProgress, readSlot, stamp, summary, validate, writeSlot } from './game/saves';
import { runBattle } from './battle/view';
import { openBag } from './bag';
import { openTrail } from './trail-view';
import { renderEventCard, useCards } from './event-card';
import { leadLine } from './game/cards';
import { bookEntries, dizhun, enemyMul, gongLine, identityLine, identityOpen } from './game/cult';
import { ACHIEVEMENTS, GONGFA, GF_GRADES, IDENTITIES, TIER_NAMES } from './data/cult';
import { FATE_BY_ID } from './data/fate';
import { ATTR_NAMES, AttrKey, CN_NUM, REALMS, ROOTS, SCHOOL_NAMES, School, TALENT_BY_ID, Talent, cnAge } from './data/core';
import { COMPANION_NAMES, CompanionId, LEGENDS, MUTATORS, PAGES, VOLUME_NAMES, WISHES } from './data/content';
import type { LifeState, LogEntry, SkillId, Tendency } from './game/types';
import { ERA_BY_ID, HOOKS, RELATION_NAMES, faceKinds } from './data/faces';
import { LOC_BY_ID } from './data/events';
import { Scene } from './art/scene';
import { moment, momentsIdle, setMomentSpeed } from './art/moments';
import { sfx, setSound, soundOn } from './art/sound';
import { Chip, clearOutcome, playResult, showOutcome, stampCard, stampOption, sweep } from './art/feedback';
import { boardBackdrop, boardGeometry, tileGraphic, tilePosition } from './art/board';

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
    const cards = useCards(p);
    const box = openModal(
      cards ? '' : `<h2>${esc(p.title)}</h2><div class="prompt-text">${nl(p.text)}</div><div class="opts"></div><div class="hint">数字键 1～${p.options.length} 快速选择</div>`,
      `style-${p.style ?? 'event'}${cards ? ' ec-modal' : ''}`,
    );
    let stopPic = () => {};
    let opts: Element;
    if (cards) {
      // 场景卡 + 行动卡
      const r = renderEventCard(box, p, scene);
      opts = r.opts;
      stopPic = r.stop;
      r.buttons.forEach((b, i) => (b.onclick = () => done(i)));
    } else {
      opts = box.querySelector('.opts')!;
      p.options.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.disabled = !!o.disabled;
        b.innerHTML = `<b>${i + 1}. ${esc(o.label)}</b>${o.desc ? `<span>${esc(o.desc)}</span>` : ''}`;
        b.onclick = () => done(i);
        opts.appendChild(b);
      });
    }
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key) - 1;
      if (n >= 0 && n < p.options.length && !p.options[n].disabled) done(n);
      if ((e.key === 'Enter' || e.key === ' ') && p.options.length === 1) done(0);
    };
    if (p.key && BAG_KEYS.has(p.key) && game?.L?.inDao) {
      const bb = document.createElement('button');
      bb.className = 'btn sm bag-open';
      bb.textContent = '打开行囊';
      bb.onclick = () => openBag(game.L, refresh);
      box.querySelector('.hint')?.before(bb);
    }
    // 墓志铭：死后复盘这一世，也能接着看前几世
    if (p.style === 'epitaph' && game?.L?.trail?.nodes.length) {
      const rb = document.createElement('button');
      rb.className = 'btn sm bag-open';
      rb.textContent = '复盘此生';
      rb.onclick = () => openTrail(meta, game.L, { fromTop: true }); // 复盘从出生看起
      box.querySelector('.hint')?.before(rb);
    }
    window.addEventListener('keydown', onKey);
    let picked = false;
    async function done(i: number) {
      if (picked) return;
      picked = true;
      window.removeEventListener('keydown', onKey);
      sfx.pluck(i + 2, 0.35);
      // 只有两项以上的真选择才落印、记得失；「继续」「开卷」这类单按钮直接过
      if (p.options.length > 1) {
        const chosen = opts.querySelectorAll<HTMLElement>('.opt')[i];
        flyFrom = chosen ? chosen.getBoundingClientRect() : null;
        await stampOption([...opts.querySelectorAll<HTMLElement>('.opt')], i, auto);
        beginChoice(p.options[i].label);
      }
      stopPic();
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
// 骰面：九宫格里的点位，一点、四点用朱红（民间骰子的样子）
const PIP_POS: Record<number, number[]> = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
function dieFace(f: number): string {
  if (f < 1 || f > 6) return `<span class="d-char">${faceName(f)}</span>`;
  const red = f === 1 || f === 4 ? ' red' : '';
  return PIP_POS[f].map((p) => `<i class="pip${red}" style="grid-area:${Math.ceil(p / 3)}/${((p - 1) % 3) + 1}"></i>`).join('');
}
const AUTO_KEYS = new Set(['oracle', 'hold', 'build', 'holdBranch', 'retreat', 'trialInsight', 'newGong', 'yujian', 'canye']);
const BAG_KEYS = new Set(['battlePrep', 'retreat', 'market', 'gongSwap']);
const compactBoardScreen = matchMedia('(max-width: 980px), (max-height: 500px) and (pointer: coarse)');
let boardExpanded: boolean | null = null; // 未手动切换时，窄屏默认收起，桌面默认展开
let lastRollAct: RollAction['action'] | null = null;
// 上一次落子的格子与结算出来的简略结果（下一次摆盘时冒在那一格上）
let landed: { life: number; size: number; slot: number; tip?: { chips: Chip[]; caption: string | null } } | null = null;
function tileTip(v: RollView): string {
  const l = landed;
  if (!l || l.life !== game.L.lifeNo || l.size !== v.size || !l.tip || l.slot >= v.size) return '';
  const { chips, caption } = l.tip;
  l.tip = undefined;
  const body = chips.length ? chips.map((c) => `<span class="${c.tone}">${esc(c.text)}</span>`).join('') : caption ? `<span class="neutral">${esc(caption.length > 9 ? caption.slice(0, 8) + '…' : caption)}</span>` : '';
  if (!body) return '';
  return `<div class="tile-tip" style="${tilePosition(v.size, l.slot).tipStyle};animation-delay:-{D}ms"><div class="tile-tip-body">${body}</div></div>`;
}
let shownDice = '';

async function roll(v: RollView): Promise<RollAction> {
  settle();
  await momentsIdle();
  setMomentSpeed(auto ? meta.settings.speed * 1.6 : 1);
  const danger = v.gathered ? 1 : v.tiles.some((t) => t.tag === '劫') ? 0.4 : v.tiles.some((t) => t.tag === '凶') ? 0.3 : 0;
  scene.set({ mode: 'life', danger });
  const key = `${game.L.lifeNo}|${v.lap}|${v.stops}|${v.dice.join(',')}`;
  // 掷过的骰子（窥命之后回来）直接亮出；重掷的、勾了自动摇的，自己滚
  // 龙驹拨过点数：骰子已经亮着，不再重掷
  let rolled = key === shownDice || lastRollAct === 'nudge';
  if (rolled) shownDice = key;
  const autoTumble = !rolled && (lastRollAct === 'reroll' || auto || !!meta.settings.autoRoll);
  return new Promise((resolve) => {
    let peekMode = false;
    let ruyiMode = false;
    let focus: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let going = false;
    let tumbling = false;
    const n = v.size;
    const geometry = boardGeometry(n);
    const k = geometry.side;
    const targetName = (slot: number) => (slot >= n ? '过岁首' : slot === v.pos ? '原地' : v.tiles[slot].name);
    const ruyiTargets = [1, 2, 3, 4, 5, 6].map((d) => Math.min(n, v.pos + d));
    const tip = tileTip(v);
    const tip0 = performance.now();
    // 小结果停留约 2.6 秒；期间重绘（掷骰、点格）接着原来的进度淡出
    const tipHtml = () => {
      const el = performance.now() - tip0;
      return tip && el < 2600 ? tip.replace('{D}', String(Math.round(el))) : '';
    };
    const diceHtml = () => {
      if (ruyiMode) return ruyiTargets.map((s, i) => `<button class="die-btn ruyi" data-r="${i + 1}"><span class="die">${dieFace(i + 1)}</span><small>${esc(targetName(s))}</small></button>`).join('');
      if (!rolled) return `<button class="roll-btn" data-a="roll">${v.dice.map((_, i) => `<span class="die blank" style="--i:${i}">${dieFace(randFace())}</span>`).join('')}<b>掷 骰</b></button>`;
      const d = v.dice[0];
      const t = v.targets[0];
      const goText = t >= n ? '→ 过岁首' : t === v.pos ? '原地' : `→ ${targetName(t)}`;
      return `<button class="die-btn${d === 0 ? ' f-stop' : d === 7 ? ' f-dun' : d === -1 ? ' f-jie' : ''}" data-d="0"><span class="die">${dieFace(d)}</span><small>${esc(goText)}</small></button>
        <button class="again-btn" data-a="reroll" ${v.again <= 0 ? 'disabled' : ''}>${v.again > 0 ? `再摇一次<small>本世还剩 ${v.again} 次</small>` : '再摇用尽<small>事件可得</small>'}</button>`;
    };
    const render = () => {
      const mapScroll = dealEl.querySelector('.board-viewport')?.scrollLeft ?? 0;
      const controlsScroll = dealEl.scrollTop;
      const followLog = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 40;
      const activeTile = document.activeElement?.closest<HTMLButtonElement>('.tile')?.dataset.s;
      const activeAction = document.activeElement?.closest<HTMLButtonElement>('button[data-a]')?.dataset.a;
      const expanded = boardExpanded ?? !compactBoardScreen.matches;
      const targets = ruyiMode ? ruyiTargets : rolled ? v.targets : [];
      const info = focus !== null ? v.tiles[focus] : null;
      dealEl.innerHTML = `
        <div class="board s${k}${expanded ? '' : ' collapsed'}${ruyiMode ? ' choosing' : ''}${v.gathered ? ' gathered' : ''}${peekMode ? ' peeking' : ''}" style="--k:${k};--map-ratio:${geometry.ratio}">
          <div class="board-heading"><b>命途棋盘</b><span>${esc(v.stageName)} · ${n} 格</span><button class="btn sm board-toggle" data-a="board" aria-expanded="${expanded}" aria-controls="board-map-panel">${expanded ? '收起棋盘' : '展开棋盘'}</button></div>
          <div class="board-viewport" id="board-map-panel" ${expanded ? '' : 'hidden'}><div class="board-map" role="group" aria-label="${esc(v.stageName)}命途棋盘，${n}格，顺时针行进">
          ${boardBackdrop(n, esc(v.stageName))}
          ${v.tiles
            .map((t) => {
              const cls = [
                'tile',
                `k-${t.kind}`,
                t.tag ? TAG_CLASS[t.tag] : '',
                t.slot === v.pos ? 'here' : '',
                targets.includes(t.slot) && t.slot !== v.pos ? 'target' : '',
                t.visited && t.slot !== v.pos ? 'visited' : '',
                peekMode && t.canPeek ? 'peekable' : '',
                t.peek ? 'peeked' : '',
                focus === t.slot ? 'focused' : '',
                targets.some((target) => t.slot > v.pos && t.slot < Math.min(target, n)) ? 'in-path' : '',
              ].filter(Boolean).join(' ');
              const description = [t.month, t.name, t.tag && t.tag !== '平' ? t.tag : '', t.lv ? `${t.lv}级` : '', t.slot === v.pos ? '当前位置' : '', targets.includes(t.slot) ? '可前往' : '', t.peek ? '窥得：' + t.peek : t.hint].filter(Boolean).join('，');
              return `<button class="${cls}" data-s="${t.slot}" style="${tilePosition(n, t.slot).style}" aria-label="${esc(description)}" aria-pressed="${focus === t.slot}" ${t.slot === v.pos ? 'aria-current="location"' : ''} title="${esc(description)}">
                ${tileGraphic(t, v.stage)}
                <span class="t-month">${esc(t.month)}</span>
                <span class="t-name">${esc(t.name)}</span>
                ${t.tag && t.tag !== '平' ? `<span class="t-tag">${t.tag}</span>` : ''}
                ${t.lv ? `<span class="t-lv">${t.lv}</span>` : ''}
              </button>`;
            })
            .join('')}
          ${tipHtml()}
          </div></div>
          <div class="board-center">
            <div class="board-reading">
            <div class="sign${v.gathered ? ' gathered' : ''}"><span>${esc(v.sign)}</span></div>
            <div class="b-info" role="status" aria-live="polite">${
              info
                ? `<b>${esc(info.name)}</b> ${esc(info.peek ? '窥得：' + info.peek : info.hint)}`
                : peekMode
                  ? '点一格地点，窥它这一圈会发生什么'
                  : ruyiMode
                    ? '如意骰：任选点数'
                    : `所在：${esc(v.tiles[v.pos].name)} · 第 ${v.lap + 1} 圈 · 一圈 ${v.years} 年 · 已停 ${v.stops}/${v.maxStops}`
            }</div>
            </div><div class="dice">${diceHtml()}</div>
          </div>
        </div>
        <div class="deal-actions">
          <button class="btn ${peekMode ? 'active' : ''}" data-a="peek" ${v.rerolls <= 0 ? 'disabled' : ''}>改命·窥命（${v.rerolls}）</button>
          ${rolled && v.nudge ? `<button class="btn" data-a="nudge-" ${v.dice[0] <= 1 ? 'disabled' : ''}>龙驹 −1</button><button class="btn" data-a="nudge+" ${v.dice[0] >= 6 ? 'disabled' : ''}>龙驹 +1</button>` : ''}
          ${v.ruyi > 0 ? `<button class="btn ${ruyiMode ? 'active' : ''}" data-a="ruyi">如意骰（${v.ruyi}）</button>` : ''}
          ${v.canRewind ? '<button class="btn" data-a="rewind">掌天瓶·回溯</button>' : ''}
          <label class="btn chk"><input type="checkbox" data-a="autoroll" ${meta.settings.autoRoll ? 'checked' : ''}>自动摇</label>
          <button class="btn ${auto ? 'active' : ''}" data-a="auto">${auto ? '自动中' : '自动'}（${TEND_NAMES[meta.settings.tendency]}）</button>
        </div>`;
      const viewport = dealEl.querySelector('.board-viewport');
      if (viewport) viewport.scrollLeft = mapScroll;
      dealEl.scrollTop = controlsScroll;
      if (followLog) scrollEl.scrollTop = scrollEl.scrollHeight;
      if (activeTile !== undefined && expanded) dealEl.querySelector<HTMLButtonElement>(`.tile[data-s="${activeTile}"]`)?.focus({ preventScroll: true });
      else if (activeAction !== undefined) dealEl.querySelector<HTMLButtonElement>(`button[data-a="${activeAction}"]`)?.focus({ preventScroll: true });
      dealEl.querySelectorAll<HTMLButtonElement>('.tile').forEach((b) => (b.onclick = () => tapTile(Number(b.dataset.s))));
      dealEl.querySelectorAll<HTMLButtonElement>('.die-btn[data-d]').forEach((b) => (b.onclick = () => go(Number(b.dataset.d))));
      dealEl.querySelectorAll<HTMLButtonElement>('.die-btn[data-r]').forEach((b) => (b.onclick = () => go(-1, Number(b.dataset.r))));
      const ar = dealEl.querySelector<HTMLInputElement>('input[data-a="autoroll"]');
      if (ar)
        ar.onchange = () => {
          meta.settings.autoRoll = ar.checked;
          saveMeta(meta);
          if (ar.checked && !rolled) void tumble();
        };
      dealEl.querySelectorAll<HTMLButtonElement>('button[data-a]').forEach((b) => {
        b.onclick = () => {
          const a = b.dataset.a;
          sfx.tap();
          if (a === 'board') {
            boardExpanded = !expanded;
            if (!boardExpanded) peekMode = false;
            render();
          } else if (a === 'roll') void tumble();
          else if (a === 'reroll') finish({ action: 'reroll' });
          else if (a === 'nudge-' || a === 'nudge+') finish({ action: 'nudge', d: a === 'nudge+' ? 1 : -1 });
          else if (a === 'peek') {
            peekMode = !peekMode;
            if (peekMode) boardExpanded = true;
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
    // 掷骰：骰子在盘心翻滚一阵，再定下点数
    async function tumble() {
      if (rolled || tumbling) return;
      tumbling = true;
      peekMode = false;
      ruyiMode = false;
      const box = dealEl.querySelector('.dice');
      if (box) {
        box.innerHTML = v.dice.map((_, i) => `<span class="die-btn"><span class="die rolling" style="--i:${i}">${dieFace(randFace())}</span><small>&nbsp;</small></span>`).join('');
        const els = [...box.querySelectorAll<HTMLElement>('.die')];
        const t0 = performance.now();
        const dur = auto ? 260 / meta.settings.speed : 620;
        while (performance.now() - t0 < dur) {
          els.forEach((el) => (el.innerHTML = dieFace(randFace())));
          sfx.tap();
          await sleep(auto ? 50 : 85);
        }
      }
      rolled = true;
      tumbling = false;
      shownDice = key;
      render();
      dealEl.querySelectorAll('.die-btn .die').forEach((el) => el.classList.add('landed'));
      sfx.pluck(3, 0.35);
      if (auto) scheduleAuto();
    }
    const tapTile = (slot: number) => {
      if (going || tumbling) return;
      const t = v.tiles[slot];
      if (peekMode) {
        if (t.canPeek) finish({ action: 'peek', slot });
        return;
      }
      if (ruyiMode) {
        const i = ruyiTargets.indexOf(slot);
        if (i >= 0 && slot !== v.pos) return go(-1, i + 1);
      } else if (rolled) {
        const i = v.targets.indexOf(slot);
        if (i >= 0 && slot !== v.pos && focus === slot) return go(i);
      }
      focus = focus === slot ? null : slot;
      render();
    };
    // 落子：棋子一格一格走过去，再盖「定」字
    const go = async (die: number, ruyi?: number) => {
      if (going || tumbling || (!ruyi && !rolled)) return;
      going = true;
      const to = ruyi ? ruyiTargets[ruyi - 1] : v.targets[die];
      const face = ruyi ?? v.dice[die];
      sfx.pluck(Math.max(0, Math.min(6, face)), 0.45);
      clearOutcome();
      const tiles = [...dealEl.querySelectorAll<HTMLButtonElement>('.tile')];
      const step = auto ? 50 / meta.settings.speed : 110;
      for (let s = v.pos + 1; s <= Math.min(to, n - 1); s++) {
        tiles.forEach((el) => { el.classList.remove('here'); el.removeAttribute('aria-current'); });
        tiles[s]?.classList.add('here', 'passing');
        tiles[s]?.setAttribute('aria-current', 'location');
        await sleep(step);
      }
      const act: RollAction = ruyi ? { action: 'ruyi', value: ruyi } : { action: 'go', die };
      landed = to < n && to !== v.pos ? { life: game.L.lifeNo, size: n, slot: to } : null;
      if (to < n && to !== v.pos) {
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
      const control = e.target instanceof Element ? e.target.closest('button, input, select, textarea, a, [contenteditable="true"]') : null;
      if (control && (control.matches('input, select, textarea, [contenteditable="true"]') || e.key === 'Enter' || e.key === ' ')) return;
      if ((e.key === ' ' || e.key === 'Enter') && !rolled) {
        e.preventDefault();
        void tumble();
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && rolled && v.again > 0 && !going) {
        finish({ action: 'reroll' });
        return;
      }
      const d = Number(e.key) - 1;
      if (ruyiMode && d >= 0 && d < 6) go(-1, d + 1);
      else if (d >= 0 && d < v.dice.length) go(d);
    };
    window.addEventListener('keydown', onKey);
    const onBoardScreen = () => render();
    compactBoardScreen.addEventListener('change', onBoardScreen);
    function finish(a: RollAction) {
      if (timer) clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      compactBoardScreen.removeEventListener('change', onBoardScreen);
      lastRollAct = a.action;
      dealEl.innerHTML = '';
      resolve(a);
    }
    function scheduleAuto() {
      if (!rolled) return void tumble();
      const L = game.L;
      const reach = v.targets.filter((s) => s < n).map((s) => v.tiles[s]);
      const lowHp = L.hp < L.maxHp * 0.3 && reach.some((t) => t.tag === '劫');
      const story = reach.find((t) => t.tag === '引' || t.tag === '故' || t.kind === 'ruin' || t.kind === 'chain');
      if ((v.gathered && v.stops === 0) || lowHp || story) {
        auto = false;
        render();
        flash(story ? `「${story.name}」就在前面，自动暂停` : lowHp ? '气血低于三成，自动暂停' : '劫气积聚，自动暂停');
        return;
      }
      timer = setTimeout(() => {
        if (going) return;
        const nd = autoNudge(v, meta.settings.tendency, L);
        if (nd) finish({ action: 'nudge', d: nd });
        else if (autoAgain(v, meta.settings.tendency, L)) finish({ action: 'reroll' });
        else void go(autoDie(v, meta.settings.tendency, L, Math.random));
      }, 380 / meta.settings.speed);
    }
    render();
    if (autoTumble) void tumble();
    else if (auto) scheduleAuto();
  });
}
const randFace = () => 1 + Math.floor(Math.random() * 6);

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
  qi: Record<string, number>;
  xinde: number;
  fj: number;
  traces: number;
  partner: boolean;
  pet: string | null;
  gains: string[];
  chains: number;
  acq: number;
  disciples: number;
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
    qi: Object.fromEntries((L.bag ?? []).map((t) => [String(t.uid), t.grade])),
    xinde: L.xinde ?? 0,
    fj: (L.fjBag?.length ?? 0) + (L.bag ?? []).reduce((a, t) => a + (t.fj?.length ?? 0), 0),
    traces: L.traces.length,
    partner: !!L.partner,
    pet: L.pet?.name ?? null,
    gains: (L.gains ?? []).map((g) => g.name),
    chains: activeChains(L).length,
    acq: game.M.acquaintances?.length ?? 0,
    disciples: L.disciples ?? 0,
  };
}
let pending: { snap: Stats; label: string; caption: string | null; judge?: string } | null = null;
let flyFrom: DOMRect | null = null; // 刚选中的那张行动卡，结果从这里飞出去
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
    if (!a.skills[id]) out.push({ text: `习得${skillName(id as SkillId)}`, tone: 'gold' });
    else if (lvl > a.skills[id]) out.push({ text: `${skillName(id as SkillId)} ${lvl >= 5 ? '圆满' : CN_NUM[lvl] + '层'}`, tone: 'gold' });
  }
  for (const uid of Object.keys(b.qi)) if (a.qi[uid] === undefined) out.push({ text: '得一件法宝', tone: 'gold' });
  if (b.fj > a.fj) out.push({ text: `附诀 +${b.fj - a.fj}`, tone: 'gold' });
  num('心得', b.xinde - a.xinde);
  if (b.partner && !a.partner) out.push({ text: '结为道侣', tone: 'gold' });
  if (b.pet && b.pet !== a.pet) out.push({ text: `得灵宠「${b.pet}」`, tone: 'gold' });
  for (const g of b.gains) if (!a.gains.includes(g)) out.push({ text: `得「${g}」`, tone: 'gold' });
  if (b.disciples > a.disciples) out.push({ text: '收徒', tone: 'gold' });
  if (b.chains > a.chains) out.push({ text: '结下一段缘', tone: 'gold' });
  if (b.acq > a.acq) out.push({ text: '结识故人', tone: 'neutral' });
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
  // 结算一句话：判定成败 + 结果原文的第一句；什么都没变就说一声
  let line = p.caption ? leadLine(p.caption).lead : null;
  if (p.judge) line = p.judge + (line ?? '');
  if (line && line.length > 52) line = line.slice(0, 51) + '…';
  if (!line && !chips.length && p.label && flyFrom) line = `「${p.label}」，此事就此了了。`;
  const speed = auto ? meta.settings.speed * 1.6 : 1;
  showOutcome(sceneHost, line, chips, speed);
  playResult(chips, flyFrom, sceneHost, speed);
  flyFrom = null;
  // 棋盘上落子的那一格，冒一个简略结果
  if (landed) landed.tip = { chips: chips.slice(0, 3), caption: line };
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
  if (pending && !replaying && e.kind !== 'death' && !/^【/.test(e.text)) {
    // 「……你选择了「X」。」是复述，不算结果；判定成败单独记
    const j = e.text.match(/^（(.{2})判定(成功|失败)）$/);
    if (j) pending.judge = j[2] === '成功' ? '成了。' : '没成。';
    else if (!pending.caption && !e.text.includes('你选择了「')) pending.caption = e.text;
  }
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

// 缘与收获：道侣、灵宠、随身前辈这类，和手上没走完的因果链
function gainBlock(L: LifeState): string {
  const chips: string[] = [];
  if (L.partner) chips.push(`<span class="chip">道侣 · ${esc(L.partnerName ?? '道侣')}</span>`);
  if (L.pet) chips.push(`<span class="chip" title="灵宠 ${L.pet.lv} 级">灵宠 · ${esc(L.pet.name)} ${L.pet.lv} 级</span>`);
  for (const g of L.gains ?? []) chips.push(`<span class="chip" title="${esc(g.desc ?? '')}">${esc(g.name)}</span>`);
  for (const c of activeChains(L)) {
    const d = CHAIN_BY_ID[c.id];
    if (d) chips.push(`<span class="chip trace" title="${esc(d.gain)}">缘 · ${esc(d.name)}（${BEAT_LABELS[Math.min(3, c.beat)]}）</span>`);
  }
  return chips.length ? `<h4>缘与收获</h4><div class="chips">${chips.join('')}</div>` : '';
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
      <span>出身</span><b class="small" title="${esc(L.origin)}">${esc(identityLine(L))}</b>
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
    ${gainBlock(L)}
    ${gongBlock(L)}
    ${wish ? `<h4>心愿</h4><div class="wish ${L.wish!.done ? 'done' : ''}">「${wish.name}」${wish.cond}<br>${bar(L.wish!.progress, 1, 'wishbar', L.wish!.done ? '圆满' : Math.round(L.wish!.progress * 100) + '%')}</div>` : ''}
    ${L.traces.length ? `<h4>本世痕迹</h4><div class="chips">${L.traces.map((t) => `<span class="chip trace" title="${MUTATORS.find((m) => m.trace === t.tag)?.name ?? ''}">${MUTATORS.find((m) => m.trace === t.tag)?.name ?? t.tag}</span>`).join('')}</div>` : ''}
    <h4>命灯</h4><div class="lamps">${lamps}</div>`;
  const close = panelEl.querySelector<HTMLButtonElement>('[data-close]');
  if (close) close.onclick = () => togglePanel(false);
  const bagBtn = panelEl.querySelector<HTMLButtonElement>('[data-bag]');
  if (bagBtn) bagBtn.onclick = () => openBag(L, refresh);
}

// 角色面板：功法、心得与法宝一览
function gongBlock(L: LifeState) {
  const rows = L.skills
    .map((s) => {
      const g = gongLine(L, s);
      return `<div class="gong-row"><b>${esc(g.name)}${s.bm ? '<i class="bm">本命</i>' : ''}</b><span>${g.grade} · ${g.layer}<small>/${g.cap}</small></span><small class="${g.qi === '无器可御' || g.qi.includes('器不承法') ? 'warn' : ''}">${esc(g.qi)}${g.fj.length ? ' · ' + g.fj.join('、') : ''}</small></div>`;
    })
    .join('');
  const items = (L.bag ?? []).filter((t) => t.kind !== 'gong' && (L.load?.passive.includes(t.uid) || L.load?.active.includes(t.uid)));
  return `<h4>功法 <button class="btn sm" data-bag>行囊</button></h4>
    <div class="gong-list">${rows || `<p class="muted">${L.inDao ? '无' : '入道后择本命功法，法宝与附诀也在行囊里管理。'}</p>`}</div>
    <div class="p-row small"><span>心得 ${L.xinde ?? 0}</span><span>${items.length ? items.map((t) => t.name).join('、') : '未带法宝'}</span></div>`;
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
  const C = meta.cult ?? { book: {}, mortalStreak: 0, saves: 0, newAch: [] };
  const bookRows = (Object.keys(C.book) as SkillId[]).map((id) => {
    const be = C.book[id]!;
    return `<li><b>${GONGFA[id].name}</b> ${GF_GRADES[be.grade]} · 最高${['', '一层', '二层', '三层', '四层', '圆满'][be.best]}${be.fj.length ? ' · 附诀 ' + be.fj.length : ''}</li>`;
  }).join('');
  const steles = ACHIEVEMENTS.map((a) => {
    const got = meta.achievements.includes(a.id);
    return `<div class="face ${got ? 'got' : ''}"><b>${a.id} ${got ? a.name : '？'}</b><span>${got ? a.reward : a.cond}</span></div>`;
  }).join('');
  const idOpen = IDENTITIES.filter((d) => identityOpen(meta, d.id));
  const box = openModal(`<h2>前世书</h2>
    <h3>轮回碑 · ${meta.achievements.length}/${ACHIEVEMENTS.length}</h3><p class="muted">身份随机抽取：凡俗 / 小富 / 宗门 / 顶级。已开身份 ${idOpen.length}/${IDENTITIES.length}：${idOpen.map((d) => `${TIER_NAMES[d.tier].slice(0, 1)}·${d.name}`).join('、')}</p><div class="faces">${steles}</div>
    <h3>功法谱 · 收录 ${bookEntries(meta)} · 底蕴 ${dizhun(meta)}</h3><p class="muted">前世练到的层数让闭关更省（70% / 50% / 35% / 25%），附诀随功法谱转世。底蕴让劫难 ×${enemyMul(meta).toFixed(2)}（至多 1.5）。</p>${bookRows ? `<ul>${bookRows}</ul>` : '<p class="muted">还是空的。</p>'}
    <h3>千面录 · ${kinds}/16 种引子</h3><p class="muted">集齐 3 种出现「说书人」，6 种开启轮回盘「择世」，12 种得称号「一人千面」。</p><div class="faces">${faceGrid}</div>
    <h3>故人 · ${acqs.length}/8</h3>${acqList}
    <h3>遗泽 · ${legs.length}/6</h3>${legList}
    <h3>墓志铭</h3><div class="epis">${list}</div><div class="row"><button class="btn primary">关闭</button></div>`, 'wide');
  (box.querySelector('.btn.primary') as HTMLButtonElement).onclick = closeModal;
}

function showTrail() {
  togglePanel(false);
  openTrail(meta, game?.L ?? null);
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


// ---------------- 存档 ----------------
function loadAndReload(f: SaveFile, backup = true) {
  const err = applySave(f, backup);
  if (err) return alert(err);
  location.reload();
}

function downloadSave(f: SaveFile) {
  const blob = new Blob([JSON.stringify(f)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName(f);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const OVERWRITE = '读档后当前进度会先自动备份到「自动备份」，再换成这份。确定？';

function showSaves() {
  const cur = currentSave();
  const slotRow = (n: number | 'backup', f: SaveFile | null) => {
    const label = n === 'backup' ? '自动备份' : `档位 ${n}`;
    const body = f ? `<b>${label} · ${esc(f.name)}</b><span>${esc(summary(f))}</span><small>${stamp(f.savedAt)}</small>` : `<b>${label}</b><span class="muted">空</span>`;
    const btns =
      (n !== 'backup' ? `<button class="btn sm" data-save="${n}" ${hasProgress(cur) ? '' : 'disabled'}>存到这里</button>` : '') +
      `<button class="btn sm" data-load="${n}" ${f ? '' : 'disabled'}>读取</button>` +
      `<button class="btn sm" data-exp="${n}" ${f ? '' : 'disabled'}>导出</button>` +
      `<button class="btn sm danger" data-del="${n}" ${f ? '' : 'disabled'}>删除</button>`;
    return `<div class="save-slot ${f ? '' : 'empty'}"><div class="save-info">${body}</div><div class="save-btns">${btns}</div></div>`;
  };
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => slotRow(i + 1, readSlot(i + 1))).join('');
  const backup = readSlot('backup');
  const presets = PRESETS.map((p) => `<div class="save-slot"><div class="save-info"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></div><div class="save-btns"><button class="btn sm primary" data-preset="${p.id}">载入</button></div></div>`).join('');
  // 独立浮层：抉择弹窗开着时也能存读档，关掉后原来的弹窗还在
  document.querySelector('.saves-root')?.remove();
  togglePanel(false);
  const root = document.createElement('div');
  root.className = 'modal-root show saves-root';
  root.innerHTML = `<div class="modal wide"><div class="modal-box"><h2>存档</h2>
    <h3>当前进度</h3>
    <div class="save-slot cur"><div class="save-info"><b>${esc(cur.name)}</b><span>${esc(summary(cur))}</span><small>每年岁末自动记下，刷新页面从这里接着玩</small></div><div class="save-btns"><button class="btn sm" data-exp="cur" ${hasProgress(cur) ? '' : 'disabled'}>导出</button></div></div>
    <h3>手动档位</h3><p class="muted">「存到这里」记的是最近一个岁末的进度。读档前，当前进度会先放进「自动备份」，读错了还能读回来。</p>
    <div class="save-list">${slots}${backup ? slotRow('backup', backup) : ''}</div>
    <h3>预置存档</h3><div class="save-list">${presets}</div>
    <div class="row"><button class="btn" data-import>从文件导入</button><button class="btn primary" data-ok>关闭</button></div>
    <input type="file" accept=".json,application/json" hidden data-file></div></div>`;
  document.body.appendChild(root);
  const box = root.querySelector('.modal-box') as HTMLElement;
  const close = () => root.remove();
  root.querySelector('.modal')!.addEventListener('click', (e) => e.target === e.currentTarget && close());
  const slotOf = (v: string) => (v === 'backup' ? 'backup' : Number(v));
  box.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((b) => (b.onclick = () => {
    const n = Number(b.dataset.save);
    const old = readSlot(n);
    if (old && !confirm(`档位 ${n} 已有「${old.name}」，覆盖它？`)) return;
    const err = writeSlot(n, currentSave());
    if (err) return alert(err);
    showSaves();
  }));
  box.querySelectorAll<HTMLButtonElement>('[data-load]').forEach((b) => (b.onclick = () => {
    const f = readSlot(slotOf(b.dataset.load!));
    if (!f) return;
    // 读「自动备份」本身时不再备份，免得把它盖掉
    if (b.dataset.load === 'backup') {
      if (confirm('读回自动备份？当前进度会被换掉（不再另做备份）。')) loadAndReload(f, false);
    } else if (!hasProgress(cur) || confirm(OVERWRITE)) loadAndReload(f);
  }));
  box.querySelectorAll<HTMLButtonElement>('[data-exp]').forEach((b) => (b.onclick = () => {
    const f = b.dataset.exp === 'cur' ? currentSave() : readSlot(slotOf(b.dataset.exp!));
    if (f) downloadSave(f);
  }));
  box.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => (b.onclick = () => {
    const n = slotOf(b.dataset.del!);
    if (confirm(`删除${n === 'backup' ? '自动备份' : `档位 ${n}`}？`)) {
      deleteSlot(n);
      showSaves();
    }
  }));
  box.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => (b.onclick = async () => {
    const p = PRESETS.find((x) => x.id === b.dataset.preset)!;
    if (hasProgress(cur) && !confirm(OVERWRITE)) return;
    b.disabled = true;
    b.textContent = '载入中';
    try {
      loadAndReload(await fetchPreset(p));
    } catch (e) {
      alert((e as Error).message);
      b.disabled = false;
      b.textContent = '载入';
    }
  }));
  const fileEl = box.querySelector('[data-file]') as HTMLInputElement;
  (box.querySelector('[data-import]') as HTMLButtonElement).onclick = () => fileEl.click();
  fileEl.onchange = async () => {
    const file = fileEl.files?.[0];
    if (!file) return;
    let f: SaveFile | null = null;
    try {
      f = validate(JSON.parse(await file.text()));
    } catch {
      f = null;
    }
    if (!f) return alert('这个文件不是本游戏导出的存档。');
    if (!hasProgress(cur) || confirm(`导入「${f.name}」（${summary(f)}）？\n${OVERWRITE}`)) loadAndReload(f);
  };
  (box.querySelector('[data-ok]') as HTMLButtonElement).onclick = close;
}

// 第一次打开带存档系统的版本：问一次要不要载入预置的二十世存档
async function offerPreset() {
  try {
    if (localStorage.getItem(OFFER_KEY)) return;
    localStorage.setItem(OFFER_KEY, '1');
  } catch {
    return;
  }
  const cur = currentSave();
  const p = PRESETS[0];
  const text = hasProgress(cur)
    ? `新加了存档系统（顶栏「存档」）：三个手动档位，能导出导入。\n\n附带一份${p.name}：${p.desc}\n\n要现在载入吗？你现在的进度（${summary(cur)}）会先放进「自动备份」，随时能读回来。`
    : `新加了存档系统（顶栏「存档」）。\n\n附带一份${p.name}：${p.desc}\n\n要直接从第二十一世玩起吗？`;
  const i = await choose({ title: '存档', text, options: [{ label: `载入${p.name}` }, { label: hasProgress(cur) ? '不了，接着玩我的' : '不了，从第一世开始' }], style: 'well' });
  if (i !== 0) return;
  try {
    loadAndReload(await fetchPreset(p));
    await new Promise(() => {}); // 等刷新
  } catch (e) {
    alert((e as Error).message);
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((b) => {
  b.onclick = () => {
    if (battleEl.classList.contains('show')) return;
    // 行囊是独立浮层，弹窗开着也能看
    if (b.dataset.open === 'bag') {
      if (game?.L) openBag(game.L, refresh);
      return;
    }
    // 经历图谱也是独立浮层：结算时也能复盘
    if (b.dataset.open === 'trail') return showTrail();
    // 存档也是独立浮层：随时能存读
    if (b.dataset.open === 'saves') return showSaves();
    if (modalEl.classList.contains('show')) return;
    if (b.dataset.open === 'panel') return togglePanel();
    togglePanel(false);
    ({ book: showBook, lamps: showLamps, past: showPast, trail: showTrail, settings: showSettings })[b.dataset.open as 'book']();
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
  await offerPreset();
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
