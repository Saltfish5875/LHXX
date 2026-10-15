// R12 内容库：天书、司灯对白、心愿、战场词条、结局等文案（首稿原文）

export interface Page {
  n: number;
  vol: 1 | 2 | 3;
  cond: string;
  text: string;
}

export const PAGES: Page[] = [
  { n: 1, vol: 1, cond: '第一次死亡', text: '砚池里沉着千万魂，个个洗得雪白。唯有一缕，洗了又洗，总还留着一点墨。' },
  { n: 2, vol: 1, cond: '以凡人身活到 80 岁', text: '凡人一生不过一笔淡墨。可墨潮漫过村庄时，淡墨也会被吞得干干净净。' },
  { n: 3, vol: 1, cond: '测灵根失败后仍入道', text: '所谓无灵根，不过是墨落在了根上。洗得掉的墨，便不算命。' },
  { n: 4, vol: 1, cond: '首次筑基', text: '司灯摸到你魂里有一根硬物，细若毫发，墨洗不动，火烧不化。她说：这是笔毫。' },
  { n: 5, vol: 1, cond: '救下雪山白狐', text: '雪地里那只狐看你的眼神，不像初见，倒像久别。' },
  { n: 6, vol: 1, cond: '一世中经历妖潮、斗法、天劫三种劫难', text: '妖是墨，敌是墨，连天上降下的雷，也带着墨腥。' },
  { n: 7, vol: 1, cond: '一世不入道、善终且功德达标', text: '画者落款处有一行小字：凡人亦是笔墨，不可轻弃。' },
  { n: 8, vol: 1, cond: '弥补一件前世遗憾', text: '轮回不是重画一张，而是在旧画上改一笔。改过的地方，墨色会深一些。' },
  { n: 9, vol: 1, cond: '与赤衣初次斗法', text: '红衣人收剑大笑：「执笔人，三千年了，你还在画里打转？」' },
  { n: 10, vol: 2, cond: '拜丹尊为师', text: '老夫当年，每隔百年便送一位徒儿出画。天门开着，像一扇寻常院门。' },
  { n: 11, vol: 2, cond: '首次结丹', text: '天门崩前最后一位出画的人，世人称他执笔人。他走后，门就再没开过。' },
  { n: 12, vol: 2, cond: '白狐命灯达 3 级', text: '白狐说：雪山那只手，袖口有一点墨。和你现在的一样。' },
  { n: 13, vol: 2, cond: '用无名古卷炼成一门五阶道法', text: '所谓自创道法，是借笔意在画上添一笔。能添笔的，本不该是画中人。' },
  { n: 14, vol: 2, cond: '在同一世完成两条因缘', text: '古戒、古瓶、雪狐、红衣，当年都在天门前。只是他们记得的，比你多。' },
  { n: 15, vol: 2, cond: '首次元婴', text: '心魔劫里那人长着你的脸，出手却比你老练。像是同一只手，多练了三千年。' },
  { n: 16, vol: 2, cond: '赤衣命灯达 3 级', text: '赤衣说：画外的墨要进来，挡也挡不住。不如让众生都化作墨，便不怕被吞。' },
  { n: 17, vol: 2, cond: '解锁掌天瓶并回溯一年', text: '瓶中那滴水是画者的砚滴。一滴，能让画上的一年重来。' },
  { n: 18, vol: 2, cond: '首次化神并叩门', text: '劫主的剑你认得，那是你前世的本命剑。他看你的眼神，像在看一面镜子。' },
  { n: 19, vol: 3, cond: '三度叩门', text: '劫主第一次开口，只说两个字：「回去。」声音是你自己的。' },
  { n: 20, vol: 3, cond: '一世不杀生活到元婴', text: '墨影溃散时会露出一张人脸。它们原也是画中人，只是被墨淹没得太早。' },
  { n: 21, vol: 3, cond: '白狐命灯达 9 级', text: '当年她跟你出了画，看见画外的事，又跟你回来。三千年，她每一世都在等你认出她。' },
  { n: 22, vol: 3, cond: '在天门前击败心魔镜像', text: '心魔倒下时说：「我是留在门前的那一半。你是逃回画里的那一半。我们都是执笔人。」' },
  { n: 23, vol: 3, cond: '丹尊命灯达 9 级', text: '是你亲手折断了造化笔。一截封门，一截化雷，一截随你坠入砚池，余下六截散落人间。' },
  { n: 24, vol: 3, cond: '赤衣命灯达 9 级或亲手斩杀他', text: '画外没有仙境。画外只有一张更大的纸，和一片正在漫过来的墨。' },
  { n: 25, vol: 3, cond: '司灯的灯第一次熄灭', text: '司灯说：我是画者搁笔前点下的最后一笔，只为守着砚池，等一个洗不干净的人。' },
  { n: 26, vol: 3, cond: '集齐前 25 页', text: '重画天门需要五样东西：狐的记忆、丹尊的火、赤衣的墨、砚滴的时间，和一盏灯的油。' },
  { n: 27, vol: 3, cond: '击败劫主', text: '你与劫主合为一人。笔毫在掌心化作一支完整的笔。门在前面，墨在后面。你要怎么落笔？' },
];

export const VOLUME_NAMES = ['', '凡尘卷', '仙途卷', '天门卷'];

// 司灯触发台词（优先）与各卷日常台词（循环）
export const SILU_TRIGGER: Record<string, string> = {
  death1: '又来一个。坐下，洗干净了再走。……奇怪，洗不掉。',
  death2: '又是你。上回的墨迹还在。去活。',
  death3: '我给你一件事做，你便不会白活。带上这个心愿。',
  p04: '你魂里有一根笔毫。三千年了，我等的就是这个。',
  accident: '这一笔落得太急。下回绕开那里。',
  trial: '雷是从门那边来的。门那边，有人不想让你过去。',
  wishDone: '好。这一世没有白活。',
  wishFail: '差一点。差一点的事，下一世还会来找你。',
  knock1: '你见到他了。……我的灯，暗了一些。不必管它。',
  dim: '（不说话，只是给你心愿）',
  afterEnd: '门的事已经了了。你想再活几世，就再活几世。',
};

export const SILU_DAILY: string[][] = [
  [],
  [
    '人活一世，本该忘一世。你不肯忘，那便记得清楚些。',
    '砚池里的魂，都怕洗。你不怕？',
    '画卷里的一年，在这里不过一滴水的工夫。',
    '你问我是谁？守井的。无名无姓，和你一样。',
    '外头的墨又浓了些。去活。',
  ],
  [
    '丹尊那老东西的话，信一半就好。另一半，他自己也记不清。',
    '红衣那人说的未必是错的。但你先别信他。',
    '狐狸又来问你的事。我说我不知道。',
    '天门的事，不是一世两世的事。慢慢来，你有的是世。',
    '你每次回来，笔毫都亮一些。我的灯，就暗一些。无妨。',
  ],
  [
    '我还能点几回灯，我自己数着。',
    '画者走的那天，也是这样的天色。',
    '你当年走出门去，回头看了我一眼。你不记得了，我记得。',
    '要是你选了封门，我也不怪你。守门也是一种画法。',
    '去吧。这次，不必去活，去画。',
  ],
];

export type CompanionId = 'silu' | 'fox' | 'chiyi' | 'danzun' | 'bottle';
export const COMPANION_NAMES: Record<CompanionId, string> = {
  silu: '司灯',
  fox: '白狐',
  chiyi: '赤衣',
  danzun: '丹尊',
  bottle: '掌天瓶',
};
export const COMPANION_QUOTE: Record<CompanionId, string> = {
  silu: '去活。',
  fox: '我记得。',
  chiyi: '又是你。',
  danzun: '老夫当年……',
  bottle: '（瓶身微微亮了一下）',
};

// 战场词条 M01～M24
export type MutType = 'terrain' | 'enemy' | 'rule';
export interface Mutator {
  id: string;
  name: string;
  trace: string;
  type: MutType;
  kinds: string; // B 妖潮 D 斗法 T 天劫
  pro: string;
  con: string;
}

export const MUTATORS: Mutator[] = [
  { id: 'M01', name: '雪原', trace: 'snowfield', type: 'terrain', kinds: 'BDT', pro: '冰系伤害 +20%', con: '移动 -10%' },
  { id: 'M02', name: '剑冢', trace: 'sword_tomb', type: 'terrain', kinds: 'BD', pro: '飞剑穿透 +1', con: '场上不时落下断剑，有预警' },
  { id: 'M03', name: '河雾', trace: 'river', type: 'terrain', kinds: 'BD', pro: '敌弹在雾中减速 20%', con: '视野边缘变暗' },
  { id: 'M04', name: '焰山', trace: 'fire_born', type: 'terrain', kinds: 'BD', pro: '火区持续 +50%', con: '场上有火井，接触受伤' },
  { id: 'M05', name: '故乡', trace: 'hometown', type: 'terrain', kinds: 'B', pro: '气血回复 +30%', con: '开场敌人 +20%' },
  { id: 'M06', name: '墨沼', trace: 'ink_touched', type: 'terrain', kinds: 'BDT', pro: '墨影死亡留下的灵气 +30%', con: '场上有墨沼，在其中持续掉血' },
  { id: 'M07', name: '画外风', trace: 'rift', type: 'terrain', kinds: 'BDT', pro: '每 20 秒一阵风把敌人吹离主角', con: '主角也会被推动' },
  { id: 'M08', name: '洞天', trace: 'cave_heaven', type: 'terrain', kinds: 'T', pro: '雷劫预警 +0.2 秒', con: '战场半径 -15%' },
  { id: 'M09', name: '狐族复仇', trace: 'fox_slain', type: 'enemy', kinds: 'D', pro: '击败后得一枚狐丹（气血上限 +10）', con: '精英换成狐族，魅惑使主角反向移动 1 秒' },
  { id: 'M10', name: '正道追兵', trace: 'demon_ally', type: 'enemy', kinds: 'BD', pro: '追兵掉落灵石 ×2', con: '精英中混入 1 名正道剑修' },
  { id: 'M11', name: '赤衣分身', trace: 'chiyi_refused', type: 'enemy', kinds: 'D', pro: '击败分身赤衣命灯进度 +1', con: '场上多一名赤衣分身精英' },
  { id: 'M12', name: '迷途画中人', trace: 'merit_high', type: 'enemy', kinds: 'BD', pro: '净化它们功德 +5 / 个，不计杀生', con: '它们不攻击但会挡路' },
  { id: 'M13', name: '旧仇', trace: 'grudge', type: 'enemy', kinds: 'D', pro: '击败后移除旧仇', con: '精英气血 +30%' },
  { id: 'M14', name: '妖兵成群', trace: 'beast_hunter', type: 'enemy', kinds: 'B', pro: '妖兵掉落经验 +25%', con: '刷怪间隔 -15%' },
  { id: 'M15', name: '墨鸦之主', trace: 'crow_omen', type: 'enemy', kinds: 'BT', pro: '墨鸦受到伤害 +30%', con: '墨鸦数量 ×2' },
  { id: 'M16', name: '心魔余韵', trace: 'heart_demon', type: 'enemy', kinds: 'BD', pro: '击败心魔影得一次悟道', con: '场上出现一个弱化心魔影（50% 强度）' },
  { id: 'M17', name: '寿元光点', trace: 'life_borrowed', type: 'rule', kinds: 'BDT', pro: '拾取光点回补本场折损的寿元', con: '光点会逐渐飘远' },
  { id: 'M18', name: '以血为引', trace: 'blood_pact', type: 'rule', kinds: 'BD', pro: '低于 30% 气血时伤害 +25%', con: '回复效果 -30%' },
  { id: 'M19', name: '广结善缘', trace: 'kind_heart', type: 'rule', kinds: 'BD', pro: '开场获得一层 30% 气血的护盾', con: '斩妖灵石 -20%' },
  { id: 'M20', name: '赌徒', trace: 'gambler', type: 'rule', kinds: 'BD', pro: '暴击伤害 +40%', con: '非暴击伤害 -10%' },
  { id: 'M21', name: '学究', trace: 'scholar', type: 'rule', kinds: 'BDT', pro: '悟道三选一变四选一', con: '经验 -10%' },
  { id: 'M22', name: '战场老兵', trace: 'soldier', type: 'rule', kinds: 'B', pro: '受到接触伤害 -15%', con: '不能布阵（老兵只信自己的刀）' },
  { id: 'M23', name: '回溯之痕', trace: 'rewound', type: 'rule', kinds: 'BDT', pro: '一次致命伤害时时间倒流 2 秒', con: '本场奖励 -20%' },
  { id: 'M24', name: '轻装', trace: 'ascetic', type: 'rule', kinds: 'BDT', pro: '移动 +15%，少于 2 件时伤害 +15%', con: '不能获得新法宝（悟道只给升阶）' },
];

// 心愿 W01～W40；check 在岁首与结算时调用
export type WishKind = 'main' | 'challenge' | 'companion';
export interface WishDef {
  id: string;
  name: string;
  cond: string;
  kind: WishKind;
  page?: number;
  lamp?: CompanionId;
  unlock?: number; // 需要完成的卷序（挑战心愿池）
}

export const WISHES: WishDef[] = [
  { id: 'W01', name: '黄发垂髫', cond: '以凡人身活到 80 岁', kind: 'main', page: 2 },
  { id: 'W02', name: '无根亦可修', cond: '测灵根失败后仍入道', kind: 'main', page: 3 },
  { id: 'W03', name: '筑一座基', cond: '筑基', kind: 'main', page: 4 },
  { id: 'W04', name: '雪中伸手', cond: '救下雪山白狐', kind: 'main', page: 5 },
  { id: 'W05', name: '三劫历尽', cond: '一世中经历妖潮、斗法、天劫', kind: 'main', page: 6 },
  { id: 'W06', name: '凡人亦是笔墨', cond: '不入道、善终、功德 ≥ 150', kind: 'main', page: 7 },
  { id: 'W07', name: '改一笔', cond: '弥补一件前世遗憾', kind: 'main', page: 8 },
  { id: 'W08', name: '红衣之约', cond: '与赤衣斗法一场', kind: 'main', page: 9 },
  { id: 'W09', name: '拜师', cond: '拜丹尊为师', kind: 'main', page: 10 },
  { id: 'W10', name: '丹成', cond: '结丹', kind: 'main', page: 11 },
  { id: 'W11', name: '狐与你', cond: '白狐命灯达 3', kind: 'main', page: 12 },
  { id: 'W12', name: '自创一法', cond: '自创道法升到五阶', kind: 'main', page: 13 },
  { id: 'W13', name: '双缘', cond: '一世完成两条因缘', kind: 'main', page: 14 },
  { id: 'W14', name: '婴成', cond: '元婴', kind: 'main', page: 15 },
  { id: 'W15', name: '三放红衣', cond: '赤衣命灯达 3', kind: 'main', page: 16 },
  { id: 'W16', name: '重来一年', cond: '解锁掌天瓶回溯', kind: 'main', page: 17 },
  { id: 'W17', name: '叩门', cond: '化神并叩门', kind: 'main', page: 18 },
  { id: 'W18', name: '再叩', cond: '累计叩门三次', kind: 'main', page: 19 },
  { id: 'W19', name: '不杀之婴', cond: '一世不杀生活到元婴', kind: 'main', page: 20 },
  { id: 'W20', name: '九灯之狐', cond: '白狐命灯达 9', kind: 'main', page: 21 },
  { id: 'W21', name: '见己', cond: '在天门前击败心魔', kind: 'main', page: 22 },
  { id: 'W22', name: '师父', cond: '丹尊命灯达 9', kind: 'main', page: 23 },
  { id: 'W23', name: '了结红衣', cond: '赤衣命灯达 9 或亲手斩杀他', kind: 'main', page: 24 },
  { id: 'W24', name: '落笔', cond: '击败劫主', kind: 'main', page: 27 },
  { id: 'W25', name: '百岁不入道', cond: '凡人身活到 100 岁', kind: 'challenge', unlock: 0 },
  { id: 'W26', name: '一剑飞升', cond: '只用一件法宝到化神', kind: 'challenge', unlock: 0 },
  { id: 'W27', name: '白手起家', cond: '贫苦农家出身结丹', kind: 'challenge', unlock: 0 },
  { id: 'W28', name: '独行', cond: '不请援、不布阵到元婴', kind: 'challenge', unlock: 0 },
  { id: 'W29', name: '好战之人', cond: '一世打赢 30 场劫难', kind: 'challenge', unlock: 1 },
  { id: 'W30', name: '客居人间', cond: '化神后仍自愿在凡间地点度过 5 回合', kind: 'challenge', unlock: 1 },
  { id: 'W31', name: '借寿之人', cond: '签下借寿燃法契约且仍寿终正寝', kind: 'challenge', unlock: 2 },
  { id: 'W32', name: '宗门中兴', cond: '开宗立派并收满 3 名弟子', kind: 'challenge', unlock: 2 },
  { id: 'W33', name: '无天赋', cond: '开局三项天赋均为凡品而结丹', kind: 'challenge', unlock: 3 },
  { id: 'W34', name: '一世一念', cond: '不使用改命到化神', kind: 'challenge', unlock: 3 },
  { id: 'W35', name: '与狐同行', cond: '本世完成白狐一段事件', kind: 'companion', lamp: 'fox' },
  { id: 'W36', name: '与师同炉', cond: '本世完成丹尊一段事件', kind: 'companion', lamp: 'danzun' },
  { id: 'W37', name: '与敌同酒', cond: '本世完成赤衣一段事件且未斩杀他', kind: 'companion', lamp: 'chiyi' },
  { id: 'W38', name: '瓶中岁月', cond: '本世完成掌天瓶一段事件', kind: 'companion', lamp: 'bottle' },
  { id: 'W39', name: '神仙眷侣', cond: '与道侣同一回合突破化神', kind: 'companion' },
  { id: 'W40', name: '为你挡雷', cond: '伙伴替你挡下致命一击后你仍活过本场', kind: 'companion' },
];

// 前世遗憾
export interface RegretDef {
  type: string;
  show: string;
  open: string;
  fixed: string;
  score: number;
}
export const REGRETS: Record<string, RegretDef> = {
  breakthrough: { type: 'breakthrough', show: '差 {数值} 修为就能{下一境界}。', open: '你在洞府里发现一座旧蒲团，坐上去就想起了什么。', fixed: '这一步，上辈子就该迈过去。', score: 80 },
  place: { type: 'place', show: '{年龄}岁，若那年没去{地点}……', open: '你一走近{地点}，心里就发寒。', fixed: '这一次，你平安走过了{地点}。', score: 75 },
  wish: { type: 'wish', show: '「{心愿}」，就差一点。', open: '', fixed: '这个心愿，终于了了。', score: 70 },
  bond: { type: 'bond', show: '{人}的事，还没有结果。', open: '{人}比上一世早十年出现在你面前。', fixed: '这一世，你赶上了。', score: 65 },
  grudge: { type: 'grudge', show: '仇人还活着。', open: '隔壁搬来一户人家，那孩子看你的眼神不对。', fixed: '上一世的帐，这一世算清了。', score: 60 },
  treasure: { type: 'treasure', show: '{法宝}随你一同沉入了水底。', open: '有人在{地点}挖出一件旧物，纹路你很熟。', fixed: '它还认得你。', score: 50 },
};

// 传奇开局 L01～L08（天赋组合触发）
export interface Legend {
  id: string;
  name: string;
  talents: string[];
  extra?: string;
  text: string;
  effect: string;
  hint: string;
}
export const LEGENDS: Legend[] = [
  { id: 'L01', name: '仙人下凡', talents: ['immortal', 'spirit_body', 'fortune'], text: '你落地那一刻，屋里的灯全亮了，又一齐暗下去。', effect: '1 岁即练气一层；测灵根必为天灵根；寿元 -20', hint: '仙人投胎，总要带三样东西。' },
  { id: 'L02', name: '剑冢之子', talents: ['sword_mad', 'orphan'], extra: 'swordTomb', text: '你是在剑冢外被捡到的，襁褓里裹着一截断剑。', effect: '剑修道途 +30；本世自带剑冢痕迹', hint: '剑冢外的孩子，没有名字。' },
  { id: 'L03', name: '古戒药童', talents: ['five_seed', 'wealthy'], extra: 'danzun3', text: '你家药铺后院埋着一枚古戒，夜里会咳嗽。', effect: '丹修道途 +30；丹尊早早现身', hint: '有个老头，等你等得不耐烦了。' },
  { id: 'L04', name: '墨中生', talents: ['no_root', 'jealous', 'sickly'], text: '你生下来不哭，眼白是灰的。', effect: '测灵根必失败；魔修道途 +40', hint: '生来带墨的人，哭不出声。' },
  { id: 'L05', name: '狐的约定', talents: ['cat', 'beauty'], extra: 'fox3', text: '你出生那夜下雪，门口蹲着一只白狐，天亮才走。', effect: '白狐以邻家少女身份在 6 岁出现', hint: '雪夜里，门外有一串小脚印。' },
  { id: 'L06', name: '书香符种', talents: ['scholar_house', 'photographic', 'prodigy'], text: '你三岁认字，五岁时发现父亲书房里有一页字会动。', effect: '符修道途 +30；古卷灵感 +1', hint: '书房里有一页纸，自己翻了过去。' },
  { id: 'L07', name: '百岁农家', talents: ['farmer', 'long_family', 'iron_heart'], text: '你家三代都活过了九十。田埂边那棵老槐，比村子还老。', effect: '凡人寿元 +40；不发测灵根卡', hint: '老槐树下，总坐着一个人。' },
  { id: 'L08', name: '浴火', talents: ['phoenix', 'bad_luck'], text: '你出生那年家里失了火，人人都说你活不过冬天。', effect: '本世第一次致命伤改为保留 1 气血并清屏；之后气运 -2', hint: '火里抱出来的孩子，命硬。' },
];

// 主线结局文本
export const ENDINGS = {
  A: {
    name: '封门守世',
    text: '你把笔毫按进门缝。门合上的声音很轻，像有人在远处掩上一卷画。墨潮退回裂口，天上的雷一道一道熄了。画里的人还会出生、老去、死去，只是再也没有人能走出去。你留在门前。三千年前，那一半的你也是这样站着的。现在轮到你了。',
    silu: '门守住了。……灯，我替你留着。',
  },
  B: {
    name: '大开天门',
    text: '你把门推到最开。门外没有仙境，只有一张更大的纸，白得刺眼。画里的人一个接一个走出去：修士、凡人、妖、鸦。墨也跟着涌进来，漫过雪山、河畔，漫过你出生的那座小院。你回头看了一眼，画卷正在变黑。有人在黑里点起了灯。',
    silu: '走吧。别回头。',
  },
  C: {
    name: '化墨',
    text: '赤衣把最后一点墨递给你：「画门时用得上。」你没有接。你握住他的手，和他一起往后退了一步，退进墨里。墨很冷，然后就不冷了。你们成了墨的一部分，也成了它的心。从那以后墨潮不再吞人，只在画卷边缘慢慢涨落，像潮汐。修士们管它叫「墨息」，没人知道里面住着两个人。',
    silu: '（灯晃了一下，什么也没说。）',
  },
  T: {
    name: '重画天门',
    text: '你没有选门前，也没有选墨后。你在门与墨之间的那片空白上落笔。白狐的记忆做笔锋，丹尊的火温墨，赤衣的墨是墨，砚滴落下的时间让这一笔慢下来。\n\n最后一样，司灯自己递了过来。她把灯里剩下的油倒进砚池：「我本来就是画者的最后一笔。用完了，正好。」\n\n新的天门画成了。它不再是一道裂口，而是一扇可以推开、也可以关上的门。想出画的人可以走，想留下的人可以留。墨退回砚池，重新变成墨。\n\n砚池边，一盏灯灭了。你在灯旁坐了很久。然后，画里有人喊你的名字。你终于想起来，你叫什么。',
    silu: '',
  },
};

export const HIDDEN = {
  H1: {
    name: '人间一世',
    text: '一百二十岁那年春天，你坐在老槐树下，看孙子的孙子在田里追一只鸡。你这一生没见过剑光，没渡过雷劫，也没见过墨影。村里人说，你是这一带最有福气的人。你闭上眼之前想：画者画这一笔的时候，大概也是这样，慢慢地画。',
    silu: '洗了三千年的魂，头一回见有人笑着回来。',
  },
  H2: {
    name: '长河',
    text: '你接过他的蓑衣，在河边坐下。河水从你脚边流过去，有人在岸上洗衣，有孩子在浅滩摸鱼。你记得每一个落水的人，你把他们都推回了岸边。一百年后，又有一个人来到河边，问你：河里有河伯吗？你说：有。',
    silu: '',
  },
  H3: {
    name: '井底',
    text: '井很深。你往下落，经过一层又一层洗干净的魂，它们白得像纸。井底是干的，是一方砚台，砚边有一个凹槽，形状像一只瓶。你抬头，看见井口有一点青光，很小，很远。司灯在上面喊你：「上来。那里不是你待的地方。」',
    silu: '你看见那个凹槽了？……那是放砚滴的地方。瓶子不是捡来的，是它自己回家了。',
  },
};

export const OPENING =
  '太初时，「画者」以一支造化笔在一张天地长卷上画出山河与众生，画成之日在卷首开了一道「九霄天门」。修士修到圆满，走过天门就能出画，这就是飞升。\n\n三千年前发生了「天门崩」。卷首裂开，浓墨从裂口渗下来，化成遍地的墨影妖魔，世人称之「墨潮」。三千年里无人飞升。\n\n修士死后，魂魄沉入画卷底部的「轮回井」，由守井人「司灯」洗去墨迹，重新落笔为人。洗干净的魂不记得前世。\n\n而你，是一缕洗不干净的「无名残魂」。';
