import { Field, Experience, KnowledgeCategory, KnowledgeItem } from '../types';

export const mockFields: Field[] = [
  { name: '釣り', icon: '🎣' },
  { name: '筋トレ', icon: '💪' },
  { name: '読書', icon: '📖' },
];

export const mockExperiences: Record<string, Experience[]> = {
  '釣り': [
    { field: '釣り', date: '6/3', memo: '朝マズメ、大物バラした。タモを先に準備すべきだった', createdAt: '' },
    { field: '釣り', date: '6/2', memo: '夕マズメ、アジ連続ヒット。レンジ中層が正解だった', createdAt: '' },
    { field: '釣り', date: '6/1', memo: '風強すぎて釣りにならず。早上がり', createdAt: '' },
    { field: '釣り', date: '5/30', memo: '新しいルアー試したが反応なし。カラーを変えてみる', createdAt: '' },
  ],
  '筋トレ': [
    { field: '筋トレ', date: '6/3', memo: 'ベンチ80kg×5rep達成。フォームも安定してきた', createdAt: '' },
    { field: '筋トレ', date: '6/1', memo: 'スクワット疲労で追い込めず。睡眠が足りていない', createdAt: '' },
  ],
  '読書': [
    { field: '読書', date: '6/2', memo: '「思考の整理学」読了。外山滋比古の発酵理論が面白い', createdAt: '' },
  ],
};

export const mockCategories: Record<string, KnowledgeCategory[]> = {
  '釣り': [
    { field: '釣り', name: 'タイミング', createdAt: '' },
    { field: '釣り', name: '道具・仕掛け', createdAt: '' },
    { field: '釣り', name: '場所', createdAt: '' },
    { field: '釣り', name: 'まだわからないこと', createdAt: '' },
  ],
  '筋トレ': [
    { field: '筋トレ', name: '種目・フォーム', createdAt: '' },
    { field: '筋トレ', name: '回復・睡眠', createdAt: '' },
    { field: '筋トレ', name: '栄養', createdAt: '' },
  ],
  '読書': [
    { field: '読書', name: '気づき', createdAt: '' },
    { field: '読書', name: '実践したこと', createdAt: '' },
  ],
};

// field -> category -> items[]
export const mockItems: Record<string, Record<string, KnowledgeItem[]>> = {
  '釣り': {
    'タイミング': [
      { field: '釣り', category: 'タイミング', content: '朝マズメは中層レンジが基本', notes: ['6/2　アジ連続ヒット、中層で反応', '5/28　サバ5匹、同条件で再現', 'Web：アジングの棚取り、朝は中層〜表層が基本'], createdAt: '' },
      { field: '釣り', category: 'タイミング', content: '風速5m以上は釣りにならない', notes: ['6/1　風強くて早上がり', '5/20　同条件で釣果ゼロ', '5/10　強風で仕掛けが安定しなかった'], createdAt: '' },
      { field: '釣り', category: 'タイミング', content: '夕マズメも侮れない', notes: ['6/2　夕マズメで大物ヒット'], createdAt: '' },
    ],
    '道具・仕掛け': [
      { field: '釣り', category: '道具・仕掛け', content: 'タモは釣り始め前に準備する', notes: ['6/3　大物バラした、タモ準備が遅かった'], createdAt: '' },
    ],
    '場所': [],
    'まだわからないこと': [
      { field: '釣り', category: 'まだわからないこと', content: '潮位の影響', notes: [], createdAt: '' },
      { field: '釣り', category: 'まだわからないこと', content: 'ルアーカラーの法則', notes: [], createdAt: '' },
    ],
  },
  '筋トレ': {
    '種目・フォーム': [
      { field: '筋トレ', category: '種目・フォーム', content: 'ベンチは肩甲骨を寄せてアーチを作る', notes: ['6/3　フォーム意識で80kg達成', '5/25　肩の痛みがなくなった'], createdAt: '' },
      { field: '筋トレ', category: '種目・フォーム', content: 'スクワットは膝をつま先方向へ', notes: [], createdAt: '' },
    ],
    '回復・睡眠': [
      { field: '筋トレ', category: '回復・睡眠', content: '7時間以下だと翌日パフォーマンスが落ちる', notes: ['6/1　6時間睡眠でスクワット追い込めず'], createdAt: '' },
    ],
    '栄養': [],
  },
  '読書': {
    '気づき': [
      { field: '読書', category: '気づき', content: 'アイデアは寝かせることで発酵する（外山滋比古）', notes: ['「思考の整理学」より', '一晩寝かせてから書いた文章の方がまとまっていた'], createdAt: '' },
    ],
    '実践したこと': [],
  },
};
