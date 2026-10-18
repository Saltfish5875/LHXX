// 事件库扩充 · 即时奇遇 · 凡人地点（C-家宅-5 … C-仙踪-11，共 70 条）
import type { LifeEvent } from './events';
import { need } from './chain-types';

const ev = (e: LifeEvent) => e;
const hasRoot = (L: { root: string }) => L.root !== 'none' && L.root !== 'unknown';

export const ENC_MORTAL: LifeEvent[] = [
  // ---------- 家宅 ----------
  ev({ id: 'C-家宅-5', locs: ['home'], kind: 'choice', sort: '直得', when: (L) => L.attrs.fam >= 6,
    text: '爷爷临终，把你叫到床前，从枕头底下摸出一本发黄的拳谱。',
    options: [
      { label: '收下', desc: '得黄阶拳法一门', eff: { skill: 'orbit' } },
      { label: '让给大哥', desc: '功德 +20，人情 +1', eff: { merit: 20, favor: 1 } },
    ] }),
  ev({ id: 'C-家宅-6', locs: ['home'], kind: 'choice', sort: '即时',
    text: '灶王爷的画像掉了，背后写着一行小字：「腊月二十三，莫说坏话。」',
    options: [
      { label: '贴回去', desc: '气运 +1', eff: { attr: { luck: 1 } } },
      { label: '撕了', desc: '本年家宅流水全是倒霉事', eff: { flag: 'kitchenGodTorn', text: '这一年家里诸事不顺。' } },
    ] }),
  ev({ id: 'C-家宅-7', locs: ['home'], kind: 'choice', sort: '余波', when: (L) => L.age >= 6 && L.age <= 14,
    text: '爹喝醉了，说你其实是捡来的，襁褓里还有一块玉。',
    options: [
      { label: '去翻箱底找玉', desc: '得一件随身凡器', eff: { item: 'yinling', flag: 'origin', acq: { role: '生身父母的后人', relation: 'vow' } } },
      { label: '当他醉话' },
    ] }),
  ev({ id: 'C-家宅-8', locs: ['home'], kind: 'choice', sort: '直得', when: (L) => L.attrs.fam <= 4,
    text: '一个落魄道士借宿一晚，第二天留下一只泥捏的小狗，说「它会看家」。',
    options: [
      { label: '留着', desc: '灵宠：泥狗', eff: { pet: { kind: 'clay' } } },
      { label: '扔了' },
    ] }),
  ev({ id: 'C-家宅-9', locs: ['home'], kind: 'choice', sort: '即时',
    text: '妹妹偷了邻居家的鸡，邻居找上门。',
    options: [
      { label: '替她认下', desc: '家境 -1，功德 +10', eff: { attr: { fam: -1 }, merit: 10 } },
      { label: '交出妹妹', desc: '家境 +1', eff: { attr: { fam: 1 }, text: '妹妹三天不跟你说话。' } },
      { label: '赔一只鸡', desc: '灵石 -2', eff: { stones: -2 } },
    ] }),
  ev({ id: 'C-家宅-10', locs: ['home'], kind: 'choice', sort: '余波', when: (L) => L.age >= 18,
    text: '媒婆上门，说城东王家姑娘看上你了。',
    options: [
      { label: '去相看', desc: '道侣：王家姑娘，家境 +1', eff: { partner: '王家姑娘', attr: { fam: 1 }, acq: { role: '凡人妻子', relation: 'vow' } } },
      { label: '推了' },
    ] }),
  ev({ id: 'C-家宅-11', locs: ['home'], kind: 'choice', sort: '即时',
    text: '地窖里多了一口你没见过的缸，缸里的水一年四季不结冰。',
    options: [
      { label: '拿缸水洗脸', desc: '根骨 +1', eff: { attr: { gen: 1 } } },
      { label: '把缸封起来' },
      { label: '卖给走街的道士', desc: '灵石 +25', eff: { stones: 25 } },
    ] }),
  // 修士期回乡：凡人地点入道后不在棋盘上，放到人生路口
  ev({ id: 'C-家宅-12', locs: ['cross'], kind: 'choice', sort: '余波', when: need({ cult: true }),
    text: '族里有人打着你的名号在外面欺男霸女。',
    options: [
      { label: '回去收拾他', desc: '功德 +20，家境 -1', eff: { merit: 20, attr: { fam: -1 } } },
      { label: '不管', desc: '结仇', eff: { grudge: true, chain: { id: 'YG35', op: 'skip' } } },
    ] }),

  // ---------- 学堂 ----------
  ev({ id: 'C-学堂-4', locs: ['school'], kind: 'choice', sort: '直得', when: (L) => L.attrs.wu >= 6,
    text: '先生让你写一个字，你写下的那个字，墨迹三天不干。先生说：「这是你的本命字。」',
    options: [
      { label: '问这是什么字', desc: '得被动法宝「本命字」：判定 +1', eff: { gain: { id: 'benmingzi', name: '本命字', desc: '判定 +1', roll: 1 } } },
      { label: '擦掉', desc: '符修道途 +5', eff: { school: { rune: 5 } } },
    ] }),
  ev({ id: 'C-学堂-5', locs: ['school'], kind: 'choice', sort: '即时',
    text: '先生考《千字文》，你背到一半忘了。',
    options: [
      { label: '硬编下去', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { attr: { wu: 1 }, text: '先生愣了愣，没听出来。' }, fail: { text: '先生听出来了。' } } },
      { label: '认错' },
      { label: '偷看同窗的', desc: '被抓，戒尺三下', eff: { text: '被先生抓了个正着，挨了三下戒尺。' } },
    ] }),
  ev({ id: 'C-学堂-6', locs: ['school'], kind: 'choice', sort: '余波',
    text: '新来的同窗总被人欺负，他爹是个杀猪的。',
    options: [
      { label: '护着他', desc: '结仇，「恩」故人：同窗', eff: { grudge: true, acq: { role: '同窗', relation: 'favor' } } },
      { label: '不掺和' },
    ] }),
  ev({ id: 'C-学堂-7', locs: ['school'], kind: 'choice', sort: '即时',
    text: '你在书页夹缝里发现一张前人的批注，字写得歪歪扭扭：「此处有误」。',
    options: [
      { label: '照批注改', desc: '悟性 +1', eff: { attr: { wu: 1 } } },
      { label: '去问先生', desc: '人情 +1', eff: { favor: 1, text: '先生说那是他少年时写的。' } },
    ] }),
  ev({ id: 'C-学堂-8', locs: ['school'], kind: 'choice', sort: '余波', when: (L) => L.age >= 12,
    text: '学堂的屋顶塌了，先生说缺钱修。',
    options: [
      { label: '捐出攒下的钱', desc: '灵石 -10', when: need({ stones: 10 }),
        eff: { stones: -10, flag: 'schoolUp', echo: { text: '新修的学堂里，先生待你格外上心。', eff: { attr: { wu: 1 } }, laps: 2 } } },
      { label: '不捐' },
    ] }),
  ev({ id: 'C-学堂-9', locs: ['school'], kind: 'choice', sort: '直得', when: hasRoot,
    text: '先生在你书包里塞了一本没封皮的书：「别给人看。」',
    options: [
      { label: '收下', desc: '得黄阶功法一门', eff: { skill: 'art' } },
      { label: '还给他' },
    ] }),
  ev({ id: 'C-学堂-10', locs: ['school'], kind: 'choice', sort: '即时',
    text: '先生让你们作诗咏雪，你写了一首，大家都说不吉利。',
    options: [
      { label: '改一首吉利的', desc: '家境 +1', eff: { attr: { fam: 1 } } },
      { label: '不改', desc: '悟性 +1', eff: { attr: { wu: 1 }, text: '先生暗暗点头。' } },
    ] }),
  ev({ id: 'C-学堂-11', locs: ['school'], kind: 'choice', sort: '余波',
    text: '同窗约你半夜去后山看「会走路的石头」。',
    options: [
      // YG34 纸人村的变体：石人村，本世之后云游可遇
      { label: '去', eff: { flag: 'stoneVillage', chain: { id: 'YG34', op: 'start' } } },
      { label: '不去' },
    ] }),

  // ---------- 市集 ----------
  ev({ id: 'C-市集-4', locs: ['market'], kind: 'choice', sort: '直得',
    text: '卖鸟的老汉笼子里有一只不叫的白鹦鹉，他说它只跟有缘人说话。',
    options: [
      { label: '买下', desc: '灵石 -15，灵宠：白鹦鹉', when: need({ stones: 15 }), eff: { stones: -15, pet: { kind: 'parrot' } } },
      { label: '不买' },
    ] }),
  ev({ id: 'C-市集-5', locs: ['market'], kind: 'choice', sort: '即时',
    text: '说书先生讲到一半卡住了，问台下谁知道结局。',
    options: [
      { label: '你接着讲', desc: '灵石 +5，悟性判定', eff: { stones: 5 }, roll: { attr: 'wu', dc: 6, ok: { giveHook: 'Y08', text: '说书先生收你为徒。' }, fail: {} } },
      { label: '不吭声' },
    ] }),
  ev({ id: 'C-市集-6', locs: ['market'], kind: 'choice', sort: '余波',
    text: '你帮一个小贩捡起掉了一地的枣，他说欠你一个人情。',
    options: [
      { label: '收下人情', desc: '人情 +1', eff: { favor: 1 } },
      { label: '要两颗枣' },
    ] }),
  ev({ id: 'C-市集-7', locs: ['market'], kind: 'choice', sort: '即时', when: (L) => L.attrs.fam >= 5,
    text: '一个外乡人用一张旧地图换你的玉佩，说图上有宝。',
    options: [
      { label: '换', desc: '五成：下一年机缘卡必出，否则是假图', chance: { p: 0.5, ok: { flag: 'fortuneYear', text: '图是真的。' }, fail: { text: '是张假图。' } } },
      { label: '不换' },
    ] }),
  ev({ id: 'C-市集-8', locs: ['market'], kind: 'choice', sort: '直得',
    text: '有人卖身葬父，是个比你大两岁的少年，眼神很硬。',
    options: [
      { label: '买下他', desc: '灵石 -30，伙伴「书童」', when: need({ stones: 30 }), eff: { stones: -30, gain: { id: 'ally', name: '书童', desc: '参战伙伴', ally: true } } },
      { label: '只给钱不买', desc: '功德 +20，「恩」故人：卖身葬父的少年', eff: { merit: 20, acq: { role: '卖身葬父的少年', relation: 'favor' } } },
      { label: '走开' },
    ] }),
  ev({ id: 'C-市集-9', locs: ['market'], kind: 'choice', sort: '即时',
    text: '赌坊门口，有人押上了自己的寿元。',
    options: [
      { label: '跟着押', desc: '寿元 -5，气运判定', eff: { life: -5 }, roll: { attr: 'luck', dc: 6, ok: { stones: 60, flag: 'gambleWin' }, fail: {} } },
      { label: '拉他走', desc: '功德 +10', eff: { merit: 10 } },
    ] }),
  ev({ id: 'C-市集-10', locs: ['market'], kind: 'choice', sort: '余波',
    text: '一个算命的拦住你：「你印堂发黑，三年内必有血光。」',
    options: [
      { label: '花钱破灾', desc: '灵石 -20，下一个凶位改成平位', when: need({ stones: 20 }), eff: { stones: -20, flag: 'xiongPing' } },
      { label: '不信', desc: '三年内第一场凶事伤害 +20%', eff: { flag: 'bloodOmen' } },
    ] }),
  ev({ id: 'C-市集-11', locs: ['market'], kind: 'choice', sort: '即时',
    text: '糖人摊的老头捏了一个和你一模一样的小人。',
    options: [
      { label: '买下', desc: '气运 +1', eff: { attr: { luck: 1 } } },
      { label: '让他捏一个神仙', desc: '灵石 -2，仙缘判定 +1', eff: { stones: -2, flag: 'extraCall' } },
    ] }),

  // ---------- 邻里 ----------
  ev({ id: 'C-邻里-4', locs: ['neighbor'], kind: 'choice', sort: '直得',
    text: '王婶家的狗下了一窝崽，非要塞给你一只最瘦的。',
    options: [
      { label: '收下', desc: '灵宠：土狗', eff: { pet: { kind: 'dog' } } },
      { label: '推辞' },
    ] }),
  ev({ id: 'C-邻里-5', locs: ['neighbor'], kind: 'choice', sort: '即时',
    text: '隔壁的老秀才写了一辈子没中，临终把一箱书送给你。',
    options: [
      { label: '收下', desc: '悟性 +1', eff: { attr: { wu: 1 } } },
      { label: '卖了', desc: '灵石 +15', eff: { stones: 15 } },
    ] }),
  ev({ id: 'C-邻里-6', locs: ['neighbor'], kind: 'choice', sort: '余波',
    text: '两家为一堵墙吵了三年，都来找你评理。',
    options: [
      { label: '评给东家', desc: '人情 +1，结仇', eff: { favor: 1, grudge: true, text: '东家记你的好，西家从此不跟你说话。' } },
      { label: '评给西家', desc: '人情 +1，结仇', eff: { favor: 1, grudge: true, text: '西家记你的好，东家从此不跟你说话。' } },
      { label: '让两家各退三尺', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { merit: 20 }, fail: {} } },
    ] }),
  // 「夏天」：原型没有季节，不写条件
  ev({ id: 'C-邻里-7', locs: ['neighbor'], kind: 'choice', sort: '即时',
    text: '巷子里纳凉，老人讲了一个狐仙报恩的故事。',
    options: [
      { label: '认真听', eff: { text: '你记住了故事里那只白狐。' } },
      { label: '睡着了' },
    ] }),
  ev({ id: 'C-邻里-8', locs: ['neighbor'], kind: 'choice', sort: '余波', when: (L) => L.age >= 12,
    text: '寡妇家的屋顶漏了，没人管。',
    options: [
      { label: '帮她修', desc: '功德 +15，「恩」故人：她的儿子', eff: { merit: 15, acq: { role: '寡妇的儿子', relation: 'favor' } } },
      { label: '不管' },
    ] }),
  ev({ id: 'C-邻里-9', locs: ['neighbor'], kind: 'choice', sort: '直得',
    text: '邻家的小姑娘说长大要嫁给你，拉了钩。',
    options: [
      { label: '拉钩', eff: { chain: { id: 'D02', op: 'start', yuan: 2 } } },
      { label: '跑开' },
    ] }),
  ev({ id: 'C-邻里-10', locs: ['neighbor'], kind: 'choice', sort: '即时',
    text: '半夜有人在巷子里哭，你出去一看，没人，只有一只纸灯笼。',
    options: [
      { label: '提回家', desc: '沾染墨气', eff: { trace: 'ink_touched' } },
      { label: '吹灭它' },
      { label: '送去庙里', desc: '功德 +5', eff: { merit: 5 } },
    ] }),
  ev({ id: 'C-邻里-11', locs: ['neighbor'], kind: 'choice', sort: '余波',
    text: '张屠户说你骨头硬，要教你两手杀猪的刀法。',
    options: [
      { label: '学', desc: '根骨 +1，体修道途 +5，杀生', eff: { attr: { gen: 1 }, school: { body: 5 }, kill: true } },
      { label: '不学' },
    ] }),

  // ---------- 河畔 ----------
  ev({ id: 'C-河畔-4', locs: ['river'], kind: 'choice', sort: '直得',
    text: '你钓上来一条红鲤鱼，它在网里流眼泪。',
    options: [
      // foxRiver：河畔不会溺水
      { label: '放生', desc: '「恩」故人：河里的鲤，河畔不会溺水', eff: { acq: { role: '河里的鲤', relation: 'favor' }, flag: 'foxRiver' } },
      { label: '带回家养', desc: '灵宠：红鲤', eff: { pet: { kind: 'carp' } } },
      { label: '炖了', desc: '根骨 +1', eff: { attr: { gen: 1 } } },
    ] }),
  ev({ id: 'C-河畔-5', locs: ['river'], kind: 'choice', sort: '即时',
    text: '河边洗衣的姑娘捡到一个漂来的木匣，打不开，递给你。',
    options: [
      { label: '撬开', desc: '灵石 +20 或一件凡器', chance: { p: 0.5, ok: { stones: 20 }, fail: { qi: { skill: 'sword', grade: 0 } } } },
      { label: '交给里正', desc: '人情 +1', eff: { favor: 1 } },
    ] }),
  ev({ id: 'C-河畔-6', locs: ['river'], kind: 'choice', sort: '余波',
    text: '夜里河上漂着一盏河灯，灯上写着你的名字。',
    options: [
      { label: '捞起来', desc: '本世第一次死于非命时，改成重伤一次', eff: { flag: 'lamp', gain: { id: 'ward', name: '河灯', desc: '本世第一次因事件致死时活下来', ward: true } } },
      { label: '让它漂走' },
    ] }),
  ev({ id: 'C-河畔-7', locs: ['river'], kind: 'choice', sort: '即时', when: (L) => L.attrs.gen >= 5,
    text: '有人赌你游不过河。',
    options: [
      { label: '游', desc: '根骨判定', roll: { attr: 'gen', dc: 6, ok: { stones: 20 }, fail: { injure: 1, text: '你呛了水。' } } },
      { label: '不游' },
    ] }),
  ev({ id: 'C-河畔-8', locs: ['river'], kind: 'choice', sort: '即时',
    text: '一个摆渡的老人收钱不收铜板，只收一句真话。',
    options: [
      { label: '说一句真话', desc: '悟性 +1', eff: { attr: { wu: 1 } } },
      { label: '说假话', eff: { text: '他照样渡你，只是一路不看你。' } },
    ] }),
  ev({ id: 'C-河畔-9', locs: ['river'], kind: 'choice', sort: '余波', when: (L) => L.era === 'E3',
    text: '退潮后沙滩上搁浅了一条小鲸，渔民围着要剖。',
    options: [
      { label: '拦着', desc: '功德 +30，「恩」故人：海里的鲸', eff: { merit: 30, acq: { role: '海里的鲸', relation: 'favor' }, flag: 'whaleFavor' } },
      { label: '不拦', desc: '灵石 +10', eff: { stones: 10 } },
    ] }),
  ev({ id: 'C-河畔-10', locs: ['river'], kind: 'choice', sort: '直得', when: hasRoot,
    text: '河底有一块会发光的石头，你潜下去摸到了。',
    options: [
      { label: '带上来', desc: '得随身凡器「河光石」，夜里不怕鬼', eff: { gain: { id: 'keep', name: '河光石', desc: '夜里不怕鬼' } } },
      { label: '放回去' },
    ] }),
  ev({ id: 'C-河畔-11', locs: ['river'], kind: 'choice', sort: '即时',
    text: '河伯庙的香炉翻了，河水一下子涨了一尺。',
    options: [
      { label: '扶起香炉', desc: '气运 +1', eff: { attr: { luck: 1 } } },
      { label: '跑' },
    ] }),

  // ---------- 官道 ----------
  ev({ id: 'C-官道-5', locs: ['road'], kind: 'choice', sort: '即时', when: (L) => L.age >= 12,
    text: '一队囚车经过，车里的人朝你喊：「告诉我娘，我没偷。」',
    options: [
      { label: '记下他的话，去找他娘', desc: '功德 +20', eff: { merit: 20 } },
      { label: '当没听见' },
    ] }),
  ev({ id: 'C-官道-6', locs: ['road'], kind: 'choice', sort: '余波',
    text: '路边一具无名尸，怀里揣着一封信。',
    options: [
      { label: '埋了他，送信', desc: '年龄 +1，「恩」故人：收信人', eff: { age: 1, acq: { role: '收信人', relation: 'favor' } } },
      { label: '只拿钱', desc: '灵石 +15，留下心魔', eff: { stones: 15, trace: 'heart_demon' } },
    ] }),
  ev({ id: 'C-官道-7', locs: ['road'], kind: 'choice', sort: '直得',
    text: '驿站要宰一匹瘸了腿的老马。',
    options: [
      { label: '买下', desc: '灵石 -20，坐骑：老马', when: need({ stones: 20 }), eff: { stones: -20, pet: { kind: 'horse', name: '老马' }, flag: 'oldHorse' } },
      { label: '不买' },
    ] }),
  ev({ id: 'C-官道-8', locs: ['road'], kind: 'choice', sort: '即时', when: (L) => L.era === 'E2',
    text: '溃兵抢粮，你被拦在路上。',
    options: [
      { label: '交出干粮', desc: '家境 -1', eff: { attr: { fam: -1 } } },
      { label: '跑', desc: '根骨判定', roll: { attr: 'gen', dc: 6, ok: { text: '你跑掉了。' }, fail: { injure: 1, text: '你没跑掉，挨了一顿打。' } } },
      { label: '跟他们讲理', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { text: '一个溃兵分你半块饼。' }, fail: { text: '没人听你的。' } } },
    ] }),
  ev({ id: 'C-官道-9', locs: ['road'], kind: 'choice', sort: '余波',
    text: '县衙贴出告示：城外破庙夜夜闹鬼，悬赏五两。',
    options: [
      { label: '去查', eff: { flag: 'caseOpen' } },
      { label: '不去' },
    ] }),
  ev({ id: 'C-官道-10', locs: ['road'], kind: 'choice', sort: '即时', when: need({ flag: 'caseOpen' }),
    text: '破庙里没有鬼，只有一个被关了十年的疯女人，墙上写满了「冤」。',
    options: [
      { label: '报官', desc: '功德 +20，县令记恨', eff: { merit: 20, grudge: true } },
      { label: '自己放她走', desc: '结仇：县令', eff: { grudge: true, acq: { role: '县令', relation: 'grudge' } } },
      { label: '问她冤从何来', eff: { flag: 'caseTwo' } },
    ] }),
  ev({ id: 'C-官道-11', locs: ['road'], kind: 'choice', sort: '即时', when: need({ flag: 'caseTwo' }),
    text: '她说县令当年杀了她全家，换了身份做官。你找到了县令左肩的刺青。',
    options: [
      { label: '告到州府', desc: '家境 +2，功德 +40', eff: { attr: { fam: 2 }, merit: 40, text: '县令下狱。' } },
      { label: '私下了断', desc: '斗法：县令，杀生', eff: { battle: { kind: 'duel', title: '县令', elites: 1, cultOnly: true, win: { kill: true } } } },
      { label: '拿把柄敲他一笔', desc: '灵石 +100，留下心魔', eff: { stones: 100, trace: 'heart_demon' } },
    ] }),
  ev({ id: 'C-官道-12', locs: ['road'], kind: 'choice', sort: '直得', when: (L) => L.attrs.gen >= 6,
    text: '镖局总镖头看中你，要把女儿许给你，条件是入赘。',
    options: [
      { label: '入赘', desc: '道侣：镖头之女，家境 +2', eff: { partner: '镖头之女', attr: { fam: 2 }, giveHook: 'Y06' } },
      { label: '不入赘' },
    ] }),

  // ---------- 病榻 ----------
  ev({ id: 'C-病榻-4', locs: ['sickbed'], kind: 'choice', sort: '即时',
    text: '发了三天高烧，你梦见自己在一条很长的走廊里，尽头有盏灯。',
    options: [
      { label: '走过去', desc: '宿慧 +5', eff: { insight: 5, text: '走廊尽头的灯下，有人在等你。' } },
      { label: '往回走', eff: { text: '病好了。' } },
    ] }),
  ev({ id: 'C-病榻-5', locs: ['sickbed'], kind: 'choice', sort: '余波',
    text: '郎中说你这病要拿人参吊命，家里只够买一根。',
    options: [
      { label: '吃', desc: '家境 -2，根骨 +1', eff: { attr: { fam: -2, gen: 1 } } },
      { label: '留给病重的奶奶', desc: '功德 +20，「恩」故人：奶奶', eff: { merit: 20, acq: { role: '奶奶', relation: 'favor' }, text: '奶奶多活了三年。' } },
    ] }),
  ev({ id: 'C-病榻-6', locs: ['sickbed'], kind: 'choice', sort: '直得',
    text: '病中你听见床底下有人说话，是一只修炼了三百年的老鼠精。',
    options: [
      { label: '跟它做个交易', desc: '寿元 -3，得黄阶功法「鼠遁」', eff: { life: -3, skill: 'frost' } },
      { label: '叫娘来', eff: { text: '它跑了。' } },
    ] }),
  ev({ id: 'C-病榻-7', locs: ['sickbed'], kind: 'choice', sort: '即时', when: (L) => L.age >= 55,
    text: '孙子守在床边，问你这辈子最后悔什么。',
    options: [
      { label: '说实话', desc: '墓志铭多一句真心话', eff: { hl: { text: '临终说了一句真心话', score: 40 } } },
      { label: '说没有', desc: '心魔难度 -1', eff: { flag: 'heartDown' } },
    ] }),
  ev({ id: 'C-病榻-8', locs: ['sickbed'], kind: 'choice', sort: '余波', when: (L) => L.talents.includes('sickly') && !('cured' in L.flags),
    text: '一个游方和尚说你的病是前世欠的债。',
    options: [
      { label: '跟他出家', desc: '体弱解除', eff: { flag: 'cured', attr: { gen: 2 }, text: '你剃了头，跟着和尚走了。' } },
      { label: '把他赶走' },
    ] }),
  ev({ id: 'C-病榻-9', locs: ['sickbed'], kind: 'choice', sort: '即时',
    text: '药里有一味蝎子，你不肯喝。',
    options: [
      { label: '捏着鼻子喝', desc: '暗伤 -1', eff: { injure: -1 } },
      { label: '倒掉', desc: '年龄 +1', eff: { age: 1, text: '病拖长了一年。' } },
    ] }),

  // ---------- 庙会 ----------
  ev({ id: 'C-庙会-4', locs: ['fair'], kind: 'choice', sort: '直得',
    text: '抛绣球招亲，绣球砸在你头上。',
    options: [
      { label: '认了', desc: '道侣：绣球姑娘，家境 +2，仙缘判定 +1', eff: { partner: '绣球姑娘', attr: { fam: 2 }, flag: 'extraCall' } },
      { label: '扔回去', desc: '她家记恨', eff: { grudge: true } },
    ] }),
  ev({ id: 'C-庙会-5', locs: ['fair'], kind: 'choice', sort: '即时',
    text: '套圈的摊子上，最远那个圈套的是一只青铜小鼎。',
    options: [
      { label: '花十文套', desc: '灵石 -1，气运判定', eff: { stones: -1 }, roll: { attr: 'luck', dc: 6, ok: { qi: { skill: 'fire', grade: 0 }, school: { alchemy: 5 }, text: '圈稳稳套住了小鼎。' }, fail: { text: '圈落在了鼎边上。' } } },
      { label: '不套' },
    ] }),
  ev({ id: 'C-庙会-6', locs: ['fair'], kind: 'choice', sort: '余波',
    text: '戏台上演的是「执笔人封天门」，演执笔人的那个人一直看你。',
    options: [
      { label: '散场后找他', desc: '天书线索，宿慧 +5', eff: { inspire: 1, insight: 5 } },
      { label: '不找' },
    ] }),
  ev({ id: 'C-庙会-7', locs: ['fair'], kind: 'choice', sort: '即时',
    text: '城隍庙前有人卖香，说一炷香能保一年平安。',
    options: [
      { label: '买', desc: '灵石 -3，本年一次凶位改平位', when: need({ stones: 3 }), eff: { stones: -3, flag: 'xiongPing' } },
      { label: '不买' },
    ] }),
  ev({ id: 'C-庙会-8', locs: ['fair'], kind: 'choice', sort: '直得',
    text: '一个皮影戏班子缺人，班主看你手巧。',
    options: [
      { label: '入班学三年', desc: '年龄 +3，得随身法宝「皮影」', eff: { age: 3, gain: { id: 'piying', name: '皮影', desc: '每场召唤一个替身挡一次伤', ally: true } } },
      { label: '不去' },
    ] }),
  ev({ id: 'C-庙会-9', locs: ['fair'], kind: 'choice', sort: '即时',
    text: '求了一支签，签文是空白的。',
    options: [
      { label: '再求一支', desc: '改命 +1', eff: { again: 1 } },
      { label: '收着空签', desc: '气运 +1', eff: { attr: { luck: 1 }, flag: 'blankLot' } },
    ] }),
  ev({ id: 'C-庙会-10', locs: ['fair'], kind: 'choice', sort: '余波',
    text: '一个小孩在人群里走丢了，拉着你的衣角。',
    options: [
      { label: '送他回家', desc: '功德 +10，「恩」故人：孩子', eff: { merit: 10, acq: { role: '走丢的孩子', relation: 'favor' } } },
      { label: '交给庙祝' },
    ] }),
  ev({ id: 'C-庙会-11', locs: ['fair'], kind: 'choice', sort: '即时',
    text: '傩戏的面具摊上，一个面具在对你笑。',
    options: [
      { label: '买下戴上', desc: '留下心魔，体修道途 +5', eff: { trace: 'heart_demon', school: { body: 5 } } },
      { label: '不买' },
    ] }),

  // ---------- 仙踪 ----------
  ev({ id: 'C-仙踪-4', locs: ['trace'], kind: 'choice', sort: '即时', when: hasRoot,
    text: '云里掉下来一只鞋，绣着仙鹤。',
    options: [
      { label: '等主人来取', desc: '年龄 +1，仙缘判定 +1', eff: { age: 1, flag: 'extraCall' } },
      { label: '收着', desc: '灵石 +10', eff: { stones: 10 } },
    ] }),
  ev({ id: 'C-仙踪-5', locs: ['trace'], kind: 'choice', sort: '余波',
    text: '山里两个老头下棋，让你帮看一步。',
    options: [
      { label: '指一步', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { again: 1, text: '一个老头送你一枚棋子。' }, fail: {} } },
      { label: '观棋不语', desc: '悟性 +1', eff: { attr: { wu: 1 } } },
    ] }),
  ev({ id: 'C-仙踪-6', locs: ['trace'], kind: 'choice', sort: '直得',
    text: '一只白鹤落在你面前，腿上绑着一封没写收信人的信。',
    options: [
      { label: '留下它', desc: '灵宠：白鹤', eff: { pet: { kind: 'crane' } } },
      { label: '读信', desc: '仙缘判定 +2', eff: { flag: 'extraCall', text: '信里是一个仙门的入门口诀。' } },
    ] }),
  ev({ id: 'C-仙踪-7', locs: ['trace'], kind: 'choice', sort: '即时',
    text: '你在山洞里发现一具坐着的骸骨，膝上放着一卷书。',
    options: [
      { label: '磕三个头再拿', desc: '得黄阶功法一门', eff: { skill: 'sword' } },
      { label: '直接拿', desc: '得黄阶功法一门，留下心魔', eff: { skill: 'sword', trace: 'heart_demon' } },
      { label: '不拿', desc: '功德 +10', eff: { merit: 10 } },
    ] }),
  ev({ id: 'C-仙踪-8', locs: ['trace'], kind: 'choice', sort: '余波',
    text: '一个年轻仙人御剑掉了下来，摔断了腿。',
    options: [
      { label: '照顾他', desc: '年龄 +1，「恩」故人：仙人，人情 +2', eff: { age: 1, favor: 2, acq: { role: '仙人', relation: 'favor' } } },
      { label: '偷他的剑', desc: '得一件法器剑，结仇', eff: { qi: { skill: 'sword', grade: 1 }, grudge: true } },
    ] }),
  ev({ id: 'C-仙踪-9', locs: ['trace'], kind: 'choice', sort: '即时',
    text: '山顶有一棵树，树上结着像人脸的果子。',
    options: [
      { label: '摘一个吃', desc: '五成寿元 +5', chance: { p: 0.5, ok: { life: 5 }, fail: { text: '你闹了一天肚子。' } } },
      { label: '不吃' },
    ] }),
  ev({ id: 'C-仙踪-10', locs: ['trace'], kind: 'choice', sort: '直得', when: (L) => hasRoot(L) && L.age >= 12,
    text: '一位女仙路过，看了你一眼：「骨相不错，跟我走吗？」',
    options: [
      { label: '跟她走', desc: '必得仙缘', eff: { flag: 'forceCall', chain: { id: 'YG27', op: 'start' }, text: '她是你的师尊。' } },
      { label: '舍不得家' },
    ] }),
  ev({ id: 'C-仙踪-11', locs: ['trace'], kind: 'choice', sort: '即时',
    text: '山泉边有一行脚印，走到泉水中间就没了。',
    options: [
      { label: '跟着走进泉里', desc: '仙缘判定 +1，寿元 -1', eff: { life: -1, flag: 'extraCall' } },
      { label: '不跟' },
    ] }),
];
