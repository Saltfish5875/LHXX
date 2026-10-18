// 因果链 YG24～YG40（内容库「事件库扩充」：师徒传承、诡异与规则、家族与基业、画卷与前世）
import type { ChainDef } from './chain-types';

export const CHAINS_C: ChainDef[] = [
  // ================= 师徒传承 =================
  {
    id: 'YG24', name: '扫地老僧', group: '师徒传承', gain: '一门天阶功法', stage: 'any',
    start: {
      locs: ['sect', 'fair'],
      text: '藏经阁外扫地的老人，扫了几十年，地上一片叶子都没有。',
      options: [
        { label: '帮他扫一会儿', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '问他扫了多少年', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '嫌他挡路' },
      ],
    },
    beats: [
      {
        locs: ['sect'],
        text: '他的扫帚断了。',
        options: [
          { label: '削一把新的给他', eff: { chain: { yuan: 2 } } },
          { label: '去坊市买一把', desc: '灵石 -5', need: { stones: 5 }, eff: { stones: -5, chain: { yuan: 1 } } },
          { label: '当没看见', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['sect'],
        when: (L) => L.inDao,
        text: '宗门遭了劫，长老们都不在，墨潮涌到了山门。',
        options: [
          { label: '守在藏经阁前', desc: '劫难：墨潮', eff: { battle: { kind: 'beast', title: '墨潮', cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '跑', eff: { chain: { yuan: -2 } } },
        ],
      },
    ],
    end: {
      locs: ['sect'],
      text: '墨潮退了。扫地的老人站在你身后，扫帚上一滴墨也没沾。',
      options: [],
      endings: [
        { tier: 'top', text: '他说「你扫地扫得还行」，传你一门天阶功法。', eff: { skill: 'orbit', canye: true } },
        { tier: 'mid', text: '他递给你一片叶子。', eff: { attr: { wu: 2 } } },
        { tier: 'low', label: '罢了', text: '第二天扫地的换了个年轻人。' },
      ],
    },
  },
  {
    id: 'YG25', name: '天才徒弟', group: '师徒传承', gain: '弟子成材，伙伴「首徒」', stage: 'cult',
    start: {
      locs: ['cross'],
      text: '村口一个孩子，一手能举起石磨，眼里有光。',
      options: [
        { label: '收为徒', desc: '弟子 +1', eff: { disciple: 1, chain: { op: 'start', yuan: 2 } } },
        { label: '指点他去别的宗门', desc: '功德 +10', eff: { merit: 10 } },
      ],
    },
    beats: [
      {
        locs: ['cave', 'sect', 'roam'],
        text: '他学得太快，三年走完你十年的路。',
        options: [
          { label: '压一压他', eff: { chain: { yuan: 1, mark: 'slow' } } },
          { label: '由着他', eff: { chain: { yuan: 2, mark: 'fast' } } },
          { label: '把压箱底的功法传给他', desc: '修为 -5%', eff: { xpPct: -5, text: '你把压箱底的功法拆开讲给他，自己的功夫退了一层。', chain: { yuan: 2 } } },
        ],
      },
      {
        locs: ['sect', 'roam', 'demon'],
        text: '他在外面杀了人，说那人该死。',
        options: [
          { label: '护着他', desc: '结仇', eff: { grudge: true, chain: { yuan: 1 } } },
          { label: '罚他', eff: { chain: { mark: 'punished' } } },
          { label: '把他交出去', eff: { chain: { yuan: -2 } } },
        ],
      },
    ],
    end: {
      locs: ['cross'],
      text: '他筑基了，跪在你面前。',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'fast', yuanMax: 2 }, label: '……', text: '他入了魔，叛出师门。', eff: { acq: { role: '叛出师门的徒弟', relation: 'grudge' } } },
        { tier: 'mid', need: { mark: 'slow', markN: ['punished', 1] }, text: '他下山自立门户。', eff: { acq: { role: '自立门户的徒弟', relation: 'favor' } } },
        { tier: 'top', text: '他留在你身边，做你的首徒，与你同流派。', eff: { gain: { id: 'ally', name: '首徒', desc: '参战伙伴，与你同流派', ally: true } } },
        { tier: 'mid', text: '他下山自立门户。', eff: { acq: { role: '自立门户的徒弟', relation: 'favor' } } },
        { tier: 'low', label: '……', text: '他入了魔，叛出师门。', eff: { acq: { role: '叛出师门的徒弟', relation: 'grudge' } } },
      ],
    },
  },
  {
    id: 'YG26', name: '废柴徒弟', group: '师徒传承', gain: '真传人；跨世还能遇见他', stage: 'cult',
    when: (L) => L.route === 'sect' || (L.holdings ?? []).some((h) => h.type === 'zong'),
    start: {
      locs: ['sect'],
      text: '测灵根，一个孩子测出五行杂灵根，满场都在笑。他看着你。',
      options: [
        { label: '收他', desc: '弟子 +1', eff: { disciple: 1, chain: { op: 'start', yuan: 2 } } },
        { label: '不收' },
      ],
    },
    beats: [
      {
        locs: ['sect', 'cave'],
        text: '别人练气三年，他练了三年还在练气一层。他每天比谁都早起。',
        options: [
          { label: '换一门笨功法给他', eff: { chain: { yuan: 2 } } },
          { label: '劝他下山', eff: { chain: { yuan: -1 } } },
          { label: '不管' },
        ],
      },
      {
        locs: ['sect'],
        text: '宗门大比，他被分去和一个天骄打。',
        options: [
          { label: '让他认输' },
          { label: '教他一招只挨打不倒的法子', eff: { chain: { yuan: 2, mark: 'tough' } } },
          { label: '替他求情换对手', desc: '人情 -1', eff: { favor: -1, chain: { yuan: 1 } } },
        ],
      },
    ],
    end: {
      locs: ['sect'],
      text: '他挨了三十招没倒。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'tough' }, text: '他打赢了第三十一招。你死后，他守着你的宗门。', eff: { disciple: 1, gain: { id: 'keep', name: '真传人', desc: '你死后他守着你的宗门' }, acq: { role: '守着你宗门的徒弟', relation: 'favor' } } },
        { tier: 'top', text: '他打赢了第三十一招。你死后，他守着你的宗门。', eff: { disciple: 1, gain: { id: 'keep', name: '真传人', desc: '你死后他守着你的宗门' }, acq: { role: '守着你宗门的徒弟', relation: 'favor' } } },
        { tier: 'mid', label: '罢了', text: '他输了，可没人再笑他。' },
        { tier: 'low', label: '罢了', text: '他下山去了。' },
      ],
    },
  },
  {
    id: 'YG27', name: '师尊的秘密', group: '师徒传承', gain: '看结局：师尊的全部传承，或反杀得到的一切', stage: 'cult',
    when: (L) => L.route === 'sect',
    start: {
      locs: ['sect'],
      text: '入门那天，一位长老当众收你为亲传，赐你一颗筑基丹。',
      options: [
        { label: '拜师', desc: '修为 +10%', eff: { xpPct: 10, chain: { op: 'start', yuan: 1 } } },
        { label: '婉拒' },
      ],
    },
    beats: [
      {
        locs: ['sect', 'cave'],
        text: '师尊对你好得过分，每月一颗丹，从不让你下山。',
        options: [
          { label: '照吃', desc: '修为 +5%', eff: { xpPct: 5 } },
          { label: '偷偷把丹留着', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { chain: { mark: 'kept' } }, fail: {} } },
          { label: '求下山历练', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: ['sect'],
        text: '你在师尊的密室里看见一座丹炉，炉壁上刻着你的生辰。',
        options: [
          { label: '当面问他', eff: { chain: { mark: 'asked' } } },
          { label: '连夜跑', desc: '宗门结仇', eff: { grudge: true, chain: { mark: 'fled' } } },
          { label: '假装没看见' },
        ],
      },
    ],
    end: {
      locs: ['sect'],
      text: '月圆夜，师尊叫你进密室。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'asked' }, text: '他说那是替你挡劫的替身炉，他在用自己的寿元换你的命。他把全部传承给了你，然后坐化。', eff: { skill: 'fire', canye: true, qi: { skill: 'fire', grade: 3 } } },
        { tier: 'mid', need: { mark: 'kept' }, label: '反制', text: '你用攒下的丹反制。', eff: { battle: { kind: 'duel', title: '师尊', elites: 1, cultOnly: true, win: { xpPct: 30, text: '你夺了他的修为。' }, lose: { injure: 2 } } } },
        { tier: 'low', need: { mark: 'fled' }, label: '……', text: '本世宗门不可去，他成了你的仇人。', eff: { banLoc: { loc: 'sect', years: 999 }, acq: { role: '师尊', relation: 'grudge' } } },
        { tier: 'low', need: {}, label: '进去', text: '你进了炉。', eff: { die: '被师尊炼成了丹' } },
      ],
    },
  },
  {
    id: 'YG28', name: '衣钵', group: '师徒传承', gain: '一座现成的宗门（产业 2 级）', stage: 'cult',
    start: {
      locs: ['roam', 'fortune'],
      text: '一个老散修靠在树下，快不行了，手里攥着一枚令牌：「替我送回山门，我是最后一个。」',
      options: [
        { label: '答应', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '拿了令牌就走', desc: '灵石 +20', eff: { stones: 20 } },
      ],
    },
    beats: [
      {
        locs: ['roam', 'cross'],
        text: '山门早荒了，只剩一个守山的哑巴。',
        options: [
          { label: '把令牌交给他', eff: { chain: { yuan: 2 } } },
          { label: '问他山门的事', eff: { chain: { yuan: 1 } } },
        ],
      },
      {
        locs: ['sect', 'roam'],
        text: '有人来占山，说这山是无主之地。',
        options: [
          { label: '替哑巴守山', desc: '斗法：占山的人', eff: { battle: { kind: 'duel', title: '占山的人', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '跟占山的讲理', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { chain: { yuan: 1 } }, fail: {} } },
          { label: '走', eff: { chain: { op: 'break' } } },
        ],
      },
    ],
    end: {
      locs: ['sect', 'roam'],
      text: '哑巴把令牌塞回你手里，跪下了。',
      options: [],
      endings: [
        { tier: 'top', text: '你继承了这座宗门。', eff: { favor: 1, gain: { id: 'zong', name: '荒山宗门', lv: 2, desc: '一座 2 级宗门产业：每圈灵石 +16', lap: { stones: 16 } } } },
        { tier: 'mid', text: '他把这座宗门的镇山功法交给了你。', eff: { skill: 'sword', canye: true } },
        { tier: 'low', label: '……', text: '哑巴死了，山门塌了。' },
      ],
    },
  },

  // ================= 诡异与规则 =================
  {
    id: 'YG29', name: '客栈守则', group: '诡异与规则', gain: '随身法宝「守则纸」', stage: 'any',
    start: {
      locs: ['roam', 'road'],
      text: '荒山客栈，墙上贴着一张纸：一、子时后不要开窗。二、掌柜只有一只眼睛。三、如果有人敲门问你是不是你，回答「不是」。',
      options: [
        { label: '住下', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '不住' },
      ],
    },
    beats: [
      {
        locs: 'same',
        text: '子时，窗外有人喊你的小名，是你娘的声音。',
        options: [
          { label: '开窗', desc: '暗伤 +2', eff: { injure: 2, chain: { yuan: -2 } } },
          { label: '不开', eff: { chain: { yuan: 2 } } },
          { label: '隔着窗问她你小时候摔断的是哪条腿', eff: { chain: { yuan: 1, mark: 'test' } } },
        ],
      },
      {
        locs: 'same',
        text: '掌柜给你端面，他有两只眼睛。',
        options: [
          { label: '吃', eff: { chain: { yuan: -2 } } },
          { label: '不吃，问「掌柜呢」', eff: { chain: { yuan: 2 } } },
          { label: '掀桌', desc: '斗法：画皮', eff: { battle: { kind: 'duel', title: '画皮', elites: 1, cultOnly: true, win: { chain: { yuan: 1 } } } } },
        ],
      },
    ],
    end: {
      locs: 'same',
      text: '有人敲门：「里面的人，是你吗？」',
      options: [
        { label: '答「不是」', desc: '随身法宝：守则纸', eff: { text: '天亮，客栈变成一片空地，地上一张纸。', gain: { id: 'rules', name: '守则纸', desc: '每场战斗第一次致命伤无效' } } },
        { label: '答「是」', desc: '劫难：墨影', eff: { text: '门开了。', battle: { kind: 'beast', title: '墨影', cultOnly: true, win: { qi: { skill: 'ink', grade: 2 } } } } },
        { label: '不答', desc: '寿元 -5', eff: { life: -5, text: '一夜无事。' } },
      ],
    },
  },
  {
    id: 'YG30', name: '第十三个月', group: '诡异与规则', gain: '多一个格的一年', stage: 'any',
    when: (_L, M) => M.lives >= 2,
    start: {
      locs: 'any',
      text: '棋盘上多了一个格，节气写的是「闰」，没人记得有这个月。',
      options: [
        { label: '停上去看看', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '绕开', eff: { text: '你绕开了，那一格本圈就不见了。' } },
      ],
    },
    beats: [
      {
        locs: 'same',
        text: '这个月里人人都在睡，只有你醒着。',
        options: [
          { label: '趁机修炼', desc: '修为 +8%', eff: { xpPct: 8 } },
          { label: '走遍村子看一看', eff: { chain: { yuan: 2, mark: 'walked' } } },
          { label: '也睡下', eff: { chain: { op: 'break' } } },
        ],
      },
      {
        locs: 'same',
        text: '你看见一个人醒着，在给睡着的人一个个描眉，用的是墨。',
        options: [
          { label: '问他在干什么', eff: { chain: { yuan: 2 } } },
          { label: '偷他的笔', desc: '斗法：描眉人', eff: { chain: { yuan: -1 }, battle: { kind: 'duel', title: '描眉人', elites: 1, cultOnly: true, win: { chain: { mark: 'stole' } } } } },
        ],
      },
    ],
    end: {
      locs: 'same',
      text: '他说：「每年多画一个月，画卷就不会烂。今年你来画。」',
      options: [],
      endings: [
        { tier: 'mid', need: { mark: 'stole' }, text: '你得了一支画骨笔。之后每世，都会有一个人在找你。', eff: { qi: { skill: 'art', grade: 3 }, acq: { role: '找画骨笔的人', relation: 'grudge' } } },
        { tier: 'top', text: '你画了一个月。', eff: { insight: 40, inspire: 1 } },
        { tier: 'mid', label: '……', text: '月过完了，你什么都不记得。' },
        { tier: 'low', label: '……', text: '月过完了，你什么都不记得。' },
      ],
    },
  },
  {
    id: 'YG31', name: '戴着你的脸', group: '诡异与规则', gain: '一具化身，或除掉一个墨中复制品', stage: 'any',
    start: {
      locs: ['market', 'bazaar'],
      text: '街上的人都跟你打招呼，说你早上才买过东西。你早上没出门。',
      options: [
        { label: '去问', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '不管' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '你远远看见了他：你的脸，你的衣裳，走路的样子比你还像你。',
        options: [
          { label: '跟上去', eff: { chain: { yuan: 1 } } },
          { label: '当街拦住', desc: '斗法：墨影', eff: { battle: { kind: 'duel', title: '墨影', elites: 1, cultOnly: true } } },
          { label: '躲开', eff: { chain: { yuan: -1 } } },
        ],
      },
      {
        locs: 'any',
        text: '他在替你做事：还了你的债，看了你的娘，也替你杀了一个仇人。',
        options: [
          { label: '谢他', eff: { chain: { yuan: 2 } } },
          { label: '让他停手' },
          { label: '找人对付他', eff: { chain: { yuan: -2 } } },
        ],
      },
    ],
    end: {
      locs: ['quiet'],
      text: '他坐在你的蒲团上，说：「你是墨里的我，还是我是墨里的你？」',
      options: [],
      endings: [
        { tier: 'top', text: '你们合一了。', eff: { gain: { id: 'clone', name: '化身', desc: '本世多一个伙伴位；化身死了你暗伤 +2', ally: true } } },
        { tier: 'mid', text: '你们各过各的。', eff: { epitaph: '世上曾有另一个你，替你还过债，看过你娘。' } },
        { tier: 'low', label: '斗法', text: '只能留下一个。', eff: { battle: { kind: 'duel', title: '墨中的你', elites: 1, cultOnly: true, win: { flag: 'inkCleansed', text: '你赢了，身上的墨气散了。' }, lose: { die: '被墨中的自己替换' } } } },
      ],
    },
  },
  {
    id: 'YG32', name: '借运', group: '诡异与规则', gain: '一次翻倍的好运', stage: 'any',
    start: {
      locs: ['fair', 'cross'],
      text: '一个穿得很体面的人，要借你三年的运，许你三百灵石。',
      options: [
        { label: '借', desc: '气运 -2，灵石 +300', eff: { attr: { luck: -2 }, stones: 300, chain: { op: 'start', yuan: 1 } } },
        { label: '不借' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '这三年你走路摔跤、喝水呛着，样样不顺。',
        options: [
          { label: '忍着', eff: { chain: { yuan: 1 } } },
          { label: '去找他' },
          { label: '请人破法', desc: '灵石 -100，气运 +2', need: { stones: 100 }, eff: { stones: -100, attr: { luck: 2 }, chain: { op: 'break' } } },
        ],
      },
      {
        locs: 'any',
        text: '三年到了，他没来还。',
        options: [
          { label: '上门讨', desc: '斗法：借运人', need: { cult: true }, eff: { battle: { kind: 'duel', title: '借运人', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '上门讨', desc: '悟性判定', need: { mortal: true }, roll: { attr: 'wu', dc: 6, ok: { chain: { yuan: 2 } }, fail: {} } },
          { label: '等' },
          { label: '算了', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: 'any',
      text: '他终于来了，满脸是灰：「还给你，连本带利。」',
      options: [],
      endings: [
        { tier: 'top', text: '他多还了一点。', eff: { attr: { luck: 3 }, again: 2 } },
        { tier: 'mid', text: '他把运还给了你。', eff: { attr: { luck: 2 } } },
        { tier: 'low', label: '……', text: '还回来的运是坏的。本世的心魔劫会更难。', eff: { flag: 'heartDemonHard' } },
      ],
    },
  },
  {
    id: 'YG33', name: '代班鬼差', group: '诡异与规则', gain: '阴司令牌（死亡延迟一年）或鬼伴', stage: 'any',
    start: {
      locs: ['sickbed', 'quiet'],
      text: '一个戴高帽的人蹲在你床头咳嗽：「我病了，你替我勾三个魂，勾完我就走。」',
      options: [
        { label: '答应', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '不答应', desc: '寿元 -3', eff: { life: -3, text: '他叹了口气。' } },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '第一个魂是一个老人，他求你让他看完孙子出生。',
        options: [
          { label: '让他看完', eff: { chain: { yuan: 1, mark: 'mercy' } } },
          { label: '照勾', eff: { chain: { yuan: 2 } } },
        ],
      },
      {
        locs: 'any',
        text: '第二个魂是个孩子。第三个魂，写的是你的名字。',
        options: [
          { label: '勾孩子，划掉自己的名字', eff: { chain: { yuan: -2 } } },
          { label: '放过孩子，勾自己', eff: { chain: { yuan: 2, mark: 'self' } } },
          { label: '两个都不勾' },
        ],
      },
    ],
    end: {
      locs: ['sickbed', 'quiet'],
      text: '鬼差的病好了，回来收簿子。',
      options: [],
      endings: [
        { tier: 'top', need: { mark: 'self' }, text: '他把你的名字划掉了，留给你一块阴司令牌。', eff: { gain: { id: 'ward', name: '阴司令牌', desc: '本世第一次因事件致死时活下来', ward: true } } },
        { tier: 'top', need: { mark: 'mercy' }, text: '老人的魂来给你磕头，从此跟着你。', eff: { merit: 60, gain: { id: 'ghost', name: '老人', desc: '参战伙伴，不能进天劫；夜里的劫难伤害 +15%', ally: true } } },
        { tier: 'low', need: {}, label: '……', text: '他收走簿子，记了你一笔。', eff: { life: -5 } },
      ],
    },
  },
  {
    id: 'YG34', name: '纸人村', group: '诡异与规则', gain: '灵宠纸鹤，或一村的香火', stage: 'any',
    start: {
      locs: ['roam', 'road'],
      text: '一个村子，人人脸色煞白，说话不张嘴。村长请你住一晚。',
      options: [
        { label: '住', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '不住' },
      ],
    },
    beats: [
      {
        locs: 'same',
        text: '你戳了一下邻桌的人，指头穿过了他的胳膊，是纸。',
        options: [
          { label: '不说破', eff: { chain: { yuan: 2 } } },
          { label: '问村长', eff: { chain: { yuan: 1 } } },
          { label: '点火', desc: '功德 -30', eff: { merit: -30, text: '火烧了一夜。', chain: { op: 'break' } } },
        ],
      },
      {
        locs: 'same',
        text: '村长说，墨潮那年全村都死了，一个扎纸匠把他们扎了回来，扎纸匠却走了。',
        options: [
          { label: '替他们找扎纸匠', eff: { chain: { yuan: 2 } } },
          { label: '劝他们安息', eff: { chain: { yuan: 1, mark: 'rest' } } },
        ],
      },
    ],
    end: {
      locs: 'same',
      text: '你找到扎纸匠的坟，坟上插着一只纸鹤。',
      options: [],
      endings: [
        { tier: 'mid', need: { mark: 'rest' }, text: '一村人对你鞠了一躬，化成纸灰。', eff: { merit: 80 } },
        { tier: 'top', text: '纸鹤飞到你肩上。', eff: { pet: { kind: 'paper', adult: true } } },
        { tier: 'mid', text: '一村人对你鞠了一躬，化成纸灰。', eff: { merit: 80 } },
        { tier: 'low', label: '……', text: '村子第二天不见了。' },
      ],
    },
  },

  // ================= 家族与基业 =================
  {
    id: 'YG35', name: '立族', group: '家族与基业', gain: '家族（跨世投生）', stage: 'cult',
    start: {
      locs: ['cross'],
      text: '你回乡，族里老老少少跪了一地，求你庇护。',
      options: [
        { label: '留下立族', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '留一笔灵石走', desc: '灵石 -100，功德 +20', need: { stones: 100 }, eff: { stones: -100, merit: 20 } },
      ],
    },
    beats: [
      {
        locs: ['cross'],
        text: '族规怎么定？',
        options: [
          { label: '耕读传家', desc: '家境 +1', eff: { attr: { fam: 1 }, chain: { yuan: 1, mark: 'farm' } } },
          { label: '以武立族', eff: { text: '族中从此出体修。', chain: { yuan: 1, mark: 'war' } } },
          { label: '修仙为先', desc: '灵石 -80', need: { stones: 80 }, eff: { stones: -80, text: '族中孩童都测了灵根。', chain: { yuan: 2, mark: 'dao' } } },
        ],
      },
      {
        locs: ['cross'],
        text: '族里出了一个天才，也出了一个败类，败类偷了族库。',
        options: [
          { label: '严惩败类', eff: { chain: { yuan: 1 } } },
          { label: '给败类一次机会', eff: { chain: { yuan: 2 } }, chance: { p: 0.3, ok: { echo: { text: '当年偷族库的败类回来了，捧着一袋灵石给你磕头。', eff: { stones: 50 }, laps: 2 } }, fail: {} } },
          { label: '把天才送进宗门', desc: '人情 +1', eff: { favor: 1, chain: { yuan: 1 } } },
        ],
      },
    ],
    end: {
      locs: ['cross'],
      text: '你在祠堂里写下族谱第一页。',
      options: [],
      endings: [
        { tier: 'top', text: '家族成立了。', eff: { gain: { id: 'clan', name: '本族', desc: '之后每世 20% 投生在本族，家境 +2', meta: 'clan' } } },
        { tier: 'mid', text: '族谱留下了，下一世家宅里的事都是本族的事。' },
        { tier: 'low', label: '……', text: '族人散了。' },
      ],
    },
  },
  {
    id: 'YG36', name: '香火成神', group: '家族与基业', gain: '死后的神位', stage: 'any',
    start: {
      locs: ['neighbor', 'roam'],
      text: '山村闹妖，村民凑了一篮鸡蛋求你。',
      options: [
        { label: '去', desc: '斗法：山妖', eff: { battle: { kind: 'beast', title: '山妖', cultOnly: true, win: { chain: { op: 'start', yuan: 1 } } } } },
        { label: '不去' },
      ],
    },
    beats: [
      {
        locs: 'same',
        text: '村里给你立了一座小祠，泥像一点也不像你。',
        options: [
          { label: '让他们重塑', eff: { chain: { yuan: 1 } } },
          { label: '由他们去', eff: { chain: { yuan: 2 } } },
          { label: '拆了', eff: { chain: { op: 'break' } } },
        ],
      },
      {
        locs: 'same',
        text: '有人在你的祠里许愿，求的是别人家死人。',
        options: [
          { label: '应他', desc: '魔修道途 +10', eff: { school: { demon: 10 }, chain: { yuan: -2, mark: 'dark' } } },
          { label: '不应', eff: { chain: { yuan: 1 } } },
          { label: '托梦劝他', eff: { chain: { yuan: 2 } } },
        ],
      },
    ],
    end: {
      locs: 'same',
      when: (L) => L.age >= 40,
      text: '你老了，梦里总有人喊你的名字。祠里的香一直没断过。',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'dark' }, label: '……', text: '你成了一尊邪神，下一世此地标凶。' },
        { tier: 'top', text: '你成了一方山神。', eff: { gain: { id: 'shrine', name: '一方山神', desc: '之后每世路过此地，劫难敌人 -15%', meta: 'shrine' } } },
        { tier: 'mid', text: '香火渐冷。下一世，你的功德起点高一些。' },
        { tier: 'low', label: '……', text: '香火渐冷。' },
      ],
    },
  },
  {
    id: 'YG37', name: '灵石矿', group: '家族与基业', gain: '商会（坊市价格 -20%，每圈分红）', stage: 'cult',
    start: {
      locs: ['bazaar'],
      text: '一个胖商人说他知道一条灵脉，缺本钱，三七分。',
      options: [
        { label: '入股', desc: '灵石 -150', need: { stones: 150 }, eff: { stones: -150, chain: { op: 'start', yuan: 1 } } },
        { label: '不入' },
      ],
    },
    beats: [
      {
        locs: ['realm', 'fortune'],
        text: '矿开了，下面挖出了墨。',
        options: [
          { label: '封矿', desc: '功德 +20', eff: { merit: 20, chain: { yuan: 1 } } },
          { label: '接着挖', desc: '灵石 +100，沾染墨气', eff: { stones: 100, trace: 'ink_touched', chain: { mark: 'greed' } } },
          { label: '雇人挖、自己不下去', desc: '灵石 +60', eff: { stones: 60 } },
        ],
      },
      {
        locs: ['bazaar'],
        text: '别家商会要吞你们的矿。',
        options: [
          { label: '硬碰', desc: '斗法：别家商会', eff: { battle: { kind: 'duel', title: '别家商会', elites: 1, cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '让一成股', eff: { chain: { yuan: 1 } } },
          { label: '卖掉', desc: '灵石 +250', eff: { stones: 250, chain: { op: 'break' } } },
        ],
      },
    ],
    end: {
      locs: ['bazaar'],
      text: '年底分红。',
      options: [],
      endings: [
        { tier: 'low', need: { mark: 'greed' }, label: '……', text: '矿底的墨涌了上来，矿塌了，灵石归零。这一世成了墨潮年。', eff: { stones: -99999, flag: 'inkYear' } },
        { tier: 'top', text: '商会成立了。', eff: { gain: { id: 'guild', name: '灵石商会', desc: '坊市价格 -20%，每圈分红灵石 +10', price: 0.2, lap: { stones: 10 } } } },
        { tier: 'mid', text: '你分到一大笔灵石。', eff: { stones: 300 } },
        { tier: 'low', label: '……', text: '矿底的墨涌了上来，矿塌了，灵石归零。这一世成了墨潮年。', eff: { stones: -99999, flag: 'inkYear' } },
      ],
    },
  },
  {
    id: 'YG38', name: '残破洞天', group: '家族与基业', gain: '随身洞天', stage: 'cult',
    start: {
      locs: ['realm'],
      text: '一颗拳头大的石头，里面有山有水，只是塌了一半。',
      options: [
        { label: '收下', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '留下' },
      ],
    },
    beats: [
      {
        locs: ['cave'],
        text: '洞天要灵气才能补。',
        options: [
          { label: '灌灵石', desc: '灵石 -100', need: { stones: 100 }, eff: { stones: -100, chain: { yuan: 2 } } },
          { label: '灌修为', desc: '修为 -10%', eff: { xpPct: -10, chain: { yuan: 2 } } },
          { label: '慢慢养', eff: { chain: { yuan: 1 } } },
        ],
      },
      {
        locs: ['cave'],
        text: '洞天里长出一株草，草叶上结着露。',
        options: [
          { label: '摘了吃', desc: '修为 +8%', eff: { xpPct: 8, chain: { yuan: -1 } } },
          { label: '等它开花', eff: { chain: { yuan: 2 } } },
        ],
      },
    ],
    end: {
      locs: ['cave'],
      text: '洞天补好了，里面有一条小河。',
      options: [],
      endings: [
        { tier: 'top', text: '洞天成了你的随身小天地。', eff: { gain: { id: 'dongtian', name: '随身洞天', lv: 2, desc: '闭关修为 +15%，可种一株灵药', xp: 0.15 } } },
        { tier: 'mid', text: '洞天只够住一只灵宠。', eff: { gain: { id: 'dongtian', name: '灵宠洞天', lv: 1, desc: '灵宠气血 +30%' } } },
        { tier: 'low', text: '洞天塌了，碎成一块灵石。', eff: { stones: 80 } },
      ],
    },
  },

  // ================= 画卷与前世 =================
  {
    id: 'YG39', name: '补画匠', group: '画卷与前世', gain: '天书线索与墨抗性', stage: 'cult',
    when: (_L, M) => M.saga.volume >= 2,
    start: {
      locs: ['rift', 'roam'],
      text: '一个老匠人坐在天边，拿一块绢补天上的一个窟窿。',
      options: [
        { label: '帮他递针', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '问他是谁', eff: { chain: { op: 'start', yuan: 2 } } },
        { label: '走开' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '他说下一处破洞在你家乡的山后。',
        options: [
          { label: '去补', desc: '耗 3 年', eff: { age: 3, chain: { yuan: 2 } } },
          { label: '告诉乡人搬走', desc: '功德 +20', eff: { merit: 20, chain: { yuan: 1 } } },
        ],
      },
      {
        locs: ['demon', 'rift'],
        text: '第三处破洞在魔域，墨正往外淌。',
        options: [
          { label: '补', desc: '劫难：墨潮', eff: { battle: { kind: 'beast', title: '墨潮', cultOnly: true, win: { chain: { yuan: 2 } } } } },
          { label: '叫他自己去', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['rift'],
      text: '他把针交给你：「补不完的。你接着补。」',
      options: [],
      endings: [
        { tier: 'top', text: '你接过了补画针，也看见了天书的一页。', eff: { inspire: 1, gain: { id: 'needle', name: '补画针', desc: '主动法宝：一场一次清空身边的墨沼' } } },
        { tier: 'mid', text: '本世墨潮伤你少了两成。', eff: { flag: 'inkResist' } },
        { tier: 'low', label: '……', text: '他走了，窟窿还在。' },
      ],
    },
  },
  {
    id: 'YG40', name: '另一个你', group: '画卷与前世', gain: '继承前世的一门功法', stage: 'cult',
    when: (_L, M) => M.lives >= 5,
    start: {
      locs: ['quiet', 'karma'],
      text: '入定时，有个人坐在你对面，穿着你上上辈子的衣服。',
      options: [
        { label: '跟他说话', eff: { chain: { op: 'start', yuan: 1 } } },
        { label: '睁眼' },
      ],
    },
    beats: [
      {
        locs: 'any',
        text: '他问你这一世过得怎么样。',
        options: [
          { label: '说实话', eff: { chain: { yuan: 2 } } },
          { label: '说很好', eff: { chain: { yuan: 1 } } },
          { label: '问他上辈子怎么死的', eff: { text: '他说了。你记下了那一世的一桩遗憾。', flag: 'regretHint', chain: { yuan: 1 } } },
        ],
      },
      {
        locs: 'any',
        text: '他说他还有一件事没做完。',
        options: [
          { label: '替他做', eff: { text: '你应下了他那一世没做完的事。', flag: 'pastUnfinished', chain: { yuan: 2 } } },
          { label: '不替', eff: { chain: { yuan: -1 } } },
        ],
      },
    ],
    end: {
      locs: ['quiet'],
      text: '他越来越淡，说该走了。',
      options: [],
      endings: [
        { tier: 'top', text: '他把那一世最好的一门功法给了你。', eff: { flag: 'pastSkill' } },
        { tier: 'mid', text: '他走了，留下一些你本该记得的东西。', eff: { insight: 40 } },
        { tier: 'low', label: '……', text: '他没说再见。' },
      ],
    },
  },
];
