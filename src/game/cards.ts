// 场景卡与行动卡：把事件的选项数据翻成「动作 + 代价 + 风险」，玩家不读长文也能选。
// 只读数据、不改状态；引擎在弹出事件时调用，界面负责画。
import { ATTR_NAMES, AttrKey, SCHOOL_NAMES, School } from '../data/core';
import { PET_NAMES } from '../data/chain-types';
import { LOC_BY_ID } from '../data/events';
import type { Effect, LifeState, Option } from './types';
import { rollBonus } from './chains';

export type Tone = 'up' | 'down' | 'gold' | 'neutral' | 'unknown';
export interface CardTag {
  text: string;
  tone: Tone;
}
// safe 无风险 / low 较低 / mid 一半一半 / high 高 / unknown 看天意
export type Risk = 'safe' | 'low' | 'mid' | 'high' | 'unknown';
export interface ActionCard {
  icon: string; // 图标名，见 src/art/subject.ts
  tags: CardTag[]; // 主要得失，至多 3 个
  risk: Risk;
  riskText: string; // 「受伤风险高」「约七成把握」……；safe 时为空
  detail: string[]; // 展开查看的数值与成败
}
// 场景卡画什么：战斗、采集、交易、修炼、奇遇，以及人物；null = 只画地点
export type Subject = 'battle' | 'gather' | 'trade' | 'cultivate' | 'encounter' | 'person' | null;
export interface EventScene {
  subject: Subject;
  loc: string;
  locName: string;
  lead: string; // 一句话
  more: boolean; // 原文比一句话长，可以展开
}

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// 判定把握：与引擎 applyOption 的算法一致
export function rollChance(L: LifeState, attr: AttrKey, dc: number) {
  const v = L.attrs[attr] + rollBonus(L, attr);
  return Math.max(0.1, Math.min(0.95, 0.5 + (v - dc) * 0.12));
}
const odds = (p: number) => `约${CN[Math.max(1, Math.min(9, Math.round(p * 10)))]}成`;
const riskOf = (p: number): Risk => (p >= 0.75 ? 'low' : p >= 0.5 ? 'mid' : 'high');

// 一个效果里玩家看得见的得失
export function effTags(e: Effect | undefined, L: LifeState): CardTag[] {
  if (!e) return [];
  const out: CardTag[] = [];
  const num = (name: string, d: number | undefined, goodUp = true) => {
    if (!d) return;
    out.push({ text: `${name} ${sign(d)}`, tone: d > 0 === goodUp ? 'up' : 'down' });
  };
  num(L.inDao ? '灵石' : '银两', e.stones);
  if (e.xpPct) out.push({ text: e.xpPct > 0 ? '修为精进' : '修为倒退', tone: e.xpPct > 0 ? 'up' : 'down' });
  if (e.attr) for (const [k, v] of Object.entries(e.attr)) num(ATTR_NAMES[k as AttrKey], v as number);
  num('功德', e.merit);
  num('人情', e.favor);
  if (e.life) out.push({ text: `寿元 ${sign(e.life)}`, tone: e.life > 0 ? 'up' : 'down' });
  if (e.age) out.push({ text: `耗去 ${e.age} 年`, tone: 'down' });
  if (e.injure && e.injure > 0) out.push({ text: '受伤', tone: 'down' });
  if (e.injure && e.injure < 0) out.push({ text: '疗伤', tone: 'up' });
  num('气血上限', e.hpMax);
  if (e.skill) out.push({ text: '得功法', tone: 'gold' });
  if (e.qi || e.item) out.push({ text: '得法宝', tone: 'gold' });
  if (e.fujue) out.push({ text: '得附诀', tone: 'gold' });
  if (e.canye) out.push({ text: '功法残页', tone: 'gold' });
  num('心得', e.xinde);
  if (e.pet) out.push({ text: `得灵宠${PET_NAMES[e.pet.kind] ? '·' + PET_NAMES[e.pet.kind] : ''}`, tone: 'gold' });
  if (e.partner) out.push({ text: '结为道侣', tone: 'gold' });
  if (e.gain) out.push({ text: `得「${e.gain.name}」`, tone: 'gold' });
  if (e.disciple && e.disciple > 0) out.push({ text: '收徒', tone: 'gold' });
  if (e.acq) out.push({ text: '结识故人', tone: 'neutral' });
  if (e.grudge) out.push({ text: '结仇', tone: 'down' });
  if (e.removeGrudge) out.push({ text: '化解仇怨', tone: 'up' });
  if (e.chain?.op === 'start' || e.chain?.op === 'skip') out.push({ text: '结下一段缘', tone: 'gold' });
  if (e.chain?.op === 'break') out.push({ text: '断了这段缘', tone: 'down' });
  if (e.again) out.push({ text: `再摇 +${e.again}`, tone: 'up' });
  if (e.inspire && e.inspire > 0) out.push({ text: '灵感', tone: 'up' });
  if (e.school) {
    const top = (Object.entries(e.school) as [School, number][]).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0) out.push({ text: `偏向${SCHOOL_NAMES[top[0]]}`, tone: 'neutral' });
  }
  if (e.banLoc) out.push({ text: `${LOC_BY_ID[e.banLoc.loc]?.name ?? '此地'}暂去不得`, tone: 'down' });
  if (e.nextLoc) out.push({ text: `去往${LOC_BY_ID[e.nextLoc]?.name ?? '他处'}`, tone: 'neutral' });
  if (e.echo) out.push({ text: '日后有回响', tone: 'unknown' });
  return out;
}

// 效果里有没有藏着玩家看不见、但会影响后事的东西（链内标记、缘分、世内标记）
const hidden = (e: Effect | undefined) => !!e && !!(e.flag || e.chain || e.trace || e.hook || e.giveHook || e.next || e.bond || e.fate);

// 作者写的 desc 拆成小签：带「-」「失」「伤」「仇」的算损失，「得」「获」算收获
export function descTags(desc: string): CardTag[] {
  return desc
    .split(/[，；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const tone: Tone = /治|疗|清零|痊愈|化解|消/.test(s) ? 'up' : /[-－−]\s*\d|失|伤|仇|折|损|倒霉|丢|死|亡|散|退/.test(s) ? 'down' : /^得|获|学会|结为|收|领悟/.test(s) ? 'gold' : /[+＋]\s*\d/.test(s) ? 'up' : 'neutral';
      return { text: s, tone };
    });
}

const battleOf = (e: Effect | undefined) => e?.battle;

// 选项 → 行动卡
export function actionCard(o: Option, L: LifeState): ActionCard {
  const detail: string[] = [];
  let risk: Risk = 'safe';
  let riskText = '';
  let tags: CardTag[] = o.desc ? descTags(o.desc) : effTags(o.eff, L);
  const bt = battleOf(o.eff);
  if (o.eff?.die) {
    risk = 'high';
    riskText = '有性命危险';
  } else if (bt) {
    risk = bt.boss || (bt.elites ?? 0) >= 2 ? 'high' : 'mid';
    riskText = '要打一场';
    detail.push(`劫难：${bt.title}`);
  }
  if (o.roll) {
    const p = rollChance(L, o.roll.attr, o.roll.dc);
    const r = riskOf(p);
    if (risk === 'safe' || r === 'high') risk = r;
    riskText = `${ATTR_NAMES[o.roll.attr]}判定 · ${odds(p)}把握`;
    const ok = effTags(o.roll.ok, L).map((t) => t.text).join('、') || o.roll.ok.text || '如愿';
    const fail = effTags(o.roll.fail, L).map((t) => t.text).join('、') || o.roll.fail.text || '无功而返';
    detail.push(`成：${ok}`, `败：${fail}`);
    if (!o.desc) tags = [...tags, ...effTags(o.roll.ok, L).slice(0, 1).map((t) => ({ ...t, text: t.text + '？' }))];
    if (effTags(o.roll.fail, L).some((t) => t.tone === 'down') && !tags.some((t) => t.tone === 'down')) tags.push({ text: '失手有损', tone: 'down' });
  }
  if (o.chance) {
    const p = o.chance.p;
    if (risk === 'safe') risk = 'unknown';
    riskText = `看天意 · ${odds(p)}`;
    const ok = effTags(o.chance.ok, L).map((t) => t.text).join('、') || o.chance.ok.text || '如愿';
    const fail = effTags(o.chance.fail, L).map((t) => t.text).join('、') || o.chance.fail.text || '落空';
    detail.push(`成：${ok}`, `败：${fail}`);
    if (!o.desc) tags = [...tags, ...effTags(o.chance.ok, L).slice(0, 1).map((t) => ({ ...t, text: t.text + '？' }))];
  }
  if (o.page) tags.push({ text: '天书一页', tone: 'gold' });
  if (o.desc && (o.desc.length > 16 || descTags(o.desc).length > 3)) detail.unshift(o.desc);
  else {
    const all = effTags(o.eff, L);
    if (all.length > 3) detail.unshift(all.map((t) => t.text).join('、'));
  }
  if (!tags.length) {
    if (hidden(o.eff) || o.roll || o.chance) tags.push({ text: '后事难料', tone: 'unknown' });
    else tags.push({ text: '平安无事', tone: 'neutral' });
  } else if (hidden(o.eff) && tags.length < 3 && !tags.some((t) => t.tone === 'unknown' || t.tone === 'gold')) tags.push({ text: '另有后事', tone: 'unknown' });
  // 判定已经写在风险里，小签里不再重复
  if (o.roll || o.chance) tags = tags.map((t) => ({ ...t, text: t.text.replace(/^.{2}判定[：:]?\s*/, '') })).filter((t) => t.text);
  if (risk === 'safe' && tags.some((t) => t.text.includes('受伤'))) riskText = '必受点伤';
  if (bt && risk !== 'safe') riskText = riskText || '要打一场';
  if (risk === 'high' && !riskText) riskText = '风险高';
  return { icon: actionIcon(o.label), tags: tags.slice(0, 3), risk, riskText, detail };
}

// 动作名 → 图标。按先后匹配，匹配不到就用动作名第一个字盖印
const ICON_RULES: [RegExp, string][] = [
  [/^(不|拒|推辞|婉拒|谢绝)/, 'no'],
  [/^(去|离开|走|逃|跑|避|躲|绕|退|回家|算了|罢了|作罢|不理|不管|无视|装作|悄悄走|转身)|离开|走开|算了|绕道|躲开/, 'foot'],
  [/打(?!开|听|扫|水|算)|斗|杀|战|斩|拔剑|出手|迎战|应战|除|降服|擒|围剿|硬闯|拼/, 'sword'],
  [/买|卖|换|讨价|还价|赌|押|租|当掉|典当|出价|交易|收购|入股|借钱|放贷/, 'coin'],
  [/修炼|闭关|参悟|悟|打坐|静坐|练|读|学|抄|背|研|炼丹|炼器|画符|吐纳/, 'lotus'],
  [/救|帮|扶|医|治|护|收留|照顾|陪|守|喂|放生|放了/, 'heart'],
  [/给|送|让|赠|还给|施|赔|捐|献|分给|舍|交出|上交|交给/, 'gift'],
  [/采|摘|取|收下|拿|捡|挖|抢|夺|接过|接下|留着|收|要|撬|打开|扔|丢|撕|烧|砸|毁|搬|埋|翻|摸|吃|喝|服/, 'hand'],
  [/问|说|劝|谈|聊|求|拜|认|答应|应下|许|骂|讲|告诉|揭发|告|请/, 'talk'],
  [/看|等|观|听|查|探|跟|藏|偷|窥|守株|试/, 'eye'],
];
export function actionIcon(label: string): string {
  for (const [re, k] of ICON_RULES) if (re.test(label)) return k;
  return 'seal';
}

// 事件主体：按文字、地点和选项里有没有仗来猜
const SUBJECT_RULES: [Exclude<Subject, null>, RegExp][] = [
  ['battle', /抢|打架|斗殴|妖|兽|狼|虎|豹|熊|蛇|蟒|魔|墨潮|墨物|贼|匪|强盗|山贼|劫道|追杀|追兵|仇家|恶霸|厮杀|鬼|尸|邪修|围攻|偷袭/],
  ['gather', /灵草|草药|药草|采药|灵芝|人参|何首乌|灵果|果子|灵花|花|矿|灵泉|莲|藤|朱果|仙草|药田|采/],
  ['trade', /摊|卖|买|商|铺|掌柜|货|价|银两|灵石|当铺|赌|拍卖|集市|坊市/],
  ['cultivate', /闭关|修炼|打坐|悟|功法|心法|经书|秘籍|吐纳|灵气|丹炉|炼丹|筑基|瓶颈|入定|道心/],
  ['encounter', /洞|古|仙|宝|光|遗|碑|残|奇|玉简|剑冢|画|匣|盒|石|镜|神|天书|异象|井/],
  ['person', /人|女|老|少年|孩|童|道士|和尚|僧|师|兄|姐|妹|弟|爹|娘|丫头|书生|姑娘|夫|客|乞|官|掌门|长老/],
];
const SUBJECT_WEIGHT: Record<Exclude<Subject, null>, number> = { battle: 1.6, gather: 1.8, trade: 1.3, cultivate: 1.3, encounter: 1, person: 0.8 };
const LOC_SUBJECT: Record<string, Subject> = { home: 'person', neighbor: 'person', school: 'person', fair: 'person', sickbed: 'person', market: 'trade', bazaar: 'trade', cave: 'cultivate', quiet: 'cultivate', forest: 'battle', demon: 'battle', rift: 'battle', trace: 'encounter', realm: 'encounter', fortune: 'encounter' };
export function eventSubject(text: string, opts: Option[], loc: string): Subject {
  if (opts.some((o) => battleOf(o.eff) || battleOf(o.roll?.fail) || battleOf(o.chance?.fail))) return 'battle';
  let best: Subject = null;
  let score = 0;
  SUBJECT_RULES.forEach(([k, re]) => {
    // 越具体的词权重越高；地点本身算半票
    const n = (text.match(new RegExp(re.source, 'g')) ?? []).length * SUBJECT_WEIGHT[k] + (LOC_SUBJECT[loc] === k ? 0.5 : 0);
    // 先列的类优先：同分不换
    if (n > score) {
      best = k;
      score = n;
    }
  });
  return best ?? LOC_SUBJECT[loc] ?? null;
}

// 一句话：取第一句；原文更长时可展开
export function leadLine(text: string): { lead: string; more: boolean } {
  const flat = text.replace(/\s*\n+\s*/g, '');
  if (flat.length <= 34) return { lead: flat, more: false };
  const m = flat.match(/^.{8,40}?[。！？」]/);
  let lead = m ? m[0] : flat.slice(0, 30) + '……';
  // 引号没合上：能在 52 字内合上就补全，否则截到引号前
  const open = lead.lastIndexOf('「');
  if (open > lead.lastIndexOf('」')) {
    const close = flat.indexOf('」', lead.length);
    if (close >= 0 && close < 52) lead = flat.slice(0, close + 1);
    else if (open >= 8) lead = flat.slice(0, open).replace(/[：:，,]$/, '') + '……';
  }
  return { lead, more: lead.length < flat.length };
}

export function eventScene(text: string, opts: Option[], loc: string, locName: string): EventScene {
  const { lead, more } = leadLine(text);
  return { subject: eventSubject(text, opts, loc), loc, locName, lead, more };
}
