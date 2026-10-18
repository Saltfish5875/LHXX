// 即时奇遇：修士地点（后半）——因果、妖林、秘境、魔域、画外裂隙、天门前庭（内容库「事件库扩充」）
import type { AcqRelation, LifeState, MetaState } from '../game/types';
import { need } from './chain-types';
import type { LifeEvent } from './events';

const ev = (e: LifeEvent) => e;
const hasAcq = (rel: AcqRelation) => (_L: LifeState, M: MetaState) => (M.acquaintances ?? []).some((a) => a.relation === rel && !a.resolved);
const hasNemesis = (L: LifeState, M: MetaState) => !!M.nemesis || (L.gains ?? []).some((g) => g.id === 'nemesis');
const hasTrace = (tag: string) => (L: LifeState) => L.traces.some((t) => t.tag === tag);

export const ENC_CULT_B: LifeEvent[] = [
  // ---------- 因果 ----------
  ev({ id: 'C-因果-1', locs: ['karma'], kind: 'choice', sort: '余波', when: hasAcq('grudge'),
    text: '当年被你打断腿的那个人，如今成了一城之主，派人请你赴宴。',
    options: [
      { label: '去', desc: '悟性判定：和解，或斗法', roll: { attr: 'wu', dc: 6,
        ok: { favor: 1, text: '席间他举杯，旧账一笔勾销。' },
        fail: { battle: { kind: 'duel', title: '城主', elites: 1, cultOnly: true } } } },
      { label: '不去', desc: '他下一世也记得你', eff: { flag: 'feud', acq: { role: '被你打断腿的城主', relation: 'grudge' } } },
    ] }),
  ev({ id: 'C-因果-2', locs: ['karma'], kind: 'choice', sort: '即时', when: hasAcq('favor'),
    text: '你救过的那只小狐狸的后代，叼来一枚果子放在你门口。',
    options: [
      { label: '吃', desc: '寿元 +5', eff: { life: 5 } },
      { label: '种下', desc: '三年后长成一株灵果树', eff: { echo: { text: '门口那枚果核长成了一株灵果树。', eff: { life: 5, xpPct: 3 }, laps: 3 } } },
    ] }),
  ev({ id: 'C-因果-3', locs: ['karma'], kind: 'choice', sort: '余波', when: (_L, M) => M.regrets.length > 0,
    text: '你走到一座桥上，桥头有个老妇人在等人。她看着你，叫出了你上一世的名字。',
    options: [
      { label: '应她', desc: '了结一段前世遗憾，宿慧 +20', eff: { insight: 20, text: '一段前世的遗憾，在桥头了结了。' } },
      { label: '装作不认识', desc: '遗憾留到下一世', eff: { next: { regretKeep: 1 } } },
    ] }),
  ev({ id: 'C-因果-4', locs: ['karma'], kind: 'choice', sort: '即时', when: (L) => 'grudge' in L.flags,
    text: '仇家的儿子找上门，他才十岁，手里握着一把菜刀。',
    options: [
      { label: '放他走', desc: '他长大后或成仇，或被你感化', chance: { p: 0.5,
        ok: { acq: { role: '仇家的儿子', relation: 'favor' }, text: '他被你感化了。' },
        fail: { acq: { role: '仇家的儿子', relation: 'grudge' }, text: '他长大了，还记着这笔账。' } } },
      { label: '收他做弟子', desc: '弟子 +1', eff: { disciple: 1, text: '他拜了师，看你的眼神还是冷的。' } },
      { label: '让他砍一刀', desc: '暗伤 +1，仇了', eff: { injure: 1, removeGrudge: true, text: '一刀下去，两家的仇了了。' } },
    ] }),
  ev({ id: 'C-因果-5', locs: ['karma'], kind: 'choice', sort: '直得', when: (L) => L.merit >= 100,
    text: '你帮过的那些凡人凑钱给你立了一座生祠。',
    options: [
      { label: '受了', desc: '生祠：本世劫难敌人 -10%', eff: { gain: { id: 'shrine', name: '生祠', desc: '本世战斗伤害 +10%', dmg: 0.1 } } },
      { label: '让他们拆了', desc: '功德 +20', eff: { merit: 20 } },
    ] }),
  ev({ id: 'C-因果-6', locs: ['karma'], kind: 'choice', sort: '余波',
    text: '你上一世埋下的一坛酒，被这一世的你挖了出来。',
    options: [
      { label: '喝', desc: '修为 +6%，宿慧 +10', eff: { xpPct: 6, insight: 10, text: '酒入喉，你想起了上一世的一件事。' } },
      { label: '留给下一世', desc: '再埋回去，下一世修为 +10%', eff: { flag: 'wineKept', text: '你把酒坛埋了回去。' } },
    ] }),
  ev({ id: 'C-因果-7', locs: ['karma'], kind: 'choice', sort: '即时', when: hasAcq('vow'),
    text: '你答应过要去看一个人，今年是最后的期限。',
    options: [
      { label: '去', desc: '功德 +20，「诺」了结', eff: { merit: 20, acqResolve: true } },
      { label: '不去', desc: '气运 -2，故人变成「仇」', eff: { attr: { luck: -2 }, acq: { role: '等你的故人', relation: 'grudge' } } },
    ] }),
  ev({ id: 'C-因果-8', locs: ['karma'], kind: 'choice', sort: '余波', when: hasNemesis,
    text: '宿敌死了，死前托人给你带了一句话：「下一世，我先找到你。」',
    options: [
      { label: '收下他的遗物', desc: '得他的本命法宝，宿敌下一世高一个境界', eff: { qi: { skill: 'sword', grade: 2 }, flag: 'nemesisUp' } },
      { label: '烧了', desc: '宿敌下一世不认得你', eff: { flag: 'nemesisForget', text: '遗物烧成了灰。' } },
    ] }),

  // ---------- 妖林 ----------
  ev({ id: 'C-妖林-4', locs: ['forest'], kind: 'choice', sort: '即时',
    text: '一群猴子把你的行囊抢走了，挂在树顶上。',
    options: [
      { label: '爬上去', desc: '身法判定', roll: { attr: 'gen', dc: 6,
        ok: { text: '你攀上树顶，把行囊拿了回来。' },
        fail: { stones: -10, text: '你摔了下来，行囊里的灵石撒了一地。' } } },
      { label: '拿灵果换', desc: '灵石 -5', when: need({ stones: 5 }), eff: { stones: -5 } },
      { label: '放火烧树', desc: '斗法：猴王', eff: { battle: { kind: 'duel', title: '猴王', elites: 1, cultOnly: true } } },
    ] }),
  ev({ id: 'C-妖林-5', locs: ['forest'], kind: 'choice', sort: '直得',
    text: '一只白狐狸崽被夹子夹住了腿，冲你龇牙。',
    options: [
      { label: '救它', desc: '灵宠：小狐', eff: { pet: { kind: 'fox' } } },
      { label: '不管它' },
    ] }),
  ev({ id: 'C-妖林-6', locs: ['forest'], kind: 'choice', sort: '余波',
    text: '树妖说它想去看海，求你把它的一颗种子带出林子。',
    options: [
      { label: '带上', desc: '到河畔种下，下一世那里长出一片林子', eff: { flag: 'seed', text: '你把种子揣进了怀里。' } },
      { label: '不带' },
    ] }),
  ev({ id: 'C-妖林-7', locs: ['forest'], kind: 'choice', sort: '直得', when: need({ realm: 2 }),
    text: '一头老虎拦住你的路，它身上全是伤，背后是一窝小虎。',
    options: [
      { label: '替它疗伤', desc: '灵宠：山君', eff: { pet: { kind: 'tiger' } } },
      { label: '绕开' },
      { label: '趁虚而入', desc: '得虎骨，体修道途 +10，结仇：妖族', eff: { school: { body: 10 }, grudge: true, text: '你剔下了一副虎骨。' } },
    ] }),
  ev({ id: 'C-妖林-8', locs: ['forest'], kind: 'choice', sort: '即时',
    text: '一只会说话的乌鸦告诉你，林子东边有宝，西边有死。',
    options: [
      { label: '往东', desc: '五成真有宝', chance: { p: 0.5,
        ok: { item: '?', text: '东边真有宝。' },
        fail: { text: '乌鸦骗了你。' } } },
      { label: '往西', desc: '妖潮，掉落好一档', eff: { battle: { kind: 'beast', title: '林西', reward: 1.5, cultOnly: true } } },
      { label: '抓住乌鸦问清楚' },
    ] }),
  ev({ id: 'C-妖林-9', locs: ['forest'], kind: 'choice', sort: '余波', when: need({ pet: true }),
    text: '你的灵宠跟一群同族跑了，三天没回来。',
    options: [
      { label: '去找', desc: '找回来的灵宠升一级', eff: { flag: 'petHome', echo: { text: '你把它找了回来，它好像长大了一些。', laps: 2 } } },
      { label: '等它', desc: '七成回来', chance: { p: 0.7,
        ok: { text: '它自己回来了。' },
        fail: { flag: 'petLost', text: '它没有回来。' } } },
    ] }),
  ev({ id: 'C-妖林-10', locs: ['forest'], kind: 'choice', sort: '直得',
    text: '一条小蛇缠在你手腕上，怎么也甩不掉。',
    options: [
      { label: '留着', desc: '灵宠：青蛇', eff: { pet: { kind: 'snake' } } },
      { label: '用火逼走它' },
    ] }),
  ev({ id: 'C-妖林-11', locs: ['forest'], kind: 'choice', sort: '即时', when: need({ realm: 3 }),
    text: '妖族在开大会，邀请你这个人族做见证。',
    options: [
      { label: '去', desc: '妖族好感 +，本世妖林的战斗少一场', eff: { flag: 'beastTruce', text: '妖族记下了你这个人族。' } },
      { label: '不去' },
    ] }),
  ev({ id: 'C-妖林-12', locs: ['forest'], kind: 'choice', sort: '余波',
    text: '一个狐妖化成人形，说她是你上一世救过的那只。',
    options: [
      { label: '信她', desc: '伙伴：狐妖', eff: { gain: { id: 'ally', name: '狐妖', desc: '参战伙伴', ally: true }, chain: { id: 'YG15', op: 'skip' } } },
      { label: '不信', desc: '「恩」故人', eff: { acq: { role: '狐妖', relation: 'favor' }, text: '她哭着走了。' } },
    ] }),
  ev({ id: 'C-妖林-13', locs: ['forest'], kind: 'choice', sort: '即时',
    text: '你踩到了一只千年蘑菇精。',
    options: [
      { label: '道歉', desc: '悟性 +1', eff: { attr: { wu: 1 }, text: '它送你一朵小蘑菇，你吃了。' } },
      { label: '摘了它', desc: '修为 +5%，蘑菇精的子孙会记得你', eff: { xpPct: 5, acq: { role: '蘑菇精的子孙', relation: 'grudge' } } },
    ] }),
  ev({ id: 'C-妖林-14', locs: ['forest'], kind: 'choice', sort: '直得', when: need({ realm: 4 }),
    text: '一枚巨大的蛋卡在两棵树之间，蛋壳上有裂缝。',
    options: [
      { label: '守到它孵出来', eff: { chain: { id: 'YG18', op: 'skip' } } },
      { label: '抱走', eff: { chain: { id: 'YG18', op: 'start' } } },
    ] }),
  ev({ id: 'C-妖林-15', locs: ['forest'], kind: 'choice', sort: '余波',
    text: '林子深处有一座无人认领的妖王坟。',
    options: [
      { label: '修坟', desc: '妖林里的妖兽对你敌意 -1 档', eff: { flag: 'tomb', text: '你把坟修好了。' } },
      { label: '挖开', desc: '得妖王内丹，修为 +10%，结仇：妖族', eff: { xpPct: 10, grudge: true } },
    ] }),

  // ---------- 秘境 ----------
  ev({ id: 'C-秘境-4', locs: ['realm'], kind: 'choice', sort: '即时',
    text: '秘境入口立着一块牌子：「组队优先，单人后果自负。」',
    options: [
      { label: '找人组队', desc: '伙伴：路人修士', eff: { gain: { id: 'ally', name: '路人修士', desc: '参战伙伴', ally: true } } },
      { label: '一个人进', desc: '劫难 +10%，掉落 +20%', eff: { flag: 'soloRealm' } },
    ] }),
  ev({ id: 'C-秘境-5', locs: ['realm'], kind: 'choice', sort: '直得', when: need({ realm: 3 }),
    text: '秘境核心有一面镜子，你在镜子里看见了另一个自己，他朝你伸出手。',
    options: [
      { label: '握住', desc: '化身：本世多一个伙伴位', eff: { gain: { id: 'clone', name: '镜中化身', desc: '参战伙伴；化身死了你暗伤 +2', ally: true } } },
      { label: '打碎镜子', desc: '修为 +10%，暗伤 +1', eff: { xpPct: 10, injure: 1 } },
    ] }),
  ev({ id: 'C-秘境-6', locs: ['realm'], kind: 'choice', sort: '余波',
    text: '一个跟你同时进秘境的人，在你面前被机关夹死了。',
    options: [
      { label: '拿走他的储物袋', desc: '灵石 +40，他的师门会来找你', eff: { stones: 40, flag: 'looted',
        echo: { text: '死者的师门找上门来了。', eff: { battle: { kind: 'duel', title: '死者师门', elites: 1, cultOnly: true } }, laps: 3 } } },
      { label: '把他背出去', desc: '功德 +20，人情 +1', eff: { merit: 20, favor: 1 } },
    ] }),
  ev({ id: 'C-秘境-7', locs: ['realm'], kind: 'choice', sort: '即时',
    text: '秘境里有一扇门，门上写着规则：「进门的人只能说真话。」',
    options: [
      { label: '进', desc: '悟性判定，成则得一门功法', roll: { attr: 'wu', dc: 6,
        ok: { skill: 'thunder', text: '门后的石壁上刻着一门掌法。' },
        fail: { flag: 'secretOut', text: '你说漏了一个秘密。' } } },
      { label: '不进' },
    ] }),
  ev({ id: 'C-秘境-8', locs: ['realm'], kind: 'choice', sort: '直得', when: (L) => (L.bag ?? []).some((t) => t.kind === 'gong' && t.grade >= 1),
    text: '石台上摆着一枚附诀，周围是十具尸体。',
    options: [
      { label: '拿', desc: '随机附诀一枚，劫难 +15%', eff: { fujue: true, flag: 'realmCursed' } },
      { label: '先看清楚尸体是怎么死的', desc: '悟性判定，成则安全拿到', roll: { attr: 'wu', dc: 6,
        ok: { fujue: true, text: '你看出了机关所在，安全拿到了附诀。' },
        fail: { fujue: true, flag: 'realmCursed', text: '你没看出门道，硬着头皮拿了。' } } },
    ] }),
  ev({ id: 'C-秘境-9', locs: ['realm'], kind: 'choice', sort: '余波',
    text: '秘境要关了，还有一个小孩被困在里面。',
    options: [
      { label: '回去救', desc: '困在秘境一年，修为 +10%，小孩成「恩」故人', eff: { age: 1, xpPct: 10, acq: { role: '秘境里的小孩', relation: 'favor' }, text: '你错过了出口，在秘境里困了一年。' } },
      { label: '先出去' },
    ] }),
  ev({ id: 'C-秘境-10', locs: ['realm'], kind: 'choice', sort: '即时',
    text: '你遇到一个守了秘境三千年的傀儡，它问你外面现在是哪一年。',
    options: [
      { label: '告诉它', desc: '它把守的东西送你一件', eff: { item: '?' } },
      { label: '骗它', eff: { text: '它信了，放你过去。' } },
    ] }),
  ev({ id: 'C-秘境-11', locs: ['realm'], kind: 'choice', sort: '直得', when: (L) => L.attrs.luck >= 6,
    text: '秘境深处躺着一个睡着的人，身边放着一枚令牌：「醒者为徒」。',
    options: [
      { label: '叫醒他', desc: '随身前辈：沉睡的老祖', eff: { gain: { id: 'elder', name: '沉睡的老祖', desc: '战斗伤害 +10%；每次出手要睡一年', dmg: 0.1 } } },
      { label: '拿了令牌就走', desc: '宗门贡献 +，令牌兑一门功法', eff: { merit: 10, skill: 'sword' } },
    ] }),
  ev({ id: 'C-秘境-12', locs: ['realm'], kind: 'choice', sort: '余波', when: hasNemesis,
    text: '宿敌也在秘境里，你们同时找到了最后一件宝物。',
    options: [
      { label: '抢', desc: '斗法：宿敌，赢了宿慧 +20', eff: { battle: { kind: 'duel', title: '宿敌', elites: 1, cultOnly: true, win: { insight: 20 } } } },
      { label: '联手先出去', desc: '宿敌下一世对你敌意 -1 档', eff: { flag: 'truce' } },
    ] }),
  ev({ id: 'C-秘境-13', locs: ['realm'], kind: 'choice', sort: '即时',
    text: '秘境地图是一张会动的画。',
    options: [
      { label: '跟着画走', desc: '沾染墨气，灵石 +20', eff: { trace: 'ink_touched', stones: 20 } },
      { label: '撕了按自己的路走', desc: '劫难 -10%', eff: { flag: 'realmEase' } },
    ] }),

  // ---------- 魔域 ----------
  ev({ id: 'C-魔域-4', locs: ['demon'], kind: 'choice', sort: '即时',
    text: '魔修拦路收「过路费」，要一滴精血。',
    options: [
      { label: '给', desc: '暗伤 +1', eff: { injure: 1, text: '你平安过去了。' } },
      { label: '打', desc: '斗法：拦路魔修', eff: { battle: { kind: 'duel', title: '拦路魔修', elites: 1, cultOnly: true } } },
      { label: '给一滴假的', desc: '悟性判定', roll: { attr: 'wu', dc: 6,
        ok: { text: '他没看出来，放你过去了。' },
        fail: { battle: { kind: 'duel', title: '拦路魔修', elites: 1, cultOnly: true } } } },
    ] }),
  ev({ id: 'C-魔域-5', locs: ['demon'], kind: 'choice', sort: '直得', when: (L) => L.school.demon >= 10,
    text: '魔宗少主看上了你，要你做他的护法。',
    options: [
      { label: '答应', eff: { chain: { id: 'YG11', op: 'skip' } } },
      { label: '拒绝', desc: '结仇', eff: { grudge: true } },
    ] }),
  ev({ id: 'C-魔域-6', locs: ['demon'], kind: 'choice', sort: '余波',
    text: '一个正道修士被魔修关在笼子里，他求你救他出去。',
    options: [
      { label: '救', desc: '结仇：魔修；「恩」故人：正道修士', eff: { grudge: true, acq: { role: '正道修士', relation: 'favor' } } },
      { label: '不救', desc: '魔修道途 +5', eff: { school: { demon: 5 } } },
    ] }),
  ev({ id: 'C-魔域-7', locs: ['demon'], kind: 'choice', sort: '即时',
    text: '魔域的集市上，有人卖「一年寿元换十年修为」。',
    options: [
      { label: '换', desc: '寿元 -10，修为 +12%', eff: { life: -10, xpPct: 12 } },
      { label: '不换' },
    ] }),
  ev({ id: 'C-魔域-8', locs: ['demon'], kind: 'choice', sort: '直得',
    text: '一把魔剑在你耳边说话，说它可以让你天下无敌。',
    options: [
      { label: '拿起', desc: '得魔剑：攻击 +25%，每场战斗结束气血 -5%；魔修道途 +10', eff: { gain: { id: 'demonblade', name: '魔剑', desc: '战斗伤害 +25%；每场战斗结束气血 -5%', dmg: 0.25 }, school: { demon: 10 } } },
      { label: '封起来', desc: '功德 +10', eff: { merit: 10 } },
    ] }),
  ev({ id: 'C-魔域-9', locs: ['demon'], kind: 'choice', sort: '余波',
    text: '你在魔域碰上一个跟你一模一样的魔修，他说他是你被斩掉的那一半。',
    options: [
      { label: '收回他', desc: '修为 +15%，魔修道途 +20', eff: { xpPct: 15, school: { demon: 20 } } },
      { label: '杀了他', desc: '暗伤 +2，心魔难度 -1 档', eff: { injure: 2, flag: 'trialEase' } },
      { label: '放他走', eff: { chain: { id: 'YG40', op: 'start' } } },
    ] }),
  ev({ id: 'C-魔域-10', locs: ['demon'], kind: 'choice', sort: '即时', when: need({ realm: 3 }),
    text: '一个魔头要跟你赌命，赌注是他的魔丹。',
    options: [
      { label: '赌', desc: '三局两胜：赢了修为 +20%，输了暗伤 +3', chance: { p: 0.5,
        ok: { xpPct: 20, text: '你赢下了他的魔丹。' },
        fail: { injure: 3, text: '你输了。' } } },
      { label: '不赌' },
    ] }),
  ev({ id: 'C-魔域-11', locs: ['demon'], kind: 'choice', sort: '直得', when: (L) => L.injuries > 0,
    text: '魔医说他能治好你，代价是你一段记忆。',
    options: [
      { label: '治', desc: '暗伤清零，宿慧 -15', eff: { injure: -99, insight: -15 } },
      { label: '不治' },
    ] }),
  ev({ id: 'C-魔域-12', locs: ['demon'], kind: 'choice', sort: '余波',
    text: '魔域深处有一座正道修士的坟场，都是当年剿魔死的。',
    options: [
      { label: '一座座立碑', desc: '功德 +30，正道宗门对你好感 +1 档', eff: { merit: 30, flag: 'grave' } },
      { label: '搜刮遗物', desc: '灵石 +30，魔修道途 +5', eff: { stones: 30, school: { demon: 5 } } },
    ] }),
  ev({ id: 'C-魔域-13', locs: ['demon'], kind: 'choice', sort: '即时',
    text: '墨潮从魔域边上漫过来了。',
    options: [
      { label: '逃', desc: '身法判定', roll: { attr: 'gen', dc: 6,
        ok: { text: '你逃了出去。' },
        fail: { battle: { kind: 'beast', title: '墨潮', cultOnly: true } } } },
      { label: '迎上去', desc: '墨潮战，奖励 +30%，沾染墨气', eff: { trace: 'ink_touched', battle: { kind: 'beast', title: '墨潮', reward: 1.3, cultOnly: true } } },
    ] }),

  // ---------- 画外裂隙 ----------
  ev({ id: 'C-画外裂隙-1', locs: ['rift'], kind: 'choice', sort: '即时', when: hasTrace('ink_touched'),
    text: '裂隙另一边有一只手在画东西，画的是你明天要走的路。',
    options: [
      { label: '看清楚', desc: '再摇 +1', eff: { again: 1, text: '下一圈的骰子点数，你提前知道了。' } },
      { label: '闭眼' },
    ] }),
  ev({ id: 'C-画外裂隙-2', locs: ['rift'], kind: 'choice', sort: '直得', when: hasTrace('ink_touched'),
    text: '一个从画里走出来的女子，问你能不能带她看看真的天。',
    options: [
      { label: '带她走', desc: '道侣：画中人', eff: { partner: '画中人', chain: { id: 'YG16', op: 'skip' } } },
      { label: '送她回画里' },
    ] }),
  ev({ id: 'C-画外裂隙-3', locs: ['rift'], kind: 'choice', sort: '余波',
    text: '你在裂隙里看到一行被涂掉的字，依稀能认出你的名字。',
    options: [
      { label: '记住', desc: '天门前庭多一个选项', eff: { flag: 'erased' } },
      { label: '不看' },
    ] }),
  ev({ id: 'C-画外裂隙-4', locs: ['rift'], kind: 'choice', sort: '即时',
    text: '裂隙边上坐着一个补画匠，他问你要不要补一笔。',
    options: [
      { label: '补', eff: { chain: { id: 'YG39', op: 'start' } } },
      { label: '不补' },
    ] }),
  ev({ id: 'C-画外裂隙-5', locs: ['rift'], kind: 'choice', sort: '直得', when: need({ realm: 4 }),
    text: '一支笔从裂隙里掉了出来，笔尖还湿着。',
    options: [
      { label: '拿着', desc: '得仙器「画笔」，再摇 +1', eff: { qi: { skill: 'art', grade: 4 }, again: 1 } },
      { label: '扔回去' },
    ] }),
  ev({ id: 'C-画外裂隙-6', locs: ['rift'], kind: 'choice', sort: '余波',
    text: '你看见画外的人在翻一本书，翻到的那一页是你的这一世。',
    options: [
      { label: '喊他', desc: '宿慧 +30，画外的人以后会留意你', eff: { insight: 30, flag: 'seen' } },
      { label: '不出声' },
    ] }),
  ev({ id: 'C-画外裂隙-7', locs: ['rift'], kind: 'choice', sort: '即时',
    text: '墨从裂隙里滴下来，滴在你身上就成了一个字。',
    options: [
      { label: '留着', desc: '本命字 +1 级', eff: { flag: 'inkWord', text: '那个字留在了你身上。' } },
      { label: '擦掉', desc: '墨气消失', eff: { flag: 'inkWiped', text: '你把墨擦得干干净净。' } },
    ] }),
  ev({ id: 'C-画外裂隙-8', locs: ['rift'], kind: 'choice', sort: '直得', when: (L) => (L.gains ?? []).some((g) => g.id === 'clone'),
    text: '你的化身说它想留在画外。',
    options: [
      { label: '让它去', desc: '化身变成「画外的你」，时常送你一件小东西', eff: { gain: { id: 'outside', name: '画外的你', desc: '每个岁首灵石 +5', lap: { stones: 5 } } } },
      { label: '召回来' },
    ] }),

  // ---------- 天门前庭 ----------
  ev({ id: 'C-天门前庭-1', locs: ['gate'], kind: 'choice', sort: '即时', when: need({ realm: 5 }),
    text: '天门前坐着一个看门的老头，说进门要报上你所有的名字。',
    options: [
      { label: '一个个报', desc: '每有一个千面录身份，劫难 -3%', eff: { flag: 'allNames' } },
      { label: '只报这一世的' },
    ] }),
  ev({ id: 'C-天门前庭-2', locs: ['gate'], kind: 'choice', sort: '余波', when: hasAcq('vow'),
    text: '托你看天门后面的那位前辈，魂魄就在门边等着。',
    options: [
      { label: '带他进去', desc: '劫难 +10%，过了门他成你的随身前辈', eff: { flag: 'gateGuest',
        echo: { text: '过了门，前辈的魂住进了你的法宝。', eff: { gain: { id: 'elder', name: '门边的前辈', desc: '判定 +1，战斗伤害 +8%', roll: 1, dmg: 0.08 } }, laps: 2 } } },
      { label: '告诉他门后是什么', desc: '了结「诺」', eff: { acqResolve: true } },
    ] }),
  ev({ id: 'C-天门前庭-3', locs: ['gate'], kind: 'choice', sort: '即时',
    text: '门前有一面石壁，刻满了没进去的人的名字，其中有一个是你上一世的。',
    options: [
      { label: '划掉', desc: '宿慧 +20', eff: { insight: 20 } },
      { label: '在旁边刻上这一世的名字', desc: '劫难 -5%', eff: { flag: 'nameCarved' } },
    ] }),
  ev({ id: 'C-天门前庭-4', locs: ['gate'], kind: 'choice', sort: '直得', when: need({ partner: true }),
    text: '天门只能一个人过。',
    options: [
      { label: '让道侣先过', desc: '道侣成仙，下一世她来接你', eff: { acq: { role: '成仙的道侣', relation: 'favor' }, text: '她先过了门。' } },
      { label: '一起闯', desc: '劫难 +25%，过了是双人结局', eff: { flag: 'gateTogether' } },
      { label: '自己过' },
    ] }),
  ev({ id: 'C-天门前庭-5', locs: ['gate'], kind: 'choice', sort: '余波', when: (L) => 'erased' in L.flags || 'seen' in L.flags,
    text: '门后传来一个声音：「你本来不该走到这里。」',
    options: [
      { label: '问为什么', eff: { flag: 'trueEndLead' } },
      { label: '推门' },
    ] }),
  ev({ id: 'C-天门前庭-6', locs: ['gate'], kind: 'choice', sort: '即时',
    text: '你回头看了一眼，来时的路上站满了你这几世遇见的人。',
    options: [
      { label: '挥手', desc: '功德 +20，劫难里故人会出手一次', eff: { merit: 20, flag: 'gateHelp' } },
      { label: '不回头', desc: '劫难 -10%', eff: { flag: 'gateEase' } },
    ] }),
];
