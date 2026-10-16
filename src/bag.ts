// 行囊：换法宝、挂附诀、选主动法宝与引雷目标（独立浮层，出征前也能打开）
import type { LifeState, SkillId, Treasure } from './game/types';
import { autoEquip, ensureCult, gongLine, layerCap, qiFor, slotCount } from './game/cult';
import { ACTIVE_MAX, FJ_SLOTS, FUJUE, GF_GRADES, GF_MIN_QI, GONGFA, ITEMS, LAYER_NAMES, PASSIVE_MAX, QI_GRADES } from './data/cult';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function openBag(L: LifeState, onChange: () => void) {
  ensureCult(L);
  document.querySelector('.bag-root')?.remove();
  const root = document.createElement('div');
  root.className = 'bag-root';
  document.body.appendChild(root);
  const close = () => {
    root.remove();
    onChange();
  };
  root.onclick = (e) => {
    if (e.target === root) close();
  };
  const render = () => {
    const bag = L.bag!;
    const ld = L.load!;
    const gongRows = L.skills
      .map((s) => {
        const gl = gongLine(L, s);
        const t = qiFor(L, s.id);
        const qis = bag.filter((x) => x.kind === 'gong' && x.key === s.id);
        const sel = qis.length > 1 ? `<select data-qi="${s.id}">${qis.map((q) => `<option value="${q.uid}" ${q.uid === t?.uid ? 'selected' : ''}>${QI_GRADES[q.grade]}「${esc(q.name)}」${q.spirit ? '·' + q.spirit : ''}</option>`).join('')}</select>` : `<span class="${t ? '' : 'warn'}">${esc(gl.qi)}${t?.spirit ? ` · 器灵${t.spirit}` : ''}</span>`;
        const fj = (t?.fj ?? []).map((f, i) => `<button class="fj on" data-unfj="${s.id}:${i}" title="${esc(FUJUE[f].desc)}">${FUJUE[f].name} ×</button>`).join('');
        const free = t ? FJ_SLOTS[t.grade] - (t.fj?.length ?? 0) : 0;
        const add = free > 0 && L.fjBag!.length ? `<select data-addfj="${s.id}"><option value="">挂附诀（空 ${free}）</option>${L.fjBag!.map((f, i) => `<option value="${i}">${FUJUE[f].name}：${esc(FUJUE[f].desc)}</option>`).join('')}</select>` : free > 0 ? `<small class="muted">空附诀位 ${free}</small>` : '';
        const weak = t && t.grade < GF_MIN_QI[s.grade ?? 0];
        return `<div class="bag-gong">
          <div class="bg-head"><b>${esc(gl.name)}</b>${s.bm ? '<i class="bm">本命</i>' : ''}<span>${gl.grade} · ${gl.layer}/${LAYER_NAMES[layerCap(L, s)]} · ${gl.school}</span></div>
          <div class="bg-qi">法宝：${sel}${weak ? `<small class="warn">器不承法 ×0.7（需${QI_GRADES[GF_MIN_QI[s.grade ?? 0]]}）</small>` : ''}</div>
          <div class="bg-fj">${fj}${add}</div>
        </div>`;
      })
      .join('');
    const hasChain = L.skills.some((s) => qiFor(L, s.id)?.fj?.includes('yinlei'));
    const chain = hasChain && L.skills.length > 1 ? `<div class="bag-line">引雷引动：<select data-chain>${L.skills.map((s) => `<option value="${s.id}" ${ld.chain === s.id ? 'selected' : ''}>${GONGFA[s.id].name}</option>`).join('')}</select></div>` : '';
    const item = (t: Treasure, on: boolean, kind: 'passive' | 'active') => {
      const it = ITEMS[t.key];
      const left = kind === 'active' ? (it.cells ? `充能 ${it.cells} 格` : `剩 ${t.uses ?? 0}`) : t.key === 'hushen' ? `剩 ${t.uses ?? 0} 次` : '';
      return `<label class="bag-item ${on ? 'on' : ''}"><input type="checkbox" data-${kind}="${t.uid}" ${on ? 'checked' : ''}><b>${it.name}</b><small>${esc(it.desc)}${left ? ` · ${left}` : ''}</small></label>`;
    };
    const passives = bag.filter((t) => t.kind === 'passive');
    const actives = bag.filter((t) => t.kind === 'active');
    const scrap = bag.filter((t) => t.kind === 'gong' && !L.skills.some((s) => s.id === t.key));
    root.innerHTML = `<div class="bag-box">
      <div class="bag-top"><h2>行囊</h2><span>心得 ${L.xinde ?? 0} · 功法位 ${L.skills.length}/${slotCount(L)}</span><button class="btn sm" data-auto>自动配装</button><button class="btn sm primary" data-close>收起</button></div>
      <h3>功法</h3>${gongRows || '<p class="muted">还没有功法。入道后择本命。</p>'}${chain}
      <h3>被动法宝 · ${ld.passive.length}/${PASSIVE_MAX}</h3>${passives.map((t) => item(t, ld.passive.includes(t.uid), 'passive')).join('') || '<p class="muted">无</p>'}
      <h3>主动法宝 · ${ld.active.length}/${ACTIVE_MAX}</h3><p class="muted">战斗中按 1/2/3（触屏点右下圆钮）。消耗型次数跨战斗保留，充能型每场满格，拾灵气球回充。</p>${actives.map((t) => item(t, ld.active.includes(t.uid), 'active')).join('') || '<p class="muted">无</p>'}
      ${L.fjBag!.length ? `<h3>未挂附诀</h3><div class="chips">${L.fjBag!.map((f) => `<span class="chip" title="${esc(FUJUE[f].desc)}">${FUJUE[f].name}</span>`).join('')}</div>` : ''}
      ${scrap.length ? `<h3>闲置法宝</h3><div class="chips">${scrap.map((t) => `<span class="chip" title="没有对应功法，暂是废铁">${QI_GRADES[t.grade]}「${esc(t.name)}」· 缺${GONGFA[t.key as SkillId].short}</span>`).join('')}</div>` : ''}
      <p class="muted">功法须配同器类法宝才能施展；法宝低于功法要求的品级时威力 ×0.7。附诀位：法器 1、灵器 2、宝器以上 3。品阶 ${GF_GRADES.join(' / ')}。</p>
    </div>`;
    root.querySelector<HTMLButtonElement>('[data-close]')!.onclick = close;
    root.querySelector<HTMLButtonElement>('[data-auto]')!.onclick = () => {
      autoEquip(L);
      render();
    };
    root.querySelectorAll<HTMLSelectElement>('[data-qi]').forEach((el) => {
      el.onchange = () => {
        ld.gong[el.dataset.qi as SkillId] = Number(el.value);
        render();
      };
    });
    root.querySelectorAll<HTMLButtonElement>('[data-unfj]').forEach((el) => {
      el.onclick = () => {
        const [id, i] = el.dataset.unfj!.split(':');
        const t = qiFor(L, id as SkillId);
        if (!t?.fj) return;
        L.fjBag!.push(...t.fj.splice(Number(i), 1));
        render();
      };
    });
    root.querySelectorAll<HTMLSelectElement>('[data-addfj]').forEach((el) => {
      el.onchange = () => {
        if (el.value === '') return;
        const t = qiFor(L, el.dataset.addfj as SkillId);
        if (!t) return;
        const f = L.fjBag![Number(el.value)];
        if ((t.fj ?? []).includes(f)) {
          alert('同一件法宝不能挂两枚相同的附诀');
          return render();
        }
        L.fjBag!.splice(Number(el.value), 1);
        (t.fj ??= []).push(f);
        render();
      };
    });
    const chainEl = root.querySelector<HTMLSelectElement>('[data-chain]');
    if (chainEl) chainEl.onchange = () => (ld.chain = chainEl.value as SkillId);
    const toggle = (kind: 'passive' | 'active', max: number) =>
      root.querySelectorAll<HTMLInputElement>(`[data-${kind}]`).forEach((el) => {
        el.onchange = () => {
          const uid = Number(el.dataset[kind]);
          const arr = ld[kind];
          if (el.checked) {
            if (arr.length >= max) arr.shift();
            arr.push(uid);
          } else ld[kind] = arr.filter((u) => u !== uid);
          render();
        };
      });
    toggle('passive', PASSIVE_MAX);
    toggle('active', ACTIVE_MAX);
  };
  render();
}
