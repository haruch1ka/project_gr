import { storageKey, buildSystemPrompt } from '../chat';
import { Knowledge, Experience } from '../../types';

// ── storageKey ──────────────────────────────────────────────────────────────

describe('storageKey', () => {
  it('フィールド名からキーを生成する', () => {
    expect(storageKey('釣り')).toBe('chat_history:釣り');
    expect(storageKey('筋トレ')).toBe('chat_history:筋トレ');
  });

  it('空文字列でも動作する', () => {
    expect(storageKey('')).toBe('chat_history:');
  });
});

// ── buildSystemPrompt ───────────────────────────────────────────────────────

const baseKnowledge: Knowledge = {
  field: '釣り',
  category: 'テクニック',
  content: 'フローティングミノーは澄み潮に効く',
  webSources: [],
  supportingExperiences: [],
  contradictingExperiences: [],
  confidenceScore: 0.5,
  status: 'hypothesis',
  tags: [],
  createdAt: '2024-01-01',
};

const baseExperience: Experience = {
  field: '釣り',
  date: '2024-01-10',
  memo: '朝マズメにシーバス3匹',
  createdAt: '2024-01-10',
};

describe('buildSystemPrompt', () => {
  it('フィールド名がプロンプトに含まれる', () => {
    const prompt = buildSystemPrompt('釣り', [], []);
    expect(prompt).toContain('釣り');
  });

  it('知識なし・経験なしの場合はフォールバック文言が入る', () => {
    const prompt = buildSystemPrompt('釣り', [], []);
    expect(prompt).toContain('（まだ知識がありません）');
    expect(prompt).toContain('（まだ経験ログがありません）');
  });

  it('仮説ステータスの知識が「仮説」ラベルで表示される', () => {
    const prompt = buildSystemPrompt('釣り', [{ ...baseKnowledge, status: 'hypothesis', confidenceScore: 0.5 }], []);
    expect(prompt).toContain('[仮説 50%]');
    expect(prompt).toContain('フローティングミノーは澄み潮に効く');
  });

  it('verifiedステータスの知識が「検証済」ラベルで表示される', () => {
    const prompt = buildSystemPrompt('釣り', [{ ...baseKnowledge, status: 'verified', confidenceScore: 0.85 }], []);
    expect(prompt).toContain('[検証済 85%]');
  });

  it('disprovedステータスの知識が「反証」ラベルで表示される', () => {
    const prompt = buildSystemPrompt('釣り', [{ ...baseKnowledge, status: 'disproved', confidenceScore: 0.1 }], []);
    expect(prompt).toContain('[反証 10%]');
  });

  it('経験ログが日付・メモ形式で含まれる', () => {
    const prompt = buildSystemPrompt('釣り', [], [baseExperience]);
    expect(prompt).toContain('2024-01-10: 朝マズメにシーバス3匹');
  });

  it('経験ログは最大5件しか含まれない', () => {
    const experiences: Experience[] = Array.from({ length: 8 }, (_, i) => ({
      ...baseExperience,
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      memo: `経験${i + 1}`,
    }));
    const prompt = buildSystemPrompt('釣り', [], experiences);
    expect(prompt).toContain('経験1');
    expect(prompt).toContain('経験5');
    expect(prompt).not.toContain('経験6');
  });

  it('信頼度スコアは四捨五入されたパーセント表示になる', () => {
    const prompt = buildSystemPrompt('釣り', [{ ...baseKnowledge, confidenceScore: 0.754 }], []);
    expect(prompt).toContain('75%');
  });
});
