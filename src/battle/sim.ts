// 劫难战斗逻辑：与画面分离，界面和模拟脚本共用同一套规则
import type { BattleSpec, BattleResult } from './spec';
import type { Skill, SkillId } from '../game/types';
import { rand } from '../game/rng';

export type EType = 'swordsman' | 'crow' | 'ghost' | 'mage' | 'elite' | 'banner' | 'puppet' | 'mirror' | 'general' | 'lord' | 'inkeye' | 'lost' | 'chiyi' | 'hebo';

export interface Enemy {
  id: number;
  type: EType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  r: number;
  required: boolean; // 胜利条件
  elite: boolean;
  t: number; // 内部计时
  state: number;
  frozen: number;
  hitFlash: number;
  tag?: string; // fox / righteous / clone / shadow
  invuln?: boolean;
  cd: Record<string, number>;
  tx?: number;
  ty?: number;
  xpVal: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  r: number;
  life: number;
  pierce: number;
  hit: Set<number>;
  color: string;
  enemy: boolean;
  homing?: boolean;
  slow?: boolean;
  kind?: string;
}

export interface Zone {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  dps: number;
  kind: 'fire' | 'ink' | 'firewell' | 'mist';
  enemyHarm: boolean;
  playerHarm: boolean;
}

export interface Warn {
  x: number;
  y: number;
  r: number;
  t: number;
  max: number;
  kind: 'strike' | 'mage' | 'sword';
  dmgPct: number;
  track?: number; // 追踪剩余秒
  lockedAt?: number;
}

export interface Orb {
  x: number;
  y: number;
  v: number;
  kind: 'xp' | 'life';
  vx?: number;
  vy?: number;
  life?: number;
}

export interface Fx {
  x: number;
  y: number;
  t: number;
  max: number;
  kind: 'hit' | 'kill' | 'bolt' | 'slash' | 'text' | 'heal' | 'arc';
  text?: string;
  x2?: number;
  y2?: number;
  color?: string;
}

export interface Partner {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  down: boolean;
  cd: number;
  dmg: number;
  count: number;
}

export interface LevelChoice {
  label: string;
  desc: string;
  apply: () => void;
}

const SKILL_LABEL: Record<SkillId, string> = { sword: '青锋飞剑', orbit: '环身剑印', thunder: '掌心雷符', fire: '离火金乌翎', frost: '玄冰寒魄', ink: '百鬼幡', art: '自创道法' };
const SKILL_DESC: Record<SkillId, string> = {
  sword: '自动射出追踪飞剑',
  orbit: '剑印环绕周身',
  thunder: '定时落雷轰击敌群',
  fire: '投下灼烧火区',
  frost: '寒魄冻结敌人',
  ink: '召出墨魂扑向敌人',
  art: '三束高速灵光穿透',
};

export const ARENA = 900;

export class BattleSim {
  spec: BattleSpec;
  t = 0;
  px = 0;
  py = 0;
  hp: number;
  maxHp: number;
  shield = 0;
  iframes = 0;
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  zones: Zone[] = [];
  warns: Warn[] = [];
  orbs: Orb[] = [];
  fx: Fx[] = [];
  partners: Partner[] = [];
  skills: Skill[];
  cds: Record<string, number> = {};
  kills = 0;
  purified = 0;
  xp = 0; // 本场悟道经验
  totalXp = 0;
  level = 1;
  levelNeed = 10;
  levelUp: LevelChoice[] | null = null;
  pendingLevels = 0;
  stones = 0;
  done = false;
  result: BattleResult | null = null;
  holdFire = false;
  arena: number;
  strikesLeft: number;
  strikeTimer = 2.5;
  strikeIdx = 0;
  spawnTimer = 0;
  eliteTimer = 12;
  nextId = 1;
  foxGuard: boolean;
  foxBlocked = false;
  partnerSaved = false;
  mirrorBeaten = false;
  cloneBeaten = false;
  lifeOrbs = 0;
  phase = 0; // 叩门 / 劫主阶段
  phaseT = 0;
  lordSpawned = false;
  freezeT = 0;
  charmT = 0;
  windT = 20;
  hazardT = 6;
  lifeOrbT = 8;
  rewindReady: boolean;
  hpHistory: { t: number; hp: number }[] = [];
  phoenix: boolean;
  dmgScale: number;
  enemyScale: number;
  mods: Record<string, boolean> = {};
  message = '';
  messageT = 0;
  lastMoveX = 1;
  lastMoveY = 0;
  regenT = 20;
  lordAssist = { fox: false, danzun: false, chiyi: false, bottle: false };
  required0 = 0;

  constructor(spec: BattleSpec) {
    this.spec = spec;
    this.maxHp = spec.player.maxHp;
    this.hp = Math.min(spec.player.hp, this.maxHp);
    this.skills = spec.skills.map((s) => ({ ...s }));
    if (!this.skills.length) this.skills = [{ id: 'sword', lvl: 1 }];
    for (const m of spec.mutators) this.mods[m.id] = true;
    this.arena = ARENA * (this.mods.M08 ? 0.85 : 1);
    this.strikesLeft = spec.kind === 'trial' ? spec.strikes : 0;
    this.foxGuard = spec.foxGuard;
    this.rewindReady = !!this.mods.M23;
    this.phoenix = spec.player.phoenix;
    const r = spec.realm;
    this.dmgScale = spec.player.dmgMul * (1 + 0.45 * (r - 1));
    this.enemyScale = 1 + 0.75 * (r - 1);
    if (this.mods.M19) this.shield = this.maxHp * 0.3;
    for (const p of spec.partners) {
      const lamp = p.lamp;
      this.partners.push({ id: p.id, name: p.name, x: -40, y: 30, hp: this.maxHp * (0.3 + 0.05 * lamp), maxHp: this.maxHp * (0.3 + 0.05 * lamp), down: false, cd: 0, dmg: this.partnerDmg(p.id, lamp, p.count ?? 1), count: p.count ?? 1 });
    }
    if (spec.assist) this.lordAssist = spec.assist;
    this.setup();
  }

  partnerDmg(id: string, lamp: number, count: number) {
    const base = 14;
    switch (id) {
      case 'fox': return base * (0.4 + 0.05 * lamp) * 2;
      case 'chiyi': return base * (0.6 + 0.05 * lamp) * 2.5;
      case 'partner': return base * 0.5 * 2;
      case 'cat': return base * 0.2 * 2;
      case 'disciples': return base * 0.15 * 3 * Math.min(3, count);
      default: return 0;
    }
  }

  say(m: string, t = 2.5) {
    this.message = m;
    this.messageT = t;
  }

  // ---------- 开场 ----------
  setup() {
    const s = this.spec;
    if (s.kind === 'beast') {
      let n = Math.round(6 * (s.formation ? 0.7 : 1) * (this.mods.M05 ? 1.2 : 1));
      for (let i = 0; i < n; i++) this.spawnTrash();
      if (s.boss === 'hebo') this.spawnAt('hebo', 380, 0, true);
    } else if (s.kind === 'duel') {
      let n = s.elites - (s.formation ? 1 : 0);
      n = Math.max(1, n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const type: EType = s.boss === 'chiyi' && i === 0 ? 'chiyi' : this.mods.M09 ? 'elite' : 'elite';
        const e = this.spawnAt(type, Math.cos(a) * 420, Math.sin(a) * 420, true);
        if (this.mods.M09) e.tag = 'fox';
        if (this.mods.M13) {
          e.hp *= 1.3;
          e.maxHp = e.hp;
        }
      }
      for (let i = 0; i < 2 + Math.floor(s.realm / 2); i++) this.spawnAt('mage', (rand() - 0.5) * 900, (rand() - 0.5) * 900, false);
      if (s.realm >= 3 && !s.formation) this.spawnAt('banner', 500, -300, false);
      if (this.mods.M10) this.spawnAt('elite', -400, 300, false).tag = 'righteous';
      if (this.mods.M11) this.spawnAt('chiyi', 0, -460, false).tag = 'clone';
    } else {
      for (let i = 0; i < 3; i++) this.spawnTrash();
      if (s.heartDemon || s.boss === 'trial-mirror') {
        const m = this.spawnAt('mirror', 300, -200, true);
        m.tag = 'mirror';
        if (s.heartMod) m.hp = m.maxHp = m.maxHp * Math.max(0.5, 1 + 0.3 * s.heartMod);
      }
    }
    if (this.mods.M16 && s.kind !== 'trial') {
      const m = this.spawnAt('mirror', -320, -260, false);
      m.hp *= 0.5;
      m.maxHp = m.hp;
      m.dmg *= 0.5;
      m.tag = 'shadow';
    }
    if (this.mods.M12) for (let i = 0; i < 5; i++) this.spawnAt('lost', (rand() - 0.5) * 1000, (rand() - 0.5) * 1000, false);
    if (this.mods.M04) for (let i = 0; i < 3; i++) this.zones.push({ x: (rand() - 0.5) * 1200, y: (rand() - 0.5) * 1200, r: 60, life: 1e9, max: 1e9, dps: 0.08, kind: 'firewell', enemyHarm: false, playerHarm: true });
    if (this.mods.M06) for (let i = 0; i < 4; i++) this.zones.push({ x: (rand() - 0.5) * 1300, y: (rand() - 0.5) * 1300, r: 90, life: 1e9, max: 1e9, dps: 0.04, kind: 'ink', enemyHarm: false, playerHarm: true });
    if (this.mods.M03) for (let i = 0; i < 4; i++) this.zones.push({ x: (rand() - 0.5) * 1200, y: (rand() - 0.5) * 1200, r: 160, life: 1e9, max: 1e9, dps: 0, kind: 'mist', enemyHarm: false, playerHarm: false });
    this.required0 = this.enemies.filter((e) => e.required).length;
    if (s.boss === 'knock' || s.boss === 'lord') this.say('飞升天门劫：渡过九道劫雷，斩灭天门神将');
    else if (s.kind === 'beast') this.say(`坚守 ${s.duration} 秒`);
    else if (s.kind === 'duel') this.say('击败全部精英');
    else this.say(`渡过 ${s.strikes} 道劫雷${s.heartDemon ? '，并击败心魔' : ''}`);
  }

  base(type: EType) {
    const T: Record<EType, [number, number, number, number, number]> = {
      // hp, speed, dmg, radius, xp
      swordsman: [30, 92, 10, 16, 2],
      crow: [12, 160, 6, 11, 1],
      ghost: [75, 55, 14, 19, 3],
      mage: [42, 62, 0, 16, 4],
      elite: [300, 105, 16, 24, 20],
      banner: [140, 30, 8, 22, 10],
      puppet: [200, 0, 0, 22, 8],
      mirror: [0, 115, 0, 20, 30],
      general: [1700, 70, 22, 34, 60],
      lord: [3400, 85, 26, 34, 0],
      inkeye: [260, 0, 0, 26, 10],
      lost: [40, 40, 0, 16, 0],
      chiyi: [700, 125, 20, 24, 40],
      hebo: [1100, 70, 18, 30, 50],
    };
    return T[type];
  }

  spawnAt(type: EType, x: number, y: number, required: boolean): Enemy {
    const [hp0, sp, dmg, r, xpv] = this.base(type);
    let hp = hp0 * this.enemyScale;
    let d = dmg * (1 + 0.35 * (this.spec.realm - 1));
    if (type === 'mirror') {
      hp = this.maxHp * 3;
      d = 0;
    }
    if (type === 'lord') hp = this.base('general')[0] * this.enemyScale * 2;
    const e: Enemy = { id: this.nextId++, type, x: this.px + x, y: this.py + y, hp, maxHp: hp, speed: sp, dmg: d, r, required, elite: ['elite', 'chiyi', 'general', 'lord', 'hebo', 'mirror'].includes(type), t: rand() * 2, state: 0, frozen: 0, hitFlash: 0, cd: {}, xpVal: xpv };
    if (type === 'lost' || type === 'inkeye' || type === 'puppet') e.speed = type === 'lost' ? 30 : 0;
    this.enemies.push(e);
    return e;
  }

  spawnTrash() {
    const a = rand() * Math.PI * 2;
    const d = 420 + rand() * 160;
    let x = Math.cos(a) * d;
    let y = Math.sin(a) * d;
    const r = rand();
    let type: EType = r < 0.5 ? 'swordsman' : r < 0.8 ? 'crow' : 'ghost';
    if (this.spec.kind === 'trial' && r < 0.3) type = 'crow';
    if (type === 'crow' && this.mods.M15) this.spawnAt('crow', x + 20, y + 20, false);
    this.spawnAt(type, x, y, false);
  }

  // ---------- 主循环 ----------
  update(dt: number, mx: number, my: number) {
    if (this.done || this.levelUp) return;
    this.t += dt;
    if (this.messageT > 0) this.messageT -= dt;
    const s = this.spec;

    // 玩家移动
    let speed = 230 * s.player.speed * (this.mods.M01 ? 0.9 : 1) * (this.mods.M24 ? 1.15 : 1);
    if (this.charmT > 0) {
      this.charmT -= dt;
      mx = -mx;
      my = -my;
    }
    const ml = Math.hypot(mx, my);
    if (ml > 0.01) {
      mx /= Math.max(1, ml);
      my /= Math.max(1, ml);
      this.px += mx * speed * dt;
      this.py += my * speed * dt;
      this.lastMoveX = mx;
      this.lastMoveY = my;
    }
    const dc = Math.hypot(this.px, this.py);
    if (dc > this.arena) {
      this.px *= this.arena / dc;
      this.py *= this.arena / dc;
    }
    if (this.iframes > 0) this.iframes -= dt;
    this.hpHistory.push({ t: this.t, hp: this.hp });
    while (this.hpHistory.length && this.hpHistory[0].t < this.t - 2.2) this.hpHistory.shift();

    // 丹道真传回复
    if (s.player.regen) {
      this.regenT -= dt;
      if (this.regenT <= 0) {
        this.regenT = 20;
        this.heal(this.maxHp * 0.06);
      }
    }

    if (this.freezeT > 0) this.freezeT -= dt;

    this.updateSpawns(dt);
    this.updateStrikes(dt);
    this.updatePhases(dt);
    if (!this.holdFire) this.updateSkills(dt);
    this.updatePartners(dt);
    this.updateEnemies(dt);
    this.updateShots(dt);
    this.updateZones(dt);
    this.updateWarns(dt);
    this.updateOrbs(dt);
    this.updateMods(dt);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.max);
    this.checkEnd();
  }

  updateSpawns(dt: number) {
    const s = this.spec;
    if (this.freezeT > 0) return;
    let interval: number;
    if (s.kind === 'beast') interval = Math.max(0.22, 1.05 - 0.09 * s.realm - (this.t / s.duration) * 0.45);
    else if (s.kind === 'duel') interval = 2.2;
    else interval = 1.8;
    if (this.mods.M14) interval *= 0.85;
    if (s.boss === 'lord' && this.phase === 2) interval = 0.9;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < 120) {
      this.spawnTimer = interval;
      this.spawnTrash();
      if (s.kind === 'beast' && this.t > s.duration * 0.6) this.spawnTrash();
    }
    if (s.kind === 'beast') {
      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.eliteTimer = 15;
        const a = rand() * Math.PI * 2;
        const e = this.spawnAt('elite', Math.cos(a) * 500, Math.sin(a) * 500, false);
        if (this.mods.M10 && rand() < 0.5) e.tag = 'righteous';
      }
    }
  }

  updateStrikes(dt: number) {
    const s = this.spec;
    if (s.kind !== 'trial' || this.strikesLeft <= 0) return;
    if (s.boss === 'lord' && this.phase >= 1) return;
    this.strikeTimer -= dt;
    if (this.strikeTimer > 0) return;
    this.strikeTimer = 3.1;
    const pattern = s.realm === 5 ? (this.strikeIdx % 4) + 1 : s.realm;
    this.castStrike(pattern);
    this.strikeIdx += 1;
    this.strikesLeft -= 1;
    if (this.strikesLeft === 0 && s.realm === 5) {
      const g = this.spawnAt('general', 0, -380, true);
      g.tag = 'general';
      this.say('天门神将降临');
    }
  }

  castStrike(pattern: number) {
    const plus = this.mods.M08 ? 0.2 : 0;
    const R = 95;
    if (pattern === 1 || pattern === 4) {
      const warn = (pattern === 4 ? 1.2 : 1.4) + plus;
      this.warns.push({ x: this.px, y: this.py, r: R, t: 0, max: warn, kind: 'strike', dmgPct: 0.3 });
    } else if (pattern === 2) {
      const warn = 1.2 + plus;
      let dx = this.lastMoveX;
      let dy = this.lastMoveY;
      for (let i = -1; i <= 3; i++) this.warns.push({ x: this.px + dx * R * 0.53 * 1.6 * 2 * i, y: this.py + dy * R * 0.53 * 1.6 * 2 * i, r: R, t: 0, max: warn, kind: 'strike', dmgPct: 0.3 });
    } else if (pattern === 3) {
      this.warns.push({ x: this.px, y: this.py, r: R, t: 0, max: 1.5 + plus, kind: 'strike', dmgPct: 0.3, track: 1.0 });
    }
  }

  updatePhases(dt: number) {
    const s = this.spec;
    if (s.boss !== 'knock' && s.boss !== 'lord') return;
    const general = this.enemies.find((e) => e.tag === 'general');
    if (this.phase === 0 && this.strikesLeft === 0 && !general && this.t > 3) {
      this.phase = 1;
      this.phaseT = 0;
      const lord = this.spawnAt('lord', 0, -360, s.boss === 'lord');
      lord.tag = 'lord';
      if (s.boss === 'knock') {
        lord.invuln = true;
        this.say('劫主现身——在他的攻势下坚持 20 秒');
      } else this.say('劫主 · 镜之剑');
    }
    if (this.phase >= 1) this.phaseT += dt;
    if (s.boss === 'knock' && this.phase === 1 && this.phaseT >= 20) {
      this.finish(false, { survivedKnock: true });
      return;
    }
    if (s.boss === 'lord') {
      const lord = this.enemies.find((e) => e.tag === 'lord');
      if (this.phase === 1 && lord && lord.hp <= 0.02 * lord.maxHp) {
        this.phase = 2;
        this.phaseT = 0;
        lord.invuln = true;
        lord.hp = lord.maxHp;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          const e = this.spawnAt('inkeye', Math.cos(a) * 380 - this.px, Math.sin(a) * 380 - this.py, true);
          e.tag = 'inkeye';
        }
        this.say('墨潮：四十秒内净化四只墨眼');
      }
      if (this.phase === 2) {
        this.arena = Math.max(260, ARENA - Math.floor(this.phaseT / 5) * 70);
        const eyes = this.enemies.filter((e) => e.tag === 'inkeye');
        if (!eyes.length) {
          this.phase = 3;
          this.phaseT = 0;
          this.arena = ARENA;
          if (lord) {
            lord.invuln = false;
            lord.hp = lord.maxHp = this.base('general')[0] * this.enemyScale * 3;
          }
          this.strikesLeft = 99;
          this.say('断笔');
          // 命灯 9 级的同行者各出手一次
          if (this.lordAssist.danzun) this.heal(this.maxHp);
          if (lord && this.lordAssist.chiyi) lord.hp *= 0.85;
          if (this.lordAssist.bottle) this.freezeT = 3;
          if (this.lordAssist.fox) this.foxGuard = true;
        } else if (this.phaseT >= 40) {
          this.say('墨潮吞没了全场');
          this.finish(false);
          return;
        }
      }
      if (this.phase === 3) {
        this.strikeTimer -= dt;
        if (this.strikeTimer <= 0) {
          this.strikeTimer = 3.4;
          this.castStrike((this.strikeIdx++ % 4) + 1);
        }
        if (!lord || lord.hp <= 0) this.finish(true, { lordBeaten: true });
      }
      if (this.phase === 1 && lord) {
        lord.cd.track = (lord.cd.track ?? 15) - dt;
        if (lord.cd.track <= 0) {
          lord.cd.track = 15;
          this.castStrike(3);
        }
      }
    }
  }

  // ---------- 技能 ----------
  skillLvl(id: SkillId) {
    return this.skills.find((s) => s.id === id)?.lvl ?? 0;
  }

  nearest(maxD = 9999, from?: { x: number; y: number }): Enemy | null {
    const fx = from?.x ?? this.px;
    const fy = from?.y ?? this.py;
    let best: Enemy | null = null;
    let bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.invuln) continue;
      const d = (e.x - fx) ** 2 + (e.y - fy) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  dmgRoll(base: number, kind: string): number {
    let d = base * this.dmgScale;
    if (kind === 'frost' && this.mods.M01) d *= 1.2;
    if (this.mods.M18 && this.hp < this.maxHp * 0.3) d *= 1.25;
    if (this.mods.M24 && this.skills.length < 2) d *= 1.15;
    const crit = rand() < this.spec.player.crit;
    if (crit) d *= this.mods.M20 ? 2.4 : 2;
    else if (this.mods.M20) d *= 0.9;
    return d;
  }

  updateSkills(dt: number) {
    for (const sk of this.skills) {
      const id = sk.id;
      const lvl = sk.lvl;
      this.cds[id] = (this.cds[id] ?? 0) - dt;
      if (id === 'orbit') {
        const n = 2 + lvl;
        const rad = 78;
        for (let i = 0; i < n; i++) {
          const a = this.t * 3 + (i / n) * Math.PI * 2;
          const ox = this.px + Math.cos(a) * rad;
          const oy = this.py + Math.sin(a) * rad;
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.invuln) continue;
            if ((e.x - ox) ** 2 + (e.y - oy) ** 2 < (e.r + 12) ** 2) {
              const key = 'orb' + i;
              if ((e.cd[key] ?? 0) <= this.t) {
                e.cd[key] = this.t + 0.45;
                this.damage(e, this.dmgRoll(7 + 3 * lvl, 'orbit'));
              }
            }
          }
        }
        continue;
      }
      if (this.cds[id] > 0) continue;
      const target = this.nearest(id === 'thunder' ? 480 : 700);
      if (!target) continue;
      if (id === 'sword') {
        this.cds[id] = Math.max(0.35, 0.95 - 0.09 * lvl);
        const n = 1 + Math.floor(lvl / 2);
        const pierce = (this.mods.M02 ? 1 : 0) + (lvl >= 4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const ang = Math.atan2(target.y - this.py, target.x - this.px) + (i - (n - 1) / 2) * 0.18;
          this.shots.push({ x: this.px, y: this.py, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, dmg: this.dmgRoll(11 + 4 * lvl, 'sword'), r: 8, life: 1.2, pierce, hit: new Set(), color: '#4fd2f5', enemy: false, homing: true, kind: 'sword' });
        }
      } else if (id === 'thunder') {
        this.cds[id] = Math.max(0.8, 2.4 - 0.28 * lvl);
        const r = 70 + 6 * lvl;
        this.fx.push({ x: target.x, y: target.y, t: 0, max: 0.35, kind: 'bolt' });
        for (const e of this.enemies) if ((e.x - target.x) ** 2 + (e.y - target.y) ** 2 < r * r) this.damage(e, this.dmgRoll(22 + 9 * lvl, 'thunder'));
      } else if (id === 'fire') {
        this.cds[id] = 2.8;
        const life = 3 * (this.mods.M04 ? 1.5 : 1);
        this.zones.push({ x: target.x, y: target.y, r: 55 + 6 * lvl, life, max: life, dps: 9 + 5 * lvl, kind: 'fire', enemyHarm: true, playerHarm: false });
      } else if (id === 'frost') {
        this.cds[id] = Math.max(0.5, 1.25 - 0.1 * lvl);
        const ang = Math.atan2(target.y - this.py, target.x - this.px);
        this.shots.push({ x: this.px, y: this.py, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, dmg: this.dmgRoll(10 + 5 * lvl, 'frost'), r: 9, life: 1.4, pierce: lvl >= 3 ? 1 : 0, hit: new Set(), color: '#6fb6e8', enemy: false, slow: true, kind: 'frost' });
      } else if (id === 'ink') {
        this.cds[id] = 2.4;
        for (let i = 0; i < lvl; i++) {
          const a = rand() * Math.PI * 2;
          this.shots.push({ x: this.px, y: this.py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: this.dmgRoll(16 + 4 * lvl, 'ink'), r: 10, life: 3, pierce: 0, hit: new Set(), color: '#4a3d6b', enemy: false, homing: true, kind: 'ink' });
        }
      } else if (id === 'art') {
        this.cds[id] = Math.max(0.6, 1.7 - 0.16 * lvl);
        const ang0 = Math.atan2(target.y - this.py, target.x - this.px);
        for (let i = -1; i <= 1; i++) {
          const ang = ang0 + i * 0.12;
          this.shots.push({ x: this.px, y: this.py, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, dmg: this.dmgRoll(12 + 6 * lvl, 'art'), r: 7, life: 0.9, pierce: 3, hit: new Set(), color: '#c9a23a', enemy: false, kind: 'art' });
        }
      }
    }
  }

  updatePartners(dt: number) {
    let i = 0;
    for (const p of this.partners) {
      i++;
      if (p.down) continue;
      const ang = this.t * 0.8 + i * 2.1;
      const tx = this.px + Math.cos(ang) * 55;
      const ty = this.py + Math.sin(ang) * 55;
      p.x += (tx - p.x) * Math.min(1, dt * 6);
      p.y += (ty - p.y) * Math.min(1, dt * 6);
      p.cd -= dt;
      if (this.holdFire && p.id !== 'danzun') continue;
      if (p.id === 'danzun') {
        if (p.cd <= 0) {
          p.cd = 10;
          this.heal(this.maxHp * 0.08);
        }
        continue;
      }
      if (p.id === 'fox') {
        for (let k = 0; k < 3; k++) {
          const a = this.t * 2.4 + (k / 3) * Math.PI * 2;
          const ox = this.px + Math.cos(a) * 110;
          const oy = this.py + Math.sin(a) * 110;
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.invuln) continue;
            if ((e.x - ox) ** 2 + (e.y - oy) ** 2 < (e.r + 14) ** 2 && (e.cd['fox' + k] ?? 0) <= this.t) {
              e.cd['fox' + k] = this.t + 0.5;
              this.damage(e, p.dmg * this.dmgScale);
            }
          }
        }
        continue;
      }
      if (p.cd > 0) continue;
      const tgt = this.nearest(p.id === 'cat' ? 120 : 520, p);
      if (!tgt) continue;
      if (p.id === 'chiyi') {
        p.cd = 1;
        this.fx.push({ x: p.x, y: p.y, x2: tgt.x, y2: tgt.y, t: 0, max: 0.25, kind: 'slash', color: '#b03030' });
        this.damage(tgt, p.dmg * this.dmgScale);
        this.heal(this.maxHp * 0.01);
      } else if (p.id === 'cat') {
        p.cd = 0.8;
        this.damage(tgt, p.dmg * this.dmgScale);
      } else {
        p.cd = p.id === 'disciples' ? 1.2 : 1;
        const n = p.id === 'disciples' ? p.count : 1;
        for (let k = 0; k < n; k++) {
          const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x) + (k - (n - 1) / 2) * 0.2;
          this.shots.push({ x: p.x, y: p.y, vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560, dmg: (p.dmg / n) * this.dmgScale, r: 6, life: 1, pierce: 0, hit: new Set(), color: '#5fae8a', enemy: false, kind: 'partner' });
        }
      }
    }
  }

  // ---------- 敌人 ----------
  updateEnemies(dt: number) {
    const frozenAll = this.freezeT > 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (frozenAll) continue;
      if (e.frozen > 0) {
        e.frozen -= dt;
        continue;
      }
      e.t += dt;
      const dx = this.px - e.x;
      const dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      let sp = e.speed;
      switch (e.type) {
        case 'mage': {
          if (d < 240) sp = -e.speed;
          else if (d < 320) sp = 0;
          e.cd.cast = (e.cd.cast ?? 2 + rand() * 2) - dt;
          if (e.cd.cast <= 0 && d < 600) {
            e.cd.cast = 3.2;
            this.warns.push({ x: this.px, y: this.py, r: 70, t: 0, max: 1.0, kind: 'mage', dmgPct: 0.12 });
          }
          break;
        }
        case 'elite':
        case 'chiyi':
        case 'hebo': {
          e.cd.dash = (e.cd.dash ?? 3) - dt;
          if (e.state === 0 && e.cd.dash <= 0 && d < 500) {
            e.state = 1;
            e.t = 0;
            e.tx = this.px;
            e.ty = this.py;
          }
          if (e.state === 1) {
            sp = 0;
            if (e.t > 0.8) {
              e.state = 2;
              e.t = 0;
            }
          } else if (e.state === 2) {
            const ddx = (e.tx ?? this.px) - e.x;
            const ddy = (e.ty ?? this.py) - e.y;
            const dd = Math.hypot(ddx, ddy) || 1;
            e.x += (ddx / dd) * 620 * dt;
            e.y += (ddy / dd) * 620 * dt;
            if (dd < 20 || e.t > 0.6) {
              e.state = 0;
              e.cd.dash = e.type === 'chiyi' ? 2.2 : 3.5;
              if (e.type === 'chiyi' || e.type === 'hebo') this.ring(e, 8, 260, 0.08);
            }
            sp = 0;
          }
          break;
        }
        case 'banner': {
          sp = d > 420 ? e.speed : 0;
          e.cd.summon = (e.cd.summon ?? 4) - dt;
          if (e.cd.summon <= 0) {
            e.cd.summon = 4.5;
            for (let k = 0; k < 2; k++) this.spawnAt('swordsman', e.x - this.px + (rand() - 0.5) * 60, e.y - this.py + (rand() - 0.5) * 60, false);
          }
          break;
        }
        case 'puppet':
        case 'inkeye': {
          sp = 0;
          e.cd.fire = (e.cd.fire ?? 2) - dt;
          if (e.cd.fire <= 0) {
            e.cd.fire = e.type === 'inkeye' ? 1.6 : 2;
            this.aimShot(e, 300, 0.07);
          }
          break;
        }
        case 'mirror': {
          if (d < 260) sp = -e.speed * 0.6;
          else if (d < 340) sp = 0;
          e.cd.fire = (e.cd.fire ?? 1) - dt;
          if (e.cd.fire <= 0) {
            e.cd.fire = 0.9;
            const n = 1 + Math.min(3, Math.floor(this.skills.reduce((a, s) => a + s.lvl, 0) / 4));
            for (let k = 0; k < n; k++) this.aimShot(e, 380, (e.tag === 'shadow' ? 0.035 : 0.06) * 0.7, (k - (n - 1) / 2) * 0.2);
          }
          break;
        }
        case 'general': {
          e.cd.fire = (e.cd.fire ?? 2) - dt;
          if (e.cd.fire <= 0) {
            e.cd.fire = 2;
            this.ring(e, 10, 240, 0.07);
          }
          break;
        }
        case 'lord': {
          e.cd.fire = (e.cd.fire ?? 1.5) - dt;
          if (e.cd.fire <= 0) {
            e.cd.fire = this.phase === 3 ? 1.2 : 1.5;
            for (let k = 0; k < 3; k++) this.ring(e, 8, 230 + k * 40, 0.07, this.t + k * 0.13);
          }
          if (this.phase === 2) sp = 0;
          break;
        }
        case 'lost':
          sp = e.speed;
          break;
      }
      if (sp !== 0) {
        e.x += (dx / d) * sp * dt;
        e.y += (dy / d) * sp * dt;
      }
      // 接触伤害
      if (e.dmg > 0 && d < e.r + 14) this.hurt(e.dmg * (this.mods.M22 ? 0.85 : 1), e);
      // 伙伴受击
      if (e.dmg > 0) for (const p of this.partners) if (!p.down && p.id !== 'danzun' && (p.x - e.x) ** 2 + (p.y - e.y) ** 2 < (e.r + 10) ** 2) {
        p.hp -= e.dmg * dt * 2;
        if (p.hp <= 0) {
          p.down = true;
          this.say(`${p.name}倒下了`);
        }
      }
    }
    // 互相推开（简单）
    const es = this.enemies;
    for (let i = 0; i < es.length; i += 2) {
      const a = es[i];
      const b = es[(i + 1) % es.length];
      if (a === b || a.speed === 0 || b.speed === 0) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = a.r + b.r;
      if (d < min) {
        const push = (min - d) / 2;
        a.x += (dx / d) * push;
        a.y += (dy / d) * push;
        b.x -= (dx / d) * push;
        b.y -= (dy / d) * push;
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  ring(e: Enemy, n: number, speed: number, dmgPct: number, off = 0) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + off + e.t * 0.3;
      this.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: this.maxHp * dmgPct, r: 8, life: 3.5, pierce: 0, hit: new Set(), color: '#c0392b', enemy: true });
    }
  }

  aimShot(e: Enemy, speed: number, dmgPct: number, off = 0) {
    const a = Math.atan2(this.py - e.y, this.px - e.x) + off;
    this.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: this.maxHp * dmgPct, r: 8, life: 3, pierce: 0, hit: new Set(), color: e.type === 'mirror' ? '#2a3550' : '#c0392b', enemy: true });
  }

  updateShots(dt: number) {
    for (const s of this.shots) {
      let slow = 1;
      if (s.enemy && this.mods.M03) for (const z of this.zones) if (z.kind === 'mist' && (s.x - z.x) ** 2 + (s.y - z.y) ** 2 < z.r * z.r) slow = 0.8;
      if (s.enemy && this.freezeT > 0) slow = 0;
      if (s.homing && !s.enemy) {
        const tgt = this.nearest(400, s);
        if (tgt) {
          const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
          const sp = Math.hypot(s.vx, s.vy);
          const cur = Math.atan2(s.vy, s.vx);
          let da = a - cur;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const na = cur + Math.max(-6 * dt, Math.min(6 * dt, da));
          s.vx = Math.cos(na) * Math.max(sp, s.kind === 'ink' ? 340 : sp);
          s.vy = Math.sin(na) * Math.max(sp, s.kind === 'ink' ? 340 : sp);
        }
      }
      s.x += s.vx * dt * slow;
      s.y += s.vy * dt * slow;
      s.life -= dt;
      if (s.enemy) {
        if ((s.x - this.px) ** 2 + (s.y - this.py) ** 2 < (s.r + 12) ** 2) {
          this.hurt(s.dmg, null, true);
          s.life = 0;
        }
        continue;
      }
      for (const e of this.enemies) {
        if (e.hp <= 0 || s.hit.has(e.id) || e.invuln) continue;
        if ((s.x - e.x) ** 2 + (s.y - e.y) ** 2 < (s.r + e.r) ** 2) {
          s.hit.add(e.id);
          this.damage(e, s.dmg);
          if (s.slow) e.frozen = Math.max(e.frozen, this.skillLvl('frost') >= 3 ? 1.2 : 0.4);
          if (s.kind === 'sword' && rand() < 0.4) this.fx.push({ x: this.px, y: this.py, x2: e.x, y2: e.y, t: 0, max: 0.3, kind: 'arc' });
          if (s.pierce-- <= 0) {
            s.life = 0;
            break;
          }
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  updateZones(dt: number) {
    for (const z of this.zones) {
      z.life -= dt;
      if (z.enemyHarm) for (const e of this.enemies) if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + e.r) ** 2) this.damage(e, z.dps * this.dmgScale * dt, true);
      if (z.playerHarm && (this.px - z.x) ** 2 + (this.py - z.y) ** 2 < z.r * z.r) this.hurtRaw(this.maxHp * z.dps * dt);
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  updateWarns(dt: number) {
    for (const w of this.warns) {
      w.t += dt;
      if (w.track && w.t < w.track) {
        const dx = this.px - w.x;
        const dy = this.py - w.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = 230 * 0.6;
        w.x += (dx / d) * Math.min(d, sp * dt);
        w.y += (dy / d) * Math.min(d, sp * dt);
      }
      if (w.t >= w.max) {
        // 落雷
        const core = w.kind === 'strike' ? w.r * 0.53 + 18 : w.r;
        if (w.kind === 'strike') this.fx.push({ x: w.x, y: w.y, t: 0, max: 0.4, kind: 'bolt' });
        if ((this.px - w.x) ** 2 + (this.py - w.y) ** 2 < core * core) {
          if (w.kind === 'strike' && this.foxGuard) {
            this.foxGuard = false;
            this.foxBlocked = true;
            this.partnerSaved = true;
            this.say('白狐替你挡下了这道雷');
          } else this.hurtRaw(this.maxHp * w.dmgPct, true);
        }
        if (w.kind === 'strike') {
          for (const e of this.enemies) if ((e.x - w.x) ** 2 + (e.y - w.y) ** 2 < (w.r + e.r) ** 2) {
            if (e.type === 'mirror' || e.type === 'lord' || e.type === 'general') this.damage(e, e.maxHp * 0.15, true, true);
            else this.damage(e, 60 * this.enemyScale, true, true);
          }
        }
      }
    }
    this.warns = this.warns.filter((w) => w.t < w.max);
  }

  updateOrbs(dt: number) {
    const pr = 70 * (this.spec.partners.some((p) => p.id === 'cat') ? 1.4 : 1);
    for (const o of this.orbs) {
      if (o.kind === 'life') {
        o.x += (o.vx ?? 0) * dt;
        o.y += (o.vy ?? 0) * dt;
        o.life = (o.life ?? 8) - dt;
      }
      const d = Math.hypot(this.px - o.x, this.py - o.y);
      if (d < pr) {
        o.x += ((this.px - o.x) / (d || 1)) * 500 * dt;
        o.y += ((this.py - o.y) / (d || 1)) * 500 * dt;
      }
      if (d < 18) {
        o.v = -1;
        if (o.kind === 'xp') this.gainXp(1);
        else {
          this.lifeOrbs += 1;
          this.fx.push({ x: this.px, y: this.py - 20, t: 0, max: 1, kind: 'text', text: '寿元 +1', color: '#3a8a5a' });
        }
      }
    }
    this.orbs = this.orbs.filter((o) => o.v >= 0 && (o.kind !== 'life' || (o.life ?? 1) > 0));
  }

  updateMods(dt: number) {
    if (this.mods.M07) {
      this.windT -= dt;
      if (this.windT <= 0) {
        this.windT = 20;
        for (const e of this.enemies) {
          const dx = e.x - this.px;
          const dy = e.y - this.py;
          const d = Math.hypot(dx, dy) || 1;
          if (e.speed > 0) {
            e.x += (dx / d) * 220;
            e.y += (dy / d) * 220;
          }
        }
        const a = rand() * Math.PI * 2;
        this.px += Math.cos(a) * 80;
        this.py += Math.sin(a) * 80;
        this.say('画外风起');
      }
    }
    if (this.mods.M02) {
      this.hazardT -= dt;
      if (this.hazardT <= 0) {
        this.hazardT = 6;
        for (let k = 0; k < 3; k++) this.warns.push({ x: this.px + (rand() - 0.5) * 400, y: this.py + (rand() - 0.5) * 400, r: 50, t: 0, max: 1.2, kind: 'sword', dmgPct: 0.12 });
      }
    }
    if (this.mods.M17) {
      this.lifeOrbT -= dt;
      if (this.lifeOrbT <= 0) {
        this.lifeOrbT = 8;
        const a = rand() * Math.PI * 2;
        this.orbs.push({ x: this.px + Math.cos(a) * 220, y: this.py + Math.sin(a) * 220, v: 1, kind: 'life', vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 8 });
      }
    }
  }

  // ---------- 伤害结算 ----------
  damage(e: Enemy, amount: number, silent = false, fromStrike = false) {
    if (e.invuln || e.hp <= 0) return;
    if (e.type === 'mirror' && !fromStrike) amount *= 0.35;
    if (e.type === 'crow' && this.mods.M15) amount *= 1.3;
    e.hp -= amount;
    e.hitFlash = 0.12;
    if (!silent && amount >= 1) this.fx.push({ x: e.x, y: e.y - e.r, t: 0, max: 0.6, kind: 'text', text: String(Math.round(amount)) });
    if (this.spec.player.lifesteal) this.heal(amount * 0.01);
    if (e.hp <= 0) this.onKill(e);
  }

  onKill(e: Enemy) {
    this.fx.push({ x: e.x, y: e.y, t: 0, max: 0.5, kind: 'kill' });
    if (e.type === 'lost') {
      this.purified += 1;
      this.fx.push({ x: e.x, y: e.y - 20, t: 0, max: 1.2, kind: 'text', text: '净化', color: '#3a8a5a' });
      return;
    }
    if (e.type === 'inkeye') {
      this.say(`墨眼净化（剩 ${this.enemies.filter((x) => x.tag === 'inkeye' && x.hp > 0).length}）`, 1.5);
      return;
    }
    if (e.type === 'lord') {
      if (this.spec.boss === 'lord' && this.phase === 1) {
        e.hp = 1;
        return;
      }
    }
    if (e.tag === 'mirror' || e.tag === 'shadow') {
      if (e.tag === 'mirror') this.mirrorBeaten = true;
      this.say(e.tag === 'mirror' ? '心魔溃散——那张脸是你自己' : '心魔影溃散，你悟得一道');
      if (e.tag === 'shadow') this.pendingLevels += 1;
    }
    if (e.tag === 'clone') this.cloneBeaten = true;
    this.kills += 1;
    let v = e.xpVal * (this.mods.M06 ? 1.3 : 1) * (this.mods.M14 ? 1.25 : 1) * (this.mods.M21 ? 0.9 : 1);
    const n = Math.max(1, Math.round(v));
    for (let i = 0; i < n; i++) this.orbs.push({ x: e.x + (rand() - 0.5) * 20, y: e.y + (rand() - 0.5) * 20, v: 1, kind: 'xp' });
    let st = e.elite ? 10 : 1;
    if (e.tag === 'righteous') st *= 2;
    if (this.mods.M19) st *= 0.8;
    this.stones += st;
    this.totalXp += e.xpVal * 4;
  }

  heal(n: number) {
    if (this.mods.M18) n *= 0.7;
    if (this.mods.M05) n *= 1.3;
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  hurt(dmg: number, e: Enemy | null, isShot = false) {
    if (this.iframes > 0) return;
    this.iframes = 0.5;
    if (e?.tag === 'fox') this.charmT = 1;
    this.hurtRaw(dmg, false, isShot);
  }

  hurtRaw(dmg: number, _isStrike = false, _isShot = false) {
    dmg *= 1 - this.spec.player.armor;
    if (this.shield > 0) {
      const s = Math.min(this.shield, dmg);
      this.shield -= s;
      dmg -= s;
    }
    this.hp -= dmg;
    if (this.hp <= 0) {
      if (this.foxGuard && this.spec.kind !== 'trial') {
        this.foxGuard = false;
        this.foxBlocked = true;
        this.partnerSaved = true;
        this.hp = Math.max(1, this.maxHp * 0.15);
        this.say('白狐替你挡下了致命一击');
        return;
      }
      if (this.rewindReady) {
        this.rewindReady = false;
        const past = this.hpHistory[0]?.hp ?? this.maxHp * 0.3;
        this.hp = Math.max(1, past);
        this.say('回溯之痕：时间倒流两秒');
        for (const en of this.enemies) {
          const dx = en.x - this.px;
          const dy = en.y - this.py;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 200 && en.speed > 0) {
            en.x += (dx / d) * 160;
            en.y += (dy / d) * 160;
          }
        }
        return;
      }
      if (this.phoenix) {
        this.phoenix = false;
        this.hp = 1;
        this.enemies = this.enemies.filter((en) => en.required || en.elite);
        this.say('浴火凤命：留得一口气，清场');
        return;
      }
      this.hp = 0;
      this.finish(false);
    }
  }

  gainXp(n: number) {
    this.xp += n;
    this.totalXp += n;
    while (this.xp >= this.levelNeed) {
      this.xp -= this.levelNeed;
      this.level += 1;
      this.levelNeed = Math.round(this.levelNeed + 8);
      this.pendingLevels += 1;
    }
    if (this.pendingLevels > 0 && !this.levelUp && !this.done) this.openLevelUp();
  }

  openLevelUp() {
    this.pendingLevels -= 1;
    const opts: LevelChoice[] = [];
    const up = this.skills.filter((s) => s.lvl < 5);
    const ids: SkillId[] = ['sword', 'orbit', 'thunder', 'fire', 'frost', 'ink'];
    const fresh = ids.filter((id) => !this.skills.some((s) => s.id === id));
    const pool: LevelChoice[] = [];
    for (const s of up) pool.push({ label: `${SKILL_LABEL[s.id]} → ${s.lvl + 1} 阶`, desc: SKILL_DESC[s.id], apply: () => (s.lvl += 1) });
    if (this.skills.length < 4 && !this.mods.M24) for (const id of fresh) pool.push({ label: `新法宝：${SKILL_LABEL[id]}`, desc: SKILL_DESC[id], apply: () => this.skills.push({ id, lvl: 1 }) });
    const n = this.spec.scholar ? 4 : 3;
    while (opts.length < n && pool.length) opts.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    opts.push({ label: '调息', desc: '回复 30% 气血', apply: () => this.heal(this.maxHp * 0.3) });
    this.levelUp = opts.slice(0, Math.max(n, Math.min(opts.length, n)));
    if (!this.levelUp.length) this.levelUp = null;
  }

  chooseLevel(i: number) {
    if (!this.levelUp) return;
    const o = this.levelUp[i] ?? this.levelUp[0];
    o.apply();
    this.levelUp = null;
    if (this.pendingLevels > 0) this.openLevelUp();
  }

  checkEnd() {
    if (this.done) return;
    const s = this.spec;
    if (s.boss === 'knock' || s.boss === 'lord') return; // 在 updatePhases 里结算
    const reqAlive = this.enemies.some((e) => e.required);
    if (s.kind === 'beast' && this.t >= s.duration && !reqAlive) this.finish(true);
    if (s.kind === 'duel' && !reqAlive && this.t > 1) this.finish(true);
    if (s.kind === 'trial' && this.strikesLeft <= 0 && this.warns.filter((w) => w.kind === 'strike').length === 0 && !reqAlive && this.t > 2) this.finish(true);
  }

  finish(win: boolean, extra: Partial<BattleResult> = {}) {
    if (this.done) return;
    this.done = true;
    this.levelUp = null;
    const downed = this.partners.filter((p) => p.down).map((p) => p.id);
    this.result = {
      win,
      hp: Math.max(0, Math.round(this.hp)),
      kills: this.kills,
      xp: Math.round(this.totalXp),
      stones: this.stones,
      skills: this.skills.map((s) => ({ ...s })),
      downed,
      foxBlocked: this.foxBlocked,
      partnerSaved: this.partnerSaved,
      mirrorBeaten: this.mirrorBeaten,
      purified: this.purified,
      survivedKnock: false,
      lordBeaten: false,
      cloneBeaten: this.cloneBeaten,
      lifeOrbs: this.lifeOrbs,
      ...extra,
    };
  }

  // 目标进度文本（HUD）
  objective(): string {
    const s = this.spec;
    if (s.boss === 'knock' || s.boss === 'lord') {
      if (this.phase === 0) return this.strikesLeft > 0 ? `劫雷 ${s.strikes - this.strikesLeft}/${s.strikes}` : '斩灭天门神将';
      if (s.boss === 'knock') return `在劫主攻势下坚持 ${Math.max(0, 20 - this.phaseT).toFixed(1)} 秒`;
      if (this.phase === 1) return '劫主 · 镜之剑';
      if (this.phase === 2) return `墨潮：净化墨眼 ${4 - this.enemies.filter((e) => e.tag === 'inkeye').length}/4 · ${Math.max(0, 40 - this.phaseT).toFixed(0)} 秒`;
      return '劫主 · 断笔';
    }
    if (s.kind === 'beast') return `坚守 ${Math.max(0, s.duration - this.t).toFixed(0)} 秒${this.enemies.some((e) => e.required) ? ' · 击败首领' : ''}`;
    if (s.kind === 'duel') return `精英 ${this.required0 - this.enemies.filter((e) => e.required).length}/${this.required0}`;
    return `劫雷 ${s.strikes - this.strikesLeft}/${s.strikes}${s.heartDemon ? (this.mirrorBeaten ? ' · 心魔已破' : ' · 击败心魔') : ''}`;
  }
}

// 模拟用的自动驾驶：远离最近敌人、躲劫雷预警，悟道选第一项
export function autoBattle(spec: BattleSpec, lordAssist?: BattleSim['lordAssist']): BattleResult {
  const b = new BattleSim(spec);
  if (lordAssist) b.lordAssist = lordAssist;
  const dt = 1 / 20;
  let guard = 0;
  while (!b.done && guard++ < 20 * 400) {
    if (b.levelUp) {
      b.chooseLevel(0);
      continue;
    }
    let mx = 0;
    let my = 0;
    for (const e of b.enemies) {
      const dx = b.px - e.x;
      const dy = b.py - e.y;
      const d2 = dx * dx + dy * dy + 1;
      if (d2 < 260 * 260) {
        mx += dx / d2;
        my += dy / d2;
      }
    }
    // 回到场中央的倾向
    mx -= b.px * 0.000002;
    my -= b.py * 0.000002;
    const l = Math.hypot(mx, my);
    if (l > 0) {
      mx /= l;
      my /= l;
    }
    // 躲预警：在 16 个方向里找落点处最安全的一个
    const coreOf = (w: (typeof b.warns)[number]) => (w.kind === 'strike' ? w.r * 0.53 + 18 : w.r) + 14;
    const danger = (x: number, y: number) => {
      let n = 0;
      for (const w of b.warns) if ((x - w.x) ** 2 + (y - w.y) ** 2 < coreOf(w) ** 2) n += 1;
      return n;
    };
    let dodging = false;
    if (b.warns.length && danger(b.px, b.py) > 0) {
      const left = Math.min(...b.warns.map((w) => w.max - w.t));
      const reach = Math.max(40, 230 * spec.player.speed * Math.max(0.2, left) * 0.85);
      let best = danger(b.px, b.py) * 10;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        const sc = danger(b.px + cx * reach, b.py + cy * reach) * 10 - (cx * mx + cy * my) * 0.5;
        if (sc < best) {
          best = sc;
          mx = cx;
          my = cy;
          dodging = true;
        }
      }
    }
    // 斗法时主动接近精英
    if (!dodging && spec.kind !== 'beast' && b.enemies.some((e) => e.required)) {
      const tgt = b.enemies.find((e) => e.required)!;
      const dx = tgt.x - b.px;
      const dy = tgt.y - b.py;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 300) {
        mx = mx * 0.4 + (dx / d) * 0.6;
        my = my * 0.4 + (dy / d) * 0.6;
      }
    }
    b.update(dt, mx, my);
  }
  if (!b.done) b.finish(false);
  return b.result!;
}
