// 一人千面（R12 内容库 / 系统设计案 附录）：画卷年代、引子、故人、千面录、身世抉择
import type { AcqRelation, LifeState, MetaState, Option } from '../game/types';
import type { LifeEvent } from './events';

// ---------------- 画卷年代 ----------------
export interface EraDef {
  id: string;
  name: string;
  open: string;
  unlock: (M: MetaState) => boolean;
  weight: Record<string, number>; // 地点基础权重倍率
  rename?: Record<string, { name: string; hint?: string }>; // 文案变体
  duelBoost?: number; // 妖潮地点改为斗法的概率
  beastBoost?: number; // 斗法地点改为妖潮的概率
  calamityBoost?: number; // 流年出两处劫的额外概率
  duelTitles?: string[];
  mutator?: string; // 必出词条
  note: string;
}

export const ERAS: EraDef[] = [
  { id: 'E1', name: '承平年', open: '这一卷画的是太平年月，墨色很淡。', unlock: () => true, weight: { school: 1.5, home: 1.5 }, note: '学堂、家宅更常见' },
  { id: 'E2', name: '烽烟年', open: '这一卷画的是乱世，满纸烽烟。', unlock: () => true, weight: { road: 2, school: 0.5 }, duelTitles: ['乱兵围村', '流寇劫道', '溃兵夺粮'], note: '官道更常见，斗法多为乱兵、流寇' },
  {
    id: 'E3', name: '海国年', open: '这一卷画的是海，岸在纸边上。', unlock: () => true, weight: { river: 2, market: 1.5 },
    rename: { river: { name: '渡口', hint: '海岸与渡船，可能有险' } }, note: '渡口、市集更常见，妖潮是海妖',
  },
  { id: 'E4', name: '宗门年', open: '这一卷画的是仙门林立，山山有剑光。', unlock: (M) => M.saga.volume >= 2, weight: { sect: 1.5, bazaar: 1.5 }, duelBoost: 0.3, note: '宗门、坊市更常见，斗法 +30%' },
  { id: 'E5', name: '妖乱年', open: '这一卷画的是人妖相争，山林都红了。', unlock: (M) => M.saga.volume >= 2, weight: { forest: 2 }, beastBoost: 0.3, note: '妖林更常见，妖潮 +30%' },
  { id: 'E6', name: '墨潮年', open: '这一卷离裂口最近，墨顺着纸往下淌。', unlock: (M) => M.saga.volume >= 3, weight: { demon: 2, fortune: 1.5 }, mutator: 'M06', note: '魔域、机缘更常见，词条「墨沼」必出' },
  { id: 'E7', name: '天门前夜', open: '这一卷画的是三千年前，门还没有塌。', unlock: (M) => M.saga.volume >= 3 && M.saga.knocks >= 3, weight: { sect: 1.5, roam: 1.5 }, calamityBoost: 0.2, note: '宗门、云游更常见，劫难 +20%' },
];
export const ERA_BY_ID: Record<string, EraDef> = Object.fromEntries(ERAS.map((e) => [e.id, e]));
export const eraIndex = (id?: string | null) => (id ? Number(id.slice(1)) : 1);

// ---------------- 引子 ----------------
export interface HookBeat {
  loc: string; // 「引」卡显示和事件发生的地点
  title: string; // 卡面提示
  ev: string | LifeEvent; // 抉择 id 或内联事件
}
export interface HookDef {
  id: string;
  name: string;
  cond: (L: LifeState, M: MetaState, era: string) => boolean;
  condText: string;
  start: { age?: number; birth?: string }; // 起拍：到某岁，或开局自带
  beats: [HookBeat, HookBeat, HookBeat];
  reward: string;
  acq: { role: string; relation: AcqRelation };
}

const opt = (o: Option) => o;
const inline = (id: string, text: string, options: Option[]): LifeEvent => ({ id, locs: [], kind: 'choice', text, options });
const hasSchoolTalent = (L: LifeState, school: string) => L.talents.some((t) => t.includes(school));

export const HOOKS: HookDef[] = [
  {
    id: 'Y01', name: '灭门遗孤', condText: '任意年代，家境 ≤ 5', cond: (L) => L.attrs.fam <= 5, start: { age: 6 },
    beats: [
      { loc: 'home', title: '灭门那夜', ev: 'C-家宅-3' },
      { loc: 'road', title: '仇家的下落', ev: inline('Y01-2', '你拜了个武师学艺。十年后，你查出当年那人如今在官府里当差。', [
        opt({ label: '记下他的名字', desc: '根骨 +1，体修道途 +10', eff: { attr: { gen: 1 }, school: { body: 10 } } }),
        opt({ label: '不查了', desc: '引子改走「放下」，功德 +20', eff: { merit: 20, flag: 'letGo' } }),
      ]) },
      { loc: 'cross', title: '了断', ev: inline('Y01-3', '那人老了，坐在堂上，认不出你。', [
        opt({ label: '复仇', desc: '斗法，胜则了结', eff: { battle: { kind: 'duel', title: '灭门之仇', elites: 1, win: { hook: 'done', kill: true, text: '那笑声，终于停了。' }, lose: { hook: 'open' } } }, when: (L) => L.inDao }),
        opt({ label: '复仇', desc: '根骨判定，失败重伤', roll: { attr: 'gen', dc: 6, ok: { hook: 'done', kill: true, text: '那笑声，终于停了。' }, fail: { injure: 3, hook: 'open', text: '你没能近他的身。' } }, when: (L) => !L.inDao }),
        opt({ label: '放下', desc: '功德 +40，了结', eff: { merit: 40, hook: 'done', text: '你转身走了。米缸里那个孩子，终于从缸里出来了。' } }),
      ]) },
    ],
    reward: '宿慧 +40，墓志铭高光', acq: { role: '仇家', relation: 'grudge' },
  },
  {
    id: 'Y02', name: '寒门科举', condText: '承平年、烽烟年；书香门第或悟性 ≥ 6', cond: (L, _M, era) => ['E1', 'E2'].includes(era) && (L.origin === '书香门第' || L.attrs.wu >= 6), start: { age: 8 },
    beats: [
      { loc: 'school', title: '县试', ev: 'C-学堂-3' },
      { loc: 'road', title: '入京殿试', ev: inline('Y02-2', '你进京赶考，殿试前夜，有人递来一张帖子，要你拜在某位大人门下。', [
        opt({ label: '收下帖子', desc: '家境 +2，结仇', eff: { attr: { fam: 2 }, grudge: true } }),
        opt({ label: '原样退回', desc: '悟性 +1', eff: { attr: { wu: 1 } } }),
      ]) },
      { loc: 'home', title: '十年宦海', ev: inline('Y02-3', '你做了官。十年后，你站在衙门口，想起当年那道考题。', [
        opt({ label: '做官十年', desc: '年龄 +10，家境 +2，功德 +30，了结', eff: { age: 10, attr: { fam: 2 }, merit: 30, hook: 'done' } }),
        opt({ label: '弃官入道', desc: '仙缘判定 +1，了结', eff: { flag: 'forceCall', hook: 'done' } }),
      ]) },
    ],
    reward: '下一世家境 +2', acq: { role: '考官', relation: 'grudge' },
  },
  {
    id: 'Y03', name: '边军小卒', condText: '烽烟年、妖乱年', cond: (_L, _M, era) => ['E2', 'E5'].includes(era), start: { age: 14 },
    beats: [
      { loc: 'road', title: '征兵', ev: 'C-官道-2' },
      { loc: 'road', title: '守城', ev: 'C-官道-3' },
      { loc: 'road', title: '城头', ev: inline('Y03-3', '十年边关，你从小卒熬成了老兵。最后一仗，敌军压城。', [
        opt({ label: '领兵出城', desc: '根骨判定：成则升将，败则战死城头', roll: { attr: 'gen', dc: 6, ok: { hook: 'done', text: '你升了将。' }, fail: { die: '战死城头' } } }),
        opt({ label: '解甲归田', desc: '未了', eff: { hook: 'open' } }),
      ]) },
    ],
    reward: '体修道途 +20，痕迹「从军」', acq: { role: '同袍', relation: 'vow' },
  },
  {
    id: 'Y04', name: '王府庶子', condText: '承平年；家境 ≥ 8', cond: (L, _M, era) => era === 'E1' && L.attrs.fam >= 8, start: { birth: '你生在王府，是庶出的第七子。' },
    beats: [
      { loc: 'home', title: '王府', ev: inline('Y04-1', '王府' , []) },
      { loc: 'cross', title: '诸子站队', ev: 'C-路口-3' },
      { loc: 'home', title: '王位', ev: inline('Y04-3', '父王的灵柩还没出府，新王已经坐上了位子。他看着你。', [
        opt({ label: '夺位', desc: '气运判定，败则被赐死', roll: { attr: 'luck', dc: 7, ok: { attr: { fam: 2 }, hook: 'done', text: '你坐上了那把椅子。' }, fail: { die: '被赐死' } } }),
        opt({ label: '出家', desc: '功德 +30，了结', eff: { merit: 30, hook: 'done' } }),
      ]) },
    ],
    reward: '家境 +2，称号「王孙」', acq: { role: '兄长', relation: 'grudge' },
  },
  {
    id: 'Y05', name: '海客寻岸', condText: '海国年', cond: (_L, _M, era) => era === 'E3', start: { age: 12 },
    beats: [
      { loc: 'river', title: '破船', ev: 'C-河畔-3' },
      { loc: 'realm', title: '群岛与沉城', ev: 'C-秘境-2' },
      { loc: 'river', title: '岸', ev: inline('Y05-3', '海图画到了尽头。再往前，纸是白的。', [
        opt({ label: '继续往前', desc: '气运判定：成则找到岸，败则葬身海上', roll: { attr: 'luck', dc: 6, ok: { hook: 'done', text: '你看见了岸。岸上有一盏灯。' }, fail: { die: '葬身海上' } } }),
        opt({ label: '回头', desc: '未了', eff: { hook: 'open' } }),
      ]) },
    ],
    reward: '下一世机缘卡权重 ×1.5', acq: { role: '船主', relation: 'vow' },
  },
  {
    id: 'Y06', name: '镖师', condText: '任意；根骨 ≥ 5', cond: (L) => L.attrs.gen >= 5, start: { age: 18 },
    beats: [
      { loc: 'road', title: '入镖局', ev: inline('Y06-1', '镇上的镖局招人，总镖头看了看你的胳膊。', [
        opt({ label: '入镖局', desc: '根骨 +1，体修道途 +10', eff: { attr: { gen: 1 }, school: { body: 10 } } }),
        opt({ label: '不去', desc: '引子作罢', eff: { hook: 'open' } }),
      ]) },
      { loc: 'road', title: '一趟怪镖', ev: 'C-官道-4' },
      { loc: 'road', title: '自立门户', ev: inline('Y06-3', '你走镖二十年，攒下一面旗。', [
        opt({ label: '自立镖局', desc: '了结', eff: { hook: 'done' } }),
        opt({ label: '再走最后一趟', desc: '气运判定，败则死在官道', roll: { attr: 'luck', dc: 5, ok: { stones: 40, hook: 'done' }, fail: { die: '死在官道' } } }),
      ]) },
    ],
    reward: '灵石 +100', acq: { role: '被押的孩子', relation: 'favor' },
  },
  {
    id: 'Y07', name: '医者', condText: '承平年、妖乱年；丹修天赋或家境 ≥ 5', cond: (L, _M, era) => ['E1', 'E5'].includes(era) && (hasSchoolTalent(L, 'pill') || L.attrs.fam >= 5), start: { age: 10 },
    beats: [
      { loc: 'market', title: '药铺学徒', ev: inline('Y07-1', '药铺的老掌柜缺个抓药的伙计。', [
        opt({ label: '去当学徒', desc: '丹修道途 +10', eff: { school: { alchemy: 10 } } }),
        opt({ label: '不去', desc: '引子作罢', eff: { hook: 'open' } }),
      ]) },
      { loc: 'sickbed', title: '瘟疫', ev: 'C-病榻-2' },
      { loc: 'sickbed', title: '药方', ev: inline('Y07-3', '疫病又来了。你手里的方子只试过三回。', [
        opt({ label: '用这方子', desc: '悟性判定：成则研出药方，败则殉疫', roll: { attr: 'wu', dc: 5, ok: { hook: 'done', text: '方子成了。' }, fail: { die: '殉疫' } } }),
        opt({ label: '再等等', desc: '未了', eff: { hook: 'open' } }),
      ]) },
    ],
    reward: '丹修道途 +20，功德 +50', acq: { role: '疫村的孩子', relation: 'favor' },
  },
  {
    id: 'Y08', name: '说书人', condText: '任意；千面录 ≥ 3', cond: (_L, M) => faceKinds(M) >= 3, start: { age: 16 },
    beats: [
      { loc: 'market', title: '茶楼学艺', ev: inline('Y08-1', '茶楼的说书先生收徒，只考一件事：会不会编。', [
        opt({ label: '拜师', desc: '悟性 +1', eff: { attr: { wu: 1 } } }),
        opt({ label: '不去', desc: '引子作罢', eff: { hook: 'open' } }),
      ]) },
      { loc: 'market', title: '前世的书', ev: 'C-市集-3' },
      { loc: 'market', title: '一部书', ev: inline('Y08-3', '你说了一辈子书，最后想写一部自己的。', [
        opt({ label: '写下来', desc: '了结', eff: { hook: 'done', text: '书传下去了。没人知道书里的人都是你。' } }),
        opt({ label: '不写', desc: '未了', eff: { hook: 'open' } }),
      ]) },
    ],
    reward: '前世书解锁「说书本」', acq: { role: '听书的孩子', relation: 'vow' },
  },
  {
    id: 'Y09', name: '魔门弃徒', condText: '墨潮年，或出身墨门遗孤', cond: (L, _M, era) => era === 'E6' || L.origin === '墨门遗孤', start: { birth: '你是被魔门捡回去的孩子。' },
    beats: [
      { loc: 'home', title: '魔门', ev: inline('Y09-1', '魔门', []) },
      { loc: 'demon', title: '叛出师门', ev: 'C-魔域-3' },
      { loc: 'demon', title: '清理门户', ev: inline('Y09-3', '师父亲自来了。', [
        opt({ label: '迎战', desc: '斗法，胜则了结', eff: { battle: { kind: 'duel', title: '师徒相残', elites: 1, win: { hook: 'done' }, lose: { hook: 'open' } } } }),
        opt({ label: '跪下', desc: '魔修道途 +10，未了', eff: { school: { demon: 10 }, hook: 'open' } }),
      ]) },
    ],
    reward: '赤衣本世进度 +1', acq: { role: '师父', relation: 'grudge' },
  },
  {
    id: 'Y10', name: '宗门杂役', condText: '宗门年；测灵根失败', cond: (L, _M, era) => era === 'E4' && (L.talents.includes('no_root') || L.attrs.luck <= 3), start: { age: 7 },
    beats: [
      { loc: 'trace', title: '仙门收杂役', ev: 'C-仙踪-2' },
      { loc: 'sect', title: '偷学功法', ev: inline('Y10-2', '藏经阁的门没锁严。你挑水路过，看见一卷摊开的功法。', [
        opt({ label: '偷看', desc: '悟性 +1，古卷灵感 +1', eff: { attr: { wu: 1 }, inspire: 1 } }),
        opt({ label: '替它合上', desc: '功德 +20', eff: { merit: 20 } }),
      ]) },
      { loc: 'sect', title: '期满', ev: 'C-宗门-3' },
    ],
    reward: '功德 +40，古卷灵感 +1', acq: { role: '管事', relation: 'favor' },
  },
  {
    id: 'Y11', name: '妖族养子', condText: '妖乱年', cond: (_L, _M, era) => era === 'E5', start: { age: 3 },
    beats: [
      { loc: 'trace', title: '狼妖', ev: 'C-仙踪-3' },
      { loc: 'forest', title: '人族剿山', ev: 'C-妖林-2' },
      { loc: 'forest', title: '两族', ev: inline('Y11-3', '山下的人和山上的妖，都在等你说一句话。', [
        opt({ label: '劝和', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { hook: 'done', merit: 60 }, fail: { hook: 'open', text: '没人听。' } } }),
        opt({ label: '不管了', desc: '未了', eff: { hook: 'open' } }),
      ]) },
    ],
    reward: '本世妖潮开局敌人减少', acq: { role: '狼妖', relation: 'grudge' },
  },
  {
    id: 'Y12', name: '问命', condText: '任意；悟性 ≥ 7', cond: (L) => L.attrs.wu >= 7, start: { age: 12 },
    beats: [
      { loc: 'fair', title: '卦书', ev: inline('Y12-1', '庙会散场，地上落着一本没人要的卦书。', [
        opt({ label: '捡起来', desc: '悟性 +1', eff: { attr: { wu: 1 } } }),
        opt({ label: '不碰', desc: '引子作罢', eff: { hook: 'open' } }),
      ]) },
      { loc: 'fair', title: '死期', ev: 'C-庙会-3' },
      { loc: 'cross', title: '那一年', ev: inline('Y12-3', '卦上写的那一年到了。', [
        opt({ label: '改', desc: '寿元 +10，了结', eff: { life: 10, hook: 'done', text: '你没死。卦书上的字淡了。' } }),
        opt({ label: '不改', desc: '功德 +20，了结', eff: { merit: 20, hook: 'done', text: '你把该做的事都做了。' } }),
      ]) },
    ],
    reward: '下一世改命每年 +1', acq: { role: '卦书主人', relation: 'vow' },
  },
  {
    id: 'Y13', name: '守城人', condText: '墨潮年', cond: (_L, _M, era) => era === 'E6', start: { birth: '你在一座被墨潮围了三十年的城里长大。' },
    beats: [
      { loc: 'home', title: '城', ev: inline('Y13-1', '城', []) },
      { loc: 'fortune', title: '烽火', ev: 'C-机缘-3' },
      { loc: 'cross', title: '守城', ev: 'C-路口-4' },
    ],
    reward: '功德 +80，痕迹「墨染」', acq: { role: '城里的人', relation: 'vow' },
  },
  {
    id: 'Y14', name: '乱世开国', condText: '烽烟年；气运 ≥ 7', cond: (L, _M, era) => era === 'E2' && L.attrs.luck >= 7, start: { age: 15 },
    beats: [
      { loc: 'road', title: '流民', ev: inline('Y14-1', '你跟着流民往南走，身后跟的人越来越多。', [
        opt({ label: '领他们走', desc: '人情 +1', eff: { favor: 1 } }),
        opt({ label: '独自走', desc: '引子作罢', eff: { hook: 'open' } }),
      ]) },
      { loc: 'road', title: '据城', ev: inline('Y14-2', '前面有一座空城，城门开着。', [
        opt({ label: '进城据守', desc: '家境 +2', eff: { attr: { fam: 2 } } }),
        opt({ label: '绕过去', desc: '功德 +10', eff: { merit: 10 } }),
      ]) },
      { loc: 'cross', title: '称王', ev: inline('Y14-3', '城外来了使者，问你肯不肯归顺。', [
        opt({ label: '立国称王', desc: '家境 +3，了结', eff: { attr: { fam: 3 }, hook: 'done' } }),
        opt({ label: '为人作嫁', desc: '灵石 +80，了结', eff: { stones: 80, hook: 'done' } }),
      ]) },
    ],
    reward: '下一世家境 +3', acq: { role: '谋士', relation: 'vow' },
  },
  {
    id: 'Y15', name: '庙祝', condText: '任意；悟性与气运 ≥ 5', cond: (L) => L.attrs.wu >= 5 && L.attrs.luck >= 5, start: { age: 20 },
    beats: [
      { loc: 'fair', title: '小庙', ev: inline('Y15-1', '山脚的小庙没人守了，香炉里落满了灰。', [
        opt({ label: '守着它', desc: '功德 +10', eff: { merit: 10 } }),
        opt({ label: '路过', desc: '引子作罢', eff: { hook: 'open' } }),
      ]) },
      { loc: 'fair', title: '香客', ev: 'C-庙会-2' },
      { loc: 'fair', title: '庙火', ev: inline('Y15-3', '你守了这座庙一辈子。今夜的风很大。', [
        opt({ label: '护住庙火', desc: '了结', eff: { hook: 'done', text: '庙火没灭。' } }),
      ]) },
    ],
    reward: '功德 +60，司灯多说一句', acq: { role: '香客', relation: 'favor' },
  },
  {
    id: 'Y16', name: '画师', condText: '仙途卷后', cond: (_L, M) => M.saga.volume >= 2, start: { age: 9 },
    beats: [
      { loc: 'home', title: '学画', ev: inline('Y16-1', '你第一次拿笔，就画了一座山。山上有一扇门。', [
        opt({ label: '接着画', desc: '符修道途 +10', eff: { school: { rune: 10 } } }),
        opt({ label: '撕了', desc: '引子作罢', eff: { hook: 'open' } }),
      ]) },
      { loc: 'quiet', title: '画中人', ev: 'C-静室-3' },
      { loc: 'quiet', title: '小样', ev: inline('Y16-3', '你想画一幅完整的青冥画卷。哪怕只是小样。', [
        opt({ label: '画完它', desc: '年龄 +3，了结', eff: { age: 3, hook: 'done' } }),
        opt({ label: '留白', desc: '未了', eff: { hook: 'open' } }),
      ]) },
    ],
    reward: '古卷灵感 +1', acq: { role: '画中人', relation: 'vow' },
  },
];
export const HOOK_BY_ID: Record<string, HookDef> = Object.fromEntries(HOOKS.map((h) => [h.id, h]));

export function faceKinds(M: MetaState) {
  return new Set((M.faces ?? []).map((f) => f.hook)).size;
}

// ---------------- 故人 ----------------
export const RELATION_NAMES: Record<AcqRelation, string> = { favor: '恩', grudge: '仇', vow: '诺' };
export const ACQ_NICK = ['老陈', '阿禾', '小六', '柳娘', '石头', '阿青', '周伯', '二丫', '老何', '阿满', '小满', '杜三'];
export type AcqShape = 'same' | 'later' | 'earlier';
export const ACQ_SHAPE_NAMES: Record<AcqShape, string> = { same: '转世', later: '后人', earlier: '前缘' };
export const ACQ_TEXT: Record<AcqRelation, Record<AcqShape, string>> = {
  favor: { same: '{名}也带着前世的影子，见你就想对你好。', later: '{名}的后人认出了你，奉上谢礼。', earlier: '年少的{名}还没遇见你，却梦见过你。' },
  grudge: { same: '转世的{名}天生恨你，不知为何。', later: '{名}的后人守在你门外，等了三年。', earlier: '年少的{名}第一次见你。这段仇，可以不发生。' },
  vow: { same: '{名}记得半句约定。', later: '{名}的后人拿着当年的信物来找你兑现。', earlier: '你可以先许下一个{名}日后会等的诺。' },
};
export const ACQ_GONE = '那个人，我洗干净了。他不记得你了。';

// ---------------- 千面录 ----------------
export const FACES_SILU = ['今天你是个书生，上回你是个杀猪的。都挺像你。', '你这张脸我见过很多次了，每次都不一样。', '你欠的人，比欠你的人多。慢慢还。'];

// ---------------- 身世抉择（另 30 条） ----------------
// hookOnly：只经「引」卡出现；其余按条件进普通事件池
const ev = (e: LifeEvent & { hookOnly?: boolean }) => e;
export const IDENTITY_CHOICES: (LifeEvent & { hookOnly?: boolean })[] = [
  ev({ id: 'C-家宅-3', locs: ['home'], kind: 'choice', hookOnly: true, text: '灭门那夜你躲在米缸里，听见一个人的笑声。', options: [
    { label: '记住那笑声', desc: '悟性 +1，本世心魔更难', eff: { attr: { wu: 1 }, flag: 'heartUp', trace: 'grudge' } },
    { label: '捂住耳朵', desc: '功德 +5，引子改走「放下」', eff: { merit: 5, flag: 'letGo' } },
  ] }),
  ev({ id: 'C-家宅-4', locs: ['home'], kind: 'choice', when: (L) => L.era === 'E2', text: '乱兵进村，娘把最后的干粮塞给你。', options: [
    { label: '背着娘一起逃', desc: '家境 -1，功德 +20', eff: { attr: { fam: -1 }, merit: 20 } },
    { label: '一个人跑', desc: '无伤，结下「诺」：娘', eff: { acq: { role: '娘', relation: 'vow' } } },
  ] }),
  ev({ id: 'C-学堂-3', locs: ['school'], kind: 'choice', hookOnly: true, text: '县试考题问「民为何而苦」。', options: [
    { label: '照实写', desc: '悟性 +1，结下「仇」：考官', eff: { attr: { wu: 1 }, acq: { role: '考官', relation: 'grudge' } } },
    { label: '写考官爱看的', desc: '家境 +1，中举', eff: { attr: { fam: 1 }, text: '你中了举。' } },
  ] }),
  ev({ id: 'C-市集-3', locs: ['market'], kind: 'choice', hookOnly: true, text: '茶客点了一出「雪山救狐」，书里的人和你前世一模一样。', options: [
    { label: '照本说', desc: '灵石 +15', eff: { stones: 15 } },
    { label: '改个结局', desc: '白狐本世进度 +1，留下痕迹「雪原」', eff: { bond: 'fox', trace: 'snowfield' } },
  ] }),
  ev({ id: 'C-邻里-3', locs: ['neighbor'], kind: 'choice', when: (L) => L.era === 'E3', text: '邻家渔户的儿子出海三年未归。', options: [
    { label: '替他家出海寻人', desc: '下一年必发河畔卡；无引子时得引子「海客寻岸」', eff: { nextLoc: 'river', giveHook: 'Y05' } },
    { label: '帮他家修船', desc: '灵石 -10，人情 +1', eff: { stones: -10, favor: 1 } },
  ] }),
  ev({ id: 'C-河畔-3', locs: ['river'], kind: 'choice', hookOnly: true, text: '渡口一艘破船，船主说海的尽头有岸。', options: [
    { label: '上船', desc: '寿元 -5', eff: { life: -5 } },
    { label: '买他的海图', desc: '灵石 -30，本年机缘更多', eff: { stones: -30, flag: 'fortuneYear' }, when: (L) => L.stones >= 30 },
  ] }),
  ev({ id: 'C-官道-3', locs: ['road'], kind: 'choice', hookOnly: true, text: '你守的城被围，粮只够三天。', options: [
    { label: '开城突围', desc: '斗法，胜则升校尉', eff: { battle: { kind: 'duel', title: '突围', elites: 1, win: { attr: { fam: 1 }, text: '你升了校尉。' } } }, when: (L) => L.inDao },
    { label: '开城突围', desc: '根骨判定，败则重伤', roll: { attr: 'gen', dc: 6, ok: { attr: { fam: 1 }, text: '你杀出一条路，升了校尉。' }, fail: { injure: 3 } }, when: (L) => !L.inDao },
    { label: '死守', desc: '功德 +40', eff: { merit: 40, trace: 'soldier' } },
    { label: '开城投降', desc: '家境 +2，结下「仇」：城中百姓', eff: { attr: { fam: 2 }, acq: { role: '城中百姓', relation: 'grudge' } } },
  ] }),
  ev({ id: 'C-官道-4', locs: ['road'], kind: 'choice', hookOnly: true, text: '镖车里押的是一个被绑的孩子。', options: [
    { label: '照约送到', desc: '灵石 +60，结仇', eff: { stones: 60, grudge: true } },
    { label: '劫自己的镖', desc: '丢了饭碗，功德 +40，结下「恩」：孩子', eff: { merit: 40, acq: { role: '被押的孩子', relation: 'favor' } } },
  ] }),
  ev({ id: 'C-病榻-2', locs: ['sickbed'], kind: 'choice', hookOnly: true, text: '镇上起了瘟疫，师父不许你去疫村。', options: [
    { label: '去', desc: '功德 +60，丹修道途 +10；根骨低时染病', eff: { merit: 60, school: { alchemy: 10 } }, roll: { attr: 'gen', dc: 4, ok: {}, fail: { life: -10, text: '你染了病，落下了病根。' } } },
    { label: '听师父的', eff: {} },
  ] }),
  ev({ id: 'C-病榻-3', locs: ['sickbed', 'home', 'cave'], kind: 'choice', when: (L) => !!L.flags.spanLeft && L.flags.spanLeft <= 3, text: '临终前你想见一个人。', options: [
    { label: '写信叫他来', desc: '结下「诺」：故交', eff: { acq: { role: '故交', relation: 'vow' } } },
    { label: '谁也不见', desc: '墓志铭高光「孑然一身」', eff: { hl: { text: '孑然一身', score: 60 } } },
  ] }),
  ev({ id: 'C-庙会-2', locs: ['fair'], kind: 'choice', hookOnly: true, text: '香客求子，你知道他求不来。', options: [
    { label: '照收香火', desc: '灵石 +20', eff: { stones: 20 } },
    { label: '说实话', desc: '功德 +20', eff: { merit: 20, flag: 'saved' } },
    { label: '替他去求', desc: '年龄 +1，三成应验', eff: { age: 1 }, chance: { p: 0.3, ok: { attr: { luck: 1 }, text: '应验了。' }, fail: { text: '没有应验。' } } },
  ] }),
  ev({ id: 'C-庙会-3', locs: ['fair'], kind: 'choice', hookOnly: true, text: '卦书推出你死在某一年。', options: [
    { label: '信命', desc: '知道死期，死前一年必发人生路口卡', eff: { flag: 'fateKnown' } },
    { label: '改命', desc: '下一年改命 +2，死期提前 5 年', eff: { reroll: 2, life: -5 } },
    { label: '烧掉卦书', eff: {} },
  ] }),
  ev({ id: 'C-仙踪-2', locs: ['trace'], kind: 'choice', hookOnly: true, text: '仙门收杂役，管事要你挑一辈子水。', options: [
    { label: '去挑水', desc: '年龄 +3，更容易得仙缘', eff: { age: 3, flag: 'forceCall' } },
    { label: '回家', eff: { hook: 'open' } },
  ] }),
  ev({ id: 'C-仙踪-3', locs: ['trace'], kind: 'choice', hookOnly: true, text: '一头老狼妖把你叼回山里。', options: [
    { label: '留在山里', desc: '根骨 +1，本世妖潮敌人更少', eff: { attr: { gen: 1 }, flag: 'wolfKin' } },
    { label: '逃回人间', desc: '悟性 +1，结下「仇」：狼妖', eff: { attr: { wu: 1 }, acq: { role: '狼妖', relation: 'grudge' }, hook: 'open' } },
  ] }),
  ev({ id: 'C-洞府-3', locs: ['cave'], kind: 'choice', hookOnly: true, text: '闭关时有人在洞外守了三年，是你前世斩过的人的后人。', options: [] }),
  ev({ id: 'C-静室-2', locs: ['quiet'], kind: 'choice', when: (_L, M) => new Set((M.faces ?? []).map((f) => f.hook)).size >= 5, text: '入定时，前几世的你排成一列站在面前。', options: [
    { label: '挨个看过去', desc: '古卷灵感 +1，本世心魔更难', eff: { inspire: 1, flag: 'heartUp' } },
    { label: '只看最近一个', desc: '下一世前世遗憾多留 1 世', eff: { next: { regretKeep: 1 } } },
  ] }),
  ev({ id: 'C-静室-3', locs: ['quiet'], kind: 'choice', hookOnly: true, text: '你画的山水，第二天多了一个人。', options: [
    { label: '擦掉', desc: '符修道途 +10', eff: { school: { rune: 10 } } },
    { label: '让他留着', desc: '沾染墨气，结下「诺」：画中人', eff: { trace: 'ink_touched', acq: { role: '画中人', relation: 'vow' } } },
  ] }),
  ev({ id: 'C-宗门-3', locs: ['sect'], kind: 'choice', hookOnly: true, text: '杂役期满，掌门问你要什么。', options: [
    { label: '一部功法', desc: '得一门功法，了结', eff: { flag: 'giftSkill', hook: 'done' } },
    { label: '一个名分', desc: '外门弟子，人情 +2，了结', eff: { favor: 2, hook: 'done' } },
    { label: '下山', desc: '功德 +20，了结', eff: { merit: 20, hook: 'done' } },
  ] }),
  ev({ id: 'C-宗门-4', locs: ['sect'], kind: 'choice', when: (_L, M) => new Set((M.faces ?? []).map((f) => f.hook)).size >= 3, text: '藏经阁里有一本你前世写的笔记，署名不是你。', options: [
    { label: '照着练', desc: '得一门功法，本派道途 +20', eff: { flag: 'pastNotes' } },
    { label: '补写一页', desc: '古卷灵感 +1，宿慧 +20', eff: { inspire: 1, insight: 20 } },
  ] }),
  ev({ id: 'C-云游-2', locs: ['roam'], kind: 'choice', when: (L) => L.era === 'E4', text: '两宗为一条灵脉开战，都来请你。', options: [
    { label: '帮其中一方', desc: '斗法，胜得灵石 80，另一宗结仇', eff: { grudge: true, battle: { kind: 'duel', title: '灵脉之争', elites: 1, win: { stones: 80 } } } },
    { label: '调停', desc: '悟性判定', roll: { attr: 'wu', dc: 6, ok: { merit: 50, favor: 2 }, fail: { text: '两边都嫌你多事。' } } },
  ] }),
  ev({ id: 'C-云游-3', locs: ['roam'], kind: 'choice', when: (L) => L.era === 'E5', text: '人族联军在招修士守关。', options: [
    { label: '去守关', desc: '下一年必发妖林，留下痕迹「从军」', eff: { nextLoc: 'forest', trace: 'soldier' } },
    { label: '带走关下难民', desc: '灵石 -30，功德 +40', eff: { stones: -30, merit: 40 } },
    { label: '不去', eff: {} },
  ] }),
  ev({ id: 'C-坊市-3', locs: ['bazaar'], kind: 'choice', hookOnly: true, text: '坊市老板认出你，说你前世救过他祖上。', options: [] }),
  ev({ id: 'C-路口-3', locs: ['cross'], kind: 'choice', hookOnly: true, text: '父王病危，兄长们请你站队。', options: [
    { label: '站长兄', desc: '家境 +2，结下「仇」：次兄', eff: { attr: { fam: 2 }, acq: { role: '次兄', relation: 'grudge' } } },
    { label: '站次兄', desc: '家境 +2，结下「仇」：长兄', eff: { attr: { fam: 2 }, acq: { role: '长兄', relation: 'grudge' } } },
    { label: '出家修道', desc: '仙缘判定 +1，了结', eff: { flag: 'forceCall', hook: 'done' } },
  ] }),
  ev({ id: 'C-路口-4', locs: ['cross'], kind: 'choice', hookOnly: true, text: '墨潮压城，城主让你带一半人先走。', options: [
    { label: '带人走', desc: '功德 +60，城破，结下「仇」：留下的人', eff: { merit: 60, acq: { role: '留下的人', relation: 'grudge' }, hook: 'open' } },
    { label: '留下守城', desc: '墨潮劫难，胜则了结', eff: { battle: { kind: 'beast', title: '墨潮压城', reward: 1.2, win: { hook: 'done' }, lose: { hook: 'open' }, cultOnly: true } } },
    { label: '谁都不走', desc: '劫难更凶，胜则奖励 ×2，败则全城陨落', eff: { battle: { kind: 'beast', title: '死守孤城', elites: 2, reward: 2, win: { hook: 'done' }, lose: { die: '与城同殁' }, cultOnly: true } } },
  ] }),
  ev({ id: 'C-机缘-3', locs: ['fortune'], kind: 'choice', when: (L) => L.era === 'E6', text: '一座城被墨潮围住，城里点起烽火。', options: [
    { label: '进城', desc: '劫难奖励 ×2，沾染墨气', eff: { trace: 'ink_touched', battle: { kind: 'beast', title: '城中墨潮', reward: 2, cultOnly: true } } },
    { label: '在城外布阵接应', desc: '灵石 -40，功德 +60', eff: { stones: -40, merit: 60 } },
  ] }),
  ev({ id: 'C-妖林-2', locs: ['forest'], kind: 'choice', hookOnly: true, text: '来剿山的人族修士里，领头的是你亲哥哥。', options: [
    { label: '站妖这边', desc: '斗法，结下「仇」：兄长', eff: { acq: { role: '兄长', relation: 'grudge' }, battle: { kind: 'duel', title: '兄弟阋墙', elites: 1, cultOnly: true } } },
    { label: '站人这边', desc: '修为 +5%，结下「仇」：狼妖', eff: { xpPct: 5, acq: { role: '狼妖', relation: 'grudge' } } },
    { label: '让两边坐下谈', desc: '悟性判定，成则了结', roll: { attr: 'wu', dc: 6, ok: { merit: 80, hook: 'done' }, fail: { text: '没人肯坐下。' } } },
  ] }),
  ev({ id: 'C-妖林-3', locs: ['forest'], kind: 'choice', when: (L) => L.inDao, text: '一只受伤的小妖向你讨一颗丹。', options: [
    { label: '给', desc: '灵石 -20，结下「恩」：小妖', eff: { stones: -20, acq: { role: '小妖', relation: 'favor' } } },
    { label: '取它内丹', desc: '修为 +4%，杀生', eff: { xpPct: 4, kill: true } },
  ] }),
  ev({ id: 'C-秘境-2', locs: ['realm'], kind: 'choice', when: (L) => L.era === 'E3', text: '海底沉城的城门上刻着你上一世的名字。', options: [
    { label: '进城', desc: '秘境劫难，胜得一门前世功法', eff: { battle: { kind: 'beast', title: '沉城', cultOnly: true, win: { flag: 'giftSkill' } } } },
    { label: '在旁边补刻今生的名字', desc: '宿慧 +20，墓志铭高光', eff: { insight: 20, hl: { text: '在沉城门上刻下今生的名字', score: 62 } } },
  ] }),
  ev({ id: 'C-秘境-3', locs: ['realm'], kind: 'choice', when: (L) => L.inDao, text: '一面照命镜照出你下一世的身世。', options: [
    { label: '看', desc: '下一世从两个引子里选一个', eff: { next: { chooseHook: true } } },
    { label: '打碎', desc: '修为 +5%，本世心魔更易', eff: { xpPct: 5, flag: 'heartDown' } },
  ] }),
  ev({ id: 'C-魔域-3', locs: ['demon'], kind: 'choice', hookOnly: true, text: '师门派人来清理门户。', options: [
    { label: '迎战', desc: '斗法', eff: { battle: { kind: 'duel', title: '清理门户', elites: 1, cultOnly: true } } },
    { label: '求情', desc: '灵石 -50，赤衣本世进度 +1', eff: { stones: -50, bond: 'chiyi' }, when: (L) => L.stones >= 50 },
    { label: '投奔正道', desc: '魔修道途 -20，更容易得仙缘', eff: { school: { demon: -20 }, flag: 'forceCall' } },
  ] }),
];
