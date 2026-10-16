// 同行者事件：白狐、赤衣、丹尊、掌天瓶各 9 段（内容库「同行者事件」）
// 第 N 段只在命灯 = N-1 时出现，完成后命灯 +1（一世最多 +2）
import type { CompanionId } from './content';
import type { LifeState, MetaState, Option } from '../game/types';

export interface BondEvent {
  comp: Exclude<CompanionId, 'silu'>;
  n: number;
  title: string;
  text: string;
  cond: (L: LifeState, M: MetaState) => boolean;
  options: Option[];
}

const r = (n: number) => (L: LifeState) => L.realm >= n;
const vol = (n: number) => (_L: LifeState, M: MetaState) => M.saga.volume >= n;

export const BOND_EVENTS: BondEvent[] = [
  // 白狐
  { comp: 'fox', n: 1, title: '雪中狐', text: '雪地里一只受伤的白狐，抬头看着你。', cond: r(2), options: [
    { label: '救它', desc: '灵石 20', eff: { stones: -20, trace: 'snowfield', flag: 'foxSaved' }, page: 5 },
    { label: '留下灵药离开', eff: { trace: 'snowfield' } },
    { label: '取其内丹', desc: '修为 +15%，白狐线本世终止', eff: { xpPct: 15, trace: 'fox_slain', flag: 'foxDead', kill: true }, lamp: false },
  ] },
  { comp: 'fox', n: 2, title: '月下妖仙', text: '白狐化作白衣妖仙：「那只手，我从未忘记。」', cond: r(3), options: [
    { label: '并肩问道', desc: '白狐成为伙伴', eff: { flag: 'foxPartner' } },
    { label: '各自修行', eff: {} },
  ] },
  { comp: 'fox', n: 3, title: '狐火与墨', text: '白狐的狐火烧开墨影，她说她只是「记得怎么烧」。', cond: (L) => !!L.flags.foxFought, options: [
    { label: '问她从哪学的', eff: {} },
    { label: '不问', eff: {} },
  ] },
  { comp: 'fox', n: 4, title: '袖口的墨', text: '她抓住你的袖口看了很久。', cond: r(1), options: [
    { label: '任她看', eff: { flag: 'foxPartner' } },
    { label: '抽回手', desc: '本世她不再参战', eff: { flag: 'foxAway' } },
  ] },
  { comp: 'fox', n: 5, title: '替你挡雷', text: '她替你挡下一道雷，伤得很重，说这不是第一次。', cond: (L) => !!L.flags.foxBlocked, options: [
    { label: '闭关为她疗伤', desc: '寿元 -10', eff: { life: -10 } },
    { label: '赠丹药', desc: '灵石 80', eff: { stones: -80 }, when: (L) => L.stones >= 80 },
  ] },
  { comp: 'fox', n: 6, title: '邻家少女', text: '邻家小女孩总在河畔等你。有她在，你去河畔不会溺水。', cond: (L) => L.realm === 0 && L.age >= 6, options: [
    { label: '陪她放纸鸢', eff: { flag: 'foxRiver', merit: 5 } },
    { label: '读书去', eff: { attr: { wu: 1 }, flag: 'foxRiver' } },
  ] },
  { comp: 'fox', n: 7, title: '她也会老', text: '她以凡身老去，笑着说下一世还会来。', cond: r(4), options: [
    { label: '送她走', eff: { merit: 20 } },
    { label: '求掌天瓶留她一年', desc: '需已解锁回溯', when: (_L, M) => M.saga.pages.includes(17), eff: { flag: 'rewindSpent' } },
  ] },
  { comp: 'fox', n: 8, title: '画外的雪', text: '她说画外也下雪，雪是黑的。', cond: vol(3), options: [{ label: '听她讲完', eff: { flag: 'foxSnowHeard' } }] },
  { comp: 'fox', n: 9, title: '狐的记忆', text: '她把三千年的记忆抽成一缕白毫交给你。', cond: () => true, options: [{ label: '收下', eff: {} }] },

  // 赤衣
  { comp: 'chiyi', n: 1, title: '正魔之间', text: '一名红衣魔修被正道围攻，浑身是血。', cond: r(2), options: [
    { label: '出手相救', desc: '得百鬼幡，正道追兵', eff: { skill: 'ink', trace: 'demon_ally', school: { demon: 10 } } },
    { label: '旁观', eff: {} },
    { label: '助正道围杀', desc: '斩杀线', eff: { killChiyi: true, merit: 20 }, lamp: false },
  ] },
  { comp: 'chiyi', n: 2, title: '红衣下战书', text: '他叫出「执笔人」，约你一战。', cond: r(3), options: [
    { label: '应战', desc: '斗法，无论胜负得天书', eff: { battle: { kind: 'duel', title: '赤衣斗法', elites: 1, boss: 'chiyi' } }, page: 9 },
  ] },
  { comp: 'chiyi', n: 3, title: '放他走', text: '他倒在地上，等你下手。', cond: (L) => !!L.flags.chiyiBeaten || L.realm >= 3, options: [
    { label: '放他走', eff: { spareChiyi: true } },
    { label: '斩杀', desc: '赤衣本世终止，命灯不加', eff: { killChiyi: true }, lamp: false },
  ] },
  { comp: 'chiyi', n: 4, title: '墨域之主', text: '他在魔域开宗，流年签上开始出现「魔域扩张」。', cond: vol(2), options: [
    { label: '入魔域见他', eff: { trace: 'ink_touched' } },
    { label: '率正道讨伐', desc: '大型斗法', eff: { battle: { kind: 'duel', title: '讨伐魔域', elites: 3 } } },
  ] },
  { comp: 'chiyi', n: 5, title: '半身墨', text: '他让你看他被墨吞掉的半边身子。', cond: r(1), options: [{ label: '听他说', eff: {} }] },
  { comp: 'chiyi', n: 6, title: '结盟', text: '他提议这一世不打了。', cond: r(1), options: [
    { label: '结盟', desc: '本世可请援赤衣', eff: { flag: 'chiyiAlly', trace: 'demon_ally' } },
    { label: '拒绝', eff: { trace: 'chiyi_refused' } },
  ] },
  { comp: 'chiyi', n: 7, title: '儿时玩伴', text: '他以凡人小孩的身份出现，和你在官道上打架。', cond: (L) => L.realm === 0 && L.age >= 6, options: [
    { label: '打赢他', eff: { attr: { gen: 1 } } },
    { label: '打输他', eff: {} },
    { label: '分他半个馒头', eff: { merit: 10 } },
  ] },
  { comp: 'chiyi', n: 8, title: '墨的理由', text: '他说当年你封门时，把他留在了门外半步。', cond: vol(3), options: [
    { label: '道歉', eff: { flag: 'chiyiSorry' } },
    { label: '不道歉', eff: {} },
  ] },
  { comp: 'chiyi', n: 9, title: '赤衣之墨', text: '他把自己身上最浓的一点墨给你：「画门时用得上。」', cond: () => true, options: [{ label: '收下', eff: {} }] },

  // 丹尊
  { comp: 'danzun', n: 1, title: '古戒', text: '你拾得一枚古戒，戴上后它会吸你的灵气。', cond: (L, M) => r(1)(L) && vol(2)(L, M), options: [
    { label: '戴上', desc: '修为 -25%', eff: { xpPct: -25, flag: 'ring' } },
    { label: '炼化', desc: '灵石 +60，丹尊线本世终止', eff: { stones: 60 }, lamp: false },
  ] },
  { comp: 'danzun', n: 2, title: '残魂苏醒', text: '戒中残魂现身，自称丹尊，愿以焰诀相偿。', cond: (L, M) => r(2)(L) && vol(2)(L, M), options: [
    { label: '拜师', desc: '丹尊成为伙伴', eff: { flag: 'danzunPartner', school: { alchemy: 20 } }, page: 10 },
    { label: '只取焰诀', eff: { skill: 'fire' } },
  ] },
  { comp: 'danzun', n: 3, title: '第一炉丹', text: '他教你炼丹，炸了炉。「老夫当年也炸过。」', cond: r(1), options: [{ label: '再来一炉', desc: '丹修道途 +15', eff: { school: { alchemy: 15 } } }] },
  { comp: 'danzun', n: 4, title: '门前旧事', text: '他讲飞升曾是常事，讲到一半睡着了。', cond: r(3), options: [{ label: '等他醒', desc: '年龄 +1', eff: { age: 1 } }] },
  { comp: 'danzun', n: 5, title: '丹火不灭', text: '他的丹火烧着三千年没灭，他说是为一个人留的。', cond: r(4), options: [{ label: '问是谁', eff: {} }, { label: '不问', eff: {} }] },
  { comp: 'danzun', n: 6, title: '求药', text: '他可以炼一炉回天丹，但要你一件法宝入炉。', cond: r(2), options: [
    { label: '给', desc: '交出一件法宝（没有就功法退一层）', eff: { flag: 'loseSkill', merit: 30 } },
    { label: '不给', eff: {}, lamp: false },
  ] },
  { comp: 'danzun', n: 7, title: '徒儿们', text: '他念出当年送出画的徒儿名字，念到最后一个停住了。', cond: r(1), options: [{ label: '追问', eff: {} }, { label: '不追问', eff: {} }] },
  { comp: 'danzun', n: 8, title: '那个名字', text: '最后一个名字是你。他是你当年的师父。', cond: vol(3), options: [{ label: '叫一声师父', eff: {} }] },
  { comp: 'danzun', n: 9, title: '丹尊之火', text: '他把丹火移入你的笔毫，古戒碎了。', cond: () => true, options: [{ label: '收下', eff: {} }] },

  // 掌天瓶
  { comp: 'bottle', n: 1, title: '古瓶', text: '一只古瓶，以灵气温养可延寿。', cond: (L, M) => r(2)(L) && vol(2)(L, M), options: [
    { label: '温养', desc: '寿元 +12', eff: { life: 12, flag: 'bottle' } },
    { label: '卖掉', desc: '灵石 +80', eff: { stones: 80 }, lamp: false },
  ] },
  { comp: 'bottle', n: 2, title: '滴水', text: '瓶中凝出一滴水。', cond: (L, M) => r(4)(L) && vol(2)(L, M), options: [
    { label: '饮下', desc: '所有功法 +1 层', eff: { flag: 'allUp' } },
    { label: '留着', eff: {} },
  ] },
  // 第 3 段「死前一刻」在死亡时自动触发
  { comp: 'bottle', n: 4, title: '重来一年', text: '你在一个糟糕的年份里眨了一下眼，发现又回到年初。', cond: vol(2), options: [{ label: '接受', desc: '解锁掌天瓶回溯', eff: {}, page: 17 }] },
  { comp: 'bottle', n: 5, title: '瓶底的字', text: '瓶底刻着一个「砚」字。', cond: r(1), options: [{ label: '记下，拿去问司灯', eff: { flag: 'askSilu' } }] },
  { comp: 'bottle', n: 6, title: '偷来的岁月', text: '瓶里映出一个不认识的人的一生，每一年都缺了一点。', cond: r(3), options: [
    { label: '把水倒回画中', desc: '功德 +100', eff: { merit: 100 } },
    { label: '自己喝', desc: '寿元 +40，命灯不加', eff: { life: 40 }, lamp: false },
  ] },
  { comp: 'bottle', n: 7, title: '停止的三息', text: '天劫落下前，时间停了三息。', cond: r(5), options: [{ label: '记住这三息', eff: {} }] },
  { comp: 'bottle', n: 8, title: '砚池的水', text: '瓶和轮回井的水是同一种水。', cond: vol(3), options: [{ label: '把瓶放进井里一夜', eff: {} }] },
  { comp: 'bottle', n: 9, title: '砚滴之时', text: '瓶碎了，水不流出来，只浮在你掌中。', cond: () => true, options: [{ label: '收下', eff: {} }] },
];
