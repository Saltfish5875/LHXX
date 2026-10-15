// 沿用 R10 的境界、属性、天赋等基础数据（网页原型取其子集）

export type School = 'sword' | 'body' | 'alchemy' | 'demon' | 'rune';
export type AttrKey = 'gen' | 'wu' | 'luck' | 'fam';

export const ATTR_NAMES: Record<AttrKey, string> = { gen: '根骨', wu: '悟性', luck: '气运', fam: '家境' };
export const SCHOOL_NAMES: Record<School, string> = { sword: '剑修', body: '体修', alchemy: '丹修', demon: '魔修', rune: '符修' };

export interface Realm {
  name: string;
  step: number; // 每回合年数
  lifeBase: number;
  need: number; // 突破修为
  trial: string; // 劫名
  strikes: number;
}

// 0 = 凡人，1 练气 … 5 化神（R10 第 4.1 节）
export const REALMS: Realm[] = [
  { name: '凡人', step: 1, lifeBase: 48, need: 0, trial: '', strikes: 0 },
  { name: '练气', step: 1, lifeBase: 120, need: 300, trial: '引灵小天劫', strikes: 3 },
  { name: '筑基', step: 2, lifeBase: 220, need: 850, trial: '四九紫霄劫', strikes: 4 },
  { name: '金丹', step: 5, lifeBase: 500, need: 1600, trial: '六九寂灭劫', strikes: 6 },
  { name: '元婴', step: 10, lifeBase: 1000, need: 2800, trial: '九九心魔劫', strikes: 8 },
  { name: '化神', step: 20, lifeBase: 2000, need: 4200, trial: '飞升天门劫', strikes: 9 },
];

export type Grade = '凡品' | '灵品' | '玄品' | '仙品' | '神品';
export const GRADE_WEIGHT: Record<Grade, number> = { 凡品: 3, 灵品: 6, 玄品: 4, 仙品: 1.5, 神品: 0.45 };

export interface Talent {
  id: string;
  name: string;
  grade: Grade;
  desc: string;
  school?: School;
  attr?: Partial<Record<AttrKey, number>>;
  flags?: string[];
  life?: number; // 寿元
}

// 只收录 R12 内容库里点名的天赋与少量补充，归属按内容库「天赋流派归属」
export const TALENTS: Talent[] = [
  { id: 'sword_bone', name: '天生剑骨', grade: '玄品', school: 'sword', desc: '飞剑伤害 +15%', flags: ['swordDmg'] },
  { id: 'wine_sword', name: '酒中剑仙', grade: '仙品', school: 'sword', desc: '暴击率 +8%，悟性 +1', attr: { wu: 1 }, flags: ['crit'] },
  { id: 'sword_mad', name: '天生剑痴', grade: '灵品', school: 'sword', desc: '剑修道途起步更快', attr: { wu: 1 } },
  { id: 'ancient_body', name: '荒古圣体', grade: '神品', school: 'body', desc: '根骨 +3，气血 +30%', attr: { gen: 3 }, flags: ['bodyHp'] },
  { id: 'odd_bones', name: '骨骼惊奇', grade: '灵品', school: 'body', desc: '根骨 +2', attr: { gen: 2 } },
  { id: 'deathless', name: '长生不死胎', grade: '仙品', school: 'body', desc: '寿元 +25%', flags: ['longLife'] },
  { id: 'five_seed', name: '五行道种', grade: '玄品', school: 'alchemy', desc: '灵根下限为五行杂以上，炼丹更易', flags: ['noNoRoot'] },
  { id: 'pill_heir', name: '丹道真传', grade: '玄品', school: 'alchemy', desc: '战斗中每 20 秒回复 6% 气血', flags: ['regen'] },
  { id: 'rich', name: '富甲一方', grade: '灵品', school: 'alchemy', desc: '家境 +3，灵石 +60', attr: { fam: 3 }, flags: ['stones60'] },
  { id: 'devour_body', name: '吞天魔体', grade: '仙品', school: 'demon', desc: '斩妖回复气血', flags: ['lifesteal'] },
  { id: 'soul_lord', name: '万魂之主', grade: '玄品', school: 'demon', desc: '伤害 +10%，功德 -20', flags: ['dmg10'] },
  { id: 'possess', name: '魔道夺舍', grade: '仙品', school: 'demon', desc: '劫难胜利额外延寿 2 年', flags: ['stealLife'] },
  { id: 'holy_seed', name: '圣体道胎', grade: '仙品', school: 'rune', desc: '悟性 +2，根骨 +1', attr: { wu: 2, gen: 1 } },
  { id: 'photographic', name: '过目不忘', grade: '灵品', school: 'rune', desc: '悟性 +2', attr: { wu: 2 } },
  { id: 'prodigy', name: '少年早慧', grade: '灵品', school: 'rune', desc: '悟性 +1，学堂必有收获', attr: { wu: 1 } },
  { id: 'scholar_house', name: '书香门第', grade: '凡品', school: 'rune', desc: '家境 +1，悟性 +1', attr: { fam: 1, wu: 1 } },
  { id: 'luck_dragon', name: '气运化龙', grade: '神品', desc: '气运 +4', attr: { luck: 4 } },
  { id: 'luck_child', name: '气运之子', grade: '玄品', desc: '气运 +3，每年去向卡 +1', attr: { luck: 3 }, flags: ['extraCard', 'extraReroll'] },
  { id: 'fortune', name: '鸿运当头', grade: '灵品', desc: '每年改命 +1，去向卡 +1', flags: ['extraCard', 'extraReroll'] },
  { id: 'bad_luck', name: '霉运缠身', grade: '凡品', desc: '气运 -2，宿慧 +20%', attr: { luck: -2 }, flags: ['badLuck', 'insightBonus'] },
  { id: 'orphan', name: '天涯孤儿', grade: '凡品', desc: '出身固定为山野孤儿，根骨 +1', attr: { gen: 1 }, flags: ['orphan'] },
  { id: 'sickly', name: '体弱多病', grade: '凡品', desc: '根骨 -2，悟性 +2', attr: { gen: -2, wu: 2 }, flags: ['sickly'] },
  { id: 'late_bloomer', name: '大器晚成', grade: '灵品', desc: '30 岁后修炼 ×1.4', flags: ['lateBloomer'] },
  { id: 'cat', name: '灵猫相伴', grade: '灵品', desc: '一只灵猫随你参战，拾取范围 +40%', flags: ['cat'] },
  { id: 'beauty', name: '倾国倾城', grade: '玄品', desc: '人缘极好，人情 +1', flags: ['favor'] },
  { id: 'farmer', name: '农家子弟', grade: '凡品', desc: '家境 -1，根骨 +2', attr: { fam: -1, gen: 2 } },
  { id: 'long_family', name: '长寿之家', grade: '灵品', desc: '凡人寿元 +15', life: 15 },
  { id: 'iron_heart', name: '道心如铁', grade: '玄品', desc: '受到伤害 -10%', flags: ['armor'] },
  { id: 'jealous', name: '天妒英才', grade: '玄品', desc: '悟性 +3，寿元 -15', attr: { wu: 3 }, life: -15 },
  { id: 'no_root', name: '先天无根', grade: '凡品', desc: '测灵根必失败，但根骨 +2', attr: { gen: 2 }, flags: ['noRoot'] },
  { id: 'phoenix', name: '浴火凤命', grade: '仙品', desc: '每世第一次致命伤保留 1 气血', flags: ['phoenix'] },
  { id: 'spirit_body', name: '天生灵体', grade: '仙品', desc: '灵根至少为先天', flags: ['goodRoot'] },
  { id: 'immortal', name: '仙人转世', grade: '神品', desc: '6 岁仙缘必至', flags: ['call6'] },
  { id: 'wealthy', name: '家财万贯', grade: '玄品', desc: '家境 +4', attr: { fam: 4 } },
  { id: 'sect_orphan', name: '宗门遗孤', grade: '灵品', desc: '12 岁必得仙缘', flags: ['call12'] },
];

export const TALENT_BY_ID: Record<string, Talent> = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

export interface RootDef {
  id: string;
  name: string;
  speed: number;
  w: number;
}
export const ROOTS: RootDef[] = [
  { id: 'none', name: '无灵根', speed: 0, w: 18 },
  { id: 'mixed', name: '五行杂灵根', speed: 0.75, w: 30 },
  { id: 'wf', name: '木火灵根', speed: 1.0, w: 20 },
  { id: 'mw', name: '金水灵根', speed: 1.0, w: 20 },
  { id: 'thunder', name: '异雷灵根', speed: 1.25, w: 6 },
  { id: 'wind', name: '异风灵根', speed: 1.2, w: 6 },
  { id: 'innate', name: '先天灵根', speed: 1.6, w: 2 },
];

export function originOf(fam: number, orphan: boolean): string {
  if (orphan) return '山野孤儿';
  if (fam <= 2) return '贫苦农家';
  if (fam <= 4) return '寻常人家';
  if (fam <= 6) return '书香门第';
  if (fam <= 8) return '凡俗富商';
  return '修仙世家';
}

// 评分（R10 第 8 节）
export const REALM_SCORE = [0, 120, 300, 600, 1000, 1500];
export function gradeOf(score: number): string {
  if (score >= 3000) return 'SSS';
  if (score >= 2200) return 'SS';
  if (score >= 1600) return 'S';
  if (score >= 1100) return 'A';
  if (score >= 650) return 'B';
  if (score >= 300) return 'C';
  return 'D';
}

export const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export function cnAge(n: number): string {
  if (n < 10) return CN_NUM[n];
  if (n < 20) return '十' + (n % 10 ? CN_NUM[n % 10] : '');
  if (n < 100) return CN_NUM[Math.floor(n / 10)] + '十' + (n % 10 ? CN_NUM[n % 10] : '');
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (rest === 0) return CN_NUM[h] + '百';
    if (rest < 10) return CN_NUM[h] + '百零' + CN_NUM[rest];
    return CN_NUM[h] + '百' + (rest < 20 ? '一' : '') + cnAge(rest);
  }
  return String(n);
}
