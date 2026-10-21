// 命途棋盘：格子布局、本命格、歧路格、产业、后果格、天机格、遗迹（内容库附录「命途棋盘内容」）
import type { Effect, LifeState, Option } from '../game/types';
import type { School } from './core';

export const MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
export const SOLAR_TERMS = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
// 棋盘随年龄与境界分四档变大：走得越远，路上的事越多
export const BOARD_STAGES = [
  { size: 12, name: '乡里', maxStops: 5, text: '' },
  { size: 16, name: '一州', maxStops: 6, text: '你走出了生你的那片乡里，眼前是整整一州。' },
  { size: 20, name: '一域', maxStops: 6, text: '金丹之后，御剑一日千里，一州之地转眼走遍。' },
  { size: 24, name: '天下', maxStops: 7, text: '化神之身，九州不过一步。' },
];
export const boardStageOf = (L: { inDao: boolean; realm: number; age: number }) => (L.inDao ? (L.realm <= 2 ? 1 : L.realm <= 4 ? 2 : 3) : L.age < 16 ? 0 : 1);
// 四角：岁首、本命格、市、天机；两处产业格；其余是流年格
export function boardLayout(n: number) {
  const side = n / 4;
  const start = 0;
  const fate = side;
  const holdA = 2 * side - 1;
  const market = 2 * side;
  const oracle = 3 * side;
  const holdB = n - 1;
  const fixed = [start, fate, holdA, market, oracle, holdB];
  const flow: number[] = [];
  for (let i = 0; i < n; i++) if (!fixed.includes(i)) flow.push(i);
  return { n, start, fate, holdA, market, oracle, holdB, flow };
}
export const tileMonth = (slot: number, n: number) => (n === 12 ? MONTHS[slot] : SOLAR_TERMS[Math.round((slot * 24) / n) % 24]);
// 固定在角上的地点，不进流年格
export const CORNER_LOCS = ['cave', 'bazaar', 'fair', 'market'];

// ---------------- 本命格 ----------------
export interface FateTileDef {
  name: string;
  icon: string;
  extra?: Effect; // 停下时另加
  lv3: { title: string; text: string; options?: Option[]; eff?: Effect };
  lv5: { title: string; text: string; eff: Effect; special?: string };
  strays: string[];
}
export const FATE_TILES: Record<string, FateTileDef> = {
  jianti: {
    name: '剑冢', icon: '剑',
    lv3: { title: '剑冢问剑', text: '剑冢最深处，一柄断剑自己立了起来，剑尖对着你。', eff: { skill: 'sword', text: '断剑认主，化作一道青光没入你的掌心。' } },
    lv5: { title: '剑心通明', text: '你在剑冢里坐了一夜，满冢旧剑一齐低鸣。', eff: { text: '剑心通明：本世修炼加快一成。' }, special: 'xpMul' },
    strays: ['wuguan', 'danzong'],
  },
  fozi: {
    name: '禅院', icon: '禅', extra: { merit: 5 },
    lv3: { title: '受具足戒', text: '方丈问你：这一戒受下去，破了便是双倍的罪。受不受？', options: [
      { label: '受戒', desc: '修炼 ×1.1', eff: { flag: 'fullVow', text: '你跪在佛前，受了具足戒。' } },
      { label: '再等等', desc: '功德 +5', eff: { merit: 5, text: '方丈点点头，没有再问。' } },
    ] },
    lv5: { title: '舍利初成', text: '打坐时，你胸口有一点温热，像含着一颗没化的雪。', eff: { flag: 'sarira', text: '舍利初成：本世一次致命伤会留你一口气。' } },
    strays: ['moku'],
  },
  danxin: {
    name: '丹炉', icon: '丹',
    lv3: { title: '九转试丹', text: '丹炉连烧九天，开炉时满屋异香。', eff: { life: 20, text: '九转丹成，寿元 +20。' } },
    lv5: { title: '丹成龙虎', text: '炉中龙虎交汇，你的丹术到了家。', eff: { flag: 'danMaster', text: '丹成龙虎：丹房收成 ×1.5。' } },
    strays: ['jiange', 'duzong'],
  },
  mozhong: {
    name: '心魔窟', icon: '魔', extra: { merit: -3 },
    lv3: { title: '压魔或纵魔', text: '窟里的墨开始往你心口爬。它问你：你要压着我，还是放我出来？', options: [
      { label: '压魔', desc: '功德 +10，魔修道途 -5', eff: { merit: 10, school: { demon: -5 }, flag: 'suppress', text: '你把它按回了心底。' } },
      { label: '纵魔', desc: '魔修道途 +10', eff: { school: { demon: 10 }, flag: 'indulge', trace: 'ink_touched', text: '你松开了手。墨在你身上开出一朵花。' } },
    ] },
    lv5: { title: '魔种成形', text: '心魔窟安静下来了。', eff: {}, special: 'demonBloom' },
    strays: ['fosi', 'zhengjian'],
  },
  wenxin: {
    name: '书斋', icon: '书',
    lv3: { title: '著书', text: '你把这些年想明白的东西写成了一本小书。', eff: { attr: { wu: 1 }, text: '著书立说：悟性 +1。' } },
    lv5: { title: '文成符箓', text: '你写下的最后一个字，自己亮了。', eff: { inspire: 1, school: { rune: 5 }, text: '文成符箓：无名古卷灵感 +1。' } },
    strays: ['junying', 'dufang'],
  },
  jiangxing: {
    name: '营帐', icon: '营',
    lv3: { title: '点将', text: '旧部来投，说愿意跟你再打一仗。', eff: { favor: 1, text: '点将：人情 +1，伙伴参战更勇。' } },
    lv5: { title: '将星照命', text: '你夜观星象，那颗将星正好在你头顶。', eff: { hpMax: 20, text: '将星照命：气血上限 +20。' } },
    strays: ['danzong'],
  },
  daotong: {
    name: '道观', icon: '观',
    lv3: { title: '守静', text: '你在观里守了一冬的静。', eff: { flag: 'calmHeart', text: '守静：道心蒙尘的时间减半。' } },
    lv5: { title: '抱朴', text: '师父的蒲团留给了你。', eff: { flag: 'baopu', text: '抱朴：转机更容易到来。' } },
    strays: [],
  },
  fangu: {
    name: '田舍', icon: '田',
    lv3: { title: '勤能补拙', text: '你还是天不亮就起来。', eff: { text: '勤能补拙：本世修炼倍率 +0.04。' } },
    lv5: { title: '百业兴', text: '你的田舍成了方圆百里最热闹的地方。', eff: { flag: 'bounty', text: '百业兴：两处产业收成 ×1.3。' } },
    strays: [],
  },
};

// ---------------- 歧路格 ----------------
export interface StrayDef {
  name: string;
  icon: string;
  school: Partial<Record<School, number>> | null; // 入门习艺加的道途
  text: string;
  third: Option;
  mortalOnly?: boolean;
}
export const STRAYS: Record<string, StrayDef> = {
  wuguan: { name: '体修武馆', icon: '武', school: { body: 8 }, text: '武馆门口贴着招徒的红纸：「三月可开碑裂石。」比你磨剑快得多。',
    third: { label: '踢馆', desc: '根骨判定：成则体修 +3，灵石 +20', roll: { attr: 'gen', dc: 6, ok: { school: { body: 3 }, stones: 20, text: '你连过三人，馆主送了你一页拳谱。' }, fail: { injure: 1, text: '你被扔出了门。' } } } },
  danzong: { name: '丹宗招徒', icon: '丹', school: { alchemy: 8 }, text: '丹宗的管事握着你的手腕看了半天：「这双手，拿剑可惜了。」',
    third: { label: '讨一颗丹', desc: '灵石 -20，修为 +3%', eff: { stones: -20, xpPct: 3, life: 1, text: '丹药入口，一股暖意散到四肢。' } } },
  jiange: { name: '剑阁比武', icon: '剑', school: { sword: 8 }, text: '剑阁在山下摆了擂台，赢三场就能上山。',
    third: { label: '旁观', desc: '悟性判定：成则剑修 +3', roll: { attr: 'wu', dc: 6, ok: { school: { sword: 3 }, text: '你看懂了最后那一剑。' }, fail: { text: '你看了一天，什么也没看明白。' } } } },
  duzong: { name: '毒宗', icon: '毒', school: { demon: 8 }, text: '毒宗弟子在巷口卖药，药罐上画着一只三眼蛇。',
    third: { label: '报官', desc: '功德 +5，结仇', eff: { merit: 5, grudge: true, text: '官差来了，毒宗的人记住了你的脸。' } } },
  moku: { name: '魔窟', icon: '窟', school: { demon: 8 }, text: '山窟里有人念经，念的却不是你听过的经。',
    third: { label: '超度', desc: '功德 +10，暗伤 +1', eff: { merit: 10, injure: 1, text: '你念了一夜往生咒，窟里的声音终于停了。' } } },
  fosi: { name: '佛寺', icon: '寺', school: { body: 4, rune: 4 }, text: '钟声从山门里传出来，你心里的突突跳动居然静了一下。',
    third: { label: '吃一顿斋', desc: '功德 +3，心魔稍退', eff: { merit: 3, flag: 'heartDown', text: '一碗白粥，你吃得很慢。' } } },
  zhengjian: { name: '正道剑阁', icon: '阁', school: { sword: 8 }, text: '剑阁长老看出了你身上的魔气，却没有拔剑。',
    third: { label: '请教', desc: '魔修道途 -5，功德 +5', eff: { school: { demon: -5 }, merit: 5, text: '长老教了你一套压魔的心法。' } } },
  junying: { name: '军营', icon: '军', school: { body: 8 }, text: '征兵的旗子插到了书院门口。',
    third: { label: '做军师', desc: '悟性 +1，人情 +1', eff: { attr: { wu: 1 }, favor: 1, text: '你替校尉算了一仗，算对了。' } } },
  dufang: { name: '赌坊', icon: '赌', school: null, mortalOnly: true, text: '赌坊的帐房先生缺一个会算账的。',
    third: { label: '做帐房', desc: '银两 +30，本命格蒙尘', eff: { stones: 30, flag: 'dustyFate', text: '你在赌坊算了一年的账。' } } },
};

// ---------------- 产业 ----------------
export const HOLD_COST_MORTAL = [30, 60, 120, 200, 320];
export const HOLD_COST_CULT = [40, 80, 160, 280, 450];
export interface HoldingDef {
  name: string;
  icon: string;
  stage: 'mortal' | 'cult';
  can: (L: LifeState) => boolean;
  school?: School; // 与该流派命格同派时必出
  yieldText: string;
  branches: { label: string; desc: string; eff?: Effect }[];
  lv5: string;
  names: string[];
  guard: string;
}
export const HOLDINGS: Record<string, HoldingDef> = {
  tian: { name: '田产', icon: '田', stage: 'mortal', can: (L) => L.attrs.fam <= 4 || L.fate === 'fangu' || L.origin.includes('农'), yieldText: '银两 6×级',
    branches: [{ label: '桑麻', desc: '收成 ×1.5，家境 +1', eff: { attr: { fam: 1 } } }, { label: '药圃', desc: '根骨 +1，洗髓奇缘更容易', eff: { attr: { gen: 1 } } }],
    lv5: '良田千顷：寿元 +10', names: ['东坡田', '老槐田', '十亩桑', '南岗田'], guard: '山贼下了帖子，要你三天内把银子送到山上。' },
  shang: { name: '商号', icon: '商', stage: 'mortal', can: (L) => L.attrs.fam >= 4 || L.origin.includes('商'), yieldText: '银两 10×级',
    branches: [{ label: '走商', desc: '人情 +1，机缘更多', eff: { favor: 1 } }, { label: '钱庄', desc: '收成 ×2' }],
    lv5: '富甲一方：银两 +200', names: ['恒源号', '福记', '万隆号', '广利行'], guard: '山贼下了帖子，要你三天内把银子送到山上。' },
  wu: { name: '武馆', icon: '武', stage: 'mortal', school: 'body', can: (L) => L.attrs.gen >= 5, yieldText: '银两 4×级，每 2 级根骨 +1',
    branches: [{ label: '外家', desc: '体修道途 +10', eff: { school: { body: 10 } } }, { label: '镖局', desc: '人情 +1', eff: { favor: 1 } }],
    lv5: '开宗：入道后武馆直接升为 2 级宗门', names: ['铁拳馆', '振威武馆', '虎啸堂', '长风镖局'], guard: '一伙人上门踢馆，说要摘了你的匾。' },
  shu: { name: '私塾', icon: '塾', stage: 'mortal', school: 'rune', can: (L) => L.attrs.wu >= 5 || L.origin.includes('书'), yieldText: '银两 3×级，每 2 级悟性 +1',
    branches: [{ label: '科举', desc: '悟性 +1', eff: { attr: { wu: 1 } } }, { label: '讲经', desc: '符修道途 +10', eff: { school: { rune: 10 } } }],
    lv5: '桃李：宿慧 +20', names: ['松间书塾', '明德塾', '寒窗斋', '听雨书屋'], guard: '县里来人说你的私塾没交束脩税，要封门。' },
  zong: { name: '宗门', icon: '宗', stage: 'cult', can: (L) => L.realm >= 3 || (L.route === 'sect' && L.realm >= 2), yieldText: '灵石 8×级，每 2 级人情 +1；3 级起弟子援战',
    branches: [
      { label: '剑宗', desc: '剑修道途 +10', eff: { school: { sword: 10 } } },
      { label: '丹宗', desc: '丹修道途 +10', eff: { school: { alchemy: 10 } } },
      { label: '体宗', desc: '体修道途 +10', eff: { school: { body: 10 } } },
      { label: '符宗', desc: '符修道途 +10', eff: { school: { rune: 10 } } },
      { label: '魔门', desc: '魔修道途 +10', eff: { school: { demon: 10 } } },
    ],
    lv5: '大宗：宗门大比格常驻', names: ['青云宗', '太初门', '玄霄派', '归墟宗', '望月门'], guard: '山门外来了一伙人，领头的说这座山本是他师祖的。' },
  dan: { name: '丹房', icon: '炉', stage: 'cult', school: 'alchemy', can: (L) => L.school.alchemy >= 10 || L.fate === 'danxin', yieldText: '修为 +0.6%×级',
    branches: [{ label: '延寿', desc: '每圈寿元 +1×级' }, { label: '破境', desc: '每圈修为再 +0.3%×级' }],
    lv5: '洗髓丹：寿元 +30', names: ['九转丹房', '回春堂', '紫霞丹室', '炎阳丹房'], guard: '丹炉半夜炸了，烟里站着一个你不认识的人。' },
  ling: { name: '灵田', icon: '圃', stage: 'cult', can: () => true, yieldText: '灵石 12×级',
    branches: [{ label: '灵脉', desc: '收成 ×2，常招来地底的东西' }, { label: '灵兽圈', desc: '气血上限 +15', eff: { hpMax: 15 } }],
    lv5: '洞天：留下痕迹「洞天」', names: ['碧泉灵田', '云溪药圃', '寒潭灵田', '紫竹园'], guard: '灵脉引来了地底的东西，田埂一块一块地往下陷。' },
  jian: { name: '剑冢', icon: '冢', stage: 'cult', school: 'sword', can: (L) => L.school.sword >= 10 || L.fate === 'jianti', yieldText: '法宝强化进度 +级',
    branches: [{ label: '本命', desc: '本命法宝 +1 阶' }, { label: '量产', desc: '另得灵石 15×级' }],
    lv5: '万剑归宗：所有法宝 +1 阶', names: ['藏锋冢', '万剑冢', '听锋阁', '孤鸿冢'], guard: '冢里的旧剑一齐响了起来，有人来取剑了。' },
  si: { name: '寺观', icon: '寺', stage: 'cult', school: 'body', can: (L) => L.merit >= 50 || L.fate === 'fozi' || L.fate === 'daotong', yieldText: '功德 3×级',
    branches: [{ label: '渡人', desc: '人情 +1', eff: { favor: 1 } }, { label: '镇魔', desc: '功德 +20', eff: { merit: 20 } }],
    lv5: '香火不绝：宿慧 +50', names: ['云栖寺', '清虚观', '白马寺', '紫阳观'], guard: '香客里混着一个不烧香的，他一直盯着你的佛像。' },
};

// ---------------- 后果格 ----------------
export interface ConseqDef {
  name: string;
  icon: string;
  text: string;
  options: Option[];
  battle?: boolean; // 停下即劫难（妖巢）
}
export const CONSEQ: Record<string, ConseqDef> = {
  grudge: { name: '仇家门前', icon: '仇', text: '仇家堵在你回家的路上。',
    options: [
      { label: '斗法了结', desc: '胜则仇消', eff: { battle: { kind: 'duel', title: '旧仇', cultOnly: true, win: { removeGrudge: true, text: '这段仇，算是了了。' } } } },
      { label: '赔礼', desc: '灵石 -30，仇消', eff: { stones: -30, removeGrudge: true, text: '你赔了礼，对方收下了。' } },
      { label: '绕路', desc: '什么也不做' },
    ] },
  partner: { name: '道侣居', icon: '侣', text: '你们在山腰上搭了一间小屋。',
    options: [
      { label: '成亲', desc: '气血上限 +10', eff: { hpMax: 10, text: '没请几个人，酒却喝了很多。' } },
      { label: '双修', desc: '修为 +5%', eff: { xpPct: 5, text: '一夜无话，各自入定。' } },
    ] },
  slay: { name: '妖巢', icon: '巢', text: '你斩过的妖物，它们的同类找来了。', battle: true, options: [] },
  rescue: { name: '恩人来访', icon: '恩', text: '你救过的人提着一篮鸡蛋来看你。',
    options: [
      { label: '收下谢礼', desc: '人情 +1', eff: { favor: 1, text: '他说以后有事尽管开口。' } },
      { label: '听他说个消息', desc: '下一圈改命 +1', eff: { flag: 'tipOff', text: '他压低声音，说了一件你没想到的事。' } },
    ] },
  disciple: { name: '弟子请教', icon: '徒', text: '弟子捧着一卷书来问你。',
    options: [
      { label: '倾囊相授', desc: '悟性判定：成则修为 +4%', roll: { attr: 'wu', dc: 6, ok: { xpPct: 4, text: '教着教着，你自己也想通了一处。' }, fail: { text: '弟子听懂了，你倒糊涂了。' } } },
      { label: '让他自己悟', desc: '人情 +1', eff: { favor: 1 } },
    ] },
  injured: { name: '静室', icon: '静', text: '旧伤又疼了。',
    options: [
      { label: '闭门调养', desc: '暗伤 -1，气血回满', eff: { injure: -1, text: '你在静室里躺了一个月。' } },
      { label: '忍着', desc: '无事' },
    ] },
  treasure: { name: '法宝异动', icon: '宝', text: '新得的法宝夜里自己飞了起来，在屋里乱撞。',
    options: [
      { label: '彻夜镇压', desc: '一门功法 +1 层', eff: { flag: 'allUpOne', text: '天亮时它服了。' } },
      { label: '放任', desc: '气血上限 -10', eff: { hpMax: -10, text: '它撞碎了你半间屋子，也撞伤了你。' } },
    ] },
  ruined: { name: '废墟', icon: '墟', text: '你的产业只剩一片瓦砾。',
    options: [
      { label: '收拾瓦砾', desc: '下次置业花费减半', eff: { flag: 'rebuildHalf', text: '你把还能用的砖一块块捡了出来。' } },
      { label: '不看了', desc: '无事' },
    ] },
  killer: { name: '冤魂渡口', icon: '渡', text: '你杀过的墨物太多，渡口挤满了影子。',
    options: [
      { label: '超度', desc: '功德 +10，灵石 -20', eff: { merit: 10, stones: -20, text: '你在渡口念了一夜经。' } },
      { label: '不理', desc: '留下心魔', eff: { flag: 'heartUp', trace: 'heart_demon', text: '影子跟着你回了家。' } },
    ] },
};

// ---------------- 天机格 ----------------
export const ORACLE_SIGNS = [
  '上签：「十二月里有一月是你的，别走过了头。」',
  '中签：「路是圆的，绕一圈还会回来。」',
  '中签：「少走一步，少见一个人。」',
  '下签：「劫在路上，不在路尽头。」',
  '下签：「骰子是你掷的，点数不是。」',
];

// ---------------- 遗迹 ----------------
export interface RuinDef {
  forms: [string, string, string]; // 故址 / 旧址 / 遗迹
  check: { battle: boolean; attr: 'gen' | 'wu' | 'luck' | 'fam'; title: string };
  base: Effect; // 每层基础收获
  vault: { name: string; eff: Effect; special?: string };
}
export const RUINS: Record<string, RuinDef> = {
  zong: { forms: ['{名}山门', '{名}废山门', '{名}遗墟'], check: { battle: true, attr: 'gen', title: '占山之敌' }, base: { stones: 30, xpPct: 1 }, vault: { name: '镇山之宝', eff: { text: '你取出了开山时供在殿里的那件法宝。' }, special: 'treasure' } },
  dan: { forms: ['{名}老药铺', '{名}废丹房', '{名}丹墟'], check: { battle: false, attr: 'wu', title: '辨药' }, base: { xpPct: 2, life: 2 }, vault: { name: '前世丹方', eff: { life: 30, text: '丹方上的字是你的笔迹。' } } },
  ling: { forms: ['{名}故地', '荒了的{名}', '{名}灵脉洞'], check: { battle: true, attr: 'gen', title: '地底灵兽' }, base: { stones: 40 }, vault: { name: '灵脉之心', eff: { stones: 150, text: '灵脉最深处，一块心形的灵玉还在跳。' } } },
  jian: { forms: ['{名}剑庐', '{名}断剑冢', '古剑冢「{名}」'], check: { battle: true, attr: 'gen', title: '剑灵' }, base: { stones: 20 }, vault: { name: '前世本命剑', eff: { skill: 'sword', text: '一柄旧剑自己飞到了你跟前。' }, special: 'upgrade' } },
  si: { forms: ['{名}', '荒废的{名}', '{名}地宫'], check: { battle: false, attr: 'luck', title: '叩问佛前' }, base: { merit: 6 }, vault: { name: '舍利', eff: { flag: 'sarira', text: '小沙弥说，师祖临终前交代过，有一个人会回来。' } } },
  tian: { forms: ['{名}祖宅', '{名}老宅', '{名}废宅'], check: { battle: false, attr: 'luck', title: '找地窖' }, base: { stones: 25 }, vault: { name: '旧地契', eff: { attr: { fam: 1 }, text: '族谱里记着一位白手起家的太祖。' } } },
  shang: { forms: ['老字号{名}', '{名}旧址', '{名}地下钱库'], check: { battle: false, attr: 'wu', title: '对账开库' }, base: { stones: 40 }, vault: { name: '前世藏银', eff: { stones: 200, text: '库底压着一箱银子，封条上是你的名字。' } } },
  wu: { forms: ['{名}', '{名}演武场旧址', '{名}演武场废墟'], check: { battle: true, attr: 'gen', title: '木人阵' }, base: { hpMax: 3 }, vault: { name: '前世拳谱', eff: { attr: { gen: 1 }, text: '馆里的挂像上，那人对你笑了一下。' } } },
  shu: { forms: ['{名}', '旧{名}', '{名}藏书楼废墟'], check: { battle: false, attr: 'wu', title: '解字' }, base: { xpPct: 2, merit: 2 }, vault: { name: '前世手稿', eff: { attr: { wu: 1 }, text: '塾里的挂像上，那人对你笑了一下。' } } },
};
export const RUIN_FORM_MULT = [0.6, 1, 1.5];
export const RUIN_FORM_NAMES = ['故址', '旧址', '遗迹'];
export const RUIN_LAYERS = ['外院', '内殿', '秘库'];
export const RUIN_REALM_COEF = [1, 1.2, 1.5, 2, 3, 4];
export const RUIN_GREET: [string[], string[], string[]] = [
  ['看门的老人抬头看了你一眼，把手里的钥匙递了过来，什么也没问。', '门外那块匾是你写的。你不记得写过，可笔迹认得。'],
  ['禁制亮了一下，又暗了下去。它认得你。', '墙上的剑痕是你练剑时留的，一道一道都对得上你的手。'],
  ['墨从梁上滴下来。你记得这根梁是哪一年上的。', '残阵醒了，却没有对你动手。它在等你发号施令。'],
];
export const RUIN_FAIL = ['你布的阵，你自己没破开。', '占山的人把你送到山门口，说下次再来就不客气了。', '烟尘里，你听见自己前世在笑。'];
export const RUIN_REVIVE = '你把旧匾擦干净，重新挂了上去。{名}，又开门了。';
