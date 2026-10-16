// 无界面跑完整人生：用真实的人生引擎与战斗逻辑（自动驾驶）批量模拟，输出 R12 验证指标
// 用法：npm run sim -- [世数=40] [倾向=safe|chance|war|all] [种子=1]
import { Game, IO, Prompt } from '../src/game/engine';
import { RollAction, RollView, autoDie } from '../src/game/board';
import { newMeta } from '../src/game/meta';
import { autoBattle } from '../src/battle/sim';
import { setSeed, rand } from '../src/game/rng';
import { TALENTS, AttrKey } from '../src/data/core';
import type { Tendency, LogEntry } from '../src/game/types';
import type { BattleSpec } from '../src/battle/spec';
import { FATE_BY_ID, NOTHING_CULT_MORE, NOTHING_MORTAL_MORE } from '../src/data/fate';
import { NOTHING_CULT, NOTHING_MORTAL } from '../src/data/events';

const NOTHING = new Set([...NOTHING_MORTAL, ...NOTHING_MORTAL_MORE, ...NOTHING_CULT, ...NOTHING_CULT_MORE]);

declare const process: { argv: string[]; env: Record<string, string | undefined>; exit(code: number): void };
const DEBUG = !!process.env.SIMDEBUG;

const args = process.argv.slice(2);
const LIVES = Number(args[0] ?? 40);
const TEND = (args[1] ?? 'all') as Tendency | 'all';
const SEED = Number(args[2] ?? 1);

interface Stats {
  decisions: number;
  rounds: number;
  nothing: number;
  battles: number;
  battlesWon: number;
  deaths: Record<string, number>;
  ages: number[];
  realms: number[];
  pagesByLife: number[];
  firstRepeatLife: number | null;
  wishes: number;
  wishesDone: number;
  endings: string[];
  errors: number;
  trials: Record<string, [number, number]>;
  cardsTotal: number;
  cardsFace: number;
  hookLives: number;
  hookDone: number;
  reunions: number;
  acqResolved: number;
  eras: Record<string, number>;
  eraRepeat: number;
  fates: Record<string, number>;
  mismatch: number;
  blocked: number;
  blockedBy: Record<string, number>;
  recovered: number;
  retired: number;
  choicesSeen: number;
  choicesRepeat: number;
  flavorTotal: number;
  flavorDistinct: number;
  trialBattles: number;
  laps: number;
  stops: number;
  kinds: Record<string, number>;
  holdLives: number;
  holdMax: number[];
  ruinVisits: number;
  dice: number[];
  laps0: number;
  btitles: Record<string, number>;
}

async function run(tend: Tendency): Promise<Stats> {
  setSeed(SEED * 1000 + tend.length);
  const meta = newMeta();
  meta.settings.tendency = tend;
  const st: Stats = { decisions: 0, rounds: 0, nothing: 0, battles: 0, battlesWon: 0, deaths: {}, ages: [], realms: [], pagesByLife: [], firstRepeatLife: null, wishes: 0, wishesDone: 0, endings: [], errors: 0, trials: {}, cardsTotal: 0, cardsFace: 0, hookLives: 0, hookDone: 0, reunions: 0, acqResolved: 0, eras: {}, eraRepeat: 0, fates: {}, mismatch: 0, blocked: 0, blockedBy: {}, recovered: 0, retired: 0, choicesSeen: 0, choicesRepeat: 0, flavorTotal: 0, flavorDistinct: 0, trialBattles: 0, laps: 0, stops: 0, kinds: {}, holdLives: 0, holdMax: [0, 0, 0, 0, 0, 0], ruinVisits: 0, dice: [0, 0, 0, 0], laps0: 0, btitles: {} };
  let prevChoices = new Set<string>();
  let curChoices = new Set<string>();
  let lifeLogs: string[] = [];
  let lastEra: string | undefined;
  const seenChoices = new Set<string>();
  let lifeNo = 0;
  const io: IO = {
    async choose(p: Prompt) {
      st.decisions += p.options.length > 1 ? 1 : 0;
      const en = p.options.map((o, i) => ({ o, i })).filter((x) => !x.o.disabled);
      if (p.key === 'battlePrep') {
        if (tend === 'safe' && !p.options[3].disabled && rand() < 0.3) return 3;
        if (!p.options[2].disabled && rand() < 0.5) return 2;
        return 0;
      }
      if (p.key === 'wheel') {
        const buy = en.filter((x) => x.i < p.options.length - 1);
        return buy.length ? buy[0].i : p.options.length - 1;
      }
      if (p.key === 'market') return p.options.length - 1;
      if (p.autoPick !== undefined && !p.options[p.autoPick]?.disabled) return p.autoPick;
      // 铸道基：多数玩家会尽量顺着本命走
      if (p.key === 'daoji') return !p.options[1]?.disabled && rand() < 0.7 ? 1 : 0;
      if (p.title.startsWith('瓶颈')) return 0;
      if (p.title === '飞升天门劫') return 0;
      if (p.key && p.key.startsWith('C-')) {
        if (seenChoices.has(p.key) && st.firstRepeatLife === null) st.firstRepeatLife = lifeNo;
        seenChoices.add(p.key);
        if (!curChoices.has(p.key)) {
          curChoices.add(p.key);
          st.choicesSeen += 1;
          if (prevChoices.has(p.key)) st.choicesRepeat += 1;
        }
      }
      return en[Math.floor(rand() * en.length)]?.i ?? 0;
    },
    async roll(v: RollView): Promise<RollAction> {
      if (v.stops === 0) st.laps += 1;
      st.rounds += 1;
      const L = g.L;
      if (new Set(v.targets).size > 1) st.decisions += 1;
      const tiles = v.tiles.filter((t) => t.kind === 'loc');
      st.cardsTotal += tiles.length;
      st.cardsFace += tiles.filter((t) => t.tag === '引' || t.tag === '故').length;
      const die = autoDie(v, tend, L, rand);
      const to = v.targets[die];
      if (to < v.size && to !== v.pos) {
        st.stops += 1;
        const t = v.tiles[to];
        const k = t.kind === 'loc' ? `loc:${t.tag ?? '平'}` : t.kind;
        st.kinds[k] = (st.kinds[k] ?? 0) + 1;
        if (t.kind === 'ruin') st.ruinVisits += 1;
      }
      return { action: 'go', die };
    },
    async battle(spec: BattleSpec) {
      st.battles += 1;
      if (DEBUG) console.log("  [战斗]", spec.kind, spec.title, spec.realm);
      const r = autoBattle(spec);
      if (DEBUG) console.log("  [战斗结果]", r.win, r.hp);
      if (r.win) st.battlesWon += 1;
      if (spec.title === '入门试炼') st.trialBattles += 1;
      else if (spec.kind !== 'trial') {
        const k = spec.title.includes('·') ? spec.title.split(' · ')[0] + '·遗迹' : spec.title.startsWith('守') ? '守业' : spec.title;
        st.btitles[k] = (st.btitles[k] ?? 0) + 1;
      }
      if (spec.kind === 'trial') {
        st.trialBattles += 1;
        const k = `${spec.realm}${spec.boss ? ':' + spec.boss : ''}`;
        const t = (st.trials[k] ??= [0, 0]);
        t[0] += r.win || r.survivedKnock ? 1 : 0;
        t[1] += 1;
      }
      return r;
    },
    async pickTalents(c) {
      return c.slice(0, 3).map((t) => t.id);
    },
    async allocate(points, base) {
      const a: Record<AttrKey, number> = { gen: 5, wu: 5, luck: 5, fam: 5 };
      let left = points - 20;
      const ks: AttrKey[] = ['gen', 'wu', 'luck', 'fam'];
      while (left-- > 0) a[ks[Math.floor(rand() * 3)]] += 1;
      for (const k of ks) a[k] = Math.max(0, a[k] + base[k]);
      return { attrs: a, origin: null };
    },
    log(e: LogEntry) {
      if (DEBUG) console.log("  ", e.text.slice(0, 80));
      if ((e.kind ?? 'normal') === 'normal' && !e.text.includes('你选择了')) lifeLogs.push(e.text);
      if (NOTHING.has(e.text)) st.nothing += 1;
      if (e.text.includes('劫气拦住')) st.btitles['(拦路)'] = (st.btitles['(拦路)'] ?? 0) + 1;
      if (e.text.startsWith('流年：劫气积聚')) st.btitles['(积聚圈)'] = (st.btitles['(积聚圈)'] ?? 0) + 1;
    },
    refresh() {},
    async pace() {},
    clearLog() {},
  };
  const g = new Game(meta, io);
  g.sim = true;
  for (let i = 0; i < LIVES; i++) {
    lifeNo = i + 1;
    prevChoices = curChoices;
    curChoices = new Set();
    lifeLogs = [];
    try {
      await g.runLife(false);
    } catch (err) {
      st.errors += 1;
      console.error(`[${tend}] 第 ${lifeNo} 世出错：`, err);
      break;
    }
    const L = g.L;
    if (L.holdings?.length) st.holdLives += 1;
    st.holdMax[Math.max(0, ...(L.holdings ?? []).map((h) => h.lv))] += 1;
    st.dice[L.dice?.n ?? 0] += 1;
    st.fates[L.fate ?? '?'] = (st.fates[L.fate ?? '?'] ?? 0) + 1;
    if (L.capReason === 'daoji' || (L.daoji && L.fate && FATE_BY_ID[L.fate].paths.length && !FATE_BY_ID[L.fate].paths.includes(L.daoji))) st.mismatch += 1;
    if (L.flags.blockedAt) {
      st.blocked += 1;
      const why = L.stall ? 'stall' : L.capReason ?? 'lifted';
      st.blockedBy[why] = (st.blockedBy[why] ?? 0) + 1;
      if (L.flags.turnedOk || (!L.stall && L.cap == null)) st.recovered += 1;
    }
    if (L.retired) st.retired += 1;
    st.flavorTotal += lifeLogs.length;
    st.flavorDistinct += new Set(lifeLogs).size;
    if (L.hook) st.hookLives += 1;
    if (L.hook?.outcome === 'done') st.hookDone += 1;
    st.reunions += L.acqMet?.length ?? 0;
    st.acqResolved += L.acqResolved?.length ?? 0;
    st.eras[L.era ?? '?'] = (st.eras[L.era ?? '?'] ?? 0) + 1;
    if (L.era === lastEra) st.eraRepeat += 1;
    lastEra = L.era;
    const cause = L.ended ?? L.deathCause ?? '未知';
    st.deaths[cause] = (st.deaths[cause] ?? 0) + 1;
    st.ages.push(L.age);
    st.realms.push(L.inDao ? L.realm : 0);
    st.pagesByLife.push(meta.saga.pages.length);
    if (L.wish) {
      st.wishes += 1;
      if (L.wish.done) st.wishesDone += 1;
    }
    if (L.flags.lordBeaten) st.endings.push(`${lifeNo}:${L.ended}`);
    const nw = (meta as typeof meta & { nextWish?: string | null }).nextWish;
    if (nw) g.pendingWish = nw;
  }
  report(tend, st, meta);
  return st;
}

function report(tend: Tendency, st: Stats, meta: ReturnType<typeof newMeta>) {
  const n = st.ages.length;
  const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
  const realmCount = [0, 0, 0, 0, 0, 0];
  for (const r of st.realms) realmCount[r]++;
  const top = Object.entries(st.deaths).sort((a, b) => b[1] - a[1]);
  const topShare = top.length ? ((top[0][1] / n) * 100).toFixed(0) : '0';
  console.log(`\n==== 倾向：${tend}（${n} 世，种子 ${SEED}）====`);
  console.log(`平均享年 ${avg(st.ages)}；最高境界分布 凡/练/筑/金/婴/化 = ${realmCount.join('/')}`);
  console.log(`回合 ${st.rounds}，有效决策 ${st.decisions}（每世 ${(st.decisions / Math.max(1, n)).toFixed(1)}）；无事回合占比 ${((st.nothing / Math.max(1, st.rounds)) * 100).toFixed(1)}%（目标 < 20%）`);
  console.log(`劫难 ${st.battles} 场，胜 ${st.battlesWon}（${((st.battlesWon / Math.max(1, st.battles)) * 100).toFixed(0)}%）；每世遭遇战（不含天劫与入门试炼） ${((st.battles - st.trialBattles) / Math.max(1, n)).toFixed(1)} 场`);
  console.log(`命途：命格 ${JSON.stringify(st.fates)}；道基不合 ${st.mismatch} 世；修为尽头 ${st.blocked} 世（占入道的世 ${((st.blocked / Math.max(1, st.realms.filter((r) => r > 0).length)) * 100).toFixed(0)}%，目标 20～35%）${JSON.stringify(st.blockedBy)}；转机修上来 ${st.recovered}（${((st.recovered / Math.max(1, st.blocked)) * 100).toFixed(0)}%，目标 35～45%）；安度余生而终 ${st.retired}`);
  console.log(`重复：抉择与上一世重复 ${((st.choicesRepeat / Math.max(1, st.choicesSeen)) * 100).toFixed(0)}%（目标 ≤ 25%）；流水不重样 ${((st.flavorDistinct / Math.max(1, st.flavorTotal)) * 100).toFixed(0)}%（每世 ${(st.flavorTotal / Math.max(1, n)).toFixed(0)} 条）`);
  console.log(`死因：${top.map(([k, v]) => `${k} ${v}`).join('，')}；单一死因占比 ${topShare}%（目标 ≤ 35%）`);
  console.log(`抉择首次重复：第 ${st.firstRepeatLife ?? '未重复'} 世（目标 ≥ 5）`);
  console.log(`天书 ${meta.saga.pages.length}/27：[${meta.saga.pages.join(',')}]；卷 ${meta.saga.volume}；叩门 ${meta.saga.knocks}；命灯 ${JSON.stringify(meta.saga.lamps)}`);
  console.log(`心愿 ${st.wishesDone}/${st.wishes} 圆满；结局 ${st.endings.join(' ') || '无'}；宿慧余 ${meta.insight}；轮回盘 ${JSON.stringify(meta.wheel)}`);
  console.log(`每 5 世天书进度：${st.pagesByLife.filter((_, i) => i % 5 === 4).join(' → ')}`);
  console.log(`天劫胜/场（按境界）：${Object.entries(st.trials).sort().map(([k, [w, n]]) => `${k} ${w}/${n}`).join('，')}`);
  console.log(`一人千面：有引子的世 ${((st.hookLives / Math.max(1, n)) * 100).toFixed(0)}%（目标 50～65%）；引子了结率 ${((st.hookDone / Math.max(1, st.hookLives)) * 100).toFixed(0)}%（目标 30～50%）；每世故人再遇 ${(st.reunions / Math.max(1, n)).toFixed(2)}（目标 0.5～1.2），了结 ${st.acqResolved}；「引」「故」卡占比 ${((st.cardsFace / Math.max(1, st.cardsTotal)) * 100).toFixed(1)}%（目标 ≤ 8%）`);
  console.log(`年代分布 ${JSON.stringify(st.eras)}；与上一世同年代 ${st.eraRepeat} 次（目标 0）；千面录 ${new Set((meta.faces ?? []).map((f) => f.hook)).size} 种引子，故人在册 ${(meta.acquaintances ?? []).length}`);
  const ks = Object.entries(st.kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((v / Math.max(1, st.stops)) * 100).toFixed(0)}%`).join('，');
  console.log(`棋盘：每世 ${(st.laps / Math.max(1, n)).toFixed(1)} 圈（目标 50～70），每圈停 ${(st.stops / Math.max(1, st.laps)).toFixed(2)} 格；停格分布 ${ks}`);
  console.log(`产业：置过产业的世 ${st.holdLives}；最高等级分布 0..5 = ${st.holdMax.join('/')}；遗迹进入 ${st.ruinVisits} 次，遗泽在册 ${(meta.legacies ?? []).length}；终局骰数 1/2/3 = ${st.dice.slice(1).join('/')}`);
  console.log(`遭遇战来源：${Object.entries(st.btitles).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join('，')}`);
  if (st.errors) console.log(`!!! 出错 ${st.errors} 次`);
}

const tends: Tendency[] = TEND === 'all' ? ['safe', 'chance', 'war'] : [TEND];
void TALENTS;
(async () => {
  let errors = 0;
  for (const t of tends) errors += (await run(t)).errors;
  console.log('\n模拟完成。');
  if (errors) process.exit(1);
})();
