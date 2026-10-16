// 修炼与法宝（修炼与法宝设计案·现行 + 系统设计案·现行 + 内容库 G/B/J/Q/S/A 表）
import type { School } from './core';
import type { SkillId } from '../game/types';

// ---------------- 功法 ----------------
export interface GongfaDef {
  id: SkillId;
  name: string; // 《青锋剑诀》
  short: string; // 剑法
  qi: string; // 所需法宝器类
  school: School;
  grade0: number; // 默认品阶
  desc: string;
}
export const GONGFA: Record<SkillId, GongfaDef> = {
  sword: { id: 'sword', name: '《青锋剑诀》', short: '剑法', qi: '剑', school: 'sword', grade0: 0, desc: '御剑追敌，层数越高飞剑越多' },
  orbit: { id: 'orbit', name: '《罗汉环身拳》', short: '拳法', qi: '拳套', school: 'body', grade0: 0, desc: '拳印环绕周身' },
  thunder: { id: 'thunder', name: '《掌心雷》', short: '掌法', qi: '法印', school: 'rune', grade0: 0, desc: '定时落雷轰击敌群' },
  fire: { id: 'fire', name: '《离火诀》', short: '火法', qi: '翎', school: 'alchemy', grade0: 0, desc: '投下灼烧火区' },
  frost: { id: 'frost', name: '《玄冰指》', short: '指法', qi: '戒', school: 'rune', grade0: 0, desc: '寒气冻住敌人' },
  ink: { id: 'ink', name: '《百鬼御幡术》', short: '幡法', qi: '幡', school: 'demon', grade0: 0, desc: '召出墨魂扑向敌人' },
  art: { id: 'art', name: '《自创道法》', short: '自创', qi: '笔', school: 'rune', grade0: 1, desc: '三束灵光穿透' },
};
export const GONGFA_IDS = Object.keys(GONGFA) as SkillId[];
export const SK_SHORT: Record<SkillId, string> = { sword: '剑', orbit: '拳', thunder: '雷', fire: '火', frost: '冰', ink: '幡', art: '笔' };

// 品阶：黄 玄 地 天
export const GF_GRADES = ['黄阶', '玄阶', '地阶', '天阶'];
export const GF_MUL = [1.0, 1.2, 1.45, 1.75];
export const GF_CAP = [3, 4, 5, 5]; // 品阶层数上限
export const GF_MIN_QI = [0, 1, 2, 3]; // 配套法宝最低品级（凡 法 灵 宝）
export const LAYER_NAMES = ['', '一层', '二层', '三层', '四层', '圆满'];
// 境界 → 功法位、层数上限（凡人按练气算）
export const SLOTS_BY_REALM = [2, 2, 3, 4, 4, 4];
export const REALM_CAP = [2, 2, 3, 4, 5, 5];

// 闭关代价：到第 n 层（黄阶基数）
export const CLOSE_COST: Record<number, { xd: number; st: number; yr: number }> = {
  2: { xd: 2, st: 30, yr: 1 },
  3: { xd: 4, st: 60, yr: 2 },
  4: { xd: 6, st: 120, yr: 3 },
  5: { xd: 8, st: 240, yr: 5 },
};
export const CLOSE_GRADE_MUL = [1, 1.5, 2, 3];
// 功法谱折扣：前世练到此层的世数 0 / 1 / 2 / 3 / 4+
export const BOOK_DISCOUNT = [1, 0.7, 0.5, 0.35, 0.25];

// ---------------- 法宝 ----------------
export const QI_GRADES = ['凡器', '法器', '灵器', '宝器', '仙器'];
export const QI_MUL = [1.0, 1.15, 1.3, 1.5, 1.75];
export const FJ_SLOTS = [0, 1, 2, 3, 3];
export const QI_PRICE = [30, 90, 240, 600, 1500];
export const QI_NAMES: Record<string, string[]> = {
  剑: ['铁剑', '青锋剑', '寒光剑', '断水剑', '太阿'],
  拳套: ['铁指虎', '罗汉拳套', '金刚拳套', '伏魔拳套', '须弥拳套'],
  法印: ['木雷印', '掌心雷印', '紫霄雷印', '九霄雷印', '天罚雷印'],
  戒: ['寒铁戒', '玄冰戒', '冰魄戒', '太阴戒', '广寒戒'],
  翎: ['赤羽翎', '火鸦翎', '金乌翎', '朱雀翎', '大日金乌翎'],
  幡: ['招魂幡', '百鬼幡', '万魂幡', '阴冥幡', '幽冥帝幡'],
  笔: ['狼毫笔', '灵犀笔', '点睛笔', '画魂笔', '天书笔'],
};
export const QI_SPIRITS = ['青鸾', '玄龟', '白泽', '赤蛟', '雪貂', '金蟾'];

export interface ItemDef {
  id: string;
  name: string;
  kind: 'passive' | 'active';
  desc: string;
  price: number;
  // 主动：消耗型次数跨战斗；充能型每场满格，靠灵气球回充
  uses?: number; // 消耗型一次买到的次数
  cells?: number; // 充能型每次所需格数
  breaks?: number; // 护身符：用几次后碎
  trigger?: boolean;
}
export const ITEMS: Record<string, ItemDef> = {
  xuanjia: { id: 'xuanjia', name: '玄甲衣', kind: 'passive', desc: '受到伤害 -10%', price: 80 },
  changchun: { id: 'changchun', name: '长春佩', kind: 'passive', desc: '战斗中每 5 秒回复 2% 气血', price: 90 },
  xueyin: { id: 'xueyin', name: '血饮珠', kind: 'passive', desc: '造成伤害的 1.5% 化为气血', price: 100 },
  yinling: { id: 'yinling', name: '引灵佩', kind: 'passive', desc: '平日修炼修为 +10%', price: 120 },
  hushen: { id: 'hushen', name: '护身符', kind: 'passive', desc: '致命一击时留 1 点气血并无敌 2 秒，每场一次，用 3 次后碎', price: 110, breaks: 3 },
  bilei: { id: 'bilei', name: '避雷珠', kind: 'passive', desc: '天劫落雷伤害 -30%', price: 100 },
  qingxin: { id: 'qingxin', name: '清心玉', kind: 'passive', desc: '心魔难度 -1', price: 90 },
  huxin: { id: 'huxin', name: '护心镜', kind: 'passive', trigger: true, desc: '受伤后 2 秒内伤害 +30%（冷却 8 秒）', price: 120 },
  zhenyue: { id: 'zhenyue', name: '镇岳印', kind: 'passive', trigger: true, desc: '站定每秒积 1 层（至多 5）：每层受伤 -4%、伤害 +6%，一动就散', price: 120 },
  tayun: { id: 'tayun', name: '踏云履', kind: 'passive', trigger: true, desc: '每走 3 丈，下一次功法 +50%', price: 120 },
  shihun: { id: 'shihun', name: '噬魂铃', kind: 'passive', trigger: true, desc: '每斩 15 敌，全屏震魂一次', price: 140 },
  juling: { id: 'juling', name: '聚灵葫', kind: 'passive', trigger: true, desc: '每拾 10 枚灵气球，白放一次其他主动法宝', price: 140 },
  huichun: { id: 'huichun', name: '回春丹', kind: 'active', desc: '回复 40% 气血（消耗，1 枚）', price: 40, uses: 1 },
  leihuo: { id: 'leihuo', name: '雷火符', kind: 'active', desc: '在敌群中炸开雷火（消耗，3 张）', price: 70, uses: 3 },
  dundi: { id: 'dundi', name: '遁地符', kind: 'active', desc: '遁走脱战，不胜不败（消耗，1 张；天劫不可用）', price: 60, uses: 1 },
  bagua: { id: 'bagua', name: '八卦镜', kind: 'active', desc: '2 秒内反弹敌方弹丸（充能 3 格）', price: 160, cells: 3 },
  dingshen: { id: 'dingshen', name: '定身符印', kind: 'active', desc: '定住全场 1.5 秒（充能 5 格）', price: 180, cells: 5 },
};
export const PASSIVE_MAX = 2;
export const ACTIVE_MAX = 3;
export const ORBS_PER_CELL = 8;

// ---------------- 附诀 ----------------
export interface FujueDef {
  id: string;
  name: string;
  desc: string;
  chain?: boolean;
}
export const FUJUE: Record<string, FujueDef> = {
  fenguang: { id: 'fenguang', name: '分光', desc: '一化为三，每道 ×0.45' },
  yinlei: { id: 'yinlei', name: '引雷', desc: '命中时 20% 引动另一门功法（×0.7），连锁一世只得一枚', chain: true },
  yufeng: { id: 'yufeng', name: '御风', desc: '弹道追踪' },
  huiying: { id: 'huiying', name: '回影', desc: '命中后弹向下一敌，至多 2 次，每次 -30%' },
  chuanyun: { id: 'chuanyun', name: '穿云', desc: '穿透 +2' },
  lianzhu: { id: 'lianzhu', name: '连珠', desc: '多出一发 ×0.6' },
  jushi: { id: 'jushi', name: '聚势', desc: '冷却 +30%，伤害 +60%' },
  jijue: { id: 'jijue', name: '疾诀', desc: '冷却 -20%，伤害 -10%' },
  guangyu: { id: 'guangyu', name: '广域', desc: '范围 +40%' },
  shigu: { id: 'shigu', name: '蚀骨', desc: '命中后 3 秒灼蚀，约一击的 40%' },
};
export const FUJUE_IDS = Object.keys(FUJUE);
export const FJ_ADD_CAP = 1.5; // 加法类加成上限 +150%

// ---------------- 轮回身份 ----------------
export type Tier = 0 | 1 | 2 | 3; // 凡俗 小富 宗门 顶级
export const TIER_NAMES = ['凡俗', '小富', '宗门', '顶级'];
export const TIER_W = [70, 22, 8, 0];
export interface IdentityDef {
  id: string;
  name: string;
  tier: Tier;
  ach?: string; // 解锁所需成就
  desc: string;
  legend?: string; // 传奇身份对应的 L 编号
  origin?: string; // 沿用旧出身名（事件判断用）
}
export const IDENTITIES: IdentityDef[] = [
  { id: 'S01', name: '农家子', tier: 0, desc: '根骨 +1', origin: '贫苦农家' },
  { id: 'S02', name: '猎户', tier: 0, desc: '气运 +1', origin: '寻常人家' },
  { id: 'S03', name: '书童', tier: 0, desc: '悟性 +1', origin: '书香门第' },
  { id: 'S04', name: '乞儿', tier: 0, desc: '一无所有，命硬', origin: '山野孤儿' },
  { id: 'S05', name: '墨门遗孤', tier: 0, ach: 'A28', desc: '魔修道途 +20', origin: '墨门遗孤' },
  { id: 'S06', name: '商贾之子', tier: 1, desc: '灵石 +40', origin: '凡俗富商' },
  { id: 'S07', name: '世家旁支', tier: 1, desc: '悟性 +1', origin: '书香门第' },
  { id: 'S08', name: '镖局少东家', tier: 1, desc: '根骨 +1', origin: '寻常人家' },
  { id: 'S09', name: '散修之后', tier: 1, ach: 'A01', desc: '仙缘更早，散修路灵石 +30', origin: '修仙世家' },
  { id: 'S10', name: '钱庄少主', tier: 1, ach: 'A06', desc: '灵石 +200', origin: '凡俗富商' },
  { id: 'S11', name: '龙族血脉', tier: 1, ach: 'A29', desc: '根骨 +3，凡人寿元 -10，不会溺水', origin: '龙族血脉' },
  { id: 'S12', name: '画中仙裔', tier: 1, ach: 'A30', desc: '符修道途 +20，灵感 +1', origin: '画中仙裔' },
  { id: 'S13', name: '外门弟子', tier: 2, desc: '八岁入宗门', origin: '修仙世家' },
  { id: 'S14', name: '内门弟子', tier: 2, desc: '八岁入宗门，修炼 +5%', origin: '修仙世家' },
  { id: 'S15', name: '长老后人', tier: 2, ach: 'A09', desc: '宗门功法升为玄阶', origin: '修仙世家' },
  { id: 'S16', name: '剑冢守墓人', tier: 2, ach: 'A13', desc: '剑修道途 +20，宗门功法为剑诀', origin: '修仙世家' },
  { id: 'S17', name: '故人之子', tier: 2, ach: 'A11', desc: '人情 +2', origin: '修仙世家' },
  { id: 'S18', name: '藏经阁守阁人', tier: 2, ach: 'A12', desc: '功法谱折扣再进一档', origin: '修仙世家' },
  { id: 'S19', name: '圣子', tier: 3, ach: 'A14', desc: '正道圣地传人', origin: '修仙世家' },
  { id: 'S20', name: '皇子', tier: 3, ach: 'A15', desc: '人间帝胄，灵石 +300', origin: '凡俗富商' },
  { id: 'S21', name: '魔门少主', tier: 3, ach: 'A16', desc: '魔修道途 +30，宗门功法为幡法', origin: '墨门遗孤' },
  { id: 'L01', name: '仙人下凡', tier: 3, ach: 'A17', legend: 'L01', desc: '传奇：一岁引气入体' },
  { id: 'L02', name: '剑冢之子', tier: 3, ach: 'A18', legend: 'L02', desc: '传奇：剑修道途 +30' },
  { id: 'L03', name: '古戒药童', tier: 3, ach: 'A19', legend: 'L03', desc: '传奇：丹修道途 +30' },
  { id: 'L04', name: '墨中生', tier: 3, ach: 'A20', legend: 'L04', desc: '传奇：魔修道途 +40' },
  { id: 'L05', name: '狐的约定', tier: 3, ach: 'A21', legend: 'L05', desc: '传奇：白狐自幼相伴' },
  { id: 'L06', name: '书香符种', tier: 3, ach: 'A22', legend: 'L06', desc: '传奇：符修道途 +30，灵感 +1' },
  { id: 'L07', name: '百岁农家', tier: 3, ach: 'A23', legend: 'L07', desc: '传奇：凡人寿元 +40' },
  { id: 'L08', name: '浴火', tier: 3, ach: 'A24', legend: 'L08', desc: '传奇：浴火凤命' },
];
export const IDENTITY_BY_ID: Record<string, IdentityDef> = Object.fromEntries(IDENTITIES.map((i) => [i.id, i]));
export const OPEN_IDENTITIES = ['S01', 'S02', 'S03', 'S04', 'S06', 'S07', 'S08', 'S13', 'S14'];

// ---------------- 轮回碑 ----------------
export interface AchDef {
  id: string;
  name: string;
  cond: string;
  reward: string;
  tier?: Partial<Record<Tier, number>>; // 档位权重加成
}
export const ACHIEVEMENTS: AchDef[] = [
  { id: 'A01', name: '白身筑基', cond: '以凡俗身份筑基', reward: '解锁「散修之后」，小富 +3', tier: { 1: 3 } },
  { id: 'A02', name: '乞儿结丹', cond: '以乞儿身份结丹', reward: '凡俗出身奇遇 +10%' },
  { id: 'A03', name: '三世布衣', cond: '连续三世凡俗出身', reward: '凡俗开局灵石 +30' },
  { id: 'A04', name: '布衣叩门', cond: '以凡俗身份修到化神叩门', reward: '顶级 +2', tier: { 3: 2 } },
  { id: 'A05', name: '富贵善终', cond: '小富出身寿终', reward: '小富 +2', tier: { 1: 2 } },
  { id: 'A06', name: '富可敌国', cond: '一世攒下灵石 3000', reward: '解锁「钱庄少主」' },
  { id: 'A07', name: '一掷千金', cond: '一世在坊市花掉 1500 灵石', reward: '坊市货架 +1' },
  { id: 'A08', name: '大比魁首', cond: '宗门大比夺魁', reward: '宗门 +2', tier: { 2: 2 } },
  { id: 'A09', name: '开宗立派', cond: '宗门产业修到 5 级', reward: '解锁「长老后人」，宗门 +3', tier: { 2: 3 } },
  { id: 'A10', name: '师门渊源', cond: '宗门出身、拜入宗门并结丹', reward: '宗门 +2', tier: { 2: 2 } },
  { id: 'A11', name: '故人满座', cond: '一世再遇 3 位故人', reward: '解锁「故人之子」' },
  { id: 'A12', name: '藏经万卷', cond: '功法谱收录 12 条（功法 × 品阶）', reward: '解锁「藏经阁守阁人」' },
  { id: 'A13', name: '剑道圆满', cond: '剑法练到圆满', reward: '解锁「剑冢守墓人」' },
  { id: 'A14', name: '斩劫', cond: '斩落劫主', reward: '解锁「圣子」' },
  { id: 'A15', name: '帝王家事', cond: '了结引子「王府庶子」或「乱世开国」', reward: '解锁「皇子」' },
  { id: 'A16', name: '魔心不灭', cond: '魔修道途 ≥ 150 并结丹', reward: '解锁「魔门少主」' },
  { id: 'A17', name: '化神', cond: '修到化神', reward: '解锁传奇「仙人下凡」' },
  { id: 'A18', name: '剑冢问心', cond: '入过剑冢且剑法四层', reward: '解锁传奇「剑冢之子」' },
  { id: 'A19', name: '丹灯三盏', cond: '丹尊命灯 ≥ 3', reward: '解锁传奇「古戒药童」' },
  { id: 'A20', name: '墨中结丹', cond: '以墨门遗孤身份结丹', reward: '解锁传奇「墨中生」' },
  { id: 'A21', name: '狐灯三盏', cond: '白狐命灯 ≥ 3', reward: '解锁传奇「狐的约定」' },
  { id: 'A22', name: '自成一家', cond: '自创道法练到圆满', reward: '解锁传奇「书香符种」' },
  { id: 'A23', name: '百岁凡人', cond: '不修仙活到一百岁', reward: '解锁传奇「百岁农家」' },
  { id: 'A24', name: '三度回生', cond: '累计被救回 3 次致命伤', reward: '解锁传奇「浴火」' },
  { id: 'A25', name: '仙器在手', cond: '一世得到仙器', reward: '顶级 +1', tier: { 3: 1 } },
  { id: 'A26', name: '三诀同修', cond: '一门功法的法宝上挂满 3 枚附诀', reward: '坊市附诀 +1' },
  { id: 'A27', name: '十世轮回', cond: '轮回满十世', reward: '顶级 +2', tier: { 3: 2 } },
  { id: 'A28', name: '魔域故事', cond: '去过魔域并与赤衣交手', reward: '解锁「墨门遗孤」' },
  { id: 'A29', name: '河伯', cond: '放走河伯，或替他守河', reward: '解锁「龙族血脉」' },
  { id: 'A30', name: '画中人', cond: '得天书第 13 页', reward: '解锁「画中仙裔」' },
];
export const TOP_TIER_CAP = 15;
