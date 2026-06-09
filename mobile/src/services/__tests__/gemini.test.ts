import { toStatus, SCORE_DELTA } from '../gemini';

// ── toStatus ────────────────────────────────────────────────────────────────

describe('toStatus', () => {
  it('0.8以上はverified', () => {
    expect(toStatus(0.8)).toBe('verified');
    expect(toStatus(0.9)).toBe('verified');
    expect(toStatus(1.0)).toBe('verified');
  });

  it('0.2以下はdisproved', () => {
    expect(toStatus(0.2)).toBe('disproved');
    expect(toStatus(0.1)).toBe('disproved');
    expect(toStatus(0.0)).toBe('disproved');
  });

  it('0.2超〜0.8未満はhypothesis', () => {
    expect(toStatus(0.21)).toBe('hypothesis');
    expect(toStatus(0.5)).toBe('hypothesis');
    expect(toStatus(0.79)).toBe('hypothesis');
  });
});

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
