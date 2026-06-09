import { knowledgeColor, knowledgeLabel } from '../knowledge';
import { colors } from '../../constants/theme';
import { Knowledge } from '../../types';

function makeKnowledge(type: Knowledge['type'], confidenceScore: number): Knowledge {
  return {
    field: 'テスト',
    type,
    category: 'テスト',
    content: 'テスト',
    webSources: [],
    supportingExperiences: [],
    contradictingExperiences: [],
    confidenceScore,
    tags: [],
    createdAt: '',
  };
}

// ─── knowledgeColor ──────────────────────────────────────────────────────────

describe('knowledgeColor', () => {
  describe('distilled（経験析出型）', () => {
    it('スコアに関係なく常にprimaryカラーを返す', () => {
      expect(knowledgeColor(makeKnowledge('distilled', 0.1))).toBe(colors.primary);
      expect(knowledgeColor(makeKnowledge('distilled', 0.5))).toBe(colors.primary);
      expect(knowledgeColor(makeKnowledge('distilled', 0.9))).toBe(colors.primary);
    });
  });

  describe('hypothesis（Web仮説型）', () => {
    it('score >= 0.7 → primaryカラー（高確信）', () => {
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.7))).toBe(colors.primary);
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.8))).toBe(colors.primary);
      expect(knowledgeColor(makeKnowledge('hypothesis', 1.0))).toBe(colors.primary);
    });

    it('score 0.3〜0.69 → textSecondaryカラー（仮説）', () => {
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.3))).toBe(colors.textSecondary);
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.5))).toBe(colors.textSecondary);
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.69))).toBe(colors.textSecondary);
    });

    it('score < 0.3 → dangerカラー（疑問）', () => {
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.0))).toBe(colors.danger);
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.1))).toBe(colors.danger);
      expect(knowledgeColor(makeKnowledge('hypothesis', 0.29))).toBe(colors.danger);
    });
  });
});

// ─── knowledgeLabel ──────────────────────────────────────────────────────────

describe('knowledgeLabel', () => {
  describe('distilled（経験析出型）', () => {
    it('スコアに関係なく常に「発見」を返す', () => {
      expect(knowledgeLabel(makeKnowledge('distilled', 0.1))).toBe('発見');
      expect(knowledgeLabel(makeKnowledge('distilled', 0.5))).toBe('発見');
      expect(knowledgeLabel(makeKnowledge('distilled', 0.9))).toBe('発見');
    });
  });

  describe('hypothesis（Web仮説型）', () => {
    it('score >= 0.7 → 「確信」', () => {
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.7))).toBe('確信');
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.8))).toBe('確信');
      expect(knowledgeLabel(makeKnowledge('hypothesis', 1.0))).toBe('確信');
    });

    it('score 0.3〜0.69 → 「仮説」', () => {
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.3))).toBe('仮説');
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.5))).toBe('仮説');
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.69))).toBe('仮説');
    });

    it('score < 0.3 → 「疑問」', () => {
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.0))).toBe('疑問');
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.1))).toBe('疑問');
      expect(knowledgeLabel(makeKnowledge('hypothesis', 0.29))).toBe('疑問');
    });
  });

  describe('colorとlabelの一貫性', () => {
    it('primaryカラーのとき発見か確信のどちらか', () => {
      const k1 = makeKnowledge('distilled', 0.5);
      const k2 = makeKnowledge('hypothesis', 0.8);
      expect(['発見', '確信']).toContain(knowledgeLabel(k1));
      expect(['発見', '確信']).toContain(knowledgeLabel(k2));
      expect(knowledgeColor(k1)).toBe(colors.primary);
      expect(knowledgeColor(k2)).toBe(colors.primary);
    });
  });
});
