// 因果链 YG01～YG12（内容库「事件库扩充」第三节：金手指与随身前辈、恩怨与逆袭）
import type { ChainDef } from './chain-types';

export const CHAINS_A: ChainDef[] = [
  {
    id: 'YG01', name: '剑中老鬼', group: '金手指与随身前辈', gain: '随身前辈「剑鬼」', stage: 'cult',
    start: {
      locs: ['bazaar'],
      text: '旧货摊上一把锈剑，摊主说它夜里会哭，三灵石就卖。',
      options: [
        { label: '买下', desc: '灵石 -3', need: { stones: 3 }, eff: { stones: -3, chain: { op: 'start', yuan: 1 } } },
        { label: '买下，当场拿灵气洗一遍锈', desc: '灵石 -3，修为 -2%', need: { stones: 3 }, eff: { stones: -3, xpPct: -2, chain: { op: 'start', yuan: 2 } } },
        { label: '不买' },
      ],
    },
    beats: [
      {
        locs: ['cave', 'quiet'],
        text: '半夜剑开口了：「小子，你拿剑的手势错了三十年。」',
        options: [
          { label: '请他指点', desc: '剑修道途 +10', eff: { school: { sword: 10 }, chain: { yuan: 1 } } },
          { label: '问他是谁', eff: { chain: { yuan: 2, mark: 'asked' } } },
          { label: '拿布把剑包起来', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['roam', 'cross'],
        text: '他说想看看外面的天，求你带他去一座剑宗。',
        textIf: [{ need: { mark: 'asked' }, text: '他说自己是被同门暗算死的，仇人还活着，在一座剑宗当长老。' }],
        options: [
          { label: '替他报仇', desc: '斗法：剑宗长老，结仇', eff: { grudge: true, battle: { kind: 'duel', title: '剑宗长老', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '带他远远看一眼山门就走', eff: { chain: { yuan: 1 } } },
          { label: '把剑卖回坊市', desc: '灵石 +30', eff: { stones: 30, chain: { op: 'break' } } },
        ],
      },
    ],
    end: {
      locs: ['cave', 'karma'],
      text: '剑鬼的魂越来越淡。他说：「借你的身子用一用，我替你打天下。」',
      options: [],
      endings: [
        { tier: 'top', label: '让他留下', text: '他其实在试你。他留了下来，做你的随身前辈。', eff: { gain: { id: 'elder', name: '剑鬼', desc: '判定 +1，战斗伤害 +8%', roll: 1, dmg: 0.08 } } },
        { tier: 'mid', text: '他传你一门地阶剑诀，然后散了。', eff: { skill: 'sword', canye: true } },
        { tier: 'low', label: '守住识海', text: '他真的想夺舍。', eff: { battle: { kind: 'duel', title: '心魔·剑鬼', elites: 1, cultOnly: true, win: { qi: { skill: 'sword', grade: 2 }, text: '你守住了识海，剑留了下来。' }, lose: { injure: 2 } } } },
      ],
    },
  },

  {
    id: 'YG02', name: '镜中老妪', group: '金手指与随身前辈', gain: '随身前辈「镜婆」', stage: 'any',
    start: {
      locs: ['home'],
      text: '娘的嫁妆里有一面铜镜，镜子里的你身后，站着一个老太太。',
      options: [
        { label: '跟她说话', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '把镜子扣过来', eff: { chain: { op: 'start', yuan: 1, mark: 'hidden' } } },
        { label: '告诉娘', eff: { text: '镜子被送进庙里。' } },
      ],
    },
    beats: [
      {
        locs: ['home', 'school', 'quiet'],
        text: '她教你认字，认的都是没人见过的字。',
        options: [
          { label: '学', desc: '悟性 +1', eff: { attr: { wu: 1 }, chain: { yuan: 1 } } },
          { label: '问她这是什么字', desc: '古卷灵感 +1', eff: { inspire: 1, chain: { yuan: 2 } } },
          { label: '不学', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['fair', 'bazaar', 'karma'],
        text: '她说她忘了自己的名字，只记得名字里有一个「砚」字。',
        options: [
          { label: '替她去庙里查旧籍', desc: '年龄 +1', eff: { age: 1, chain: { yuan: 2 } } },
          { label: '给她取一个新名字', eff: { chain: { yuan: 1, mark: 'renamed' } } },
          { label: '不管', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: 'any',
      text: '你找到了一块无字碑，镜子在碑前碎了。',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'renamed', yuanMax: 3 }, text: '她用新名字活下来，却不认得你了。', eff: { acq: { role: '镜中老妪', relation: 'vow' } } },
        { tier: 'top', text: '她住进你的识海，做你的随身前辈。每次判定前，你都可以问她。', eff: { gain: { id: 'elder', name: '镜婆', desc: '判定 +1', roll: 1 } } },
        { tier: 'mid', text: '她想起来了，留下一页天书线索，散了。', eff: { inspire: 1 } },
        { tier: 'low', text: '镜子碎了，碑前什么也没有。' },
      ],
    },
  },

  {
    id: 'YG03', name: '会长的葫芦', group: '金手指与随身前辈', gain: '成长法宝，三种形态', stage: 'any',
    start: {
      locs: ['trace', 'fortune'],
      text: '山涧里漂来一只拳头大的青葫芦，你一碰，它就缩成了指甲盖大小。',
      options: [
        { label: '收下', desc: '得「青葫芦」', eff: { gain: { id: 'gourd', name: '青葫芦', desc: '凡器，喂养后定形' }, chain: { op: 'start', yuan: 2 } } },
        { label: '放回水里' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '葫芦饿了，在你腰上一直撞。',
        options: [
          { label: '喂灵石', desc: '灵石 -30', need: { stones: 30 }, eff: { stones: -30, chain: { mark: 'stone' } } },
          { label: '喂一年寿元', desc: '寿元 -1', eff: { life: -1, chain: { mark: 'life' } } },
          { label: '喂妖丹或墨', need: { cult: true }, eff: { chain: { mark: 'ink' } } },
        ],
      },
      {
        locs: 'any',
        text: '它又饿了，比上次更凶。',
        options: [
          { label: '照上次那样喂', desc: '灵石 -30', need: { mark: 'stone', stones: 30 }, eff: { stones: -30, chain: { mark: 'stone' } } },
          { label: '照上次那样喂', desc: '寿元 -1', need: { mark: 'life' }, eff: { life: -1, chain: { mark: 'life' } } },
          { label: '照上次那样喂', need: { mark: 'ink', cult: true }, eff: { chain: { mark: 'ink' } } },
          { label: '换一样喂：灵石', desc: '灵石 -30', need: { noMark: 'stone', stones: 30 }, eff: { stones: -30, chain: { mark: 'stone' } } },
          { label: '换一样喂：寿元', desc: '寿元 -1', need: { noMark: 'life' }, eff: { life: -1, chain: { mark: 'life' } } },
          { label: '换一样喂：妖丹或墨', need: { noMark: 'ink', cult: true }, eff: { chain: { mark: 'ink' } } },
          { label: '饿着它', eff: { text: '它裂了一道缝。', chain: { yuan: -2, mark: 'cracked' } } },
        ],
      },
    ],
    end: {
      locs: ['cave', 'quiet', 'home'],
      text: '葫芦不撞了，安安静静挂在你腰上，长成了它想长的样子。',
      options: [],
      endings: [
        { tier: 'top', need: { markN: ['stone', 2] }, text: '它长成了聚宝葫芦。', eff: { gain: { id: 'gourd', name: '聚宝葫芦', desc: '每圈灵石 +5', lap: { stones: 5 } } } },
        { tier: 'top', need: { markN: ['life', 2] }, text: '它长成了长生葫芦。', eff: { life: 30, gain: { id: 'gourd', name: '长生葫芦', desc: '寿元 +30' } } },
        { tier: 'top', need: { markN: ['ink', 2] }, text: '它长成了斩仙葫芦。', eff: { gain: { id: 'gourd', name: '斩仙葫芦', desc: '主动法宝：每场一次，斩最近的精英' } } },
        { tier: 'low', need: { mark: 'cracked' }, text: '它饿裂了，只是一只普通葫芦。', eff: { gain: { id: 'keep', name: '普通葫芦' } } },
        { tier: 'mid', text: '混着喂，它长成了酒葫芦。', eff: { gain: { id: 'gourd', name: '酒葫芦', desc: '每场开场回满气血一次' } } },
      ],
    },
  },

  {
    id: 'YG04', name: '签到碑', group: '金手指与随身前辈', gain: '按连签次数递增', stage: 'any',
    start: {
      locs: ['trace', 'cave', 'fair'],
      text: '路边一块无字碑，你摸了一下，碑上多了一道刻痕。',
      options: [
        { label: '再摸一下', eff: { chain: { op: 'start', yuan: 1, mark: 'sign' } } },
        { label: '走开' },
      ],
    },
    beats: [
      {
        locs: 'same',
        text: '之后每圈停到这一格，碑上多一道痕；某一圈没停到，痕全没了。',
        options: [
          { label: '取灵石', desc: '灵石 +30', eff: { stones: 30 } },
          { label: '取修为', desc: '修为 +5%', eff: { xpPct: 5 } },
        ],
      },
      {
        locs: 'same',
        text: '连签 7 次，碑上浮出一行字：「来者何人。」',
        options: [
          { label: '写上名字', desc: '得一门玄阶功法', eff: { skill: 'art', canye: true } },
          { label: '不写', desc: '再摇 +2', eff: { again: 2 } },
        ],
      },
    ],
    end: {
      locs: 'same',
      text: '连签 12 次，碑裂开，里面是空的，只有一支秃笔。',
      options: [
        { label: '收下秃笔', desc: '得一支灵器笔，附诀位 +1', eff: { qi: { skill: 'art', grade: 2 }, text: '秃笔多出一个附诀位。' } },
        { label: '把碑扶起来', desc: '宿慧 +30，下一世开局就有这块碑', eff: { insight: 30, gain: { id: 'signin', name: '签到碑', desc: '下一世开局就有这块碑，签到从 3 起', meta: 'signin' } } },
      ],
    },
  },

  {
    id: 'YG05', name: '梦中一生', group: '金手指与随身前辈', gain: '提前知道本世的一场劫', stage: 'cult',
    start: {
      locs: ['quiet', 'cave'],
      text: '入定时你做了一个梦，梦里过了三十年。',
      options: [
        { label: '记下梦', desc: '窥命：本世一处劫格提前标出', eff: { again: 1, chain: { op: 'start', yuan: 0, mark: 'dream' } } },
        { label: '忘掉它' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '梦里的第一件事应验了：你真的在那天捡到了那枚铜钱。',
        options: [
          { label: '照着梦走', eff: { chain: { yuan: 2 } } },
          { label: '故意反着走', desc: '悟性 +1', eff: { attr: { wu: 1 }, chain: { yuan: -1, mark: 'defy' } } },
        ],
      },
      {
        locs: ['cross'],
        text: '梦里这一年，你会在这里死。',
        options: [
          { label: '照着梦走', desc: '根骨判定，败则应梦而亡', roll: { attr: 'gen', dc: 6, ok: { text: '你活了下来。', chain: { yuan: 2 } }, fail: { die: '应梦而亡' } } },
          { label: '反着走', need: { mark: 'defy' }, eff: { text: '你躲过了这一死，梦从此不准了。' } },
          { label: '反着走', desc: '根骨判定，败则应梦而亡', need: { noMark: 'defy' }, roll: { attr: 'gen', dc: 6, ok: { text: '你躲过了这一死，梦从此不准了。' }, fail: { die: '应梦而亡' } } },
        ],
      },
    ],
    end: {
      locs: ['quiet'],
      text: '你又做了那个梦，这一次梦到了三十年后的自己，他在等你。',
      options: [],
      endings: [
        { tier: 'top', text: '他告诉你一劫的解法。', eff: { flag: 'trialEase' } },
        { tier: 'mid', text: '他朝你点了点头。', eff: { xpPct: 10 } },
        { tier: 'low', text: '梦从此不准了。', eff: { trace: 'heart_demon' } },
      ],
    },
  },

  {
    id: 'YG06', name: '玉简里的陌生人', group: '金手指与随身前辈', gain: '跨年代的交易与消息', stage: 'cult',
    start: {
      locs: ['fortune', 'bazaar'],
      text: '一枚旧玉简，贴在额头上能听见几个人在说话，他们说的年号你一个也没听过。',
      options: [
        { label: '插一句话', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '只听不说', eff: { chain: { op: 'start', yuan: 1, mark: 'lurk' } } },
        { label: '扔掉' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '一个自称「宗门年」的人要换你一株灵草，说他那里早绝种了。',
        options: [
          { label: '换', desc: '得一件法宝', eff: { item: '?', text: '你把一株灵草递了过去。' } },
          { label: '抬价', desc: '灵石 +60', eff: { stones: 60, chain: { yuan: -1 } } },
          { label: '白送', desc: '功德 +10', eff: { merit: 10, chain: { yuan: 2 } } },
        ],
      },
      {
        locs: 'any',
        text: '一个说话很慢的人说他在「天门前夜」，门还没塌，问你门塌了没有。',
        options: [
          { label: '告诉他', eff: { chain: { yuan: 2, mark: 'told' } } },
          { label: '骗他说没塌' },
          { label: '不答', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['karma', 'rift'],
      text: '玉简烫手，只剩那个说话很慢的人还在。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'told' }, text: '他托你带一句话给三千年后，留下一页天书线索。', eff: { inspire: 1 } },
        { tier: 'top', text: '他托你带一句话给三千年后，留下一页天书线索。', eff: { inspire: 1 } },
        { tier: 'mid', text: '他送你一件前朝灵器。', eff: { qi: { skill: 'sword', grade: 2 } } },
        { tier: 'low', text: '玉简碎了。' },
      ],
    },
  },

  {
    id: 'YG07', name: '退婚', group: '恩怨与逆袭', gain: '一位道侣，或一桩了结的因果', stage: 'mortal',
    when: (L) => L.age >= 16,
    start: {
      locs: ['home'],
      text: '指腹为婚的那家人上门退婚，当着全族的面，说你配不上。',
      options: [
        { label: '立下三年之约', eff: { chain: { op: 'start', yuan: 1, mark: 'vow' } } },
        { label: '撕了婚书', desc: '家境 -1', eff: { attr: { fam: -1 }, chain: { op: 'start', yuan: 2 } } },
        { label: '求他们留情', desc: '家境 -2', eff: { attr: { fam: -2 } } },
      ],
    },
    beats: [
      {
        locs: ['school', 'road', 'trace'],
        text: '你在外头听说，退婚是她自己求的，她家要送她进仙门。',
        options: [
          { label: '去仙门看她', eff: { chain: { yuan: 2 } } },
          { label: '不去' },
          { label: '托人送一封信', eff: { chain: { yuan: 1 } } },
        ],
      },
      {
        locs: ['trace', 'sect', 'roam'],
        text: '三年到了。她在山门前等你，身后站着她的师兄。',
        textIf: [{ need: { mark: 'vow' }, text: '三年到了。你得赴约。她在山门前等你，身后站着她的师兄。' }],
        options: [
          { label: '斗法', desc: '斗法：师兄', eff: { battle: { kind: 'duel', title: '师兄', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '认输', desc: '功德 +10', eff: { merit: 10, chain: { yuan: 1 } } },
          { label: '只去看一眼', need: { mortal: true }, eff: { chain: { yuan: 1 } } },
        ],
      },
    ],
    end: {
      locs: ['cross'],
      text: '她说退婚是为了不连累你：她的师门要拿她炼丹。',
      options: [],
      endings: [
        { tier: 'top', label: '带她走', text: '你带她走了，结为道侣，与她的师门结了仇。', eff: { partner: '退婚的她', grudge: true } },
        { tier: 'mid', label: '替她求情', text: '你替她求情，师门放了人。', eff: { acq: { role: '退婚的她', relation: 'favor' } } },
        { tier: 'low', text: '她进了丹炉。这桩因果，未了。', eff: { flag: 'yg07_unresolved' } },
      ],
    },
  },

  {
    id: 'YG08', name: '被夺之骨', group: '恩怨与逆袭', gain: '根骨夺回并 +1', stage: 'mortal',
    when: (L) => L.age < 6,
    start: {
      locs: ['home'],
      text: '族里来了个道人，说你骨头里有一块天骨。第二天你醒来，背上多了一道疤。',
      options: [
        { label: '摸了摸背上的疤', desc: '根骨 -3', eff: { attr: { gen: -3 }, acq: { role: '族兄', relation: 'grudge' }, chain: { op: 'start', yuan: 2 } } },
      ],
    },
    beats: [
      {
        locs: ['fortune', 'trace'],
        text: '一个独臂老人看了你的疤，说骨头可以补，只是很疼。',
        options: [
          { label: '补', desc: '寿元 -10，根骨 +2', eff: { life: -10, attr: { gen: 2 }, chain: { yuan: 2, mark: 'mended' } } },
          { label: '不补' },
        ],
      },
      {
        locs: ['sect', 'roam', 'bazaar'],
        text: '族兄成了名动一方的天骄，人人都说他生来一身天骨。',
        options: [
          { label: '当众揭穿', desc: '斗法：族兄', eff: { battle: { kind: 'duel', title: '族兄', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '私下找他', eff: { chain: { yuan: 1, mark: 'talk' } } },
          { label: '躲开', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['cross'],
      text: '他站在你面前，背后也有一道疤。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'mended', yuanMin: 4 }, text: '你夺回了天骨，仇了结了。', eff: { attr: { gen: 1 }, removeGrudge: true } },
        { tier: 'mid', need: { mark: 'talk', yuanMax: 3 }, text: '他把骨头还你一半，化敌为友。', eff: { attr: { gen: 2 }, removeGrudge: true, acq: { role: '族兄', relation: 'favor' } } },
        { tier: 'top', text: '你夺回了天骨，仇了结了。', eff: { attr: { gen: 4 }, removeGrudge: true } },
        { tier: 'mid', text: '他把骨头还你一半，化敌为友。', eff: { attr: { gen: 2 }, removeGrudge: true, acq: { role: '族兄', relation: 'favor' } } },
        { tier: 'low', text: '你没赢。', eff: { injure: 2 } },
      ],
    },
  },

  {
    id: 'YG09', name: '气运之子', group: '恩怨与逆袭', gain: '他的金手指，或一位伙伴', stage: 'cult',
    start: {
      locs: ['roam', 'cross'],
      text: '一个少年掉下悬崖没死，还捡到一本秘籍。你在崖上看着，忽然觉得这一幕你读过。',
      options: [
        { label: '下去看看他', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '记下他的脸', eff: { chain: { op: 'start', yuan: 1, mark: 'villain' } } },
        { label: '走开' },
      ],
    },
    beats: [
      {
        locs: ['bazaar', 'realm'],
        text: '你发现每次他倒霉，转眼就能翻盘；而你每次见他，都在扮演找他麻烦的那个人。',
        options: [
          { label: '照剧本找他麻烦', desc: '灵石 +40', eff: { stones: 40, chain: { yuan: -1, mark: 'villain' } } },
          { label: '帮他一把', eff: { chain: { yuan: 2 } } },
          { label: '离他远点' },
        ],
      },
      {
        locs: ['realm'],
        when: (L) => L.realm >= 2,
        text: '秘境里，你和他同时看到一枚会发光的戒指。',
        options: [
          { label: '让给他', eff: { chain: { yuan: 2 } } },
          { label: '抢', need: { mark: 'villain' }, eff: { text: '剧本里，这一场你必胜。', chain: { yuan: -2, mark: 'robbed' } } },
          { label: '抢', desc: '斗法：气运之子', need: { noMark: 'villain' }, eff: { battle: { kind: 'duel', title: '气运之子', elites: 1, cultOnly: true, win: { chain: { yuan: -2, mark: 'robbed' } } } } },
          { label: '一人一半', eff: { chain: { yuan: 1 } } },
        ],
      },
    ],
    end: {
      locs: ['karma'],
      text: '他说：「我总觉得，我们是写在同一张纸上的。」',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'robbed' }, label: '戴上戒指', text: '你戴上那枚戒指。他成了你的仇人，每世都来。', eff: { attr: { luck: 2 }, gain: { id: 'keep', name: '发光的戒指', desc: '宝器，随身法宝：气运 +2' }, acq: { role: '气运之子', relation: 'grudge' } } },
        { tier: 'top', text: '他成了你的伙伴。', eff: { gain: { id: 'ally', name: '气运之子', desc: '参战伙伴；请援时本场掉落 ×1.3', ally: true } } },
        { tier: 'mid', text: '各走各路。', eff: { acq: { role: '气运之子', relation: 'favor' } } },
        { tier: 'low', text: '各走各路。' },
      ],
    },
  },

  {
    id: 'YG10', name: '欠债修仙', group: '恩怨与逆袭', gain: '钱庄贵宾，或一身债', stage: 'cult',
    start: {
      locs: ['bazaar'],
      text: '钱庄掌柜笑眯眯地说：「道友筑基缺灵石？先借二百，三圈后还三百。」',
      options: [
        { label: '借', desc: '灵石 +200', eff: { stones: 200, chain: { op: 'start', yuan: 2 } } },
        { label: '不借' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '到期了。',
        options: [
          { label: '还清', desc: '灵石 -300', need: { stones: 300 }, eff: { stones: -300, chain: { yuan: 2 } } },
          { label: '还一半', desc: '灵石 -150，利息翻倍', need: { stones: 150 }, eff: { stones: -150, echo: { text: '钱庄来收剩下的债，利息翻了一倍。', eff: { stones: -300 }, laps: 3 } } },
          { label: '再借', desc: '灵石 +200', eff: { stones: 200, chain: { yuan: -1, mark: 'deep' } } },
        ],
      },
      {
        locs: ['cave', 'cross'],
        text: '掌柜请你吃了一顿饭，问你想不想替钱庄收账。',
        textIf: [{ need: { mark: 'deep' }, text: '债主坐在你洞府里喝你的茶。' }],
        options: [
          { label: '以身抵债，替钱庄卖命十年', desc: '年龄 +10', need: { mark: 'deep' }, eff: { age: 10, text: '十年后，债清了。', chain: { unmark: 'deep' } } },
          { label: '跑', desc: '结仇', need: { mark: 'deep' }, eff: { grudge: true, echo: { text: '钱庄的打手追上了你。', eff: { battle: { kind: 'duel', title: '钱庄打手', elites: 1, cultOnly: true } }, laps: 2 } } },
          { label: '斗法', desc: '斗法：债主', need: { mark: 'deep' }, eff: { battle: { kind: 'duel', title: '债主', elites: 1, cultOnly: true, win: { text: '债主走了，再没提那笔账。', chain: { unmark: 'deep' } } } } },
          { label: '替钱庄收账', desc: '灵石 +80，杀生', need: { noMark: 'deep' }, eff: { stones: 80, kill: true } },
          { label: '婉拒', need: { noMark: 'deep' } },
        ],
      },
    ],
    end: {
      locs: ['bazaar'],
      text: '年底钱庄对账。',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'deep' }, text: '钱庄把你的名字挂在门口，坊市不再卖你东西，直到还清。', eff: { banLoc: { loc: 'bazaar', years: 10 } } },
        { tier: 'top', text: '你成了钱庄的贵宾，可随时借三百，不计息。', eff: { gain: { id: 'guild', name: '钱庄贵宾', desc: '坊市价格 -20%', price: 0.2 } } },
        { tier: 'mid', text: '两清。' },
        { tier: 'low', text: '钱庄把你的名字挂在门口，坊市不再卖你东西，直到还清。', eff: { banLoc: { loc: 'bazaar', years: 10 } } },
      ],
    },
  },

  {
    id: 'YG11', name: '魔道少主', group: '恩怨与逆袭', gain: '魔道伙伴，或一桩功德', stage: 'cult',
    start: {
      locs: ['demon', 'roam'],
      text: '一个重伤的少年倒在你洞府门口，衣襟里露出魔宗的令牌。',
      options: [
        { label: '收留他', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '给他一颗丹就走', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '交给正道', desc: '功德 +20', eff: { merit: 20 } },
      ],
    },
    beats: [
      {
        locs: ['cave'],
        text: '正道的人搜到了你山下，挨个洞府盘问。',
        options: [
          { label: '把他藏起来', eff: { chain: { yuan: 2, mark: 'hid' } } },
          { label: '带他连夜走', desc: '寿元 -2', eff: { life: -2, chain: { yuan: 1 } } },
          { label: '交出去', desc: '人情 +2', eff: { favor: 2, chain: { op: 'break' } } },
        ],
      },
      {
        locs: ['demon', 'cross'],
        text: '他伤好了，说他爹死了，魔宗要他回去继位。',
        options: [
          { label: '劝他别回', eff: { chain: { yuan: 1 } } },
          { label: '送他回去', eff: { chain: { yuan: 2 } } },
          { label: '跟他一起去', desc: '魔修道途 +15，人情 -2', eff: { school: { demon: 15 }, favor: -2, chain: { yuan: 2 } } },
        ],
      },
    ],
    end: {
      locs: ['demon'],
      text: '他坐上了宗主之位，第一道令是找你。',
      options: [],
      endings: [
        { tier: 'top', text: '他成了你的伙伴。', eff: { gain: { id: 'ally', name: '少宗主', desc: '参战伙伴；魔域劫难敌人 -30%', ally: true } } },
        { tier: 'mid', text: '魔宗与你互不相犯，魔域不再标凶。', eff: { flag: 'demon_truce' } },
        { tier: 'low', text: '他变了。', eff: { acq: { role: '魔宗少主', relation: 'grudge' } } },
      ],
    },
  },

  {
    id: 'YG12', name: '宿敌', group: '恩怨与逆袭', gain: '宿敌（跨世）或伙伴', stage: 'cult',
    start: {
      locs: ['sect', 'roam'],
      text: '比斗场上，一个和你同年入道的人赢了你半招。他说：「下次。」',
      options: [
        { label: '回他一句「下次」', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '不理', eff: { chain: { op: 'start', yuan: 1 } } },
      ],
    },
    beats: [
      {
        locs: ['realm', 'bazaar'],
        when: (L) => L.realm >= 2,
        text: '你们在秘境门口又撞上了，只有一个人能进。',
        options: [
          { label: '斗法', desc: '斗法：宿敌', eff: { battle: { kind: 'duel', title: '宿敌', elites: 1, cultOnly: true, win: { nextLoc: 'realm', text: '你进了秘境。' } } } },
          { label: '一起闯', desc: '灵石 +30', eff: { stones: 30, text: '秘境奖励各分一半。', chain: { yuan: 2 } } },
          { label: '让他', eff: { chain: { yuan: 1 } } },
        ],
      },
      {
        locs: 'any',
        text: '他被三个人围攻，见了你，没开口求救。',
        options: [
          { label: '出手', eff: { chain: { yuan: 2 } } },
          { label: '看着', eff: { chain: { yuan: -1 } } },
          { label: '补一刀', desc: '得他的本命法宝', eff: { kill: true, qi: { skill: 'sword', grade: 2 }, acq: { role: '宿敌', relation: 'grudge' }, chain: { op: 'break' } } },
        ],
      },
    ],
    end: {
      locs: ['cross'],
      text: '你们约在山顶，最后一战。',
      options: [],
      endings: [
        { tier: 'top', text: '打完喝酒。他成了你的伙伴，之后每世都会遇见他。', eff: { gain: { id: 'nemesis', name: '宿敌', desc: '参战伙伴；之后每世都会遇见他，每赢一次宿慧 +20', ally: true, meta: 'nemesis' } } },
        { tier: 'mid', text: '不分胜负，各自离开。' },
        { tier: 'low', text: '他死在你剑下。', eff: { kill: true, trace: 'grudge' } },
      ],
    },
  },
];
