// 事件库扩充·即时奇遇：修士地点（上半：洞府、静室、宗门、云游、坊市、人生路口、机缘）
import type { LifeEvent } from './events';
import { need } from './chain-types';

const ev = (e: LifeEvent) => e;
const hasGain = (id: string) => (L: { gains?: { id: string }[] }) => !!L.gains?.some((g) => g.id === id);
const ROAM = ['sect', 'roam'];

export const ENC_CULT_A: LifeEvent[] = [
  // ---------- 洞府 ----------
  ev({ id: 'C-洞府-4', locs: ['cave'], kind: 'choice', sort: '即时',
    text: '你闭关醒来，洞口的石门上多了一行指甲划的字：「这里是我的。」',
    options: [
      { label: '搬走', desc: '换一处洞府，修为 +1%', eff: { xpPct: 1, text: '你换了一处洞府。' } },
      { label: '留一行字回去', eff: { flag: 'cave_reply', echo: { text: '洞口的石门上，有人回了你一行字。', laps: 2 } } },
    ] }),
  ev({ id: 'C-洞府-5', locs: ['cave'], kind: 'choice', sort: '直得', when: need({ realm: 2 }),
    text: '洞府深处有一具盘坐的枯骨，膝上摆着一枚戒指。',
    options: [
      { label: '磕三个头再取', desc: '得储物戒（行囊格 +2），功德 +5', eff: { merit: 5, gain: { id: 'keep', name: '储物戒', desc: '行囊格 +2' } } },
      { label: '直接取', desc: '得储物戒（行囊格 +2），本世夜里的劫难伤害 +10%', eff: { flag: 'night_harm', gain: { id: 'keep', name: '储物戒', desc: '行囊格 +2' }, text: '戒指入手时，枯骨的头偏了一偏。' } },
      { label: '原样封好' },
    ] }),
  ev({ id: 'C-洞府-6', locs: ['cave'], kind: 'choice', sort: '余波',
    text: '你把洞府布成了「苟」字诀：三重阵、一道假门、一间假静室。',
    options: [
      { label: '继续加固', desc: '灵石 -40，本世洞府不会被劫', when: need({ stones: 40 }), eff: { stones: -40, flag: 'cave_safe' } },
      { label: '够用了', eff: { flag: 'hide', echo: { text: '宿敌找到你的洞府，进了假门，扑了个空。', laps: 3 } } },
    ] }),
  ev({ id: 'C-洞府-7', locs: ['cave'], kind: 'choice', sort: '即时',
    text: '一只松鼠每天来偷你的灵果。',
    options: [
      { label: '设陷阱抓它', desc: '得一只松鼠', eff: { gain: { id: 'keep', name: '松鼠', desc: '没用' } } },
      { label: '分它一颗', desc: '气运 +1', eff: { attr: { luck: 1 } } },
      { label: '不管', desc: '灵石 -5', eff: { stones: -5 } },
    ] }),
  ev({ id: 'C-洞府-8', locs: ['cave'], kind: 'choice', sort: '直得', when: need({ realm: 3 }),
    text: '地脉里涌上来一股灵泉，正好在你床底下。',
    options: [
      { label: '开成灵眼', desc: '灵眼：停洞府修为 +10%', eff: { gain: { id: 'dongtian', name: '灵眼', desc: '停洞府修为 +10%，可种一株灵药', lv: 1, xp: 0.1 } } },
      { label: '一口喝干', desc: '修为 +8%，根骨 +1', eff: { xpPct: 8, attr: { gen: 1 } } },
    ] }),
  ev({ id: 'C-洞府-9', locs: ['cave'], kind: 'choice', sort: '余波', when: (L) => L.disciples > 0,
    text: '弟子在洞府外跪了三天，说想下山娶亲。',
    options: [
      { label: '准了', desc: '「恩」故人', eff: { acq: { role: '下山娶亲的弟子', relation: 'favor' }, text: '他磕了三个头下山去了。下一世，你们会以凡人身份再遇。' } },
      { label: '不准', desc: '三年后叛出，结仇', eff: { text: '他留了下来，修为一日千里。', echo: { text: '那个想下山娶亲的弟子叛出了师门。', eff: { grudge: true, disciple: -1 }, laps: 3 } } },
    ] }),
  ev({ id: 'C-洞府-10', locs: ['cave'], kind: 'choice', sort: '即时',
    text: '闭关时你听见隔壁洞府有人在哭，哭了整整一年。',
    options: [
      { label: '去敲门', desc: '人情 +1，得一份丹方（丹修道途 +5）', eff: { favor: 1, school: { alchemy: 5 } } },
      { label: '加一层隔音阵', desc: '灵石 -10', when: need({ stones: 10 }), eff: { stones: -10 } },
    ] }),
  ev({ id: 'C-洞府-11', locs: ['cave'], kind: 'choice', sort: '直得', when: hasGain('elder'),
    text: '前辈说：「你这洞府风水不好，我教你挪一挪。」',
    options: [
      { label: '照做', desc: '闭关修为 +15%', eff: { xpPct: 15, text: '前辈哼了一声，听得出很满意。' } },
      { label: '不信', eff: { text: '前辈不说话了，好几天没理你。' } },
    ] }),
  ev({ id: 'C-洞府-12', locs: ['cave'], kind: 'choice', sort: '余波', when: need({ realm: 4 }),
    text: '一群小修士在你山脚下搭棚子，说想沾沾仙气。',
    options: [
      { label: '收留', eff: { flag: 'village', echo: { text: '山脚下的棚子连成了一片，渐渐成了村落。下一世，你可能就生在这里。', laps: 3 } } },
      { label: '赶走' },
    ] }),
  ev({ id: 'C-洞府-13', locs: ['cave'], kind: 'choice', sort: '即时',
    text: '你在洞壁上刻了一幅自己的像，越刻越不像自己。',
    options: [
      { label: '刻完', desc: '沾染墨气，悟性 +1', eff: { trace: 'ink_touched', attr: { wu: 1 } } },
      { label: '磨掉' },
    ] }),

  // ---------- 静室 ----------
  ev({ id: 'C-静室-4', locs: ['quiet'], kind: 'choice', sort: '直得', when: need({ realm: 3 }),
    text: '入定时你分出了一缕神念，它睁开眼看着你。',
    options: [
      { label: '让它留下', desc: '化身：本世多一个伙伴位', eff: { gain: { id: 'clone', name: '化身', desc: '参战伙伴；化身死了你暗伤 +2', ally: true } } },
      { label: '收回', desc: '修为 +5%', eff: { xpPct: 5 } },
    ] }),
  ev({ id: 'C-静室-5', locs: ['quiet'], kind: 'choice', sort: '即时',
    text: '心魔化成你娘的样子，坐在你对面不说话。',
    options: [
      { label: '跟她说话', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { xpPct: 6, text: '心魔破了。' }, fail: { injure: 1, text: '她始终不说话，你吐了一口血。' } } },
      { label: '闭眼' },
    ] }),
  ev({ id: 'C-静室-6', locs: ['quiet'], kind: 'choice', sort: '余波',
    text: '你梦见自己在另一个世界上班，每天挤一种叫地铁的东西。',
    options: [
      { label: '记下来', desc: '宿慧 +10', eff: { insight: 10, flag: 'dream', chain: { id: 'YG05', op: 'start', yuan: 1, mark: 'dream' } } },
      { label: '忘掉' },
    ] }),
  ev({ id: 'C-静室-7', locs: ['quiet'], kind: 'choice', sort: '即时', when: need({ realm: 2 }),
    text: '功法练到一半卡住了，经脉里有一处始终不通。',
    options: [
      { label: '硬冲', desc: '修为 +10%，暗伤 +1', eff: { xpPct: 10, injure: 1 } },
      { label: '换一条路绕过去', desc: '修为 +4%', eff: { xpPct: 4 } },
      { label: '去问师门', desc: '人情 -1，修为 +6%', eff: { favor: -1, xpPct: 6 } },
    ] }),
  ev({ id: 'C-静室-8', locs: ['quiet'], kind: 'choice', sort: '直得', when: (L) => L.attrs.wu >= 7,
    text: '你把三门功法的心法捏到一起，竟然成了一门新的。',
    options: [
      { label: '定下来', desc: '得一门自创功法', eff: { skill: 'art', text: '阶位取三门里最高的那门降一阶，带一个附诀位。' } },
      { label: '拆回去' },
    ] }),
  ev({ id: 'C-静室-9', locs: ['quiet'], kind: 'choice', sort: '余波', when: need({ partner: true }),
    text: '道侣问你要不要一起双修闭关。',
    options: [
      { label: '一起', desc: '修为 +12%', eff: { xpPct: 12, flag: 'bond' } },
      { label: '婉拒', eff: { text: '道侣没说什么，只是那几天话少了。' } },
    ] }),
  ev({ id: 'C-静室-10', locs: ['quiet'], kind: 'choice', sort: '即时',
    text: '你听见识海深处有人在敲门。',
    options: [
      { label: '开门', eff: { flag: 'mind_door', text: '门开了，门外站着一位老者。' } },
      { label: '封死', desc: '悟性 -1', eff: { attr: { wu: -1 }, flag: 'mind_sealed', text: '敲门声从此不再响了。' } },
    ] }),
  ev({ id: 'C-静室-11', locs: ['quiet'], kind: 'choice', sort: '直得', when: need({ flag: 'mind_door' }),
    text: '识海里住进了一位老者，说是你上辈子欠他一条命，借你身子住几年。',
    options: [
      { label: '答应', desc: '随身前辈：判定 +1', eff: { gain: { id: 'elder', name: '识海老者', desc: '判定前可问他，判定 +1；好感太低时会夺舍', roll: 1 } } },
      { label: '跟他斗', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { xpPct: 15, text: '你吞了他的残魂。' }, fail: { injure: 1, text: '他把你赶出了自己的识海一角。' } } },
    ] }),
  ev({ id: 'C-静室-12', locs: ['quiet'], kind: 'choice', sort: '即时', when: need({ realm: 4 }),
    text: '你在静室里悟到一个字。',
    options: [
      { label: '写下来', desc: '本命字升一级', eff: { flag: 'benming_zi', text: '本命字升了一级；没有本命字的，得了一个。' } },
      { label: '不写，记在心里', desc: '悟性 +1', eff: { attr: { wu: 1 } } },
    ] }),
  ev({ id: 'C-静室-13', locs: ['quiet'], kind: 'choice', sort: '余波', when: (L) => L.route === 'sect',
    text: '出关时外面已经变了天，你的宗门换了掌门。',
    options: [
      { label: '去拜新掌门', desc: '宗门贡献保留', eff: { text: '新掌门受了你的礼，你的贡献一分没少。' } },
      { label: '不认', desc: '结仇：新掌门', eff: { grudge: true, flag: 'old_guard', echo: { text: '几位老派长老暗中递来消息，帮你避过一劫。', eff: { favor: 1 }, laps: 3 } } },
    ] }),

  // ---------- 宗门 ----------
  ev({ id: 'C-宗门-5', locs: ['sect'], kind: 'choice', sort: '即时', when: (L) => L.realm <= 1,
    text: '外门大比，你抽到了内门长老的孙子。',
    options: [
      { label: '全力打', desc: '斗法：长老的孙子', eff: { battle: { kind: 'duel', title: '长老的孙子', elites: 1, cultOnly: true, win: { grudge: true, merit: 15, text: '你赢了，也得罪了人。宗门贡献 +30。' } } } },
      { label: '认输', desc: '人情 +1', eff: { favor: 1, text: '长老记了你一个人情。' } },
      { label: '藏锋只赢半招', desc: '功德 +5', eff: { merit: 5, flag: 'hide', text: '藏锋：宗门贡献 +10。' } },
    ] }),
  ev({ id: 'C-宗门-6', locs: ['sect'], kind: 'choice', sort: '直得',
    text: '藏经阁最底层，一卷没编号的残卷落在你脚边。',
    options: [
      { label: '抄回去', desc: '功法残页', eff: { canye: true, flag: 'scroll_half', text: '是一卷玄阶残卷，补全要再遇一次藏经阁。' } },
      { label: '交给执事', desc: '功德 +10', eff: { merit: 10, text: '宗门贡献 +20。' } },
    ] }),
  ev({ id: 'C-宗门-7', locs: ['sect'], kind: 'choice', sort: '余波',
    text: '师兄让你帮他顶一次巡山的班。',
    options: [
      { label: '顶', desc: '人情 +1，下一回去巡山（妖林）', eff: { favor: 1, nextLoc: 'forest' } },
      { label: '推了' },
    ] }),
  ev({ id: 'C-宗门-8', locs: ['sect'], kind: 'choice', sort: '即时', when: need({ realm: 2 }),
    text: '掌门考校弟子，问：「何为道？」',
    options: [
      { label: '「吃饭睡觉。」', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { xpPct: 8, text: '掌门赐你一颗丹。' }, fail: { text: '掌门摇了摇头。' } } },
      { label: '背经文', desc: '功德 +5', eff: { merit: 5, text: '宗门贡献 +10。' } },
      { label: '反问掌门', eff: { flag: 'noticed', text: '掌门笑了。' } },
    ] }),
  ev({ id: 'C-宗门-9', locs: ['sect'], kind: 'choice', sort: '直得', when: (L) => L.favor >= 2,
    text: '宗门分配洞府，剩下最后一间据说闹鬼。',
    options: [
      { label: '要了', desc: '鬼伴：一个不肯走的前任弟子', eff: { gain: { id: 'ghost', name: '前任弟子', desc: '参战伙伴，按命灯 2 级；夜里的劫难伤害 +15%', ally: true, lv: 2 } } },
      { label: '等下一批' },
    ] }),
  ev({ id: 'C-宗门-10', locs: ['sect'], kind: 'choice', sort: '余波',
    text: '你发现宗门的护山大阵有个破绽。',
    options: [
      { label: '上报', desc: '人情 +1', eff: { favor: 1, text: '宗门贡献 +40。' } },
      { label: '自己留着', eff: { flag: 'backdoor', text: '宗门被围那年，你可以带人从破绽逃出去。' } },
      { label: '卖给魔道', desc: '灵石 +200，魔修道途 +10，结仇', eff: { stones: 200, school: { demon: 10 }, grudge: true } },
    ] }),
  ev({ id: 'C-宗门-11', locs: ['sect'], kind: 'choice', sort: '即时',
    text: '师尊让你去给他买酒，说要城南那家。',
    options: [
      { label: '去城南', eff: { text: '师尊喝得眯起了眼，对你和气了不少。' } },
      { label: '就近买', eff: { text: '师尊喝了一口就吐了。' } },
      { label: '自己酿', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { fujue: true, text: '师尊喝完，传你一招。' }, fail: { text: '酿酸了。' } } },
    ] }),
  ev({ id: 'C-宗门-12', locs: ['sect'], kind: 'choice', sort: '直得', when: need({ realm: 3 }),
    text: '宗门收徒，一个小孩死死抱住你的腿不撒手。',
    options: [
      { label: '收了', desc: '弟子 +1', eff: { disciple: 1 }, chance: { p: 0.5, ok: { chain: { id: 'YG25', op: 'start', yuan: 2 } }, fail: { chain: { id: 'YG26', op: 'start', yuan: 2 } } } },
      { label: '交给执事' },
    ] }),
  ev({ id: 'C-宗门-13', locs: ['sect'], kind: 'choice', sort: '余波',
    text: '一位长老被诬陷偷了镇派法宝，被关进思过崖。',
    options: [
      { label: '去查', eff: { flag: 'zhenbao', echo: { text: '镇宝案查清了，真凶伏法。长老出了思过崖，把衣钵传给了你。', eff: { canye: true, fujue: true }, laps: 3 } } },
      { label: '不管' },
    ] }),
  ev({ id: 'C-宗门-14', locs: ['sect'], kind: 'choice', sort: '即时', when: need({ realm: 2 }),
    text: '宗门让你去敌对宗门做交换弟子。',
    options: [
      { label: '去', desc: '耗 1 年，得一门黄阶功法', eff: { age: 1, skill: 'thunder', flag: 'envoy', text: '一年后你回来了，带回对方的一门黄阶功法。' } },
      { label: '不去', desc: '功德 -10', eff: { merit: -10, text: '宗门贡献 -20。' } },
    ] }),

  // ---------- 云游 ----------
  ev({ id: 'C-云游-4', locs: ROAM, kind: 'choice', sort: '即时',
    text: '路边茶摊的老板娘给你端来一碗茶，茶里映出的不是你的脸。',
    options: [
      { label: '喝', desc: '宿慧 +5，沾染墨气', eff: { insight: 5, trace: 'ink_touched' } },
      { label: '泼了', eff: { text: '老板娘笑而不语。' } },
    ] }),
  ev({ id: 'C-云游-5', locs: ROAM, kind: 'choice', sort: '直得',
    text: '一个说书人拦住你：「你身上有个故事，我买了。」',
    options: [
      { label: '卖', desc: '灵石 +80', eff: { stones: 80, flag: 'story_sold', text: '本世一段经历从千面录里消失了。' } },
      { label: '不卖' },
    ] }),
  ev({ id: 'C-云游-6', locs: ROAM, kind: 'choice', sort: '余波',
    text: '你在山里救了一个被追杀的少年，他说自己是某个大家族的弃子。',
    options: [
      { label: '带他走', desc: '伙伴：气运之子', eff: { gain: { id: 'ally', name: '气运之子', desc: '参战伙伴', ally: true }, chain: { id: 'YG09', op: 'start', yuan: 2 } } },
      { label: '给他点盘缠', desc: '人情 +1', eff: { favor: 1 } },
    ] }),
  ev({ id: 'C-云游-7', locs: ROAM, kind: 'choice', sort: '即时',
    text: '你走进一个镇子，镇上的人都在过同一天。',
    options: [
      { label: '找出原因', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { merit: 30, text: '镇子恢复了，第二天终于来了。' }, fail: { text: '你在镇上过了好几遍同一天，什么也没找到。' } } },
      { label: '绕开走' },
    ] }),
  ev({ id: 'C-云游-8', locs: ROAM, kind: 'choice', sort: '直得',
    text: '渡口的船夫说：「过河一块灵石，或者一个秘密。」',
    options: [
      { label: '给秘密', desc: '得船夫的竹篙（法器）', eff: { gain: { id: 'keep', name: '船夫的竹篙', desc: '主动法宝，击退一圈敌人' } } },
      { label: '给灵石', desc: '灵石 -1', eff: { stones: -1 } },
    ] }),
  ev({ id: 'C-云游-9', locs: ROAM, kind: 'choice', sort: '余波', when: need({ realm: 2 }),
    text: '你碰上一支凡人商队，护卫是个跟你一样的散修。',
    options: [
      { label: '结伴', desc: '伙伴：散修，下一回坊市价格 -15%', eff: { gain: { id: 'ally', name: '散修', desc: '参战伙伴', ally: true }, flag: 'caravan' } },
      { label: '各走各路' },
    ] }),
  ev({ id: 'C-云游-10', locs: ROAM, kind: 'choice', sort: '即时',
    text: '一座破庙里供着一尊没有脸的神像。',
    options: [
      { label: '给它画一张脸', eff: { flag: 'face_temple', text: '下一世，你出生的地方附近有座庙，供着你的脸。' } },
      { label: '拜一拜', desc: '气运 +1', eff: { attr: { luck: 1 } } },
      { label: '走' },
    ] }),
  ev({ id: 'C-云游-11', locs: ROAM, kind: 'choice', sort: '余波',
    text: '你在客栈墙上看见一张泛黄的告示：「寻人：某某，年二十，眉心有痣。」画的是你。',
    options: [
      { label: '去找贴告示的人', eff: { chain: { id: 'YG40', op: 'start', yuan: 1 } } },
      { label: '撕下来' },
    ] }),
  ev({ id: 'C-云游-12', locs: ROAM, kind: 'choice', sort: '直得', when: (L) => L.attrs.luck >= 6,
    text: '一只大鹏落在你面前的山崖上，翅膀受了伤。',
    options: [
      { label: '替它包扎', desc: '灵宠：大鹏雏', eff: { pet: { kind: 'peng' } } },
      { label: '拔一根羽毛就走', desc: '得遁地符一张', eff: { item: 'dundi' } },
    ] }),
  ev({ id: 'C-云游-13', locs: ROAM, kind: 'choice', sort: '即时',
    text: '你遇到一个跟你同名同姓的人，他说他也在修仙。',
    options: [
      { label: '跟他比划', desc: '斗法：同名之人', eff: { battle: { kind: 'duel', title: '同名之人', elites: 1, cultOnly: true, win: { attr: { luck: 1 } } } } },
      { label: '请他喝酒', desc: '人情 +1', eff: { favor: 1, text: '他把名字让给了你。' } },
    ] }),
  ev({ id: 'C-云游-14', locs: ROAM, kind: 'choice', sort: '余波',
    text: '一个瞎眼老道给你算了一卦，不收钱，只说「你下辈子会回来找我」。',
    options: [
      { label: '记下', eff: { flag: 'oracle', next: { reroll: 1 }, text: '下一世云游，你会再遇见他，他会替你改一次命。' } },
      { label: '不信' },
    ] }),
  ev({ id: 'C-云游-15', locs: ROAM, kind: 'choice', sort: '即时', when: need({ realm: 3 }),
    text: '你御剑飞过一座城，城里的凡人跪了一地。',
    options: [
      { label: '落下来受拜', desc: '功德 +10', eff: { merit: 10, chain: { id: 'YG36', op: 'start', yuan: 1 } } },
      { label: '飞快点走' },
    ] }),

  // ---------- 坊市 ----------
  ev({ id: 'C-坊市-4', locs: ['bazaar'], kind: 'choice', sort: '直得',
    text: '地摊上一面铜镜，摊主说里面住着人，便宜卖。',
    options: [
      { label: '买', desc: '灵石 -60，随身前辈：镜中剑修', when: need({ stones: 60 }), eff: { stones: -60, gain: { id: 'elder', name: '镜中剑修', desc: '每场战斗可请他出手一次：判定 +1，战斗伤害 +8%', roll: 1, dmg: 0.08 } } },
      { label: '不买' },
    ] }),
  ev({ id: 'C-坊市-5', locs: ['bazaar'], kind: 'choice', sort: '即时',
    text: '赌石摊。',
    options: [
      { label: '赌一块', desc: '灵石 -30，赌一把', when: need({ stones: 30 }), eff: { stones: -30 },
        chance: { p: 0.4, ok: { item: '?', text: '石皮一刀切开，里面裹着东西。' }, fail: { text: '是块石头。' } } },
      { label: '看别人赌', desc: '悟性 +1', eff: { attr: { wu: 1 } } },
    ] }),
  ev({ id: 'C-坊市-6', locs: ['bazaar'], kind: 'choice', sort: '直得',
    text: '一只灰毛老鼠钻进你的钱袋，叼走一块灵石，又叼回来一块更大的。',
    options: [
      { label: '养着', desc: '灵宠：寻宝鼠', eff: { pet: { kind: 'rat' } } },
      { label: '赶走' },
    ] }),
  ev({ id: 'C-坊市-7', locs: ['bazaar'], kind: 'choice', sort: '余波',
    text: '拍卖会上你和一个蒙面人抢同一株灵草。',
    options: [
      { label: '抬价抢下', desc: '灵石 -150，得灵草（修为 +6%），结仇', when: need({ stones: 150 }), eff: { stones: -150, xpPct: 6, grudge: true } },
      { label: '让给他', desc: '人情 +1', eff: { favor: 1, text: '他是某宗少主。' } },
      { label: '拍完去堵他', desc: '魔修道途 +5，斗法：蒙面人', eff: { school: { demon: 5 }, battle: { kind: 'duel', title: '蒙面人', elites: 1, cultOnly: true } } },
    ] }),
  ev({ id: 'C-坊市-8', locs: ['bazaar'], kind: 'choice', sort: '即时',
    text: '一个小贩卖「保证能筑基的丹」，十块灵石一颗。',
    options: [
      { label: '买一颗', desc: '灵石 -10，赌一把', when: need({ stones: 10 }), eff: { stones: -10 },
        chance: { p: 0.1, ok: { xpPct: 20, text: '竟然真是一颗筑基丹。' }, fail: { text: '吃了拉肚子。' } } },
      { label: '拆穿他', desc: '灵石 +5', eff: { stones: 5, text: '他请你别声张，塞给你五块灵石。' } },
    ] }),
  ev({ id: 'C-坊市-9', locs: ['bazaar'], kind: 'choice', sort: '直得', when: need({ stones: 300 }),
    text: '典当行里有一只被人当了没赎回的葫芦。',
    options: [
      { label: '买下', desc: '灵石 -100，成长法宝：葫芦', eff: { stones: -100, gain: { id: 'gourd', name: '葫芦', desc: '成长法宝，喂养 3 次后定形' }, chain: { id: 'YG03', op: 'start', yuan: 1 } } },
      { label: '不买' },
    ] }),
  ev({ id: 'C-坊市-10', locs: ['bazaar'], kind: 'choice', sort: '余波',
    text: '你在坊市开了个小摊，卖自己画的符。',
    options: [
      { label: '卖便宜点', desc: '灵石 +20', eff: { stones: 20, flag: 'shop' } },
      { label: '卖贵点', desc: '符修道途 +5', eff: { school: { rune: 5 } } },
    ] }),
  ev({ id: 'C-坊市-11', locs: ['bazaar'], kind: 'choice', sort: '即时',
    text: '黑市里有人卖你的消息，开价一百灵石。',
    options: [
      { label: '买下来', desc: '灵石 -100', when: need({ stones: 100 }), eff: { stones: -100, text: '你知道了是谁在打听你。' } },
      { label: '自己去卖一份假的', desc: '灵石 +50', eff: { stones: 50, flag: 'hide' } },
    ] }),
  ev({ id: 'C-坊市-12', locs: ['bazaar'], kind: 'choice', sort: '直得', when: need({ realm: 2 }),
    text: '一个落魄女修在卖身契，说只求有人带她出城。',
    options: [
      { label: '带她走', desc: '伙伴：女修', eff: { gain: { id: 'ally', name: '女修', desc: '参战伙伴；好感高后可作道侣', ally: true } } },
      { label: '给她钱让她自己走', desc: '灵石 -20，功德 +15', when: need({ stones: 20 }), eff: { stones: -20, merit: 15 } },
    ] }),
  ev({ id: 'C-坊市-13', locs: ['bazaar'], kind: 'choice', sort: '即时',
    text: '一家铺子招牌写着「回收前世记忆，高价」。',
    options: [
      { label: '卖一段', desc: '灵石 +120，宿慧 -10', eff: { stones: 120, insight: -10 } },
      { label: '进去看看', eff: { text: '你看见货架上有一瓶贴着你名字。' } },
    ] }),
  ev({ id: 'C-坊市-14', locs: ['bazaar'], kind: 'choice', sort: '余波',
    text: '你帮一个炼器师打下手，他让你选一件边角料做的东西。',
    options: [
      { label: '要剑胚', desc: '日后铸成一件法器', eff: { echo: { text: '你把剑胚拿回坊市，铸成了一柄飞剑。', eff: { qi: { skill: 'sword', grade: 1 } }, laps: 2 } } },
      { label: '要一枚空戒', desc: '行囊格 +1', eff: { gain: { id: 'keep', name: '空戒', desc: '行囊格 +1' } } },
    ] }),
  ev({ id: 'C-坊市-15', locs: ['bazaar'], kind: 'choice', sort: '直得', when: hasGain('guild'),
    text: '账房说有一家快倒闭的炼丹铺可以盘下来。',
    options: [
      { label: '盘下', desc: '丹铺：每圈出丹', eff: { gain: { id: 'danpu', name: '丹铺', desc: '每个岁首出丹，修为 +2%', lap: { xpPct: 2 } } } },
      { label: '不要' },
    ] }),

  // ---------- 人生路口 ----------
  ev({ id: 'C-人生路口-5', locs: ['cross'], kind: 'choice', sort: '直得',
    text: '一个老人拿着族谱找到你，说你是他们走失多年的一支。',
    options: [
      { label: '认祖归宗', desc: '家族：下一世 20% 投生在本族', eff: { gain: { id: 'clan', name: '本族', desc: '下一世 20% 投生在本族（家境 +2）', meta: 'clan' } } },
      { label: '不认' },
    ] }),
  ev({ id: 'C-人生路口-6', locs: ['cross'], kind: 'choice', sort: '即时',
    text: '退婚书送到了你手上。',
    options: [
      { label: '撕了', desc: '结仇', eff: { grudge: true, chain: { id: 'YG07', op: 'start', yuan: 1 } } },
      { label: '签了', desc: '功德 +5', eff: { merit: 5, flag: 'no_romance', text: '本世少了一段情缘。' } },
      { label: '回一封更狠的退婚书', eff: { chain: { id: 'YG07', op: 'start', yuan: 2 } } },
    ] }),
  ev({ id: 'C-人生路口-7', locs: ['cross'], kind: 'choice', sort: '余波',
    text: '你被推举为一方散修的首领。',
    options: [
      { label: '接下', desc: '本世多两个伙伴位，但每年要应付一件麻烦事', eff: { flag: 'leader', gain: { id: 'leader', name: '散修首领', desc: '本世多两个伙伴位' }, echo: { text: '手下的散修又惹了麻烦，你去替他们收拾。', eff: { stones: -20 }, laps: 2 } } },
      { label: '推掉' },
    ] }),
  ev({ id: 'C-人生路口-8', locs: ['cross'], kind: 'choice', sort: '即时', when: need({ realm: 2 }),
    text: '宗门和家族同时召你回去，路只有一条。',
    options: [
      { label: '回宗门', desc: '人情 +1', eff: { favor: 1, text: '宗门贡献 +40。' } },
      { label: '回家族', desc: '家境 +2', eff: { attr: { fam: 2 } } },
      { label: '都不回', desc: '气运 +1', eff: { attr: { luck: 1 }, text: '你做了散修。' } },
    ] }),
  ev({ id: 'C-人生路口-9', locs: ['cross'], kind: 'choice', sort: '直得', when: need({ realm: 3 }),
    text: '一个合欢宗的使者送来请帖，说圣女想见你。',
    options: [
      { label: '赴约', eff: { chain: { id: 'YG14', op: 'skip' } } },
      { label: '不去' },
    ] }),
  ev({ id: 'C-人生路口-10', locs: ['cross'], kind: 'choice', sort: '余波',
    text: '你欠的债被人一次还清了，还债的人没留名字。',
    options: [
      { label: '去查', eff: { echo: { text: '查出来了：替你还债的，是前世的故人。', eff: { acq: { role: '替你还债的人', relation: 'favor' } }, laps: 2 } } },
      { label: '不管', eff: { flag: 'debt_paid' } },
    ] }),
  ev({ id: 'C-人生路口-11', locs: ['cross'], kind: 'choice', sort: '即时',
    text: '你在两门功法之间只能选一门，另一门要还回去。',
    options: [
      { label: '选攻', desc: '剑修道途 +5', eff: { school: { sword: 5 } } },
      { label: '选守', desc: '体修道途 +5', eff: { school: { body: 5 } } },
      { label: '都背下来再还', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { school: { sword: 5, body: 5 }, text: '两门都记在了心里。' }, fail: { flag: 'library_ban', text: '你被逐出了藏经阁。' } } },
    ] }),
  ev({ id: 'C-人生路口-12', locs: ['cross'], kind: 'choice', sort: '直得', when: need({ partner: true }),
    text: '道侣有了身孕。',
    options: [
      { label: '留下孩子', desc: '血脉：下一世 30% 投生为你的后人', eff: { gain: { id: 'blood', name: '血脉', desc: '下一世 30% 投生为你的后人', meta: 'clan' } } },
      { label: '以修行为重', eff: { text: '道侣很久没有再提这件事。' } },
    ] }),
  ev({ id: 'C-人生路口-13', locs: ['cross'], kind: 'choice', sort: '余波', when: need({ realm: 4 }),
    text: '有人请你出山做一国国师。',
    options: [
      { label: '去', desc: '气运 +2，但每十年要处理一场凡间劫', eff: { attr: { luck: 2 }, flag: 'guoshi', echo: { text: '凡间起了一场劫，你下山去收拾。', eff: { age: 1, merit: 10 }, laps: 3 } } },
      { label: '不去' },
    ] }),
  ev({ id: 'C-人生路口-14', locs: ['cross'], kind: 'choice', sort: '即时',
    text: '你站在一个路口，左边是你上一世死的地方，右边是你上上世死的地方。',
    options: [
      { label: '走左边', desc: '宿慧 +10，劫难 +5%', eff: { insight: 10, flag: 'harm_up' } },
      { label: '走右边', desc: '宿慧 +5', eff: { insight: 5 } },
      { label: '原路回去' },
    ] }),

  // ---------- 机缘 ----------
  ev({ id: 'C-机缘-4', locs: ['fortune'], kind: 'choice', sort: '直得',
    text: '你掉进一个山洞，洞里有一块碑，碑上写着「签到」二字。',
    options: [
      { label: '摸一下', desc: '签到碑', eff: { chain: { id: 'YG04', op: 'start', yuan: 1, mark: 'sign' } } },
      { label: '不摸' },
    ] }),
  ev({ id: 'C-机缘-5', locs: ['fortune'], kind: 'choice', sort: '即时',
    text: '天上掉下来一块石头，正砸在你面前。',
    options: [
      { label: '捡起来', desc: '陨铁：下一回铸器品阶 +1', eff: { flag: 'meteor_iron' } },
      { label: '躲远点' },
    ] }),
  ev({ id: 'C-机缘-6', locs: ['fortune'], kind: 'choice', sort: '直得',
    text: '一只巴掌大的乌龟爬了三天三夜，爬到你脚边就不走了。',
    options: [
      { label: '养着', desc: '灵宠：玄龟', eff: { pet: { kind: 'turtle' } } },
      { label: '放回水里', desc: '功德 +10', eff: { merit: 10 } },
    ] }),
  ev({ id: 'C-机缘-7', locs: ['fortune'], kind: 'choice', sort: '直得', when: need({ realm: 3 }),
    text: '一个破碎的小世界卡在两座山中间，只有你看得见。',
    options: [
      { label: '收入体内', desc: '洞天：残破洞天，闭关修为 +8%', eff: { gain: { id: 'dongtian', name: '残破洞天', desc: '闭关修为 +8%', lv: 1, xp: 0.08 }, chain: { id: 'YG38', op: 'skip' } } },
      { label: '不碰' },
    ] }),
  ev({ id: 'C-机缘-8', locs: ['fortune'], kind: 'choice', sort: '余波',
    text: '你捡到一枚玉简，里面是一个人写给未来的信。',
    options: [
      { label: '读完', eff: { chain: { id: 'YG06', op: 'start', yuan: 1 } } },
      { label: '收着不读' },
    ] }),
  ev({ id: 'C-机缘-9', locs: ['fortune'], kind: 'choice', sort: '即时',
    text: '一株灵药刚好成熟，旁边趴着一头守药的妖兽，睡着了。',
    options: [
      { label: '悄悄摘', desc: '根骨判定', roll: { attr: 'gen', dc: 6, ok: { xpPct: 6, text: '你得了灵药。' }, fail: { battle: { kind: 'beast', title: '守药妖兽', cultOnly: true, win: { xpPct: 6 } } } } },
      { label: '等它醒了谈谈', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { xpPct: 3, text: '它分了你一半。' }, fail: { text: '它打了个哈欠，叼着灵药走了。' } } },
    ] }),
  ev({ id: 'C-机缘-10', locs: ['fortune'], kind: 'choice', sort: '直得', when: (L) => L.attrs.luck >= 7,
    text: '你在河里摸到一把剑，剑身上刻着你看不懂的字。',
    options: [
      { label: '拔出来', desc: '得一件灵器飞剑', eff: { qi: { skill: 'sword', grade: 2 } } },
      { label: '扔回去', desc: '得一件灵器飞剑，暗伤 +1', eff: { qi: { skill: 'sword', grade: 2 }, injure: 1, text: '剑自己飞回了你手里。' } },
    ] }),
  ev({ id: 'C-机缘-11', locs: ['fortune'], kind: 'choice', sort: '余波',
    text: '一位渡劫失败的前辈在你面前化成飞灰，只留下一句「替我看看天门后面」。',
    options: [
      { label: '答应', desc: '「诺」故人', eff: { flag: 'promise', acq: { role: '渡劫失败的前辈', relation: 'vow' } } },
      { label: '不答应' },
    ] }),
  ev({ id: 'C-机缘-12', locs: ['fortune'], kind: 'choice', sort: '即时',
    text: '你发现一处没人知道的灵脉。',
    options: [
      { label: '独占', desc: '停洞府修为 +5%，三年后结仇', eff: { gain: { id: 'vein', name: '灵脉', desc: '停洞府修为 +5%', xp: 0.05 }, echo: { text: '三年后，你的灵脉被人发现了。', eff: { grudge: true }, laps: 3 } } },
      { label: '献给宗门', desc: '人情 +1', eff: { favor: 1, text: '宗门贡献 +60。' } },
      { label: '卖了', desc: '灵石 +150', eff: { stones: 150 } },
    ] }),
  ev({ id: 'C-机缘-13', locs: ['fortune'], kind: 'choice', sort: '直得',
    text: '一个婴儿被放在你的洞府门口，襁褓里有一块写着你名字的玉。',
    options: [
      { label: '养大', desc: '弟子 +1', eff: { disciple: 1, flag: 'foundling', echo: { text: '你捡来的那个孩子长大了，跪在你面前，说出了他是谁。', laps: 4 } } },
      { label: '送到凡间' },
    ] }),
];
