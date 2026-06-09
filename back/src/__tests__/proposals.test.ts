import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { Experience } from '../models/Experience';
import { Knowledge } from '../models/Knowledge';
import { Proposal } from '../models/Proposal';

// Gemini API の fetch をモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

// テスト環境でのAPIキー
process.env.GEMINI_API_KEY = 'test-key';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    Experience.deleteMany({}),
    Knowledge.deleteMany({}),
    Proposal.deleteMany({}),
  ]);
  mockFetch.mockReset();
});

// Gemini が返す正常レスポンスを生成するヘルパー
function geminiResponse(payload: object) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  };
}

// ─── GET /proposals ───────────────────────────────────────────────────────────

describe('GET /proposals', () => {
  it('fieldパラメータなしは400を返す', async () => {
    const res = await request(app).get('/proposals');
    expect(res.status).toBe(400);
  });

  it('未分析経験がない場合は proposal: null を返す', async () => {
    const res = await request(app).get('/proposals?field=釣り');
    expect(res.status).toBe(200);
    expect(res.body.proposal).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('既存Proposalがある場合はGeminiを呼ばず返す', async () => {
    await Proposal.create({
      field: '釣り',
      content: 'キャッシュ済みの提案',
      confidenceScore: 0.6,
    });

    const res = await request(app).get('/proposals?field=釣り');
    expect(res.status).toBe(200);
    expect(res.body.proposal.content).toBe('キャッシュ済みの提案');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('未分析経験がある場合はGeminiを呼び、経験をanalyze済みにする', async () => {
    await Experience.create({ field: '釣り', date: '6/1', memo: 'テスト経験', analyzed: false });

    mockFetch.mockResolvedValueOnce(geminiResponse({
      hypothesisUpdates: [],
      distilledProposal: null,
    }));

    const res = await request(app).get('/proposals?field=釣り');
    expect(res.status).toBe(200);
    expect(res.body.proposal).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const exp = await Experience.findOne({ field: '釣り' });
    expect(exp?.analyzed).toBe(true);
  });

  it('Geminiがdistilledを返したらProposalをDBに保存して返す', async () => {
    await Experience.create({ field: '釣り', date: '6/1', memo: 'テスト経験', analyzed: false });

    mockFetch.mockResolvedValueOnce(geminiResponse({
      hypothesisUpdates: [],
      distilledProposal: {
        content: '朝の練習の方が集中できる傾向がある',
        confidenceScore: 0.65,
        supportingExperienceIds: [],
      },
    }));

    const res = await request(app).get('/proposals?field=釣り');
    expect(res.status).toBe(200);
    expect(res.body.proposal.content).toBe('朝の練習の方が集中できる傾向がある');
    expect(res.body.proposal.confidenceScore).toBeCloseTo(0.65);

    const saved = await Proposal.findOne({ field: '釣り' });
    expect(saved).not.toBeNull();
    expect(saved?.content).toBe('朝の練習の方が集中できる傾向がある');
  });

  it('Geminiがhypothesisのscoreを更新する（supporting/high）', async () => {
    const knowledge = await Knowledge.create({
      field: '釣り',
      type: 'hypothesis',
      category: 'テスト',
      content: 'テスト仮説',
      confidenceScore: 0.5,
    });
    await Experience.create({ field: '釣り', date: '6/1', memo: 'テスト経験', analyzed: false });

    mockFetch.mockResolvedValueOnce(geminiResponse({
      hypothesisUpdates: [{
        knowledgeId: knowledge._id.toString(),
        direction: 'supporting',
        likelihood: 'high',
      }],
      distilledProposal: null,
    }));

    await request(app).get('/proposals?field=釣り');

    const updated = await Knowledge.findById(knowledge._id);
    expect(updated?.confidenceScore).toBeGreaterThan(0.5);
    expect(updated?.confidenceScore).toBeLessThanOrEqual(1.0);
  });

  it('Geminiがhypothesisのscoreを更新する（contradicting/medium）', async () => {
    const knowledge = await Knowledge.create({
      field: '筋トレ',
      type: 'hypothesis',
      category: 'テスト',
      content: 'テスト仮説',
      confidenceScore: 0.6,
    });
    await Experience.create({ field: '筋トレ', date: '6/1', memo: 'テスト経験', analyzed: false });

    mockFetch.mockResolvedValueOnce(geminiResponse({
      hypothesisUpdates: [{
        knowledgeId: knowledge._id.toString(),
        direction: 'contradicting',
        likelihood: 'medium',
      }],
      distilledProposal: null,
    }));

    await request(app).get('/proposals?field=筋トレ');

    const updated = await Knowledge.findById(knowledge._id);
    expect(updated?.confidenceScore).toBeLessThan(0.6);
    expect(updated?.confidenceScore).toBeGreaterThanOrEqual(0.0);
  });

  it('Geminiのレスポンスが不正なJSONの場合も経験をanalyze済みにする', async () => {
    await Experience.create({ field: '釣り', date: '6/1', memo: 'テスト', analyzed: false });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'invalid json{{{' }] } }],
      }),
    });

    const res = await request(app).get('/proposals?field=釣り');
    expect(res.status).toBe(200);
    expect(res.body.proposal).toBeNull();

    const exp = await Experience.findOne({ field: '釣り' });
    expect(exp?.analyzed).toBe(true);
  });

  it('confidenceScoreが0〜1の範囲外でも正規化して保存する', async () => {
    await Experience.create({ field: '釣り', date: '6/1', memo: 'テスト', analyzed: false });

    mockFetch.mockResolvedValueOnce(geminiResponse({
      hypothesisUpdates: [],
      distilledProposal: {
        content: 'テスト',
        confidenceScore: 1.5,  // 1.0超
        supportingExperienceIds: [],
      },
    }));

    const res = await request(app).get('/proposals?field=釣り');
    expect(res.body.proposal.confidenceScore).toBeLessThanOrEqual(1.0);
  });
});

// ─── DELETE /proposals/:id ────────────────────────────────────────────────────

describe('DELETE /proposals/:id', () => {
  it('Proposalを削除できる', async () => {
    const proposal = await Proposal.create({
      field: '釣り',
      content: 'テスト',
      confidenceScore: 0.5,
    });

    const res = await request(app).delete(`/proposals/${proposal._id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const found = await Proposal.findById(proposal._id);
    expect(found).toBeNull();
  });

  it('存在しないIDでも200を返す', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/proposals/${fakeId}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
