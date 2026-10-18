// 因果链（二）：YG13～YG23（情缘、灵宠灵兽），LC01～LC03（灵宠链），D01～D03（道侣链）
// 文案见内容库「事件库扩充」与「附录：事件关联与因果链」
import type { ChainDef, ChainOption } from './chain-types';
import type { LifeState, MetaState } from '../game/types';

const noPet = (L: LifeState) => !L.pet;
const noCat = (L: LifeState) => !L.pet && !L.talents.includes('cat');
// 佛子、清修道童不进道侣链 D01～D03
const canWed = (L: LifeState) => !L.partner && !['fozi', 'daotong'].includes(L.fate ?? '');
const foxLamp = (M: MetaState) => M.saga.lamps.fox ?? 0;

// LC01 上档：白狐命灯 0～1 时改为白狐相遇
const foxTop = (): ChainOption[] => [
  { label: '收下', when: (_L, M) => foxLamp(M) >= 2, eff: { pet: { kind: 'fox', adult: true }, text: '你收它为灵宠「小狐」。' } },
  { label: '看着它', when: (_L, M) => foxLamp(M) <= 1, eff: { bond: 'fox', text: '它转身时，你看见它的尾巴尖是白的。' } },
];

export const CHAINS_B: ChainDef[] = [
  // ================= 情缘 =================
  {
    id: 'YG13', name: '下凡的仙君', group: '情缘', gain: '一件仙器，或飞升时的引路人', stage: 'mortal',
    start: {
      locs: ['school', 'market'],
      text: '隔壁新来的书生穷得叮当响，字却写得像会飞。',
      options: [
        { label: '借他钱', desc: '灵石 -10', need: { stones: 10 }, eff: { stones: -10, chain: { op: 'start', yuan: 2 } } },
        { label: '跟他学字', desc: '悟性 +1', eff: { attr: { wu: 1 }, chain: { op: 'start', yuan: 1 } } },
        { label: '笑他穷' },
      ],
    },
    beats: [
      {
        locs: ['neighbor', 'river'],
        text: '他病了一冬，没人照应。',
        options: [
          { label: '守着他', desc: '年龄 +1', eff: { age: 1, chain: { yuan: 2 } } },
          { label: '请郎中', desc: '灵石 -20', need: { stones: 20 }, eff: { stones: -20, chain: { yuan: 1 } } },
          { label: '不管', eff: { chain: { yuan: -2 } } },
        ],
      },
      {
        locs: ['home', 'cross'],
        when: (L) => L.age >= 16,
        text: '他向你求亲；同一夜你梦见一个声音说：「他是下凡历劫的，劫满即归。」',
        options: [
          { label: '答应', eff: { chain: { yuan: 2, mark: 'wed' } } },
          { label: '告诉他梦里的话', eff: { chain: { yuan: 1, mark: 'told' } } },
          { label: '拒绝', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['home'],
      when: (L) => L.age >= 40,
      text: '他老死在你怀里，屋顶上的云一夜没散。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'wed' }, text: '他归位前留下一件仙器；你飞升那天，天门前多一个为你开门的人。', eff: { qi: { skill: 'art', grade: 4 }, flag: 'xianjun_gate' } },
        { tier: 'mid', need: { mark: 'told' }, text: '他提前归位，留下一卷天阶功法。', eff: { skill: 'art', canye: true } },
        { tier: 'low', text: '只是一个普通人死了。' },
      ],
    },
  },
  {
    id: 'YG14', name: '合欢宗圣女', group: '情缘', gain: '道侣，或她的半身修为', stage: 'cult',
    when: (L) => L.realm >= 2 && !L.partner,
    start: {
      locs: ['bazaar', 'roam'],
      text: '一位女修请你喝茶，茶里有一股甜得发腻的香。',
      options: [
        { label: '喝', desc: '修为 -5%', eff: { xpPct: -5, chain: { op: 'start', yuan: 2, mark: 'drank' } } },
        { label: '不动声色倒掉', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { chain: { op: 'start', yuan: 1, mark: 'saw' } }, fail: { chain: { op: 'start', yuan: 0 } } } },
        { label: '掀桌', desc: '斗法：合欢宗女修', eff: { battle: { kind: 'duel', title: '合欢宗女修', elites: 1, cultOnly: true } } },
      ],
    },
    beats: [
      {
        locs: ['cave', 'bazaar'],
        text: '她又来了，这次没带茶，说宗门逼她每年采补一人，她不想再这样。',
        options: [
          { label: '信她', eff: { chain: { yuan: 2 } } },
          { label: '不信', eff: { chain: { yuan: -1 } } },
          { label: '反问她茶里是什么', need: { mark: 'saw' }, eff: { text: '她笑了。', chain: { yuan: 1 } } },
        ],
      },
      {
        locs: ['demon', 'roam'],
        text: '合欢宗来人抓她回去。',
        options: [
          { label: '护她', desc: '斗法：合欢宗来人，结仇', eff: { grudge: true, battle: { kind: 'duel', title: '合欢宗来人', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '用灵石赎她', desc: '灵石 -150', need: { stones: 150 }, eff: { stones: -150, chain: { yuan: 1 } } },
          { label: '让她走', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['cave'],
      text: '她说愿意把一身修为渡给你，只求你记得她。',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'drank', yuanMax: 3 }, text: '她终究采补了你。', eff: { xpPct: -15, acq: { role: '合欢宗圣女', relation: 'grudge' } } },
        { tier: 'top', text: '你们结为道侣，双修修炼 ×1.1。', eff: { partner: '合欢宗圣女', fate: { xpMul: 1.1 } } },
        { tier: 'mid', text: '你收下修为，她散功成了凡人。', eff: { xpPct: 25, acq: { role: '合欢宗圣女', relation: 'vow' } } },
        { tier: 'low', text: '她走了。' },
      ],
    },
  },
  {
    id: 'YG15', name: '妖族未婚妻', group: '情缘', gain: '妖族道侣与一族的照应', stage: 'mortal',
    when: (L) => L.age <= 3 && !L.partner,
    start: {
      locs: ['home'],
      text: '你出生那夜，一只白狼叼来一块玉佩放在门口。娘说，这是定亲的礼。',
      options: [
        { label: '收下', eff: { chain: { op: 'start', yuan: 1 } } },
      ],
    },
    beats: [
      {
        locs: ['river', 'trace'],
        text: '一个眼睛发绿的姑娘总在河边看你，说她是你没过门的媳妇。',
        options: [
          { label: '跟她说话', eff: { chain: { yuan: 2 } } },
          { label: '告诉爹娘', eff: { text: '家里请了道士。' } },
          { label: '拿石头扔她', eff: { chain: { yuan: -2 } } },
        ],
      },
      {
        locs: ['forest', 'trace'],
        text: '人族猎妖队要进山，领头的是你的同乡。',
        options: [
          { label: '进山报信', desc: '结仇', eff: { grudge: true, chain: { yuan: 2 } } },
          { label: '跟猎妖队走', desc: '修为 +5%', eff: { xpPct: 5, chain: { yuan: -2 } } },
          { label: '两边劝', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { merit: 30, chain: { yuan: 1 } }, fail: {} } },
        ],
      },
    ],
    end: {
      locs: ['forest', 'home'],
      when: (L) => L.age >= 16,
      text: '她来接你，说狼族的长老要见见你。',
      options: [],
      endings: [
        { tier: 'top', text: '你们结为道侣，狼族愿为你援战。', eff: { partner: '狼族姑娘', flag: 'wolf_kin', gain: { id: 'ally', name: '狼群', desc: '参战伙伴；本世妖潮开局敌人 -20%', ally: true } } },
        { tier: 'mid', text: '退了婚，狼族送你一枚狼牙。', eff: { item: '?' } },
        { tier: 'low', text: '狼族记恨，本世妖潮敌人 +20%。', eff: { flag: 'wolf_grudge' } },
      ],
    },
  },
  {
    id: 'YG16', name: '画中仙', group: '情缘', gain: '道侣「画中人」', stage: 'any',
    when: (L) => !L.partner,
    start: {
      locs: ['market', 'bazaar'],
      text: '一幅没落款的仕女图，画里人的眼睛跟着你转。',
      options: [
        { label: '买下', desc: '灵石 -20', need: { stones: 20 }, eff: { stones: -20, chain: { op: 'start', yuan: 1 } } },
        { label: '不买' },
      ],
    },
    beats: [
      {
        locs: ['home', 'cave'],
        text: '半夜，案上多了一碗热粥。第二晚，你看见她从画里走下来，脚上沾着墨。',
        options: [
          { label: '装睡', eff: { chain: { yuan: 1 } } },
          { label: '跟她说话', eff: { chain: { yuan: 2 } } },
          { label: '把画卷起来', eff: { chain: { yuan: -2 } } },
        ],
      },
      {
        locs: ['home', 'cave'],
        text: '她越来越淡，说她靠墨活着，可墨是从裂口里流下来的。',
        options: [
          { label: '给她墨', eff: { trace: 'ink_touched', chain: { yuan: 2 } } },
          { label: '用灵石磨墨', desc: '灵石 -50', need: { stones: 50 }, eff: { stones: -50, chain: { yuan: 1 } } },
          { label: '劝她回画里去', eff: { chain: { yuan: -1, mark: 'back' } } },
        ],
      },
    ],
    end: {
      locs: ['karma', 'home'],
      text: '她问你：「我是不是你画的？」',
      options: [],
      endings: [
        { tier: 'mid', need: { mark: 'back' }, text: '她回到画里，画留给你。画中人每场替你挡一次伤。', eff: { item: 'hushen' } },
        { tier: 'top', text: '你们结为道侣。她是「画中人」，每 10 年要喂一次墨。', eff: { partner: '画中人', echo: { text: '画中人又淡了，你喂了她一次墨。', eff: { stones: -50 }, laps: 4 } } },
        { tier: 'mid', text: '她回到画里，画留给你。画中人每场替你挡一次伤。', eff: { item: 'hushen' } },
        { tier: 'low', text: '画只剩一张白纸。' },
      ],
    },
  },
  {
    id: 'YG17', name: '冥婚', group: '情缘', gain: '鬼伴，或一桩阴德', stage: 'mortal',
    when: (L) => !L.partner,
    start: {
      locs: ['sickbed', 'road'],
      text: '你病得快死了，家里收了一户人家的钱，给你配了冥婚。你没死，可那边的新娘已经过了门。',
      options: [
        { label: '知道了', eff: { chain: { op: 'start', yuan: 1 } } },
      ],
    },
    beats: [
      {
        locs: ['home'],
        text: '夜里有人替你掖被角，手冰凉。',
        options: [
          { label: '说一声谢谢', eff: { chain: { yuan: 2 } } },
          { label: '请道士', desc: '功德 +10', eff: { merit: 10, chain: { yuan: -2 } } },
          { label: '装作不知道' },
        ],
      },
      {
        locs: ['river', 'fair'],
        text: '她说她是淹死的，尸骨还在河底，没人收。',
        options: [
          { label: '下河捞', desc: '根骨判定', roll: { attr: 'gen', dc: 6, ok: { chain: { yuan: 2 } }, fail: { injure: 1, text: '你呛了水。', chain: { yuan: 2 } } } },
          { label: '花钱请人捞', desc: '灵石 -30', need: { stones: 30 }, eff: { stones: -30, chain: { yuan: 1 } } },
          { label: '不管', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['fair', 'home'],
      text: '中元节，她站在你床头，说可以走了，也可以留下。',
      options: [],
      endings: [
        { tier: 'top', text: '她留下了，成了你的鬼伴「阴新娘」。', eff: { partner: '阴新娘', gain: { id: 'ghost', name: '阴新娘', desc: '参战伙伴，不能进天劫；夜里的劫难伤害 +15%', ally: true } } },
        { tier: 'mid', text: '你超度了她。下一世，她投胎成你的邻居。', eff: { merit: 60, acq: { role: '阴新娘', relation: 'favor' } } },
        { tier: 'low', text: '她走了，没回头。' },
      ],
    },
  },

  // ================= 灵宠灵兽 =================
  {
    id: 'YG18', name: '来历不明的蛋', group: '灵宠灵兽', gain: '火鸦、青蛟或墨螭（看温养方式）', stage: 'cult',
    when: noPet,
    start: {
      locs: ['realm', 'fortune'],
      text: '一颗西瓜大的蛋，蛋壳上有三道纹：一道红，一道青，一道黑。',
      options: [
        { label: '抱走', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '打碎吃了', desc: '修为 +5%', eff: { xpPct: 5 } },
      ],
    },
    beats: [
      {
        locs: ['cave', 'quiet'],
        text: '蛋冷了。',
        options: [
          { label: '埋进火里', eff: { chain: { mark: 'fire' } } },
          { label: '泡进灵泉', eff: { chain: { mark: 'water' } } },
          { label: '滴一滴墨', eff: { trace: 'ink_touched', chain: { mark: 'ink' } } },
        ],
      },
      {
        locs: ['cave'],
        text: '蛋壳裂了一条缝，里面有东西在挠。',
        options: [
          { label: '帮它剥壳', eff: { chain: { yuan: 2 } } },
          { label: '等它自己出来', eff: { text: '它出来时会更壮。', chain: { yuan: 1, mark: 'strong' } } },
          { label: '拿去坊市卖', desc: '灵石 +200', eff: { stones: 200, chain: { op: 'break' } } },
        ],
      },
    ],
    end: {
      locs: ['cave'],
      text: '它出来了，第一眼看见的是你。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'fire', yuanMin: 4 }, text: '一只火鸦，浑身冒着火星。', eff: { pet: { kind: 'crow', adult: true } } },
        { tier: 'top', need: { mark: 'water', yuanMin: 4 }, text: '一条青蛟，鳞上还滴着泉水。', eff: { pet: { kind: 'jiao', adult: true } } },
        { tier: 'top', need: { mark: 'ink', yuanMin: 4 }, text: '一条墨螭，游过的地方留下一道墨痕。', eff: { pet: { kind: 'chi', adult: true } } },
        { tier: 'mid', need: { mark: 'fire', yuanMin: 2 }, text: '一只小火鸦。', eff: { pet: { kind: 'crow' } } },
        { tier: 'mid', need: { mark: 'water', yuanMin: 2 }, text: '一条小青蛟。', eff: { pet: { kind: 'jiao' } } },
        { tier: 'mid', need: { mark: 'ink', yuanMin: 2 }, text: '一条小墨螭。', eff: { pet: { kind: 'chi' } } },
        { tier: 'low', text: '它飞走了。' },
      ],
    },
  },
  {
    id: 'YG19', name: '吞宝鼠', group: '灵宠灵兽', gain: '灵宠寻宝鼠', stage: 'cult',
    when: noPet,
    start: {
      locs: ['bazaar'],
      text: '你储物袋里少了一块灵石，袋口有个小洞。',
      options: [
        { label: '守株待兔', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '换个袋子' },
      ],
    },
    beats: [
      {
        locs: ['bazaar', 'cave'],
        text: '一只银灰色的小鼠被你逮住了，嘴里还叼着你的灵石。',
        options: [
          { label: '放了它', eff: { chain: { yuan: 2 } } },
          { label: '拿灵石喂它', desc: '灵石 -20', need: { stones: 20 }, eff: { stones: -20, chain: { yuan: 2 } } },
          { label: '关起来', eff: { chain: { mark: 'cage' } } },
        ],
      },
      {
        locs: ['realm', 'fortune'],
        text: '它领着你钻进一条石缝，石缝尽头是一窝灵石。',
        options: [
          { label: '全拿', desc: '灵石 +80', eff: { stones: 80, chain: { yuan: -1 } } },
          { label: '分它一半', desc: '灵石 +40', eff: { stones: 40, chain: { yuan: 2 } } },
          { label: '放它出笼', need: { mark: 'cage' }, eff: { chain: { yuan: 2 } } },
        ],
      },
    ],
    end: {
      locs: 'any',
      text: '它蹲在你肩上，不走了。',
      options: [],
      endings: [
        { tier: 'top', text: '它成了你的灵宠「寻宝鼠」。', eff: { pet: { kind: 'rat', adult: true } } },
        { tier: 'mid', text: '它每年来送一次灵石。', eff: { gain: { id: 'rat_gift', name: '寻宝鼠的礼', desc: '每圈灵石 +10', lap: { stones: 10 } } } },
        { tier: 'low', text: '它把你的储物袋啃了个洞，跑了。' },
      ],
    },
  },
  {
    id: 'YG20', name: '老马化龙驹', group: '灵宠灵兽', gain: '坐骑龙驹（每圈一次点数 ±1）', stage: 'mortal',
    when: noPet,
    start: {
      locs: ['home', 'road'],
      text: '家里那匹老马快不行了，爹说卖给屠户还能换几两银子。',
      options: [
        { label: '求爹留下它', desc: '家境 -1', eff: { attr: { fam: -1 }, chain: { op: 'start', yuan: 2 } } },
        { label: '卖了' },
      ],
    },
    beats: [
      {
        locs: ['home', 'cross'],
        when: (L) => L.inDao,
        text: '你上山修道那天，老马挣开缰绳追了你十里。',
        options: [
          { label: '带上它', eff: { chain: { yuan: 2 } } },
          { label: '回头送它回家', eff: { chain: { yuan: 1 } } },
        ],
      },
      {
        locs: ['cave', 'trace'],
        text: '它老得站不起来了。',
        options: [
          { label: '喂它一株灵草', desc: '灵石 -40', need: { stones: 40 }, eff: { stones: -40, chain: { yuan: 2 } } },
          { label: '喂它一颗丹', desc: '修为 -3%', eff: { xpPct: -3, chain: { yuan: 1 } } },
          { label: '让它安静地走', desc: '功德 +10', eff: { merit: 10 } },
        ],
      },
    ],
    end: {
      locs: ['cave'],
      text: '第二天一早，洞口站着一匹浑身青鳞的马，眼睛还是那双眼睛。',
      options: [],
      endings: [
        { tier: 'top', text: '它成了你的坐骑「龙驹」。', eff: { pet: { kind: 'horse', adult: true } } },
        { tier: 'mid', text: '它只多活了十年，陪你到下一个境界。', eff: { xpPct: 5 } },
        { tier: 'low', text: '它走了，你在洞外给它立了块碑。' },
      ],
    },
  },
  {
    id: 'YG21', name: '山君', group: '灵宠灵兽', gain: '灵宠山君（护宗）', stage: 'cult',
    when: noPet,
    start: {
      locs: ['forest'],
      text: '一头白额虎被猎妖人的锁链困住，链子上刻着禁咒。',
      options: [
        { label: '斩断锁链', desc: '小斗法：猎妖人', eff: { chain: { op: 'start', yuan: 2 }, battle: { kind: 'duel', title: '猎妖人', elites: 1, cultOnly: true } } },
        { label: '等猎妖人走了再救', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '帮猎妖人杀虎', desc: '修为 +5%，得虎骨', eff: { xpPct: 5, text: '你分到一副虎骨。' } },
      ],
    },
    beats: [
      {
        locs: ['forest', 'cave'],
        text: '洞府外每天多一头野猪。',
        options: [
          { label: '收下', eff: { chain: { yuan: 1 } } },
          { label: '给它回礼一颗丹', eff: { chain: { yuan: 2 } } },
          { label: '赶它走', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['sect', 'roam', 'cave'],
        text: '有人上山找麻烦，那头虎从林子里走出来，站在你身边。',
        options: [
          { label: '让它出手', eff: { chain: { yuan: 2 } } },
          { label: '让它回去', eff: { chain: { yuan: 1 } } },
        ],
      },
    ],
    end: {
      locs: ['forest'],
      text: '它老了，带你去看它的洞，洞里有一窝小虎。',
      options: [],
      endings: [
        { tier: 'top', text: '它把最壮的一只交给你，灵宠「山君」。', eff: { pet: { kind: 'tiger', adult: true } } },
        { tier: 'mid', text: '本世妖林不再有凶位。', eff: { flag: 'forest_safe' } },
        { tier: 'low', text: '它死了，留下一张虎皮。', eff: { hpMax: 15 } },
      ],
    },
  },
  {
    id: 'YG22', name: '本命蛊', group: '灵宠灵兽', gain: '本命蛊', stage: 'cult',
    when: (L) => !L.pet && ['E1', 'E5'].includes(L.era ?? ''),
    start: {
      locs: ['roam'],
      text: '南边寨子里的老阿婆塞给你一只陶罐，罐里有东西在动。',
      options: [
        { label: '收下', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '还给她' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '罐里的蛊饿了，阿婆说它吃什么就长成什么。',
        options: [
          { label: '喂毒草', eff: { chain: { mark: 'poison' } } },
          { label: '喂你的血', desc: '气血上限 -5', eff: { hpMax: -5, chain: { yuan: 2, mark: 'blood' } } },
          { label: '喂灵石', desc: '灵石 -30', need: { stones: 30 }, eff: { stones: -30, chain: { yuan: 1 } } },
        ],
      },
      {
        locs: 'any',
        text: '蛊长大了，在罐里撞得叮当响。',
        options: [
          { label: '把它种进身体', need: { mark: 'blood' }, eff: { text: '它认得你的血，一下就钻了进去。' } },
          { label: '把它种进身体', desc: '根骨判定', need: { noMark: 'blood' }, roll: { attr: 'gen', dc: 6, ok: {}, fail: { injure: 2 } } },
          { label: '继续养', eff: { chain: { yuan: 1 } } },
          { label: '摔碎罐子', eff: { chain: { op: 'break' } } },
        ],
      },
    ],
    end: {
      locs: 'any',
      text: '它在你心口安了家。',
      options: [],
      endings: [
        { tier: 'top', text: '它成了你的本命蛊。', eff: { pet: { kind: 'gu', adult: true } } },
        { tier: 'mid', text: '它成了一只毒蛊，一场斗法可放一次。', eff: { gain: { id: 'keep', name: '毒蛊', desc: '主动法宝，一场一次' } } },
        { tier: 'low', text: '反噬。', eff: { life: -10 } },
      ],
    },
  },
  {
    id: 'YG23', name: '雷鹰', group: '灵宠灵兽', gain: '灵宠雷鹰', stage: 'cult',
    when: (L) => !L.pet && L.battleKinds.includes('trial'),
    start: {
      locs: ['cave'],
      text: '天劫劈中了崖上的鹰巢，一只雏鹰浑身冒着电光，掉在你脚边。',
      options: [
        { label: '捧回洞府', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '放回崖上', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '不管' },
      ],
    },
    beats: [
      {
        locs: ['cave'],
        text: '它只吃带雷的东西。',
        options: [
          { label: '去雷击木下守一夜', desc: '年龄 +1', eff: { age: 1, chain: { yuan: 2 } } },
          { label: '喂它一块雷属性灵石', desc: '灵石 -40', need: { stones: 40 }, eff: { stones: -40, chain: { yuan: 1 } } },
        ],
      },
      {
        locs: ['realm', 'roam'],
        text: '一只成年雷鹰在天上盘旋，叫个不停。',
        options: [
          { label: '让它飞去', eff: { chain: { yuan: 1, mark: 'free' } } },
          { label: '护着它', eff: { chain: { yuan: 2 } } },
        ],
      },
    ],
    end: {
      locs: ['cave', 'karma'],
      text: '天劫落下时，一道影子扑进了雷里。',
      options: [],
      endings: [
        { tier: 'mid', need: { mark: 'free' }, text: '它回来看了你一眼，从此你的天劫预警 +0.2 秒。', eff: { flag: 'eagle_warn' } },
        { tier: 'top', text: '它从雷里飞回来，成了你的灵宠「雷鹰」。这次天劫少一道雷。', eff: { pet: { kind: 'eagle', adult: true }, flag: 'trialEase' } },
        { tier: 'mid', text: '它回来看了你一眼，从此你的天劫预警 +0.2 秒。', eff: { flag: 'eagle_warn' } },
        { tier: 'low', text: '雷里只落下一根焦羽。' },
      ],
    },
  },

  // ================= 灵宠链 =================
  {
    id: 'LC01', name: '夹子上的小狐', group: '灵宠链', gain: '灵宠「小狐」', stage: 'any',
    when: noCat,
    start: {
      locs: ['forest', 'trace', 'neighbor', 'river'],
      text: '山脚的兽夹上夹着一只小狐狸，后腿全是血。它不叫，只盯着你。',
      options: [
        { label: '掰开夹子放了它', desc: '暗伤 +1', eff: { injure: 1, text: '手被夹破了。', chain: { op: 'start', yuan: 2 } } },
        { label: '带回家养伤', eff: { chain: { op: 'start', yuan: 2, mark: 'home' } } },
        { label: '走开' },
      ],
    },
    beats: [
      {
        locs: ['home', 'cave', 'neighbor'],
        text: '一早门口放着一只山鸡，雪地上一串小脚印。',
        textIf: [{ need: { mark: 'home' }, text: '它的腿好了，赖在柴房不走。' }],
        options: [
          { label: '收下', desc: '灵石 +5', need: { noMark: 'home' }, eff: { stones: 5, chain: { yuan: 1 } } },
          { label: '放回林边，再撒一把米', desc: '功德 +5', need: { noMark: 'home' }, eff: { merit: 5, chain: { yuan: 2 } } },
          { label: '拿去集上卖', desc: '灵石 +15', need: { noMark: 'home' }, eff: { stones: 15, chain: { yuan: -1 } } },
          { label: '留它过冬', desc: '灵石 -10', need: { mark: 'home', stones: 10 }, eff: { stones: -10, chain: { yuan: 2 } } },
          { label: '放它回山', need: { mark: 'home' }, eff: { chain: { yuan: 1, unmark: 'home' } } },
        ],
      },
      {
        locs: ['home', 'cave', 'road', 'bazaar'],
        text: '一个捕妖人顺着脚印找上门：「那只狐狸值三十两。你见过吗？」',
        options: [
          { label: '说没见过', need: { noMark: 'home' }, eff: { chain: { yuan: 1 } } },
          { label: '说没见过', desc: '气运判定', need: { mark: 'home' }, roll: { attr: 'luck', dc: 6, ok: { chain: { yuan: 1 } }, fail: { stones: -30, text: '他搜出了它，你花三十灵石赎了回来。', chain: { yuan: 1 } } } },
          { label: '把它藏进袖里', desc: '结仇', eff: { grudge: true, chain: { yuan: 2, mark: 'hidden' } } },
          { label: '指给他看', desc: '灵石 +30，功德 -20', eff: { stones: 30, merit: -20, chain: { op: 'break' } } },
          { label: '把他打发走', desc: '小斗法：捕妖人', need: { cult: true }, eff: { battle: { kind: 'duel', title: '捕妖人', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
        ],
      },
    ],
    end: {
      locs: ['karma', 'home', 'cave', 'fortune'],
      text: '月夜，它衔着一片叶子坐在你门槛上，眼睛像人的眼睛。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'hidden' }, text: '它看着你，眼睛像人的眼睛。', options: foxTop() },
        { tier: 'top', text: '它看着你，眼睛像人的眼睛。', options: foxTop() },
        { tier: 'mid', text: '它朝你拜了三拜，回了山。', eff: { acq: { role: '山里的小狐', relation: 'favor' }, again: 1 } },
        { tier: 'low', text: '门槛上只有一片叶子。' },
      ],
    },
  },
  {
    id: 'LC02', name: '洞府外的山猫', group: '灵宠链', gain: '灵宠「山猫」', stage: 'cult',
    when: noCat,
    start: {
      locs: ['cave'],
      text: '洞府外来了一只山猫，每天准时来蹭你的灵气。',
      options: [
        { label: '分它一缕灵气', desc: '修为 -1%', eff: { xpPct: -1, chain: { op: 'start', yuan: 2 } } },
        { label: '由它蹭', desc: '修为 +2%', eff: { xpPct: 2, chain: { op: 'start', yuan: 1 } } },
        { label: '赶走它' },
      ],
    },
    beats: [
      {
        locs: ['cave', 'quiet'],
        text: '你的一株灵草不见了，洞口落着几根猫毛。',
        options: [
          { label: '追进后山', desc: '小妖潮', eff: { text: '你找到了它的窝。', chain: { yuan: 1, mark: 'den' }, battle: { kind: 'beast', title: '后山', cultOnly: true } } },
          { label: '算了', eff: { chain: { yuan: 1 } } },
          { label: '下个笼子', eff: { chain: { yuan: -1, mark: 'caged' } } },
        ],
      },
      {
        locs: ['cave', 'quiet'],
        text: '雷雨夜，它浑身湿透蹲在洞口，身后跟着三只小猫。',
        textIf: [
          { need: { mark: 'caged' }, text: '笼子里的它三天没吃东西。' },
          { need: { mark: 'den' }, text: '雷雨夜，它浑身湿透蹲在洞口，身后跟着三只小猫。你认得，它的窝被雷劈了。' },
        ],
        options: [
          { label: '让它们都进来', desc: '修为 -3%', need: { noMark: 'caged' }, eff: { xpPct: -3, chain: { yuan: 2 } } },
          { label: '只让大的进', need: { noMark: 'caged' }, eff: { chain: { yuan: 1 } } },
          { label: '关上洞门', need: { noMark: 'caged' }, eff: { chain: { yuan: -2 } } },
          { label: '放了它', need: { mark: 'caged' }, eff: { chain: { yuan: 2 } } },
          { label: '接着关', need: { mark: 'caged' }, eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['cave', 'karma'],
      text: '小猫长大了，各自走了。它留了下来，趴在你的蒲团上。',
      options: [],
      endings: [
        { tier: 'top', text: '你收它为灵宠「山猫」。', eff: { pet: { kind: 'lynx', adult: true } } },
        { tier: 'mid', text: '它带着小猫住在后山。', eff: { gain: { id: 'keep', name: '后山的山猫', desc: '本世每停洞府修为 +1%' } } },
        { tier: 'low', text: '它再没来过。' },
      ],
    },
  },
  {
    id: 'LC03', name: '屋顶的白鹤', group: '灵宠链', gain: '灵宠「白鹤」', stage: 'any',
    when: noCat,
    start: {
      locs: ['trace', 'river', 'roam'],
      text: '一只白鹤落在你家屋顶，站了一夜。它的脚上系着一根褪了色的红绳。',
      options: [
        { label: '解下红绳看看', eff: { chain: { op: 'start', yuan: 1, mark: 'cord' } } },
        { label: '喂它一条鱼', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '拿石头赶它' },
      ],
    },
    beats: [
      {
        locs: ['trace', 'roam', 'fair'],
        text: '鹤又来了，翅膀上有伤。',
        textIf: [{ need: { mark: 'cord' }, text: '红绳上写着一个地名，你找过去，是一座荒观，供着一只木鹤。' }],
        options: [
          { label: '打扫荒观', desc: '功德 +10', need: { mark: 'cord' }, eff: { merit: 10, chain: { yuan: 2 } } },
          { label: '拿走观里的旧蒲团', desc: '灵石 +10', need: { mark: 'cord' }, eff: { stones: 10, chain: { yuan: -1 } } },
          { label: '替它包扎', desc: '灵石 -10', need: { noMark: 'cord', stones: 10 }, eff: { stones: -10, chain: { yuan: 2 } } },
          { label: '不管', need: { noMark: 'cord' }, eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['river', 'roam', 'realm'],
        text: '山里来了一伙张网捕鹤的人，说鹤顶红能卖好价钱。',
        options: [
          { label: '割破他们的网', desc: '结仇', eff: { grudge: true, chain: { yuan: 2 } } },
          { label: '花钱把它买下来', desc: '灵石 -40', need: { stones: 40 }, eff: { stones: -40, chain: { yuan: 2 } } },
          { label: '不管', eff: { chain: { yuan: -2 } } },
        ],
      },
    ],
    end: {
      locs: ['karma', 'fortune', 'roam'],
      when: (L) => L.inDao || L.age >= 40,
      text: '你第一次御剑，那只鹤一直跟在剑尾。',
      textIf: [{ need: { mortal: true }, text: '你老了，它每年春天来屋顶站一夜。' }],
      options: [],
      endings: [
        { tier: 'mid', need: { mortal: true }, text: '你老了，它每年春天来屋顶站一夜。', eff: { acq: { role: '屋顶的白鹤', relation: 'favor' } } },
        { tier: 'top', text: '你收它为灵宠「白鹤」。', eff: { pet: { kind: 'crane', adult: true } } },
        { tier: 'mid', text: '它领你找到一处无主洞府。', eff: { xpPct: 10 } },
        { tier: 'low', text: '它往云里飞，没再回头。' },
      ],
    },
  },

  // ================= 道侣链 =================
  {
    id: 'D01', name: '云中仙子', group: '道侣链', gain: '道侣「云中仙子」', stage: 'cult',
    when: (L) => L.realm >= 2 && canWed(L),
    start: {
      locs: ['realm', 'fortune'],
      text: '秘境深处一座困阵，阵里坐着一位白衣女修，阵眼压着她的本命剑。她说：「道友，帮我拔一下剑。」',
      options: [
        { label: '帮她拔剑', desc: '小斗法：阵灵', eff: { chain: { op: 'start', yuan: 2 }, battle: { kind: 'duel', title: '阵灵', elites: 1, cultOnly: true } } },
        { label: '先讲好价钱', desc: '灵石 +40', eff: { stones: 40, chain: { op: 'start', yuan: 0 } } },
        { label: '不信她，走开' },
      ],
    },
    beats: [
      {
        locs: ['bazaar', 'roam'],
        text: '坊市里她认出你，非要请你喝酒，说欠你一条命。喝到一半，她说要去取一株月下雪莲，一个人去不了。',
        options: [
          { label: '陪她去', desc: '下一圈有一场妖潮', eff: { chain: { yuan: 2, mark: 'lotus' }, echo: { text: '月下雪莲旁守着一群妖兽。', eff: { battle: { kind: 'beast', title: '雪莲守兽', cultOnly: true } }, laps: 1 } } },
          { label: '送她一张护身符', desc: '灵石 -30', need: { stones: 30 }, eff: { stones: -30, chain: { yuan: 1 } } },
          { label: '推说要闭关', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['sect', 'cross', 'roam'],
        text: '她的师门来人了：她早被许给掌门之子，师门要她回山，也要你离她远点。',
        options: [
          { label: '当面替她挡下', desc: '斗法：师门长老，结仇', eff: { grudge: true, battle: { kind: 'duel', title: '师门长老', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '劝她回山', desc: '功德 +10', eff: { merit: 10, chain: { yuan: -1, mark: 'parted' } } },
          { label: '陪她一起做散修', desc: '宗门路线：逐出宗门', eff: { flag: 'expelled', chain: { yuan: 1 } } },
          { label: '把雪莲送给她师父做聘礼', need: { mark: 'lotus' }, eff: { text: '师门不再追究。', chain: { yuan: 2 } } },
        ],
      },
    ],
    end: {
      locs: ['cave', 'quiet'],
      text: '你渡劫那天，她来了，坐在你身后三丈。',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'parted', yuanMax: 3 }, text: '她没来。', eff: { hl: { text: '有一个人没来', score: 60 } } },
        { tier: 'top', text: '你们结为道侣。这次天劫，她替你挡一道雷。', eff: { partner: '云中仙子', flag: 'trialEase' } },
        { tier: 'mid', text: '她替你护法到天亮就走了。这次天劫少一道雷。', eff: { flag: 'trialEase', acq: { role: '云中仙子', relation: 'vow' } } },
        { tier: 'low', text: '她没来。', eff: { hl: { text: '有一个人没来', score: 60 } } },
      ],
    },
  },
  {
    id: 'D02', name: '青梅', group: '道侣链', gain: '道侣「青梅」', stage: 'mortal',
    // 白狐命灯 ≥ 6 时邻家的孩子由白狐来当，D02 不出现
    when: (L, M) => L.age >= 6 && L.age <= 12 && canWed(L) && foxLamp(M) < 6,
    start: {
      locs: ['school', 'neighbor'],
      text: '隔壁的丫头和你同一天进学堂，她把砚台分了你一半。',
      options: [
        { label: '收下', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '回她一颗糖', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '嫌她烦' },
      ],
    },
    beats: [
      {
        locs: ['river', 'fair'],
        text: '上元节她拉你去放河灯，问你灯上写了什么。',
        options: [
          { label: '说实话，写的是她', eff: { chain: { yuan: 2, mark: 'vow' } } },
          { label: '说写的是「求仙」', desc: '下一次仙缘判定 +1', eff: { flag: 'qiuxian_roll' } },
          { label: '不去', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['home', 'cross'],
        when: (L) => L.inDao || L.age >= 16,
        text: '仙门来接你，她站在村口送你。',
        textIf: [{ need: { mortal: true }, text: '她家托媒人来问。' }],
        options: [
          { label: '许她「等我」', need: { cult: true }, eff: { chain: { yuan: 1, mark: 'wait' } } },
          { label: '带她一起上山', desc: '气运判定', need: { cult: true }, roll: { attr: 'luck', dc: 6, ok: { text: '她也入了道。', chain: { yuan: 2, mark: 'together' } }, fail: { chain: { yuan: 1 } } } },
          { label: '不回头', need: { cult: true }, eff: { chain: { yuan: -2 } } },
          { label: '成亲', need: { mortal: true }, eff: { chain: { mark: 'wed' } } },
          { label: '推了', need: { mortal: true }, eff: { chain: { yuan: -2 } } },
        ],
      },
    ],
    end: {
      locs: ['home', 'cross'],
      when: (L) => L.age >= 40,
      text: '隔壁的灯还亮着。',
      textIf: [
        { need: { mark: 'together' }, text: '她筑基那年。' },
        { need: { mark: 'wed' }, text: '儿孙满堂那年。' },
        { need: { mark: 'wait' }, text: '你下山回乡，她已经老了，还在村口。' },
      ],
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'together', yuanMin: 4 }, text: '你们结为道侣。', eff: { partner: '青梅' } },
        { tier: 'top', need: { mark: 'wed' }, text: '你们做了一世凡人夫妻，白头到老。', eff: { partner: '青梅', attr: { fam: 2 }, hl: { text: '白头', score: 70 } } },
        { tier: 'top', text: '你陪她到最后。', eff: { age: 10, merit: 50, hl: { text: '陪她到最后', score: 70 }, acq: { role: '青梅', relation: 'vow' } } },
        { tier: 'mid', text: '她嫁了别人，托人送来一双鞋。', eff: { acq: { role: '青梅', relation: 'vow' } } },
        { tier: 'low', text: '她搬走了。' },
      ],
    },
  },
  {
    id: 'D03', name: '求入道的女子', group: '道侣链', gain: '道侣「求入道的女子」', stage: 'cult',
    when: canWed,
    start: {
      locs: ['cross'],
      text: '一位凡人女子求你带她入道。',
      options: [
        { label: '收为弟子', desc: '弟子 +1', eff: { disciple: 1 } },
        { label: '带她上山看看', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '拒绝' },
      ],
    },
    beats: [
      {
        locs: ['cave', 'sect', 'roam'],
        text: '你替她测灵根，测出下品杂灵根。她听完，没说话。',
        options: [
          { label: '花灵石替她洗髓', desc: '灵石 -80', need: { stones: 80 }, eff: { stones: -80, chain: { yuan: 2, mark: 'rooted' } } },
          { label: '照实告诉她', eff: { chain: { yuan: 1 } } },
          { label: '劝她下山嫁人', desc: '功德 +10', eff: { merit: 10, chain: { yuan: -2 } } },
        ],
      },
      {
        locs: ['cave', 'quiet'],
        text: '她第一次闭关就走了火，经脉逆行。',
        options: [
          { label: '以自己的修为替她理顺', desc: '修为 -10%', eff: { xpPct: -10, chain: { yuan: 2 } } },
          { label: '喂她一颗丹', desc: '灵石 -40', need: { stones: 40 }, eff: { stones: -40, chain: { yuan: 1 } } },
          { label: '让她自己挺过去', desc: '五成', chance: { p: 0.5, ok: { chain: { yuan: 1 } }, fail: { text: '她修为尽废。', acq: { role: '求入道的女子', relation: 'vow' }, chain: { op: 'break' } } } },
        ],
      },
    ],
    end: {
      locs: ['cave', 'karma'],
      text: '她筑基了，在你洞府外跪了一夜。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'rooted', yuanMin: 4 }, text: '你们结为道侣。她与你同流派。', eff: { partner: '求入道的女子', gain: { id: 'tongliu', name: '同流派道侣', desc: '战斗伤害 +20%', dmg: 0.2 } } },
        { tier: 'top', text: '你们结为道侣。', eff: { partner: '求入道的女子' } },
        { tier: 'mid', text: '她拜你为师。', eff: { disciple: 1 } },
        { tier: 'low', text: '她下山去了。' },
      ],
    },
  },
];
