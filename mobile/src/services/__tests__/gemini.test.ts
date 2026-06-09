import { SCORE_DELTA } from '../gemini';

// ── SCORE_DELTA ─────────────────────────────────────────────────────────────

describe('SCORE_DELTA', () => {
  it('supporting/highが最大増加量', () => {
    expect(SCORE_DELTA.supporting.high).toBeGreaterThan(SCORE_DELTA.supporting.medium);
    expect(SCORE_DELTA.supporting.medium).toBeGreaterThan(SCORE_DELTA.supporting.low);
  });

  it('contradicting/highが最大減少量', () => {
    expect(SCORE_DELTA.contradicting.high).toBeLessThan(SCORE_DELTA.contradicting.medium);
    expect(SCORE_DELTA.contradicting.medium).toBeLessThan(SCORE_DELTA.contradicting.low);
  });

  it('neutralはすべて0', () => {
    expect(SCORE_DELTA.neutral.high).toBe(0);
    expect(SCORE_DELTA.neutral.medium).toBe(0);
    expect(SCORE_DELTA.neutral.low).toBe(0);
  });

  it('supportingとcontradictingは対称', () => {
    expect(SCORE_DELTA.supporting.high).toBe(-SCORE_DELTA.contradicting.high);
    expect(SCORE_DELTA.supporting.medium).toBe(-SCORE_DELTA.contradicting.medium);
    expect(SCORE_DELTA.supporting.low).toBe(-SCORE_DELTA.contradicting.low);
  });
});
