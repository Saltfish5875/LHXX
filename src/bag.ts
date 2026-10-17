// 行囊：卷轴式界面。左边是打坐的自己与身边的功法位、随身位、符丹位，下面是加成；
// 右边按类别翻看行囊里的东西。点任何一格看详情，装备、取下、换法宝、挂附诀都在详情里。
import './bag.css';
import type { LifeState, Skill, SkillId, Treasure } from './game/types';
import { autoEquip, battleGong, ensureCult, gongLine, layerCap, qiFor, slotCount } from './game/cult';
import { ACTIVE_MAX, FJ_SLOTS, FUJUE, GF_GRADES, GF_MIN_QI, GONGFA, ITEMS, LAYER_NAMES, PASSIVE_MAX, QI_GRADES, SLOTS_BY_REALM } from './data/cult';
import { ATTR_NAMES, REALMS, type AttrKey } from './data/core';
import { fjIcon, itemIcon, qiIcon, sitterSvg } from './art/icons';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

type Tab = 'all' | 'gong' | 'passive' | 'active' | 'fj';
const TABS: [Tab, string][] = [
  ['all', '全部'],
  ['gong', '法宝'],
  ['passive', '随身'],
  ['active', '符丹'],
  ['fj', '附诀'],
];
type Sel =
  | { t: 'skill'; id: SkillId }
  | { t: 'item'; uid: number }
  | { t: 'fj'; i: number }
  | { t: 'empty'; kind: 'gong' | 'passive' | 'active'; locked?: number };

// 记住上次翻到的页签（同一次打开网页内）
let lastTab: Tab = 'all';

const GRADE_SHORT = ['凡', '法', '灵', '宝', '仙'];
const REALM_FOR_SLOT = (n: number) => SLOTS_BY_REALM.findIndex((c) => c > n);

function treasureIcon(t: Treasure) {
  return t.kind === 'gong' ? qiIcon(GONGFA[t.key as SkillId].qi, t.grade) : itemIcon(t.key);
}
function usesText(t: Treasure) {
  const it = ITEMS[t.key];
  if (!it) return '';
  if (t.kind === 'active') return it.cells ? `充${it.cells}` : `×${t.uses ?? 0}`;
  if (t.key === 'hushen') return `×${t.uses ?? 0}`;
  return '';
}

export function openBag(L: LifeState, onChange: () => void) {
  ensureCult(L);
  document.querySelector('.bag-root')?.remove();
  const root = document.createElement('div');
  root.className = 'bag-root';
  document.body.appendChild(root);
  let tab: Tab = lastTab;
  let page = 0;
  let sel: Sel | null = null;
  let note = '';
  const close = () => {
    root.remove();
    window.removeEventListener('keydown', onKey);
    onChange();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (sel) {
      sel = null;
      render();
    } else close();
  };
  window.addEventListener('keydown', onKey);
  root.onclick = (e) => {
    if (e.target === root || (e.target as HTMLElement).classList.contains('nb-hint')) close();
  };

  const bag = () => L.bag!;
  const ld = () => L.load!;
  const isOn = (t: Treasure) =>
    t.kind === 'gong' ? L.skills.some((s) => qiFor(L, s.id)?.uid === t.uid) : t.kind === 'passive' ? ld().passive.includes(t.uid) : ld().active.includes(t.uid);
  const byUid = (u: number) => bag().find((t) => t.uid === u);

  // ---------- 左：打坐的自己与身边各位 ----------
  const tile = (inner: string, cls: string, data: string, tag = '', corner = '', title = '') =>
    `<button class="nb-tile ${cls}" ${data} title="${esc(title)}">${inner}${tag ? `<i class="nb-tag">${tag}</i>` : ''}${corner ? `<i class="nb-corner">${corner}</i>` : ''}</button>`;
  const skillSlot = (i: number) => {
    const s = L.skills[i];
    const cap = slotCount(L);
    if (!s) {
      if (i >= cap) {
        const r = REALM_FOR_SLOT(i);
        return tile(`<span class="nb-empty">${r > 0 ? REALMS[r].name : ''}开</span>`, 'slot locked', `data-empty="gong:${r}"`, '', '', '功法位未开');
      }
      return tile(`<span class="nb-empty">功法</span>`, 'slot', `data-empty="gong"`, '', '', '空功法位');
    }
    const t = qiFor(L, s.id);
    const weak = t && t.grade < GF_MIN_QI[s.grade ?? 0];
    const inner = t ? treasureIcon(t) : `<span class="nb-glyph">${GONGFA[s.id].short[0]}</span>`;
    return tile(inner, `slot g${t?.grade ?? 0} ${t ? '' : 'noqi'} ${weak ? 'weak' : ''}`, `data-skill="${s.id}"`, GONGFA[s.id].short, `${GF_GRADES[s.grade ?? 0][0]}${s.lvl >= 5 ? '满' : s.lvl}`, GONGFA[s.id].name);
  };
  const equipSlot = (kind: 'passive' | 'active', i: number) => {
    const t = byUid(ld()[kind][i]);
    if (!t) return tile(`<span class="nb-empty">${kind === 'passive' ? '随身' : '符丹'}</span>`, 'slot sm', `data-empty="${kind}"`);
    return tile(treasureIcon(t), `slot sm ${kind}`, `data-item="${t.uid}"`, '', usesText(t), t.name);
  };

  // ---------- 左下：加成 ----------
  const statsPanel = () => {
    const { gong, idle } = battleGong(L);
    const realm = L.inDao ? REALMS[L.realm].name : '凡人';
    const attrs = (Object.keys(ATTR_NAMES) as AttrKey[]).map((k) => `<span>${ATTR_NAMES[k]}<b>${L.attrs[k]}</b></span>`).join('');
    const gl = gong.map((g) => `<li><span>${esc(g.name)}</span><b class="${g.weak ? 'warn' : ''}">威力 ×${g.mul.toFixed(2)}</b>${g.fj.length ? `<small>${g.fj.map((f) => FUJUE[f].name).join('·')}</small>` : ''}</li>`).join('');
    const il = idle.map((n) => `<li><span>${esc(n.replace(/[《》]/g, ''))}</span><b class="warn">无器可御</b></li>`).join('');
    const ps = ld().passive.map(byUid).filter((t): t is Treasure => !!t).map((t) => `<li class="p"><span>${t.name}</span><small>${esc(ITEMS[t.key].desc)}</small></li>`).join('');
    return `<div class="nb-stats">
      <div class="nb-st-head"><b>${realm}</b><span>气血 ${Math.round(L.hp)}/${Math.round(L.maxHp)}</span></div>
      <div class="nb-attrs">${attrs}</div>
      ${gl || il ? `<h5>功法</h5><ul>${gl}${il}</ul>` : ''}
      ${ps ? `<h5>随身</h5><ul>${ps}</ul>` : ''}
      <div class="nb-st-foot"><span>灵石 ${L.stones}</span><span>心得 ${L.xinde ?? 0}</span><span>功法位 ${L.skills.length}/${slotCount(L)}</span></div>
    </div>`;
  };

  // ---------- 右：页签与格子 ----------
  type Cell = { kind: 'item'; t: Treasure } | { kind: 'fj'; i: number };
  const cells = (): Cell[] => {
    const items = (k: Treasure['kind']) => bag().filter((t) => t.kind === k).map((t): Cell => ({ kind: 'item', t }));
    const fjs = L.fjBag!.map((_, i): Cell => ({ kind: 'fj', i }));
    if (tab === 'gong') return items('gong');
    if (tab === 'passive') return items('passive');
    if (tab === 'active') return items('active');
    if (tab === 'fj') return fjs;
    return [...items('gong'), ...items('passive'), ...items('active'), ...fjs];
  };
  const perPage = () => (window.matchMedia('(min-width: 760px)').matches ? 20 : 15);
  const grid = () => {
    const all = cells();
    const per = perPage();
    const pages = Math.max(1, Math.ceil(all.length / per));
    page = Math.min(page, pages - 1);
    const shown = all.slice(page * per, page * per + per);
    const html = shown
      .map((c) => {
        if (c.kind === 'fj') {
          const f = FUJUE[L.fjBag![c.i]];
          return tile(fjIcon(f.name, f.chain), 'cell fj', `data-fj="${c.i}"`, '', '', f.name);
        }
        const t = c.t;
        const idle = t.kind === 'gong' && !L.skills.some((s) => s.id === t.key);
        const corner = t.kind === 'gong' ? GRADE_SHORT[t.grade] : usesText(t);
        return tile(treasureIcon(t), `cell ${t.kind === 'gong' ? 'g' + t.grade : t.kind} ${isOn(t) ? 'on' : ''} ${idle ? 'idle' : ''}`, `data-item="${t.uid}"`, isOn(t) ? '装' : '', corner, t.name);
      })
      .join('');
    const pads = Array.from({ length: per - shown.length }, () => `<span class="nb-tile cell pad"></span>`).join('');
    const tabs = TABS.map(([k, n]) => `<button class="nb-tab ${k === tab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('');
    const empty = !all.length ? `<p class="nb-none">${tab === 'fj' ? '没有未挂的附诀。' : '这一类还空着。'}</p>` : '';
    return `<div class="nb-tabs">${tabs}</div>
      <div class="nb-grid-wrap"><div class="nb-grid">${html}${pads}</div>${empty}
      <div class="nb-pager"><button data-pg="-1" ${page ? '' : 'disabled'}>‹</button><span>${page + 1}/${pages}</span><button data-pg="1" ${page < pages - 1 ? '' : 'disabled'}>›</button></div></div>`;
  };

  // ---------- 详情 ----------
  const fjSlots = (t: Treasure) => {
    const n = FJ_SLOTS[t.grade];
    if (!n) return `<p class="nb-muted">凡器没有附诀位；法器 1、灵器 2、宝器以上 3。</p>`;
    const on = t.fj ?? [];
    const boxes = Array.from({ length: n }, (_, i) => {
      const f = on[i];
      return f
        ? `<button class="nb-fj on" data-unfj="${t.uid}:${i}" title="${esc(FUJUE[f].desc)}"><b>${FUJUE[f].name}</b><small>${esc(FUJUE[f].desc)}</small><i>取下</i></button>`
        : `<div class="nb-fj free">空附诀位</div>`;
    }).join('');
    const free = n - on.length;
    const opts =
      free > 0 && L.fjBag!.length
        ? `<div class="nb-pick"><span>挂上：</span>${L.fjBag!.map((f, i) => `<button class="nb-chip" data-addfj="${t.uid}:${i}" ${on.includes(f) ? 'disabled title="同一件法宝不能挂两枚相同的附诀"' : `title="${esc(FUJUE[f].desc)}"`}>${FUJUE[f].name}</button>`).join('')}</div>`
        : '';
    return `<h5>附诀 ${on.length}/${n}</h5><div class="nb-fjs">${boxes}</div>${opts}`;
  };
  const chainPick = (t: Treasure) => {
    if (!(t.fj ?? []).includes('yinlei') || L.skills.length < 2) return '';
    return `<div class="nb-pick"><span>引雷引动：</span>${L.skills
      .filter((s) => s.id !== t.key)
      .map((s) => `<button class="nb-chip ${ld().chain === s.id ? 'on' : ''}" data-chain="${s.id}">${GONGFA[s.id].short}</button>`)
      .join('')}</div>`;
  };
  const skillDetail = (s: Skill) => {
    const gl = gongLine(L, s);
    const t = qiFor(L, s.id);
    const g = battleGong(L).gong.find((x) => x.id === s.id);
    const need = QI_GRADES[GF_MIN_QI[s.grade ?? 0]];
    const others = bag().filter((x) => x.kind === 'gong' && x.key === s.id && x.uid !== t?.uid);
    const qi = GONGFA[s.id].qi;
    return `<div class="nb-d-head">${t ? `<span class="nb-d-icon g${t.grade}">${treasureIcon(t)}</span>` : ''}<div><h4>${esc(gl.name)}${s.bm ? '<i class="bm">本命</i>' : ''}</h4>
        <p>${gl.grade} · ${gl.layer || '未入门'}（上限${LAYER_NAMES[layerCap(L, s)]}） · ${gl.school}</p></div></div>
      <p>${esc(GONGFA[s.id].desc)}。${g ? `当前威力 <b>×${g.mul.toFixed(2)}</b>` : '<b class="warn">没有法宝，施展不出。</b>'}</p>
      <h5>法宝 · 需「${qi}」类，至少${need}</h5>
      ${t ? `<p><b>${QI_GRADES[t.grade]}「${esc(t.name)}」</b>${t.spirit ? ` · 器灵${t.spirit}（威力 ×1.08）` : ''}${t.grade < GF_MIN_QI[s.grade ?? 0] ? ` <span class="warn">器不承法 ×0.7</span>` : ''}</p>` : `<p class="warn">无器可御：去坊市或奇遇里寻一件「${qi}」。</p>`}
      ${others.length ? `<div class="nb-pick"><span>换用：</span>${others.map((o) => `<button class="nb-chip" data-use="${o.uid}">${QI_GRADES[o.grade]}「${esc(o.name)}」${o.fj?.length ? '·' + o.fj.length + '诀' : ''}</button>`).join('')}</div>` : ''}
      ${t ? fjSlots(t) + chainPick(t) : ''}`;
  };
  const itemDetail = (t: Treasure) => {
    if (t.kind === 'gong') {
      const s = L.skills.find((x) => x.id === t.key);
      const gf = GONGFA[t.key as SkillId];
      const on = isOn(t);
      const act = !s ? `<p class="warn">没有对应的${gf.short}，暂时只是废铁；学会${esc(gf.name)}就能用。</p>` : on ? `<p class="nb-muted">正给${esc(gf.name)}用着。</p>` : `<div class="nb-acts"><button class="btn primary" data-use="${t.uid}">换给${esc(gf.name)}用</button></div>`;
      const weak = s && t.grade < GF_MIN_QI[s.grade ?? 0];
      return `<div class="nb-d-head"><span class="nb-d-icon g${t.grade}">${treasureIcon(t)}</span><div><h4>${QI_GRADES[t.grade]}「${esc(t.name)}」</h4><p>功法型法宝 · ${gf.qi} · 施展${esc(gf.name)}</p></div></div>
        ${t.spirit ? `<p>器灵「${t.spirit}」：威力 ×1.08</p>` : ''}${weak ? `<p class="warn">品级低于${GF_GRADES[s!.grade ?? 0]}功法所需，器不承法 ×0.7。</p>` : ''}
        ${act}${fjSlots(t)}${chainPick(t)}`;
    }
    const it = ITEMS[t.key];
    const kind = t.kind as 'passive' | 'active';
    const arr = ld()[kind];
    const max = kind === 'passive' ? PASSIVE_MAX : ACTIVE_MAX;
    const on = arr.includes(t.uid);
    const out = byUid(arr[0]);
    const label = on ? '取下' : arr.length >= max ? `装备（换下「${out?.name ?? ''}」）` : '装备';
    const spent = kind === 'active' && !it.cells && (t.uses ?? 0) <= 0;
    const left = usesText(t);
    return `<div class="nb-d-head"><span class="nb-d-icon ${kind}">${treasureIcon(t)}</span><div><h4>「${esc(t.name)}」</h4><p>${kind === 'passive' ? (it.trigger ? '触发型随身' : '随身') : it.cells ? '充能型符宝' : '消耗型符丹'}${left ? ` · ${left.startsWith('充') ? `每次耗 ${it.cells} 格` : `剩 ${t.uses ?? 0}`}` : ''}</p></div></div>
      <p>${esc(it.desc)}</p>
      ${kind === 'active' ? `<p class="nb-muted">战斗中按 1/2/3（触屏点右下圆钮）放出。消耗型次数跨战斗保留，充能型每场满格，拾灵气球回充。</p>` : ''}
      <div class="nb-acts"><button class="btn ${on ? '' : 'primary'}" data-toggle="${t.uid}" ${spent && !on ? 'disabled' : ''}>${spent && !on ? '已用尽' : label}</button><span class="nb-muted">${kind === 'passive' ? '随身' : '符丹'}位 ${arr.length}/${max}</span></div>`;
  };
  const fjDetail = (i: number) => {
    const f = FUJUE[L.fjBag![i]];
    const tgts = L.skills
      .map((s) => ({ s, t: qiFor(L, s.id) }))
      .filter((x): x is { s: Skill; t: Treasure } => !!x.t && (x.t.fj ?? []).length < FJ_SLOTS[x.t.grade]);
    const btn = (x: { s: Skill; t: Treasure }) =>
      `<button class="btn" data-addfj="${x.t.uid}:${i}" ${(x.t.fj ?? []).includes(f.id) ? 'disabled' : ''}>挂到${GONGFA[x.s.id].short}·「${esc(x.t.name)}」</button>`;
    return `<div class="nb-d-head"><span class="nb-d-icon fj">${fjIcon(f.name, f.chain)}</span><div><h4>附诀「${f.name}」</h4><p>${f.chain ? '连锁附诀（一世只得一枚）' : '附诀'}</p></div></div>
      <p>${esc(f.desc)}</p>
      ${tgts.length ? `<div class="nb-acts col">${tgts.map(btn).join('')}</div>` : `<p class="nb-muted">没有空着附诀位的法宝。法器 1 位、灵器 2 位、宝器以上 3 位。</p>`}`;
  };
  const emptyDetail = (kind: 'gong' | 'passive' | 'active', locked?: number) => {
    if (kind === 'gong')
      return locked !== undefined
        ? `<h4>未开的功法位</h4><p>修到${REALMS[locked]?.name ?? '更高境界'}，多开一个功法位。</p>`
        : `<h4>空功法位</h4><p>${L.inDao ? '闭关参悟、宗门传法、奇遇与坊市都可能得到新功法。' : '你还是凡人。仙缘到来、入道时会择一门本命功法并得一件凡器。'}</p>`;
    const list = bag().filter((t) => t.kind === kind && !ld()[kind].includes(t.uid));
    return `<h4>空${kind === 'passive' ? '随身' : '符丹'}位</h4>
      ${list.length ? `<div class="nb-acts col">${list.map((t) => `<button class="btn" data-toggle="${t.uid}" ${kind === 'active' && !ITEMS[t.key].cells && (t.uses ?? 0) <= 0 ? 'disabled' : ''}>带上「${esc(t.name)}」${usesText(t) ? ' ' + usesText(t) : ''}</button>`).join('')}</div>` : `<p class="nb-muted">行囊里没有可带的${kind === 'passive' ? '随身' : '符丹'}，去坊市看看。</p>`}`;
  };
  const detail = () => {
    if (!sel) return '';
    let body = '';
    if (sel.t === 'skill') {
      const id = sel.id;
      const s = L.skills.find((x) => x.id === id);
      body = s ? skillDetail(s) : '';
    } else if (sel.t === 'item') {
      const t = byUid(sel.uid);
      body = t ? itemDetail(t) : '';
    } else if (sel.t === 'fj') body = L.fjBag![sel.i] ? fjDetail(sel.i) : '';
    else body = emptyDetail(sel.kind, sel.locked);
    if (!body) {
      sel = null;
      return '';
    }
    return `<div class="nb-veil" data-shut></div><div class="nb-detail">${body}${note ? `<p class="nb-note">${note}</p>` : ''}<button class="nb-x" data-shut title="收起">×</button></div>`;
  };

  // ---------- 整体 ----------
  const render = () => {
    const mortal = !L.inDao ? `<p class="nb-mortal">你还是凡人。入道时会择一门本命功法并得一件凡器，之后在这里换法宝、挂附诀、带随身与符丹。</p>` : '';
    root.innerHTML = `<div class="nb-scroll">
      <div class="nb-rod top"><span class="nb-cap"></span><h2>行囊</h2><span class="nb-cap"></span></div>
      <div class="nb-paper">
        <div class="nb-body">
          <section class="nb-left">
            <div class="nb-figure">
              <div class="nb-col">${skillSlot(0)}${skillSlot(1)}${equipSlot('passive', 0)}</div>
              <div class="nb-sitter">${sitterSvg(L.realm, L.inDao)}</div>
              <div class="nb-col">${skillSlot(2)}${skillSlot(3)}${equipSlot('passive', 1)}</div>
            </div>
            <div class="nb-row">${equipSlot('active', 0)}${equipSlot('active', 1)}${equipSlot('active', 2)}</div>
            ${statsPanel()}
          </section>
          <section class="nb-right">${grid()}</section>
        </div>
        ${mortal}
        <div class="nb-tools"><button class="btn sm" data-auto>自动配装</button><button class="btn sm primary" data-close>收起</button></div>
        ${detail()}
      </div>
      <div class="nb-rod bottom"><span class="nb-cap"></span><span class="nb-cap"></span></div>
      <p class="nb-hint">点空白处收起</p>
    </div>`;
    bind();
  };
  const open = (s: Sel) => {
    sel = s;
    note = '';
    render();
  };
  const bind = () => {
    const q = <T extends HTMLElement>(s: string) => root.querySelectorAll<T>(s);
    q('[data-close]').forEach((el) => (el.onclick = close));
    q('[data-auto]').forEach(
      (el) =>
        (el.onclick = () => {
          autoEquip(L);
          sel = null;
          render();
        }),
    );
    q('[data-tab]').forEach(
      (el) =>
        (el.onclick = () => {
          tab = lastTab = el.dataset.tab as Tab;
          page = 0;
          render();
        }),
    );
    q('[data-pg]').forEach(
      (el) =>
        (el.onclick = () => {
          page = Math.max(0, page + Number(el.dataset.pg));
          render();
        }),
    );
    q('[data-skill]').forEach((el) => (el.onclick = () => open({ t: 'skill', id: el.dataset.skill as SkillId })));
    q('.nb-tile[data-item]').forEach((el) => (el.onclick = () => open({ t: 'item', uid: Number(el.dataset.item) })));
    q('.nb-tile[data-fj]').forEach((el) => (el.onclick = () => open({ t: 'fj', i: Number(el.dataset.fj) })));
    q('[data-empty]').forEach((el) => {
      el.onclick = () => {
        const [kind, r] = el.dataset.empty!.split(':');
        open({ t: 'empty', kind: kind as 'gong', locked: r !== undefined ? Number(r) : undefined });
      };
    });
    q('[data-shut]').forEach(
      (el) =>
        (el.onclick = () => {
          sel = null;
          render();
        }),
    );
    // 换用法宝
    q('[data-use]').forEach((el) => {
      el.onclick = () => {
        const t = byUid(Number(el.dataset.use));
        if (!t) return;
        ld().gong[t.key as SkillId] = t.uid;
        note = `${GONGFA[t.key as SkillId].short}换用「${t.name}」。`;
        render();
      };
    });
    // 装备 / 取下随身与符丹
    q('[data-toggle]').forEach((el) => {
      el.onclick = () => {
        const t = byUid(Number(el.dataset.toggle));
        if (!t || t.kind === 'gong') return;
        const kind = t.kind;
        const max = kind === 'passive' ? PASSIVE_MAX : ACTIVE_MAX;
        const arr = ld()[kind];
        if (arr.includes(t.uid)) {
          ld()[kind] = arr.filter((u) => u !== t.uid);
          note = `取下「${t.name}」。`;
        } else {
          let out = '';
          if (arr.length >= max) out = byUid(arr.shift()!)?.name ?? '';
          arr.push(t.uid);
          note = `带上「${t.name}」${out ? `，换下「${out}」` : ''}。`;
        }
        if (sel?.t === 'empty') sel = { t: 'item', uid: t.uid };
        render();
      };
    });
    // 附诀
    q('[data-unfj]').forEach((el) => {
      el.onclick = () => {
        const [uid, i] = el.dataset.unfj!.split(':').map(Number);
        const t = byUid(uid);
        if (!t?.fj) return;
        const [f] = t.fj.splice(i, 1);
        L.fjBag!.push(f);
        note = `取下附诀「${FUJUE[f].name}」，收回行囊。`;
        render();
      };
    });
    q('[data-addfj]').forEach((el) => {
      el.onclick = () => {
        const [uid, i] = el.dataset.addfj!.split(':').map(Number);
        const t = byUid(uid);
        const f = L.fjBag![i];
        if (!t || !f || (t.fj ?? []).includes(f) || (t.fj ?? []).length >= FJ_SLOTS[t.grade]) return;
        L.fjBag!.splice(i, 1);
        (t.fj ??= []).push(f);
        if (f === 'yinlei' && (!ld().chain || ld().chain === t.key)) ld().chain = L.skills.find((s) => s.id !== t.key)?.id ?? null;
        note = `「${FUJUE[f].name}」挂上「${t.name}」。`;
        // 从附诀详情挂上后，转去看那件法宝
        if (sel?.t === 'fj') sel = { t: 'item', uid: t.uid };
        render();
      };
    });
    q('[data-chain]').forEach((el) => {
      el.onclick = () => {
        ld().chain = el.dataset.chain as SkillId;
        render();
      };
    });
  };
  render();
}
