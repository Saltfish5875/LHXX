// 校验扩充的事件库：编号不重、地点存在、引用的链存在、每条链四拍都有选项
import { CHAINS, NEW_ENCOUNTERS } from '../src/game/chains';
import { CHOICES, FLAVORS, ENCOUNTERS, LOC_BY_ID } from '../src/data/events';
import { IDENTITY_CHOICES } from '../src/data/faces';
import type { Effect } from '../src/game/types';

const errs: string[] = [];
const ids = new Map<string, number>();
for (const e of [...CHOICES, ...FLAVORS, ...ENCOUNTERS, ...IDENTITY_CHOICES, ...NEW_ENCOUNTERS]) ids.set(e.id, (ids.get(e.id) ?? 0) + 1);
for (const c of CHAINS) ids.set(c.id, (ids.get(c.id) ?? 0) + 1);
for (const [k, n] of ids) if (n > 1) errs.push(`重复编号 ${k}`);
const chainIds = new Set(CHAINS.map((c) => c.id));
const walk = (e: Effect | undefined, where: string) => {
  if (!e) return;
  if (e.chain?.id && !chainIds.has(e.chain.id)) errs.push(`${where} 引用了不存在的链 ${e.chain.id}`);
  if (e.nextLoc && !LOC_BY_ID[e.nextLoc]) errs.push(`${where} nextLoc ${e.nextLoc}`);
  if (e.banLoc && !LOC_BY_ID[e.banLoc.loc]) errs.push(`${where} banLoc ${e.banLoc.loc}`);
  walk(e.battle?.win, where);
  walk(e.battle?.lose, where);
  walk(e.echo?.eff, where);
};
const opts = (os: { eff?: Effect; roll?: { ok: Effect; fail: Effect }; chance?: { ok: Effect; fail: Effect } }[] | undefined, where: string) => {
  for (const o of os ?? []) {
    walk(o.eff, where);
    walk(o.roll?.ok, where);
    walk(o.roll?.fail, where);
    walk(o.chance?.ok, where);
    walk(o.chance?.fail, where);
  }
};
for (const e of NEW_ENCOUNTERS) {
  for (const l of e.locs) if (!LOC_BY_ID[l]) errs.push(`${e.id} 地点 ${l}`);
  if (!e.options?.length) errs.push(`${e.id} 没有选项`);
  opts(e.options, e.id);
}
let starts = 0;
for (const c of CHAINS) {
  const beats = [c.start, ...c.beats, c.end];
  beats.forEach((b, i) => {
    if (Array.isArray(b.locs)) for (const l of b.locs) if (!LOC_BY_ID[l]) errs.push(`${c.id} 第${i + 1}拍 地点 ${l}`);
    opts(b.options, `${c.id}#${i + 1}`);
    if (i < 3 && !b.options.length) errs.push(`${c.id} 第${i + 1}拍 没有选项`);
  });
  if (!c.end.options.length && !c.end.endings?.length) errs.push(`${c.id} 结拍空`);
  for (const en of c.end.endings ?? []) {
    walk(en.eff, `${c.id}#结`);
    opts(en.options, `${c.id}#结`);
  }
  if (c.start.options.some((o) => o.eff?.chain?.op === 'start' || o.roll?.ok.chain?.op === 'start' || o.chance?.ok.chain?.op === 'start' || o.eff?.battle?.win?.chain?.op === 'start')) starts++;
  else errs.push(`${c.id} 起拍没有开链选项`);
}
const sorts: Record<string, number> = {};
for (const e of NEW_ENCOUNTERS) sorts[e.sort ?? '?'] = (sorts[e.sort ?? '?'] ?? 0) + 1;
console.log(`链 ${CHAINS.length} 条（可开 ${starts}），奇遇 ${NEW_ENCOUNTERS.length} 条`, sorts);
console.log(errs.length ? errs.join('\n') : '没有问题');
