// 地点卡池与地点事件（R12 系统设计案「地点表」+ 内容库「新增抉择与地点事件」）
import type { Effect, LifeState, MetaState, Option, BattleKind } from '../game/types';

export interface LocationDef {
  id: string;
  name: string;
  icon: string;
  stage: 'mortal' | 'cult';
  weight: number;
  hint: string;
  danger?: boolean; // 劫难地点（可带劫）
  fatal?: boolean; // 可能凶
  chance?: boolean; // 缘位地点
  battle?: BattleKind;
  avail?: (L: LifeState, M: MetaState) => boolean;
}

export const LOCATIONS: LocationDef[] = [
  { id: 'home', name: '家宅', icon: '宅', stage: 'mortal', weight: 10, hint: '流水与家境收入' },
  { id: 'school', name: '学堂', icon: '学', stage: 'mortal', weight: 8, hint: '可能有抉择', avail: (L) => L.age >= 6 && L.age <= 18 },
  { id: 'market', name: '市集', icon: '市', stage: 'mortal', weight: 8, hint: '赌坊与市井' },
  { id: 'neighbor', name: '邻里', icon: '邻', stage: 'mortal', weight: 8, hint: '街坊琐事' },
  { id: 'river', name: '河畔', icon: '河', stage: 'mortal', weight: 6, hint: '可能有险', fatal: true },
  { id: 'road', name: '官道', icon: '道', stage: 'mortal', weight: 6, hint: '征兵、武馆与匪患', fatal: true, avail: (L) => L.age >= 12 },
  { id: 'sickbed', name: '病榻', icon: '榻', stage: 'mortal', weight: 4, hint: '根骨判定', fatal: true, avail: (L) => !!L.flags.sickly || L.age >= 55 },
  { id: 'fair', name: '庙会', icon: '庙', stage: 'mortal', weight: 5, hint: '求签得改命' },
  { id: 'trace', name: '仙踪', icon: '仙', stage: 'mortal', weight: 4, hint: '额外一次仙缘判定', chance: true, avail: (L) => !L.inDao && L.root !== 'none' && L.age >= 6 && !L.flags.declined },
  { id: 'cave', name: '洞府', icon: '府', stage: 'cult', weight: 10, hint: '闭关修为' },
  { id: 'quiet', name: '静室', icon: '静', stage: 'cult', weight: 6, hint: '养伤、顿悟' },
  { id: 'sect', name: '宗门', icon: '宗', stage: 'cult', weight: 8, hint: '宗门事务与大比', avail: (L) => L.route === 'sect' },
  { id: 'roam', name: '云游', icon: '游', stage: 'cult', weight: 8, hint: '散修奇遇', avail: (L) => L.route !== 'sect' },
  { id: 'bazaar', name: '坊市', icon: '坊', stage: 'cult', weight: 6, hint: '交易与见闻' },
  { id: 'cross', name: '人生路口', icon: '路', stage: 'cult', weight: 6, hint: '人生抉择' },
  { id: 'fortune', name: '机缘', icon: '缘', stage: 'cult', weight: 5, hint: '奇遇、无名古卷', chance: true },
  { id: 'karma', name: '因果', icon: '果', stage: 'cult', weight: 4, hint: '同行者事件', chance: true },
  { id: 'forest', name: '妖林', icon: '妖', stage: 'cult', weight: 5, hint: '妖潮', danger: true, battle: 'beast' },
  { id: 'realm', name: '秘境', icon: '秘', stage: 'cult', weight: 4, hint: '秘境兽潮', danger: true, battle: 'beast', avail: (L) => L.realm >= 2 },
  { id: 'demon', name: '魔域', icon: '魔', stage: 'cult', weight: 3, hint: '魔修、赤衣势力', danger: true, battle: 'duel', avail: (_L, M) => M.saga.volume >= 2 },
  { id: 'rift', name: '画外裂隙', icon: '隙', stage: 'cult', weight: 3, hint: '主线线索', chance: true, avail: (L, M) => M.unlocks.includes('rift') && L.realm >= 4 },
  { id: 'gate', name: '天门前庭', icon: '门', stage: 'cult', weight: 3, hint: '劫主前哨', danger: true, battle: 'duel', avail: (L, M) => M.saga.volume >= 3 && L.realm >= 5 },
];

export const LOC_BY_ID: Record<string, LocationDef> = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

export interface LifeEvent {
  id: string;
  locs: string[];
  kind: 'flavor' | 'choice' | 'fatal';
  text: string;
  eff?: Effect;
  options?: Option[];
  when?: (L: LifeState, M: MetaState) => boolean;
  weight?: number;
  repeat?: boolean; // 默认抉择每世一次
  fatal?: { chance: number; cause: string };
}

const ev = (e: LifeEvent) => e;

// ---------- 新增抉择（内容库 30 条首稿） ----------
export const CHOICES: LifeEvent[] = [
  ev({ id: 'C-家宅-1', locs: ['home'], kind: 'choice', text: '父亲病重，家里只够一人读书。', options: [
    { label: '让给弟弟', desc: '悟性 -1，功德 +30', eff: { attr: { wu: -1 }, merit: 30, trace: 'kind_heart' } },
    { label: '自己读', desc: '悟性 +1，家境 -1', eff: { attr: { wu: 1, fam: -1 } } },
  ] }),
  ev({ id: 'C-家宅-2', locs: ['home'], kind: 'choice', text: '地窖里挖出一块墨色石头。', options: [
    { label: '交给乡里道士', desc: '灵石 +20', eff: { stones: 20 } },
    { label: '自己藏着', desc: '日后得一次古卷灵感，沾染墨气', eff: { inspire: 1, trace: 'ink_touched' } },
  ] }),
  ev({ id: 'C-学堂-1', locs: ['school'], kind: 'choice', text: '先生说你字里有剑意。', options: [
    { label: '练字', desc: '剑修道途 +10', eff: { school: { sword: 10 } } },
    { label: '学算术', desc: '家境 +1', eff: { attr: { fam: 1 } } },
    { label: '逃学去河边', desc: '下一年必发河畔卡', eff: { nextLoc: 'river' } },
  ] }),
  ev({ id: 'C-学堂-2', locs: ['school'], kind: 'choice', text: '同窗作弊被抓，嫁祸于你。', options: [
    { label: '认下', desc: '科举无望，他欠你一个人情', eff: { favor: 1, flag: 'noExam' } },
    { label: '揭发', desc: '结仇', eff: { grudge: true } },
  ] }),
  ev({ id: 'C-市集-1', locs: ['market'], kind: 'choice', text: '游方道人卖「仙人骨」。', options: [
    { label: '买', desc: '灵石 30，四成根骨 +2', eff: { stones: -30 }, chance: { p: 0.4, ok: { attr: { gen: 2 }, text: '骨头入腹，浑身发热。真是仙人骨。' }, fail: { text: '后来才知道，那是一块狗骨。' } }, when: (L) => L.stones >= 30 },
    { label: '拆穿他', desc: '气运 +1', eff: { attr: { luck: 1 } } },
  ] }),
  ev({ id: 'C-市集-2', locs: ['market'], kind: 'choice', text: '铁匠铺缺学徒。', options: [
    { label: '拜师三年', desc: '年龄 +3，根骨 +1，体修道途 +10', eff: { age: 3, attr: { gen: 1 }, school: { body: 10 } } },
    { label: '不去', eff: {} },
  ] }),
  ev({ id: 'C-邻里-1', locs: ['neighbor'], kind: 'choice', text: '邻家小女孩的风筝挂在树上。', options: [
    { label: '爬树去取', desc: '根骨判定，失败摔伤', roll: { attr: 'gen', dc: 5, ok: { merit: 10, text: '你把风筝递给她，她笑得很好看。' }, fail: { injure: 2, text: '你从树上摔下来，躺了好些日子。' } } },
    { label: '叫大人', eff: { text: '大人来了，风筝取下了。' } },
  ] }),
  ev({ id: 'C-邻里-2', locs: ['neighbor'], kind: 'choice', text: '乡里约你一同去抢另一村的水。', options: [
    { label: '去', desc: '结仇，家境 +1', eff: { grudge: true, attr: { fam: 1 } } },
    { label: '劝和', desc: '功德 +20，悟性判定', roll: { attr: 'wu', dc: 6, ok: { merit: 20, text: '两村坐下来分了水。' }, fail: { merit: 5, text: '没人听你的，但你尽力了。' } } },
  ] }),
  ev({ id: 'C-河畔-1', locs: ['river'], kind: 'choice', text: '水中有人呼救。', options: [
    { label: '下水救', desc: '根骨判定，失败溺水致死', roll: { attr: 'gen', dc: 6, ok: { merit: 40, trace: 'kind_heart', flag: 'saved', text: '你把人拖上了岸。' }, fail: { die: '溺水早夭' } } },
    { label: '抛绳', desc: '气运判定', roll: { attr: 'luck', dc: 5, ok: { merit: 25, flag: 'saved', text: '绳子刚好够长。' }, fail: { text: '绳子短了一截，人没救上来。' } } },
    { label: '跑去叫人', eff: { text: '你跑回村里，等人赶来，已经来不及了。' } },
  ], eff: { trace: 'river' } }),
  ev({ id: 'C-河畔-2', locs: ['river'], kind: 'choice', text: '一个老渔夫说河里有河伯。', options: [
    { label: '信他', desc: '河伯隐藏线计数 +1', eff: { hebo: 1, trace: 'river' } },
    { label: '不信', eff: {} },
  ] }),
  ev({ id: 'C-官道-1', locs: ['road'], kind: 'choice', text: '商队招护卫，路上有匪。', options: [
    { label: '应聘', desc: '灵石 +40，匪患致死率 ×2', eff: { stones: 40, flag: 'escort' } },
    { label: '不去', eff: {} },
  ] }),
  ev({ id: 'C-官道-2', locs: ['road'], kind: 'choice', text: '征兵的人点到你家。', options: [
    { label: '自己去', desc: '从军线，九死一生', roll: { attr: 'gen', dc: 6, ok: { trace: 'soldier', age: 3, attr: { gen: 1 }, text: '三年后，你从边关活着回来了。' }, fail: { die: '战死沙场' } } },
    { label: '花钱顶替', desc: '家境 -2', eff: { attr: { fam: -2 } } },
    { label: '逃役', desc: '三年不发官道卡，结仇', eff: { banLoc: { loc: 'road', years: 3 }, grudge: true } },
  ] }),
  ev({ id: 'C-病榻-1', locs: ['sickbed'], kind: 'choice', text: '郎中说有一味禁药可以根治。', options: [
    { label: '用', desc: '根骨 +2，寿元 -5', eff: { attr: { gen: 2 }, life: -5, flag: 'cured' } },
    { label: '不用', desc: '体弱维持', eff: {} },
  ] }),
  ev({ id: 'C-庙会-1', locs: ['fair'], kind: 'choice', text: '一个盲眼老妇人给你算命。', options: [
    { label: '问前程', desc: '本世再摇 +1', eff: { again: 1, text: '她摸了摸你的手心：「你这一辈子，总还有一次重来的机会。」' } },
    { label: '问前世', eff: { text: '她摇摇头：「不必问，你会见到我的。」' } },
  ] }),
  ev({ id: 'C-仙踪-1', locs: ['trace'], kind: 'choice', text: '山里一把偶然落下的仙人佩剑。', options: [
    { label: '等主人回来', desc: '年龄 +2，必得仙缘', eff: { age: 2, flag: 'forceCall' } },
    { label: '打磨自己用', desc: '飞剑起步多一阶', eff: { flag: 'swordStart', school: { sword: 5 } } },
  ] }),
  ev({ id: 'C-洞府-1', locs: ['cave'], kind: 'choice', text: '闭关到一半，山下传来家乡的消息。', options: [
    { label: '破关下山', desc: '修为 -10%，功德 +40', eff: { xpPct: -10, merit: 40 } },
    { label: '继续闭关', desc: '修为 +10%', eff: { xpPct: 10 } },
  ] }),
  ev({ id: 'C-洞府-2', locs: ['cave'], kind: 'choice', text: '洞府石壁上浮现前人剑痕。', options: [
    { label: '参悟', desc: '额外流逝一回合，剑法 +1 层', eff: { age: 1, skill: 'sword', school: { sword: 10 } } },
    { label: '抹去', eff: {} },
  ] }),
  ev({ id: 'C-静室-1', locs: ['quiet'], kind: 'choice', text: '暗伤里长出一丝墨。', options: [
    { label: '强行拔除', desc: '气血上限 -10，暗伤清空', eff: { hpMax: -10, injure: -99 } },
    { label: '以墨养墨', desc: '魔修道途 +20', eff: { school: { demon: 20 }, trace: 'ink_touched', skill: 'ink' } },
  ] }),
  ev({ id: 'C-宗门-1', locs: ['sect'], kind: 'choice', text: '剑宗长老请你守剑冢十年。', options: [
    { label: '入剑冢', desc: '寿元 -10，剑修 +25', eff: { life: -10, school: { sword: 25 }, trace: 'sword_tomb', skill: 'sword' } },
    { label: '借剑经一观', desc: '灵石 40，修为 +8%', eff: { stones: -40, xpPct: 8 }, when: (L) => L.stones >= 40 },
    { label: '婉拒', eff: {} },
  ] }),
  ev({ id: 'C-宗门-2', locs: ['sect'], kind: 'choice', text: '掌门之位空缺，你和师兄二选一。', options: [
    { label: '争', desc: '斗法，胜则为掌门', eff: { battle: { kind: 'duel', title: '掌门之争', elites: 2 }, flag: 'headWin' } },
    { label: '让', desc: '人情 +2', eff: { favor: 2 } },
  ] }),
  ev({ id: 'C-云游-1', locs: ['roam'], kind: 'choice', text: '散修朋友邀你合伙探一处古墨。', options: [
    { label: '合伙', desc: '秘境劫难，奖励 ×1.5', eff: { battle: { kind: 'beast', title: '古墨秘境', reward: 1.5 } } },
    { label: '独吞', desc: '结仇，灵石 +60', eff: { grudge: true, stones: 60 } },
    { label: '不去', eff: {} },
  ] }),
  ev({ id: 'C-坊市-1', locs: ['bazaar'], kind: 'choice', text: '有人收购寿元，一年换 15 灵石。', options: [
    { label: '卖 10 年', desc: '灵石 +150，寿元 -10', eff: { stones: 150, life: -10, trace: 'life_borrowed' } },
    { label: '举报', desc: '功德 +30，结仇', eff: { merit: 30, grudge: true } },
    { label: '走开', eff: {} },
  ] }),
  ev({ id: 'C-路口-1', locs: ['cross'], kind: 'choice', text: '一位凡人女子求你带她入道。', options: [
    { label: '收为弟子', desc: '弟子 +1', eff: { disciple: 1 } },
    { label: '结为道侣', desc: '道侣参战', eff: { partner: true } },
    { label: '拒绝', eff: {} },
  ] }),
  ev({ id: 'C-路口-2', locs: ['cross'], kind: 'choice', text: '你的凡间亲人寿终，家书迟来三年。', options: [
    { label: '回乡祭拜', desc: '功德 +30', eff: { merit: 30, trace: 'hometown', age: 1 } },
    { label: '继续修行', desc: '修为 +5%', eff: { xpPct: 5 } },
  ] }),
  ev({ id: 'C-机缘-1', locs: ['fortune'], kind: 'choice', text: '山洞里一幅未完的画，画中人长着你的脸。', when: (_L, M) => M.saga.volume >= 2, options: [
    { label: '补完它', desc: '古卷灵感 +1', eff: { inspire: 1, school: { rune: 10 } } },
    { label: '烧掉', desc: '修为 +5%', eff: { xpPct: 5 } },
  ] }),
  ev({ id: 'C-机缘-2', locs: ['fortune'], kind: 'choice', text: '一只墨鸦叼来一枚断笔。', options: [
    { label: '收下', desc: '符修 +15', eff: { trace: 'crow_omen', school: { rune: 15 } } },
    { label: '赶走', eff: {} },
  ] }),
  ev({ id: 'C-妖林-1', locs: ['forest'], kind: 'choice', text: '一窝小妖躲在树洞里。', options: [
    { label: '斩草除根', desc: '修为 +3%，杀生', eff: { xpPct: 3, kill: true } },
    { label: '放过', desc: '功德 +10', eff: { merit: 10 } },
  ] }),
  ev({ id: 'C-秘境-1', locs: ['realm'], kind: 'choice', text: '秘境入口只容一人。', options: [
    { label: '独入', desc: '下一年必遇秘境劫难', eff: { nextLoc: 'realm', flag: 'realmLock' } },
    { label: '让给同道', desc: '人情 +1', eff: { favor: 1 } },
  ] }),
  ev({ id: 'C-魔域-1', locs: ['demon'], kind: 'choice', text: '魔修孩童向你乞讨。', options: [
    { label: '施舍', desc: '灵石 -10，赤衣进度 +1', eff: { stones: -10, flag: 'chiyiAlms' } },
    { label: '带回宗门', desc: '弟子 +1，正道生疑', eff: { disciple: 1, trace: 'demon_ally' } },
    { label: '不理', eff: {} },
  ] }),
  ev({ id: 'C-魔域-2', locs: ['demon'], kind: 'choice', text: '一口墨井，井底有人喊你的名字。', options: [
    { label: '跳下去', desc: '当场陨落', eff: { die: '坠入墨井', epitaph: '井中人' } },
    { label: '封住它', desc: '功德 +60', eff: { merit: 60 } },
  ] }),
];

// ---------- 流水账、致命意外与杂项抉择 ----------
export const FLAVORS: LifeEvent[] = [
  ev({ id: 'f-home1', locs: ['home'], kind: 'flavor', text: '帮家里收了一季稻子，娘夸你能干。', eff: { stones: 3 }, repeat: true }),
  ev({ id: 'f-home2', locs: ['home'], kind: 'flavor', text: '在院子里看了一夜星星。', repeat: true }),
  ev({ id: 'f-home3', locs: ['home'], kind: 'flavor', text: '家里添了一头小牛。', eff: { stones: 5 }, repeat: true }),
  ev({ id: 'f-school1', locs: ['school'], kind: 'flavor', text: '先生讲《山海经》，你听得入迷。', eff: { attr: { wu: 1 } } }),
  ev({ id: 'f-school2', locs: ['school'], kind: 'flavor', text: '背书背到深夜，灯油用尽。', repeat: true }),
  ev({ id: 'f-exam', locs: ['school'], kind: 'choice', text: '州府开科取士。', when: (L) => L.age >= 14 && !L.flags.noExam, options: [
    { label: '赴考', desc: '悟性判定', roll: { attr: 'wu', dc: 7, ok: { trace: 'scholar', stones: 30, attr: { fam: 1 }, text: '榜上有名，乡里敲锣送匾。' }, fail: { text: '名落孙山。' } } },
    { label: '不考', eff: {} },
  ] }),
  ev({ id: 'f-market1', locs: ['market'], kind: 'flavor', text: '在市集上看了一出皮影戏。', repeat: true }),
  ev({ id: 'f-market2', locs: ['market'], kind: 'flavor', text: '捡到几枚铜钱，换了一串糖葫芦。', eff: { stones: 1 }, repeat: true }),
  ev({ id: 'f-gamble', locs: ['market'], kind: 'choice', text: '赌坊里有人吆喝你押一把。', repeat: true, options: [
    { label: '押上 10 灵石', desc: '气运判定', when: (L) => L.stones >= 10, roll: { attr: 'luck', dc: 7, ok: { stones: 20, flag: 'gambleWin', text: '骰子开出满堂红。' }, fail: { stones: -10, text: '输得精光。' } } },
    { label: '走开', eff: {} },
  ] }),
  ev({ id: 'f-neighbor1', locs: ['neighbor'], kind: 'flavor', text: '帮隔壁阿婆修好了篱笆。', eff: { merit: 5 }, repeat: true }),
  ev({ id: 'f-neighbor2', locs: ['neighbor'], kind: 'flavor', text: '街坊的孩子们追着你喊哥哥。', repeat: true }),
  ev({ id: 'f-river1', locs: ['river'], kind: 'flavor', text: '在河边摸了一下午鱼。', repeat: true, eff: { trace: 'river' } }),
  ev({ id: 'x-drown', locs: ['river'], kind: 'fatal', text: '夏日涨水，你在河里游得太远。', fatal: { chance: 0.35, cause: '溺水早夭' }, repeat: true }),
  ev({ id: 'f-road1', locs: ['road'], kind: 'flavor', text: '跟着货郎走了一趟县城。', eff: { stones: 4 }, repeat: true }),
  ev({ id: 'f-dojo', locs: ['road'], kind: 'choice', text: '路边武馆招弟子。', options: [
    { label: '习武', desc: '根骨 +1，体修 +10', eff: { attr: { gen: 1 }, school: { body: 10 } } },
    { label: '不去', eff: {} },
  ] }),
  ev({ id: 'x-bandit', locs: ['road'], kind: 'fatal', text: '官道上遇到一伙山匪。', fatal: { chance: 0.3, cause: '死于匪患' }, repeat: true }),
  ev({ id: 'f-sick1', locs: ['sickbed'], kind: 'flavor', text: '风寒卧床一月，总算熬了过来。', repeat: true }),
  ev({ id: 'x-plague', locs: ['sickbed'], kind: 'fatal', text: '城里起了瘟疫。', fatal: { chance: 0.35, cause: '死于瘟疫' }, repeat: true }),
  ev({ id: 'f-fair1', locs: ['fair'], kind: 'flavor', text: '庙会上求了一支上上签。', eff: { reroll: 1 }, repeat: true }),
  ev({ id: 'f-dice1', locs: ['market', 'neighbor'], kind: 'flavor', text: '货郎把一枚磨圆了角的旧骰子塞给你：「手气不好时，再摇一把。」（本世再摇 +1）', eff: { again: 1 } }),
  ev({ id: 'f-trace1', locs: ['trace'], kind: 'flavor', text: '你在山里看见一道剑光划过天边。', eff: { flag: 'extraCall' }, repeat: true }),
  // 修士
  ev({ id: 'f-cave1', locs: ['cave'], kind: 'flavor', text: '闭关一回合，修为精进。', eff: { xpPct: 3 }, repeat: true }),
  ev({ id: 'f-cave2', locs: ['cave'], kind: 'flavor', text: '洞府外的松树又高了一截。闭关无事。', eff: { xpPct: 3 }, repeat: true }),
  ev({ id: 'f-quiet1', locs: ['quiet'], kind: 'flavor', text: '静坐调息，旧伤渐愈。', eff: { injure: -1, xpPct: 1 }, repeat: true }),
  ev({ id: 'f-sect1', locs: ['sect'], kind: 'flavor', text: '宗门分派了一桩差事，你办得妥帖。', eff: { stones: 15, favor: 1 }, repeat: true }),
  // 宗门大比十五年一届
  ev({ id: 'f-tourney', locs: ['sect'], kind: 'choice', text: '宗门大比开锣。', repeat: true, when: (L) => L.age - (L.flags.tourneyAt ?? -99) >= 15, options: [
    { label: '参加', desc: '斗法，胜则灵石与修为', eff: { fate: { tag: 'tourneyAt' }, battle: { kind: 'duel', title: '宗门大比', elites: 2 } } },
    { label: '观战', desc: '修为 +2%', eff: { xpPct: 2, fate: { tag: 'tourneyAt' } } },
  ] }),
  ev({ id: 'f-roam1', locs: ['roam'], kind: 'flavor', text: '云游至一处古渡，与散修论道一夜。', eff: { xpPct: 3, stones: 8 }, repeat: true }),
  ev({ id: 'f-roam2', locs: ['roam'], kind: 'flavor', text: '你在雪山脚下住了一阵。', eff: { trace: 'snowfield', xpPct: 2 }, repeat: true }),
  ev({ id: 'f-bazaar1', locs: ['bazaar'], kind: 'flavor', text: '在坊市听人说起天门的旧闻。', repeat: true }),
  ev({ id: 'f-cross1', locs: ['cross'], kind: 'flavor', text: '在人生路口站了很久，最后还是回了洞府。', eff: { xpPct: 2 }, repeat: true }),
  ev({ id: 'f-pact', locs: ['cross', 'fortune'], kind: 'choice', text: '一卷古契在你面前展开：借寿燃法，以命换威。', options: [
    { label: '签下', desc: '寿元 -20，得自创道法', eff: { life: -20, trace: 'life_borrowed', skill: 'art' } },
    { label: '以血为引', desc: '气血上限 -15，剑法 +1 层', eff: { hpMax: -15, trace: 'blood_pact', skill: 'sword' } },
    { label: '合上', eff: {} },
  ] }),
  ev({ id: 'f-forest1', locs: ['forest'], kind: 'flavor', text: '妖林里只见妖踪，未见妖物。拾得几株灵草。', eff: { xpPct: 2, stones: 6 }, repeat: true }),
  ev({ id: 'f-realm1', locs: ['realm'], kind: 'flavor', text: '秘境门户紧闭，你在门前悟了一道禁制。', eff: { xpPct: 3 }, repeat: true }),
  ev({ id: 'f-demon1', locs: ['demon'], kind: 'flavor', text: '魔域的天是墨色的。你在边缘走了一圈。', eff: { trace: 'ink_touched' }, repeat: true }),
  ev({ id: 'f-rift1', locs: ['rift'], kind: 'flavor', text: '裂隙那头吹来一阵风，带着纸的气味。', eff: { trace: 'rift', xpPct: 4 }, repeat: true }),
];

// ---------- 奇遇（机缘地点） ----------
export const ENCOUNTERS: LifeEvent[] = [
  ev({ id: 'q-scroll', locs: ['fortune', 'roam'], kind: 'choice', text: '你在一处残碑下拾得一卷「无名古卷」，卷上空白，笔意流转。', when: (L) => L.realm >= 2 && L.inspire > 0 && !L.flags.artMade, options: [
    { label: '以笔意炼法', desc: '灵感 1、灵石 40：炼成一门自创道法', when: (L) => L.stones >= 40, eff: { inspire: -1, stones: -40, skill: 'art', flag: 'artMade', school: { rune: 15 } } },
    { label: '暂不炼成', eff: {} },
  ] }),
  ev({ id: 'q-herb', locs: ['fortune', 'roam'], kind: 'flavor', text: '悬崖上一株百年灵芝，你小心采下。', eff: { life: 8, xpPct: 4 }, repeat: true }),
  ev({ id: 'q-tomb', locs: ['fortune'], kind: 'choice', text: '一座古修士的坐化洞府。', options: [
    { label: '叩拜后取宝', desc: '得一门功法（已会则 +1 层）', eff: { skill: 'orbit', merit: 5 } },
    { label: '直接搜刮', desc: '灵石 +80，结仇', eff: { stones: 80, grudge: true } },
  ] }),
  ev({ id: 'q-thunderwood', locs: ['fortune', 'roam'], kind: 'flavor', text: '雷击木上残留着天雷之力，你从焦纹里读出《掌心雷》的法门。', eff: { skill: 'thunder' } }),
  ev({ id: 'q-firefeather', locs: ['fortune', 'roam'], kind: 'flavor', text: '火山口落下一枚赤羽，羽上烙着《离火诀》。', eff: { skill: 'fire', school: { alchemy: 5 } } }),
  ev({ id: 'q-ice', locs: ['fortune', 'roam'], kind: 'flavor', text: '太虚雪原深处，冰壁上刻着半部《玄冰指》。', eff: { skill: 'frost', trace: 'snowfield' } }),
  // 修炼与法宝：附诀、法宝、残页、心得
  ev({ id: 'q-fujue', locs: ['fortune', 'roam'], kind: 'flavor', text: '崖壁上刻着半篇口诀，不是功法，是功法的「用法」。你记下了。', eff: { fujue: true }, repeat: true, weight: 0.8 }),
  ev({ id: 'q-fujue-sect', locs: ['sect'], kind: 'flavor', text: '师兄喝多了，把一枚附诀写在你掌心，第二天他什么也不记得。', eff: { fujue: true }, repeat: true, weight: 0.8 }),
  ev({ id: 'q-trinket', locs: ['bazaar', 'roam'], kind: 'flavor', text: '散修收摊前，用一件小法宝换了你半壶酒。', eff: { item: '?' }, repeat: true, weight: 0.8 }),
  ev({ id: 'q-canye', locs: ['fortune', 'realm'], kind: 'flavor', text: '古洞石匣里压着一页残缺的功法，恰好补上你那门功法缺的一角。', eff: { canye: true }, repeat: true, weight: 0.5 }),
  ev({ id: 'q-xinde', locs: ['quiet', 'cave'], kind: 'flavor', text: '静坐一夜，把这些年打过的仗在心里又过了一遍。', eff: { xinde: 2, xpPct: 2 }, repeat: true }),
  ev({ id: 'q-crow', locs: ['fortune'], kind: 'flavor', text: '一群墨鸦绕着你飞了三圈才散去。', eff: { trace: 'crow_omen' } }),
  ev({ id: 'q-bonedie', locs: ['fortune', 'roam'], kind: 'flavor', text: '一位老散修临别送你一枚骨骰，说它记得每一次重来。（本世再摇 +2）', eff: { again: 2 } }),
  ev({ id: 'q-pill', locs: ['fortune', 'bazaar'], kind: 'flavor', text: '路遇丹师赠你一炉筑基丹的药渣，仍有余力。', eff: { xpPct: 6 }, repeat: true }),
  ev({ id: 'q-rift', locs: ['rift'], kind: 'flavor', text: '画外裂隙边，你看见一截断笔浮在空中，伸手却抓不住。', eff: { xpPct: 6, trace: 'rift' }, repeat: true }),
];

export const NOTHING_MORTAL = ['这一年平平淡淡地过去了。', '日子一天天过，没什么可记的。', '春去秋来，又是一年。'];
export const NOTHING_CULT = ['闭关无事。', '山中无甲子，又是一回合。', '修行如常。'];

// 劫难标题
export const BATTLE_TITLES: Record<string, string[]> = {
  forest: ['妖兽下山', '妖林兽潮', '墨影围山'],
  realm: ['秘境兽潮', '古阵异动'],
  demon: ['魔修截杀', '魔域斗法'],
  gate: ['天门前哨'],
};
