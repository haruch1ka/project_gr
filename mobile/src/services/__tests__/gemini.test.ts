import { SCORE_DELTA, reorganizeIntoFolders, FolderAssignment, isValidCategory } from '../gemini';
import type { Knowledge } from '../../types';

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

// ── isValidCategory ──────────────────────────────────────────────────────────

describe('isValidCategory', () => {
  it.each([
    ['ルアーカラー', true],
    ['キャスト',     true],
    ['食事',         true],
    ['睡眠',         true],
    ['回復・睡眠',   true],  // ・は許容（同類を並列）
  ])('valid: "%s"', (name, expected) => {
    expect(isValidCategory(name).valid).toBe(expected);
  });

  it.each([
    ['木曽川ルアーカラー攻略', false, '長すぎる'],
    ['光量とルアーカラー',     false, '助詞「と」'],
    ['赤金やチャート',         false, '助詞「や」'],
    ['',                       false, '空文字'],
    ['12文字以上のカテゴリ名前', false, '長すぎる'],
  ])('invalid: "%s" → %s', (name, expected, _reason) => {
    const result = isValidCategory(name);
    expect(result.valid).toBe(expected);
    expect(result.reason).toBeDefined();
  });
});

// ── reorganizeIntoFolders ────────────────────────────────────────────────────

const baseKnowledge = (overrides: Partial<Knowledge> = {}): Knowledge => ({
  _id: 'k1',
  field: '釣り',
  type: 'hypothesis',
  category: 'テクニック',
  content: 'フォールで食う',
  webSources: [],
  supportingExperiences: [],
  contradictingExperiences: [],
  confidenceScore: 0.5,
  tags: [],
  createdAt: '2024-01-01',
  ...overrides,
});

function mockFetch(assignments: FolderAssignment[]) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ text: JSON.stringify(assignments) }),
  } as unknown as Response);
}

describe('reorganizeIntoFolders', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('知識が空なら空配列を返す（APIを呼ばない）', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await reorganizeIntoFolders('釣り', [], []);
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('_idのない知識は除外されて空配列になる', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await reorganizeIntoFolders('釣り', [baseKnowledge({ _id: undefined })], []);
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Geminiが返したアサインをそのまま返す', async () => {
    const assignments: FolderAssignment[] = [
      { itemId: 'k1', folderName: 'テクニック', parentFolderName: null },
      { itemId: 'k2', folderName: 'キャスト', parentFolderName: 'テクニック' },
    ];
    mockFetch(assignments);

    const knowledge = [
      baseKnowledge({ _id: 'k1' }),
      baseKnowledge({ _id: 'k2', content: 'キャストで距離が出る' }),
    ];
    const result = await reorganizeIntoFolders('釣り', knowledge, []);
    expect(result).toEqual(assignments);
  });

  it('既存フォルダ名がプロンプトに含まれる（fetchの引数を検証）', async () => {
    const assignments: FolderAssignment[] = [
      { itemId: 'k1', folderName: 'テクニック', parentFolderName: null },
    ];
    mockFetch(assignments);

    const existingFolders = [{ _id: 'f1', title: 'テクニック' }];
    await reorganizeIntoFolders('釣り', [baseKnowledge()], existingFolders);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].parts[0].text).toContain('テクニック');
  });

  it('現在のフォルダ名がcurrentFolderとしてプロンプトに含まれる', async () => {
    const assignments: FolderAssignment[] = [
      { itemId: 'k1', folderName: 'テクニック', parentFolderName: null },
    ];
    mockFetch(assignments);

    const existingFolders = [{ _id: 'f1', title: 'ルアー' }];
    const knowledge = [baseKnowledge({ folderId: 'f1' })];
    await reorganizeIntoFolders('釣り', knowledge, existingFolders);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].parts[0].text).toContain('ルアー');
  });
});
