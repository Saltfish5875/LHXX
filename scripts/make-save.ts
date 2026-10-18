// 用真实人生引擎（自动驾驶 + 战斗机器人）跑出一份多世存档，放进 public/saves/ 随网页发布
// 用法：npm run make-save -- [世数=20] [倾向=chance] [种子=1] [输出=public/saves/twenty-lives.json]
// @ts-expect-error 项目没装 @types/node，脚本由 tsx 直接跑
import { writeFileSync, mkdirSync } from 'node:fs';
// @ts-expect-error 同上
import { dirname } from 'node:path';
import { Game, IO, Prompt } from '../src/game/engine';
import { RollAction, RollView, autoAgain, autoDie, autoNudge } from '../src/game/board';
import { newMeta } from '../src/game/meta';
import { autoBattle } from '../src/battle/sim';
import { setSeed, rand } from '../src/game/rng';
import { AttrKey } from '../src/data/core';
import type { Tendency } from '../src/game/types';
import { SAVE_FORMAT, SaveFile, summary } from '../src/game/saves';

declare const process: { argv: string[] };
const args = process.argv.slice(2);
const LIVES = Number(args[0] ?? 20);
const TEND = (args[1] ?? 'chance') as Tendency;
const SEED = Number(args[2] ?? 1);
const OUT = args[3] ?? 'public/saves/twenty-lives.json';

async function main() {
  setSeed(SEED * 1000 + TEND.length);
  const meta = newMeta();
  meta.settings.tendency = TEND;
  let g!: Game;
  const io: IO = {
    async choose(p: Prompt) {
      const en = p.options.map((o, i) => ({ o, i })).filter((x) => !x.o.disabled);
      if (p.key === 'battlePrep') {
        if (!p.options[2].disabled && rand() < 0.5) return 2;
        return 0;
      }
      if (p.key === 'wheel') {
        const buy = en.filter((x) => x.i < p.options.length - 1);
        return buy.length ? buy[0].i : p.options.length - 1;
      }
      if (p.autoPick !== undefined && !p.options[p.autoPick]?.disabled) return p.autoPick;
      if (p.key === 'daoji') return !p.options[1]?.disabled && rand() < 0.7 ? 1 : 0;
      if (p.title.startsWith('瓶颈')) return 0;
      if (p.title === '飞升天门劫') return 0;
      return en[Math.floor(rand() * en.length)]?.i ?? 0;
    },
    async roll(v: RollView): Promise<RollAction> {
      const L = g.L;
      const nd = autoNudge(v, TEND, L);
      if (nd) return { action: 'nudge', d: nd };
      if (autoAgain(v, TEND, L)) return { action: 'reroll' };
      return { action: 'go', die: autoDie(v, TEND, L, rand) };
    },
    async battle(spec) {
      return autoBattle(spec);
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
    log() {},
    refresh() {},
    async pace() {},
    clearLog() {},
  };
  g = new Game(meta, io);
  g.sim = true;
  for (let i = 0; i < LIVES; i++) {
    await g.runLife(false);
    const L = g.L;
    console.log(`第 ${L.lifeNo} 世：享年 ${L.age}，${L.deathCause ?? L.ended}`);
  }
  // 交给玩家时恢复默认的自动倾向与速度
  meta.settings = { tendency: 'safe', speed: 1 };
  const file: SaveFile = { format: SAVE_FORMAT, v: 1, name: `${LIVES}世存档`, savedAt: new Date().toISOString(), meta, life: null };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(file));
  console.log(`\n${summary(file)}\n故人 ${(meta.acquaintances ?? []).length}，遗泽 ${(meta.legacies ?? []).length}，功法谱 ${Object.keys(meta.cult?.book ?? {}).length}，图谱 ${(meta.pastTrails ?? []).length} 世，千面录 ${(meta.faces ?? []).length}`);
  console.log(`写入 ${OUT}（${(JSON.stringify(file).length / 1024).toFixed(0)} KB）`);
}

main();
