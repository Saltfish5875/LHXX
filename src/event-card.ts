// 场景卡 + 行动卡：事件弹窗的新样子。
// 上面一幅小画（当前地点 + 这件事的主体），一句话交代局面；下面每个选项一张行动卡：图标、动作名、得失小签、风险。
// 全文和数值收进「查看详情」。
import type { Prompt, PromptOption } from './game/engine';
import { actionIcon, descTags, type ActionCard } from './game/cards';
import { actionIconSvg, subjectSvg } from './art/subject';
import type { Scene } from './art/scene';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const nl = (s: string) => esc(s).replace(/\n/g, '<br>');

const RISK_LABEL: Record<ActionCard['risk'], string> = { safe: '', low: '风险不高', mid: '有些风险', high: '风险高', unknown: '看天意' };

// 没有行动卡数据的选项（棋盘经营、守业……）：按动作名配图标，desc 拆成小签
function fallbackCard(o: PromptOption): ActionCard {
  return { icon: actionIcon(o.label), tags: o.desc ? descTags(o.desc).slice(0, 3) : [], risk: 'safe', riskText: '', detail: o.desc && o.desc.length > 18 ? [o.desc] : [] };
}

// 用行动卡来画的提示：事件类、有两个以上选项
export const useCards = (p: Prompt) => (p.style ?? 'event') === 'event' && p.options.length > 1;

export function renderEventCard(box: HTMLElement, p: Prompt, scene: Scene): { opts: HTMLElement; buttons: HTMLButtonElement[]; stop: () => void } {
  const sc = p.scene;
  const lead = sc?.lead ?? p.text;
  const more = !!sc?.more || p.options.some((o) => (o.card ?? fallbackCard(o)).detail.length);
  box.classList.add('ec');
  box.innerHTML = `
    <div class="ec-head"><h2>${esc(p.title)}</h2>${sc ? `<span class="ec-loc">${esc(sc.locName)}</span>` : ''}</div>
    ${sc ? `<div class="ec-pic ${sc.subject ? 'has-sj' : ''}"><canvas></canvas>${subjectSvg(sc.subject)}</div>` : ''}
    <div class="ec-lead"><span>${nl(lead)}</span>${more ? '<button class="ec-more" type="button" aria-expanded="false">查看详情</button>' : ''}</div>
    ${sc?.more ? `<div class="ec-full">${nl(p.text)}</div>` : ''}
    <div class="opts ec-acts"></div>
    <div class="hint">数字键 1～${p.options.length} 快速选择</div>`;
  const opts = box.querySelector<HTMLElement>('.ec-acts')!;
  const buttons = p.options.map((o, i) => {
    const c = o.card ?? fallbackCard(o);
    const b = document.createElement('button');
    b.className = `opt act risk-${c.risk}`;
    b.disabled = !!o.disabled;
    const tags = c.tags.map((t) => `<i class="tg ${t.tone}">${esc(t.text)}${t.tone === 'unknown' && !t.text.endsWith('？') ? '<em>?</em>' : ''}</i>`).join('');
    const risk = c.risk !== 'safe' ? `<span class="act-risk">${esc(c.riskText || RISK_LABEL[c.risk])}</span>` : '';
    b.innerHTML = `<span class="act-ic">${actionIconSvg(c.icon, o.label)}</span>
      <span class="act-main"><b><small>${i + 1}</small>${esc(o.label)}</b><span class="act-tags">${tags}${risk}</span>
      ${c.detail.length ? `<span class="act-detail">${c.detail.map(esc).join('<br>')}</span>` : ''}</span>`;
    opts.appendChild(b);
    return b;
  });
  const toggle = box.querySelector<HTMLButtonElement>('.ec-more');
  if (toggle)
    toggle.onclick = () => {
      const on = box.classList.toggle('ec-open');
      toggle.textContent = on ? '收起详情' : '查看详情';
      toggle.setAttribute('aria-expanded', String(on));
    };
  // 小画：把画卷舞台当前的地点画面裁一块过来（跟着动），主体叠在右边
  let raf = 0;
  const cv = box.querySelector<HTMLCanvasElement>('.ec-pic canvas');
  if (cv) {
    const ctx = cv.getContext('2d')!;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const src = scene.canvas;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w || !h || !src.width || !src.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      // 铺满：按比例裁，横向偏右（地点的建筑多在画卷中右）
      const ar = w / h;
      let sw = src.width;
      let sh = sw / ar;
      if (sh > src.height) {
        sh = src.height;
        sw = sh * ar;
      }
      const sx = Math.max(0, Math.min(src.width - sw, src.width * 0.62 - sw / 2));
      const sy = Math.max(0, src.height - sh - src.height * 0.04);
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    };
    raf = requestAnimationFrame(draw);
  }
  return { opts, buttons, stop: () => cancelAnimationFrame(raf) };
}
