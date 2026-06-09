import { updateScore } from '../router/proposals';

describe('updateScore', () => {
  describe('supporting（支持）', () => {
    it('high尤度でスコアが増加する', () => {
      expect(updateScore(0.5, 'supporting', 'high')).toBeCloseTo(0.5 * 1.1);
    });

    it('medium尤度でhighより小さく増加する', () => {
      const high   = updateScore(0.5, 'supporting', 'high');
      const medium = updateScore(0.5, 'supporting', 'medium');
      expect(medium).toBeGreaterThan(0.5);
      expect(medium).toBeLessThan(high);
    });

    it('low尤度でmediumより小さく増加する', () => {
      const medium = updateScore(0.5, 'supporting', 'medium');
      const low    = updateScore(0.5, 'supporting', 'low');
      expect(low).toBeGreaterThan(0.5);
      expect(low).toBeLessThan(medium);
    });

    it('1.0を超えない', () => {
      expect(updateScore(0.99, 'supporting', 'high')).toBeLessThanOrEqual(1.0);
      expect(updateScore(1.0, 'supporting', 'high')).toBe(1.0);
    });
  });

  describe('contradicting（反証）', () => {
    it('high尤度でスコアが減少する', () => {
      expect(updateScore(0.5, 'contradicting', 'high')).toBeCloseTo(0.5 * 0.85);
    });

    it('medium尤度でhighより小さく減少する', () => {
      const high   = updateScore(0.5, 'contradicting', 'high');
      const medium = updateScore(0.5, 'contradicting', 'medium');
      expect(medium).toBeLessThan(0.5);
      expect(medium).toBeGreaterThan(high);
    });

    it('low尤度でmediumより小さく減少する', () => {
      const medium = updateScore(0.5, 'contradicting', 'medium');
      const low    = updateScore(0.5, 'contradicting', 'low');
      expect(low).toBeLessThan(0.5);
      expect(low).toBeGreaterThan(medium);
    });

    it('0.0を下回らない', () => {
      expect(updateScore(0.01, 'contradicting', 'high')).toBeGreaterThanOrEqual(0.0);
      expect(updateScore(0.0, 'contradicting', 'high')).toBe(0.0);
    });
  });

  describe('unrelated（無関係）', () => {
    it('スコアが変化しない', () => {
      expect(updateScore(0.5, 'unrelated', 'high')).toBe(0.5);
      expect(updateScore(0.3, 'unrelated', 'medium')).toBe(0.3);
    });
  });

  describe('不明な尤度', () => {
    it('不明な尤度はlow相当（0.3）として扱われる', () => {
      const withLow     = updateScore(0.5, 'supporting', 'low');
      const withUnknown = updateScore(0.5, 'supporting', 'unknown');
      expect(withUnknown).toBe(withLow);
    });
  });
});
