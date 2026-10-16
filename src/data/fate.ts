// 命途分岔与修为尽头：命格、道基、戒律尘缘、转机，以及扩写的流水事件
import type { School } from './core';
import type { LifeEvent } from './events';
import type { LifeState, Vow } from '../game/types';

export interface FateDef {
  id: string;
  name: string;
  short: string; // 面板上的一句话
  birth: string; // 出生时的一句
  paths: School[]; // 本命道途；空 = 不挑道基
  vows: Vow[]; // 戒律：love 色戒 / kill 杀戒
  deadEnd: string; // 道基不合、走到尽头时
  w: (L: LifeState) => number; // 抽取权重（随天赋流派加成）
}

const talentSchools = (L: LifeState, s: School) => L.school[s] >= 15 ? Math.floor(L.school[s] / 15) : 0;

export const FATES: FateDef[] = [
  {
    id: 'jianti', name: '天生剑体', short: '本命剑修；道基铸偏则止步金丹', paths: ['sword'], vows: [],
    birth: '你出生那夜，墙上那把旧柴刀自己落了下来，刀尖插进门槛，嗡嗡响了半宿。',
    deadEnd: '剑体铸了别的道基，就像剑插错了鞘。金丹之后，经脉里的剑意和道基互相啃咬，再往上一步，便要自己把自己撕开。',
    w: (L) => 1 + talentSchools(L, 'sword') * 3,
  },
  {
    id: 'fozi', name: '佛子', short: '本命金身或经藏；守色戒、杀戒', paths: ['body', 'rune'], vows: ['love', 'kill'],
    birth: '你生在山寺后的菜园里。老方丈抱起你，说这孩子眉心有一点朱砂，是佛门的人。',
    deadEnd: '金身与经藏都没成，佛子这条路便断在半山腰。你还是每天上早课，可木鱼的声音越来越空。',
    w: (L) => 0.8 + (talentSchools(L, 'body') + talentSchools(L, 'rune')) * 1.2,
  },
  {
    id: 'danxin', name: '丹心', short: '本命丹修；道基铸偏则止步金丹', paths: ['alchemy'], vows: [],
    birth: '你出生时满屋药香，接生婆闻了半天，说这孩子是药罐子的命——不是吃药，是熬药。',
    deadEnd: '丹心不炼丹，心火便没处去。金丹之后，丹田里那团火烧不旺也熄不灭，修为满了，劫却引不动。',
    w: (L) => 1 + talentSchools(L, 'alchemy') * 3,
  },
  {
    id: 'mozhong', name: '魔种', short: '本命魔修；压住魔种则止步金丹', paths: ['demon'], vows: [],
    birth: '你生下来不哭，睁眼看着屋梁。娘说你眼底有一点墨，洗不掉。',
    deadEnd: '你把魔种压在正道道基底下，压了一辈子。金丹之后它开始往上顶，你再往前走一步，压不住的就不只是它了。',
    w: (L) => 0.8 + talentSchools(L, 'demon') * 3,
  },
  {
    id: 'wenxin', name: '文心', short: '本命符修；道基铸偏则止步金丹', paths: ['rune'], vows: [],
    birth: '接生婆说你是攥着一根笔杆子出生的。你爹不信，可那根笔后来一直供在神龛上。',
    deadEnd: '文心本该落在纸上，你却把它铸进了别处。金丹之后，满腹的字句找不到出口，一个也写不出来。',
    w: (L) => 1 + talentSchools(L, 'rune') * 3,
  },
  {
    id: 'jiangxing', name: '将星', short: '本命体修或剑修；杀伐重', paths: ['body', 'sword'], vows: [],
    birth: '你出生那年，北边打了一场大胜仗。报信的骑兵在你家门口停了一下，马打了个响鼻。',
    deadEnd: '将星离了沙场，铸的又不是刀兵道基。金丹之后，你夜夜梦见战鼓，醒来手心全是汗，修为却一寸不动。',
    w: (L) => 0.8 + (talentSchools(L, 'body') + talentSchools(L, 'sword')) * 1.2,
  },
  {
    id: 'daotong', name: '清修道童', short: '不挑道途；命里不宜婚配', paths: [], vows: ['love'],
    birth: '你三岁被送进道观。师父摸了摸你的头，说这孩子命里清净，不宜婚配。',
    deadEnd: '',
    w: () => 1.4,
  },
  {
    id: 'fangu', name: '凡骨', short: '命里什么都没写：不设上限，修炼稍慢', paths: [], vows: [],
    birth: '你出生那天什么也没发生。接生婆收了两个鸡蛋，走了。',
    deadEnd: '',
    w: () => 2,
  },
];
export const FATE_BY_ID: Record<string, FateDef> = Object.fromEntries(FATES.map((f) => [f.id, f]));

export const hasVow = (L: LifeState, v: Vow) => !!L.fate && FATE_BY_ID[L.fate].vows.includes(v);
const isFate = (L: LifeState, id: string) => L.fate === id;
const flag = (L: LifeState, k: string) => L.flags[k] ?? 0;

// 修为尽头的文案（按原因）
export const DEAD_END_TEXT: Record<string, string> = {
  love: '你为阿蘅还了俗。修为攒满了，劫雷却不来——天道不收一个心里装着人的修行人。',
  kill: '那一刀之后，金身上的裂纹再没合上。修为满了，劫雷绕着你走。',
  stall: '道心蒙尘。入定时满眼都是旧事，修为停在原处，一寸也不肯动。',
};

export const RETIRE_LINES = [
  '你在洞府前种了一片竹子。',
  '山下的孩子叫你老神仙，你也就应了。',
  '你学会了下棋，常常输给砍柴的老樵夫。',
  '修为停在原处，你也不再去看它。',
  '你把本命法宝擦得很亮，挂在了墙上。',
  '有年轻修士上山问道。你说：别走我的路。',
  '春天你看花，秋天你扫叶子。',
  '你给山下的村子修了一条路，村里人给路起了你的名字。',
];

// ---------- 命格事件链：道途的诱惑与回报 ----------
const LOVE_WORDS: Record<string, { robe: string; tool: string; lesson: string; who: string }> = {
  fozi: { robe: '僧衣', tool: '木鱼', lesson: '晚课', who: '和尚' },
  daotong: { robe: '道袍', tool: '拂尘', lesson: '晚课', who: '道士' },
};

function loveChain(fid: 'fozi' | 'daotong'): LifeEvent[] {
  const w = LOVE_WORDS[fid];
  return [
    {
      id: `V-${fid}-情1`, locs: ['cross', 'bazaar', 'roam', 'sect', 'market', 'neighbor', 'fair'], kind: 'choice',
      text: '雨下得急，你把伞分了一半给檐下躲雨的人。那人说自己叫阿蘅，第二天又在同一个屋檐下等你。',
      when: (L) => isFate(L, fid) && L.age >= 15 && !flag(L, 'loveMet'),
      options: [
        { label: '又去了那个屋檐', desc: '尘缘渐深', eff: { fate: { tag: 'loveMet' }, text: `你们说了很多话，多到你忘了做${w.lesson}。` } },
        { label: '绕路走', desc: '守戒：修为 +5%，功德 +10', eff: { xpPct: 5, merit: 10, fate: { tag: 'loveMet' }, flag: 'loveAvoid', text: '你绕了三个月的路。后来那个屋檐下再没有人。' } },
      ],
    },
    {
      id: `V-${fid}-情2`, locs: ['cross', 'cave', 'quiet', 'sect', 'roam', 'bazaar'], kind: 'choice',
      text: '阿蘅要嫁人了，是家里定的亲。出嫁前一晚，阿蘅在山门外站了一夜，没有敲门。',
      when: (L) => isFate(L, fid) && L.inDao && flag(L, 'loveMet') > 0 && !flag(L, 'loveAvoid') && !flag(L, 'loveChoice') && L.age >= flag(L, 'loveMet') + 2,
      options: [
        { label: '推门出去', desc: '破戒还俗：结为道侣，此世修为到此为止', eff: { partner: true, fate: { capHere: true, breakVow: 'love', tag: 'loveChoice' }, hl: { text: '为阿蘅还俗', score: 85 }, text: `你脱下${w.robe}，叠好，放在蒲团上。` } },
        { label: '闭门不出', desc: '守戒：修为 +10%，本世心魔更难', eff: { xpPct: 10, flag: 'heartUp', fate: { tag: 'loveChoice' }, text: `天亮时门外没有人了。你的${w.tool}裂了一道缝。` } },
        { label: '见最后一面', desc: '悟性判定：成则斩断尘缘，败则道心蒙尘', roll: { attr: 'wu', dc: 7,
          ok: { merit: 20, flag: 'heartDown', fate: { tag: 'loveChoice' }, hl: { text: '斩断尘缘', score: 60 }, text: '你说了声保重。转身的时候，你发现自己真的放下了。' },
          fail: { fate: { breakVow: 'love', tag: 'loveChoice' }, text: '你说了声保重。可那一夜之后，你再也入不了定。' } } },
      ],
    },
    {
      id: `V-${fid}-情3`, locs: ['cave', 'quiet', 'cross', 'karma', 'roam', 'sect'], kind: 'choice',
      text: `你还俗很多年了。阿蘅老了，坐在门口晒太阳，忽然问你：「你年轻时，是不是当过${w.who}？」`,
      when: (L) => isFate(L, fid) && L.capReason === 'love' && !flag(L, 'loveDone') && L.age >= flag(L, 'loveChoice') + 15,
      options: [
        { label: '说是', desc: '悟性判定：看破则上限解除，修炼 ×1.3', roll: { attr: 'wu', dc: 6,
          ok: { fate: { lift: 99, xpMul: 1.3, tag: 'loveDone' }, hl: { text: '红尘炼心', score: 90 }, text: '说出口的那一刻，你忽然懂了当年师父那句话：红尘炼心，得先进红尘。' },
          fail: { fate: { tag: 'loveDone' }, text: '阿蘅笑了，你也笑了。可你还是看不破。' } } },
        { label: '说不是', desc: '陪阿蘅到最后，安度余生', eff: { fate: { retire: true, tag: 'loveDone' }, text: '你说不是。你本来就只是个砍柴的。' } },
      ],
    },
    {
      id: `V-${fid}-情4`, locs: ['cave', 'quiet', 'cross', 'karma', 'roam'], kind: 'choice',
      text: '十年了，你还记得阿蘅那天穿的衣服。有人从山下带来消息：阿蘅过得很好，儿孙满堂。',
      when: (L) => isFate(L, fid) && L.stall === 'love' && !flag(L, 'loveDone') && L.age >= flag(L, 'loveChoice') + 8,
      options: [
        { label: '下山看一眼', desc: '悟性判定：放下则道心复明，修炼 ×1.2', roll: { attr: 'wu', dc: 6,
          ok: { fate: { clearStall: true, xpMul: 1.2, tag: 'loveDone' }, hl: { text: '十年一念，放下了', score: 70 }, text: '阿蘅在院子里哄孙子。你站在篱笆外看了一会儿，转身上山，脚步很轻。' },
          fail: { fate: { tag: 'loveDone' }, text: '你看了一眼，又多记了十年。' } } },
        { label: '不看', eff: { text: '你没有下山。蒲团上的灰，又厚了一层。' } },
      ],
    },
  ];
}

export const FATE_EVENTS: LifeEvent[] = [
  // 天生剑体：被引向体修，或守住剑
  { id: 'F-剑体-1', locs: ['road', 'market', 'neighbor'], kind: 'choice', text: '武馆馆主捏了捏你的胳膊，说你是练铁布衫的好料子，包吃包住，还给你娘十两银子。',
    when: (L) => isFate(L, 'jianti') && !L.inDao && L.age >= 8,
    options: [
      { label: '去武馆', desc: '根骨 +2，体修道途 +25，家境 +1', eff: { attr: { gen: 2, fam: 1 }, school: { body: 25 } } },
      { label: '去城外看人舞剑', desc: '剑修道途 +10', eff: { school: { sword: 10 }, text: '那人舞得不好，可你看得挪不开眼。' } },
    ] },
  { id: 'F-剑体-2', locs: ['sect', 'roam', 'cave', 'bazaar'], kind: 'choice', text: '一位体修前辈看了你半天：「剑修太脆，活不长。我传你《九转金身》，你学不学？」',
    when: (L) => isFate(L, 'jianti') && L.inDao && L.realm <= 1,
    options: [
      { label: '学金身', desc: '体修道途 +30，气血上限 +20', eff: { school: { body: 30 }, hpMax: 20 } },
      { label: '谢绝', desc: '剑修道途 +10', eff: { school: { sword: 10 }, text: '前辈哼了一声：「那你就快些练，别死在我前头。」' } },
    ] },
  { id: 'F-剑体-3', locs: ['realm', 'fortune', 'roam', 'cave'], kind: 'choice', text: '剑冢深处，一柄断剑认出了你，剑身上的锈一片片剥落。',
    when: (L) => isFate(L, 'jianti') && L.daoji === 'sword' && L.realm >= 3,
    options: [
      { label: '以身养剑', desc: '寿元 -20，飞剑升阶，修炼 ×1.1', eff: { life: -20, skill: 'sword', fate: { xpMul: 1.1 }, hl: { text: '以身养剑', score: 70 } } },
      { label: '拜过离开', desc: '功德 +20', eff: { merit: 20 } },
    ] },
  // 佛子
  { id: 'F-佛子-1', locs: ['bazaar', 'roam', 'cross'], kind: 'choice', text: '一个魔修拦住你，递来一卷《血河经》：「佛门太苦。你这身骨头，练这个快十倍。」',
    when: (L) => isFate(L, 'fozi') && L.inDao && L.realm <= 1,
    options: [
      { label: '收下翻看', desc: '魔修道途 +30，修为 +10%', eff: { school: { demon: 30 }, xpPct: 10, trace: 'ink_touched' } },
      { label: '念一声佛号', desc: '体修、符修道途各 +8', eff: { school: { body: 8, rune: 8 } } },
    ] },
  { id: 'F-佛子-杀', locs: ['forest', 'demon', 'roam', 'cross'], kind: 'choice', text: '魔修屠了山下的村子，这会儿就站在你面前，手里还拎着一个孩子。他笑：「和尚，你不杀生的吧？」',
    when: (L) => isFate(L, 'fozi') && L.inDao && L.realm >= 2 && !flag(L, 'killChoice'),
    options: [
      { label: '破戒杀他', desc: '斗法；功德 +80，破杀戒：此世修为到此为止', eff: { merit: 80, kill: true, fate: { capHere: true, breakVow: 'kill', tag: 'killChoice' }, hl: { text: '佛子破杀戒', score: 80 }, battle: { kind: 'duel', title: '屠村魔修', cultOnly: true } } },
      { label: '以佛法渡化', desc: '悟性判定：成则功德 +60、修为 +10%；败则孩子没救下，你身受重伤', roll: { attr: 'wu', dc: 8,
        ok: { merit: 60, xpPct: 10, fate: { tag: 'killChoice' }, hl: { text: '渡化屠村魔修', score: 75 }, text: '魔修跪在地上哭了，孩子从他怀里爬出来，跑向你。' },
        fail: { injure: 3, fate: { tag: 'killChoice' }, text: '你念完最后一句经，孩子已经不动了。魔修大笑着走了。' } } },
      { label: '护住孩子退走', desc: '功德 +20', eff: { merit: 20, fate: { tag: 'killChoice' } } },
    ] },
  // 丹心
  { id: 'F-丹心-1', locs: ['market', 'home'], kind: 'choice', text: '药铺老板想收你当学徒，可你爹已经跟铁匠说好了，让你去打铁。',
    when: (L) => isFate(L, 'danxin') && !L.inDao && L.age >= 8,
    options: [
      { label: '学药', desc: '丹修道途 +15', eff: { school: { alchemy: 15 } } },
      { label: '听爹的去打铁', desc: '根骨 +1，体修道途 +25，家境 +1', eff: { attr: { gen: 1, fam: 1 }, school: { body: 25 } } },
    ] },
  { id: 'F-丹心-2', locs: ['bazaar', 'roam', 'cross'], kind: 'choice', text: '有人出高价收你的丹——前提是每炉里掺一味人血。',
    when: (L) => isFate(L, 'danxin') && L.inDao && L.realm <= 2,
    options: [
      { label: '掺', desc: '灵石 +120，魔修道途 +30', eff: { stones: 120, school: { demon: 30 }, merit: -30 } },
      { label: '不掺', desc: '丹修道途 +10', eff: { school: { alchemy: 10 } } },
    ] },
  // 魔种
  { id: 'F-魔种-1', locs: ['home', 'neighbor', 'fair'], kind: 'choice', text: '你夜里梦游，醒来时手上有血，鸡圈里少了三只鸡。娘哭了一夜，要把你送去山寺。',
    when: (L) => isFate(L, 'mozhong') && !L.inDao && L.age >= 7,
    options: [
      { label: '去山寺', desc: '符修道途 +25，魔修道途 -10，压住魔种', eff: { school: { rune: 25, demon: -10 }, merit: 10 } },
      { label: '半夜逃走', desc: '魔修道途 +15，家境 -2', eff: { school: { demon: 15 }, attr: { fam: -2 } } },
    ] },
  { id: 'F-魔种-2', locs: ['sect', 'roam', 'cross'], kind: 'choice', text: '正道宗门愿意收你，只有一个条件：废掉你体内那点墨。',
    when: (L) => isFate(L, 'mozhong') && L.inDao && L.realm <= 1,
    options: [
      { label: '废墨入正道', desc: '魔修道途 -30，剑修道途 +30，功德 +30', eff: { school: { demon: -30, sword: 30 }, merit: 30 } },
      { label: '不废', desc: '魔修道途 +15', eff: { school: { demon: 15 }, trace: 'ink_touched' } },
    ] },
  // 文心
  { id: 'F-文心-1', locs: ['school', 'road', 'market'], kind: 'choice', text: '先生劝你考功名，武举的教头却说你臂力不错，该去考武举。',
    when: (L) => isFate(L, 'wenxin') && !L.inDao && L.age >= 10,
    options: [
      { label: '抄经练字', desc: '符修道途 +15', eff: { school: { rune: 15 } } },
      { label: '弃文从武', desc: '根骨 +2，体修道途 +25', eff: { attr: { gen: 2 }, school: { body: 25 } } },
    ] },
  { id: 'F-文心-2', locs: ['bazaar', 'roam', 'cross'], kind: 'choice', text: '有人请你画一道杀人的符，酬金够你买三年的灵墨。',
    when: (L) => isFate(L, 'wenxin') && L.inDao && L.realm <= 2,
    options: [
      { label: '画', desc: '灵石 +100，魔修道途 +30', eff: { stones: 100, school: { demon: 30 }, merit: -20 } },
      { label: '不画', desc: '符修道途 +10', eff: { school: { rune: 10 } } },
    ] },
  // 将星
  { id: 'F-将星-1', locs: ['road', 'home'], kind: 'choice', text: '边关告急，募兵的旗子插到了村口。',
    when: (L) => isFate(L, 'jiangxing') && !L.inDao && L.age >= 14,
    options: [
      { label: '从军', desc: '根骨判定：成则体修 +20、剑修 +10；败则重伤', roll: { attr: 'gen', dc: 6, ok: { school: { body: 20, sword: 10 }, trace: 'soldier', text: '三年后你带着一身伤疤回来，腰上多了一块铜牌。' }, fail: { injure: 3, text: '第一仗你就被抬了下来。' } } },
      { label: '去书院', desc: '符修道途 +25，悟性 +1', eff: { school: { rune: 25 }, attr: { wu: 1 } } },
    ] },
  { id: 'F-将星-0', locs: ['sect', 'roam', 'bazaar', 'cave'], kind: 'choice', text: '丹宗长老说你火气旺，是炼丹的好苗子，愿意把一炉百年地火让给你守。',
    when: (L) => isFate(L, 'jiangxing') && L.inDao && L.realm <= 1,
    options: [
      { label: '守丹炉', desc: '丹修道途 +30，寿元 +10', eff: { school: { alchemy: 30 }, life: 10 } },
      { label: '去演武场', desc: '体修道途 +10', eff: { school: { body: 10 } } },
    ] },
  { id: 'F-将星-2', locs: ['cross', 'sect', 'roam'], kind: 'choice', text: '朝廷派人上山，请你出任国师，镇守北疆一百年。',
    when: (L) => isFate(L, 'jiangxing') && L.inDao && L.realm >= 2,
    options: [
      { label: '受封', desc: '寿元 -30，功德 +100，灵石 +200，体修道途 +15', eff: { life: -30, merit: 100, stones: 200, school: { body: 15 }, hl: { text: '镇守北疆百年', score: 75 } } },
      { label: '推辞', desc: '修为 +5%', eff: { xpPct: 5 } },
    ] },
  ...loveChain('fozi'),
  ...loveChain('daotong'),
];

// ---------- 转机：被困住以后，还有机会修上来 ----------
export const TURN_EVENTS: LifeEvent[] = [
  { id: 'T-点化', locs: [], kind: 'choice', text: '一个邋遢老道在你门外讨水喝。喝完看了你一眼：「道走歪了？小事。」',
    options: [
      { label: '求他点化', desc: '悟性判定：成则上限 +1，尘缘了却', roll: { attr: 'wu', dc: 7,
        ok: { fate: { lift: 1, clearStall: true }, hl: { text: '得高人点化', score: 70 }, text: '老道在你后脑拍了一巴掌。你眼前一黑，再睁眼时，堵了多年的那口气通了。' },
        fail: { text: '老道摇摇头：「还不是时候。」走了。' } } },
      { label: '不信', eff: { text: '你关上门。门外的人笑了一声。' } },
    ] },
  { id: 'T-散功', locs: [], kind: 'choice', text: '你在一卷古籍里读到一句：道基错了，就拆了重来。',
    when: (L) => L.capReason === 'daoji' && L.realm >= 3 && L.age < 200,
    options: [
      { label: '散功重修', desc: '跌回筑基，重铸道基；寿元 -20', eff: { life: -20, fate: { recast: true }, hl: { text: '散功重修', score: 80 }, text: '你把金丹一寸寸化开。疼得像把骨头拆了重装。' } },
      { label: '合上古籍', eff: { text: '你把古籍放回了书架最高的那一层。' } },
    ] },
  { id: 'T-灵液', locs: [], kind: 'choice', text: '秘境崩塌，一滴洗髓灵液滚到了你脚边。另外三个人也看见了。',
    options: [
      { label: '抢', desc: '斗法：胜则上限 +1', eff: { battle: { kind: 'duel', title: '争洗髓灵液', elites: 3, win: { fate: { lift: 1, clearStall: true }, text: '灵液入腹，你听见经脉里有什么东西碎了，又长好了。' } } } },
      { label: '花钱买下', desc: '灵石 200：上限 +1', when: (L) => L.stones >= 200, eff: { stones: -200, fate: { lift: 1, clearStall: true }, text: '你把半辈子的积蓄推了过去。' } },
      { label: '让给他们', desc: '功德 +30', eff: { merit: 30 } },
    ] },
  { id: 'T-顿悟', locs: [], kind: 'choice', text: '你在瀑布下站了三天三夜。水声里，你忽然想通了：你走过的那两条路，本来就是一条。',
    when: (L) => L.capReason === 'daoji' && !!L.daoji && Object.values(L.school).filter((v) => v >= 35).length >= 2,
    options: [
      { label: '顺着这一念走下去', desc: '双修道基：上限解除，修炼 ×0.85', eff: { fate: { lift: 99, xpMul: 0.85 }, hl: { text: '顿悟双修道基', score: 85 }, text: '你睁开眼，瀑布倒流了一瞬。' } },
      { label: '怕走火，收住', eff: { text: '你收住心神。那一念滑走了，像鱼。' } },
    ] },
  { id: 'T-夺舍', locs: [], kind: 'choice', text: '一具刚死的年轻修士肉身，道基完好，眉心还是热的。',
    when: (L) => L.daoji === 'demon' || L.fate === 'mozhong' || L.school.demon >= 30,
    options: [
      { label: '夺舍', desc: '换一副道基：上限解除；功德 -60', eff: { merit: -60, trace: 'ink_touched', fate: { lift: 99, clearStall: true }, hl: { text: '夺舍重修', score: 70 }, text: '你睁开一双不属于你的眼睛。' } },
      { label: '把他葬了', desc: '功德 +20', eff: { merit: 20 } },
    ] },
  { id: 'T-看破', locs: [], kind: 'choice', text: '一个小沙弥问你：「放不下，是放不下那个人，还是放不下那时的自己？」',
    when: (L) => !!L.stall,
    options: [
      { label: '想一想', desc: '悟性判定：成则道心复明', roll: { attr: 'wu', dc: 6, ok: { fate: { clearStall: true }, hl: { text: '一语看破', score: 60 }, text: '你想了一夜。天亮时，你笑了。' }, fail: { text: '你想了一夜，还是没想明白。' } } },
      { label: '不答', eff: {} },
    ] },
];

// ---------- 扩写的流水事件（同一世不易重复） ----------
const fl = (id: string, locs: string[], text: string, extra: Partial<LifeEvent> = {}): LifeEvent => ({ id, locs, kind: 'flavor', text, repeat: true, ...extra });
const young = (L: LifeState) => L.age < 12;
const adult = (L: LifeState) => L.age >= 16;

export const FLAVORS_MORE: LifeEvent[] = [
  // 家宅
  fl('g-home-1', ['home'], '你在灶台边偷吃锅巴，被娘拿锅铲追了半条街。', { when: young }),
  fl('g-home-2', ['home'], '下雨天，你和爹一起修屋顶，爹说你手稳。', { when: young }),
  fl('g-home-3', ['home'], '家里给你说了一门亲，你借口要读书推掉了。', { when: (L) => adult(L) && L.age < 30 }),
  fl('g-home-4', ['home'], '爹的背更驼了。你替他挑了一冬的水。', { when: adult, eff: { merit: 5 } }),
  fl('g-home-5', ['home'], '孙子趴在你膝盖上，问你小时候见没见过神仙。', { when: (L) => L.age >= 45 }),
  fl('g-home-6', ['home'], '院里的老槐树开花了，满院子都是甜味。'),
  fl('g-home-7', ['home'], '家里请了账房先生，顺带教你打算盘。', { when: (L) => L.attrs.fam >= 7, eff: { stones: 5 } }),
  fl('g-home-8', ['home'], '年景不好，家里一天只吃一顿。你把自己那碗分了一半给妹妹。', { when: (L) => L.attrs.fam <= 3, eff: { merit: 8 } }),
  // 学堂
  fl('g-school-1', ['school'], '你在《论语》上画了一只王八，先生打了你三下手心。'),
  fl('g-school-2', ['school'], '你和同窗比背《千字文》，赢了一块麦芽糖。'),
  fl('g-school-3', ['school'], '学堂的屋顶漏雨，先生把书都搬到了你家。'),
  fl('g-school-4', ['school'], '你在书页里夹了一片枫叶，后来再也找不到是哪一本。'),
  // 市集
  fl('g-market-1', ['market'], '说书人讲到「御剑飞仙」，满堂叫好，你听得忘了回家。'),
  fl('g-market-2', ['market'], '有人当街卖身葬父，你把身上的铜钱都给了他。', { eff: { merit: 5, stones: -2 } }),
  fl('g-market-3', ['market'], '一个胡商用琉璃珠换走了你的木雕。'),
  fl('g-market-4', ['market'], '集上新开了一家面馆，老板娘多给了你一勺臊子。'),
  fl('g-market-5', ['market'], '你看人斗蟋蟀，押了一个铜板，输了。'),
  // 邻里
  fl('g-nb-1', ['neighbor'], '王婶家的狗下了一窝崽，非要塞给你一只。'),
  fl('g-nb-2', ['neighbor'], '隔壁书生考了第七次，还是没中。你陪他喝了一夜酒。', { when: adult }),
  fl('g-nb-3', ['neighbor'], '邻居两口子吵架，你劝了半宿，两人合起伙来骂你。', { when: adult }),
  fl('g-nb-4', ['neighbor'], '巷口的老瞎子拉了一夜二胡，曲子你从没听过。'),
  fl('g-nb-5', ['neighbor'], '街坊凑钱修了一座小桥，你搬了三天石头。', { eff: { merit: 5 } }),
  // 河畔
  fl('g-river-1', ['river'], '你在河边打水漂，一口气漂了九下。'),
  fl('g-river-2', ['river'], '河里漂来一盏河灯，灯上写着一个陌生人的心愿。'),
  fl('g-river-3', ['river'], '下游的人说，昨夜看见河里有一团青光。', { eff: { trace: 'river' } }),
  fl('g-river-4', ['river'], '洗衣裳的姑娘们唱着歌，歌里不知怎么就有了你的名字。', { when: adult }),
  // 官道
  fl('g-road-1', ['road'], '一队镖车从你身边过，领头的镖师冲你点了点头。'),
  fl('g-road-2', ['road'], '你在驿站听人说，京城换了皇帝。'),
  fl('g-road-3', ['road'], '茶摊的老汉说，这条道底下埋过一个将军。'),
  fl('g-road-4', ['road'], '你给迷路的货郎指了路，他送你一把木梳。'),
  // 病榻
  fl('g-sick-1', ['sickbed'], '病中你做了一个很长的梦，梦里你是另一个人。'),
  fl('g-sick-2', ['sickbed'], '药苦得要命，碗边放着一颗蜜枣。'),
  fl('g-sick-3', ['sickbed'], '窗外的鸟叫了一整个春天，你的病也好了一半。'),
  // 庙会
  fl('g-fair-1', ['fair'], '庙会上有人踩高跷，你骑在爹的肩上看。', { when: young }),
  fl('g-fair-2', ['fair'], '你在城隍庙求了一支签，签上写着「前尘未了」。'),
  fl('g-fair-3', ['fair'], '舞狮的队伍从你面前过，狮子冲你眨了眨眼。'),
  fl('g-fair-4', ['fair'], '你买了一盏走马灯，灯上画的是八仙过海。'),
  // 仙踪
  fl('g-trace-1', ['trace'], '山腰的雾里有人在下棋。等你爬上去，只剩一副空棋盘。', { eff: { flag: 'extraCall' } }),
  fl('g-trace-2', ['trace'], '一只白鹤落在你家屋顶，站了一夜才走。', { eff: { flag: 'extraCall' } }),
  fl('g-trace-3', ['trace'], '你在溪边捡到一片会发光的鳞。'),
  // 洞府
  fl('g-cave-1', ['cave'], '洞府外来了一只山猫，每天准时来蹭你的灵气。', { eff: { xpPct: 2 } }),
  fl('g-cave-2', ['cave'], '一篇功法你抄了三遍，抄到第三遍才看懂。', { eff: { xpPct: 3 } }),
  fl('g-cave-3', ['cave'], '闭关时听见山下的钟声，你数了三千下。', { eff: { xpPct: 3 } }),
  fl('g-cave-4', ['cave'], '石壁渗出一滴灵泉，你等了一年才等到第二滴。', { eff: { xpPct: 3 } }),
  fl('g-cave-5', ['cave'], '你在洞府里种了一株灵兰，它比你先开了窍。', { eff: { xpPct: 2 } }),
  fl('g-cave-6', ['cave'], '出关时，门口的青苔已经长到了脚踝。', { eff: { xpPct: 3 } }),
  // 静室
  fl('g-quiet-1', ['quiet'], '你在静室里听自己的心跳，听着听着，就听见了雨声。', { eff: { xpPct: 2, injure: -1 } }),
  fl('g-quiet-2', ['quiet'], '打坐时一只蜘蛛在你肩上结了张网，你没舍得动。', { eff: { xpPct: 1, injure: -1 } }),
  fl('g-quiet-3', ['quiet'], '你把这些年的伤数了一遍，每一道都记得是谁留下的。', { eff: { injure: -1 } }),
  // 宗门
  fl('g-sect-1', ['sect'], '新入门的小师弟问你，修仙到底图什么。你想了很久，没答上来。'),
  fl('g-sect-2', ['sect'], '藏经阁的老执事睡着了，你偷看了一夜禁书。', { eff: { xpPct: 3 } }),
  fl('g-sect-3', ['sect'], '宗门的仙鹤又跑丢了一只，全门上下找了三天。'),
  fl('g-sect-4', ['sect'], '师尊难得下厨，做的是凡间的阳春面。'),
  fl('g-sect-5', ['sect'], '你在演武场指点了一群外门弟子。', { eff: { merit: 5 } }),
  // 云游
  fl('g-roam-1', ['roam'], '你在一个渔村住了半年，学会了补网。'),
  fl('g-roam-2', ['roam'], '山路上碰见一个也在云游的剑修，两人比了一招，不分胜负。', { eff: { xpPct: 2 } }),
  fl('g-roam-3', ['roam'], '你在古寺借宿，老和尚请你喝了一碗苦茶。', { eff: { xpPct: 2 } }),
  fl('g-roam-4', ['roam'], '大漠里走了三个月，你在海市蜃楼里看见了一座仙宫。'),
  fl('g-roam-5', ['roam'], '你替一个山村求了一场雨，村里人给你立了块碑。', { eff: { merit: 10 } }),
  // 坊市
  fl('g-bazaar-1', ['bazaar'], '有人在卖前朝的飞剑，剑身上的血还没洗干净。'),
  fl('g-bazaar-2', ['bazaar'], '一个小贩坚称他的丹药是丹尊亲手炼的。'),
  fl('g-bazaar-3', ['bazaar'], '你用一株灵草换了一壶好酒。'),
  fl('g-bazaar-4', ['bazaar'], '告示栏上贴着一张通缉令，画像有点像你。'),
  fl('g-bazaar-5', ['bazaar'], '听人说北边又出了一个化神，三天后就死在了天门前。'),
  // 人生路口
  fl('g-cross-1', ['cross'], '路口的石碑上刻满了名字，你在最下面找到一个眼熟的。'),
  fl('g-cross-2', ['cross'], '路口的算命瞎子说，你这条路已经走过很多遍了。'),
  fl('g-cross-3', ['cross'], '三条路，你走了中间那条。一年后才发现，三条路通向同一个地方。', { eff: { xpPct: 2 } }),
  // 机缘、因果
  fl('g-fortune-1', ['fortune'], '山涧里捡到一枚前人的储物戒，里面只有一封没寄出去的信。'),
  fl('g-fortune-2', ['fortune'], '一头老龟驮你过了河，上岸时递给你一片龟甲。', { eff: { stones: 20 } }),
  fl('g-fortune-3', ['fortune'], '雷雨夜，一道闪电劈开山崖，露出一线灵石矿。', { eff: { stones: 40 } }),
  fl('g-karma-1', ['karma'], '你梦见一盏灯，提灯的人背对着你。'),
  fl('g-karma-2', ['karma'], '有人在你门前放了一篮桃子，没留名字。'),
  // 危地
  fl('g-forest-1', ['forest'], '妖林边的猎户请你喝了碗肉汤，说最近林子里不太平。'),
  fl('g-forest-2', ['forest'], '你从夹子上救下一只小狐狸，它回头看了你三次。', { eff: { merit: 5 } }),
  fl('g-forest-3', ['forest'], '树上刻着前人的记号：往北，有去无回。'),
  fl('g-realm-1', ['realm'], '秘境里的时间流得慢，你出来时，外面过了三年。'),
  fl('g-realm-2', ['realm'], '你在秘境里发现一具枯骨，手里还攥着一枚没捏碎的传送符。'),
  fl('g-demon-1', ['demon'], '魔域边上的小镇里，人人都蒙着脸。'),
  fl('g-demon-2', ['demon'], '一个魔修孩童朝你扔石头，跑得比兔子还快。'),
  fl('g-rift-1', ['rift'], '裂隙里传来翻书的声音，一页，又一页。', { eff: { xpPct: 3 } }),
  fl('g-gate-1', ['gate'], '天门前庭的地砖上，有无数个跪出来的坑。'),
  // 常去的地方多备几句
  fl('g-home-9', ['home'], '娘把你小时候的虎头鞋翻了出来，说要留给孙子。', { when: adult }),
  fl('g-home-10', ['home'], '过年了，一家人守岁，你最先睡着。', { when: young }),
  fl('g-home-11', ['home'], '屋后的竹子开了花。老人说，竹子开花，年景要变。'),
  fl('g-nb-6', ['neighbor'], '张屠户家娶媳妇，流水席摆了三天。'),
  fl('g-nb-7', ['neighbor'], '你替不识字的邻居写了一封家书，寄往很远的地方。', { when: (L) => L.age >= 10, eff: { merit: 3 } }),
  fl('g-market-6', ['market'], '一个耍猴的把猴子借你牵了一圈。', { when: young }),
  fl('g-market-7', ['market'], '你在旧书摊上淘到半本没头没尾的剑谱。', { eff: { school: { sword: 2 } } }),
  fl('g-cave-7', ['cave'], '你试着一口气运转十个周天，第九个周天时睡着了。', { eff: { xpPct: 2 } }),
  fl('g-cave-8', ['cave'], '洞口的瀑布冻住了一个冬天，你就看了一个冬天。', { eff: { xpPct: 3 } }),
  fl('g-cave-9', ['cave'], '你把这些年的心得刻在石壁上，刻完又觉得全是错的。', { eff: { xpPct: 3 } }),
  fl('g-cave-10', ['cave'], '一只燕子在洞府里筑了巢，你闭关时它孵出了三只雏鸟。', { eff: { xpPct: 2 } }),
  fl('g-quiet-4', ['quiet'], '你把一盏油灯看到灭，又看着它被风吹亮。', { eff: { xpPct: 2 } }),
  fl('g-quiet-5', ['quiet'], '静坐到第七日，你想起了一首小时候娘唱过的歌。', { eff: { injure: -1 } }),
  fl('g-sect-6', ['sect'], '宗门新修了一座观星台，你在上面守了一夜。', { eff: { xpPct: 2 } }),
  fl('g-sect-7', ['sect'], '同门的师姐下山嫁了人，喜糖托人带了回来。'),
  fl('g-sect-8', ['sect'], '掌门闭关前把你叫去，只说了一句：好好修。'),
  fl('g-roam-6', ['roam'], '你在一座荒城里过了一夜，城门上的字被风沙磨平了。'),
  fl('g-roam-7', ['roam'], '你和一个卖唱的瞎子同路了一程，他唱的都是你没听过的仙人。'),
  fl('g-roam-8', ['roam'], '江上起雾，船家说这雾三百年才起一回。', { eff: { xpPct: 2 } }),
  fl('g-bazaar-6', ['bazaar'], '坊市里新来一个卖糖人的，捏的仙人一个比一个丑。'),
  fl('g-bazaar-7', ['bazaar'], '有人当街斗宝，一枚灵珠卖出了天价。'),
  fl('g-cross-4', ['cross'], '路口有个孩子在卖花，问你要不要买一朵送给想念的人。'),
  fl('g-cross-5', ['cross'], '你在路口遇见年轻时的仇家。他老了，没认出你。'),
];

// 「顺路」流水账
export const ON_THE_WAY_MORTAL = ['顺路给娘带了一包桂花糕。', '路上和小伙伴打了一架。', '在路边捡到一只受伤的麻雀。', '路过私塾，听见里面在背《三字经》。', '顺路帮人推了一段车。', '在桥头看了一会儿钓鱼的。', '路上下了雨，在别人家屋檐下躲了半天。', '顺手摘了一把野枣，酸得直咧嘴。'];
export const ON_THE_WAY_CULT = ['顺路去坊市换了几株灵草。', '路上遇见一只灵鹤，跟了你半日。', '途中歇脚，听樵夫唱了一段山歌。', '路过一座破庙，你进去上了一炷香。', '半路被一场雷雨截住，你在云里站了一会儿。', '途中替人赶走了一只偷鸡的狐狸。', '路过凡间的城，城里正在放烟火。', '顺路去看了一眼当年的老宅，已经换了人家。'];

export const NOTHING_MORTAL_MORE = ['下了一场大雪，你堆了个雪人。', '你在门槛上坐了一下午，看蚂蚁搬家。', '这一年，村里没人生，也没人死。', '你又长高了一点，旧衣裳短了一截。', '日子像磨盘，一圈一圈地转。'];
export const NOTHING_CULT_MORE = ['打坐，吐纳，再打坐。', '一炷香烧完，又点一炷。', '你数着山下的四季，又数过了一轮。', '修为涨了一点，说不清是哪天涨的。', '云来了又走，你没动。'];
