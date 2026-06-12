import { Router } from 'express';
import { Experience } from '../models/Experience';
import { Knowledge } from '../models/Knowledge';
import { Proposal } from '../models/Proposal';

const router = Router();

const GEMINI_MODEL   = 'gemini-flash-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// 尤度係数
const LIKELIHOOD_FACTOR: Record<string, number> = { high: 1.0, medium: 0.6, low: 0.3 };

export function updateScore(score: number, direction: string, likelihood: string): number {
  const factor = LIKELIHOOD_FACTOR[likelihood] ?? 0.3;
  if (direction === 'supporting')   return Math.min(1, score * (1 + 0.1 * factor));
  if (direction === 'contradicting') return Math.max(0, score * (1 - 0.15 * factor));
  return score;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY が未設定です');

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' },
    }),
  });

  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}

// GET /proposals?field=xxx
// 1. 既存のProposalがあれば返す
// 2. なければ未分析の経験をGeminiで分析し、hypothesis更新 + distilled候補を検出
router.get('/', async (req, res) => {
  const { field } = req.query;
  if (!field || typeof field !== 'string') {
    res.status(400).json({ error: 'field は必須です' });
    return;
  }

  // キャッシュ済みのProposalがあれば返す
  const existing = await Proposal.findOne({ field });
  if (existing) {
    res.json({ proposal: existing });
    return;
  }

  // 未分析の経験を取得
  const unanalyzed = await Experience.find({ field, analyzed: false }).sort({ createdAt: 1 });
  if (unanalyzed.length === 0) {
    res.json({ proposal: null });
    return;
  }

  // hypothesis知識を取得（最大10件）
  const hypotheses = await Knowledge.find({ field, type: 'hypothesis' })
    .sort({ createdAt: -1 })
    .limit(10);

  // 仮説照合・パターン検出用に全経験（最大15件）
  const allExperiences = await Experience.find({ field })
    .sort({ createdAt: -1 })
    .limit(15);

  // Geminiプロンプト構築
  const hypothesesText = hypotheses.length > 0
    ? hypotheses.map(h => `- ID:${h._id} 内容:「${h.content}」 確信度:${h.confidenceScore.toFixed(2)}`).join('\n')
    : '（なし）';

  const allExpText = allExperiences
    .map(e => `- ID:${e._id} 日付:${e.date} 内容:「${e.memo}」`)
    .join('\n');

  const prompt = `あなたは経験ログのパターンを検出するAIです。分野は「${field}」です。

【タスク1：仮説とのパターン照合】
すべての経験ログを通じて、各仮説に対して「2件以上の経験が同じ方向（支持または反証）を示しているか」を確認してください。

制約（必ず守ること）：
- Web上の一般知識・「なぜそうなるか」の推論は使用禁止
- ログに実際に書かれた事実・結果のみを根拠にする
- 2件未満しか根拠がない場合は direction を "unrelated" にする

【タスク2：パターン検出（distilled候補）】
すべての経験から、このユーザーに固有の傾向やパターンを1つだけ検出してください。

制約（必ず守ること）：
- Web上の一般知識・「なぜそうなるか」の推論は使用禁止
- ログに2件以上現れた事実のみを根拠にする
- 2件以上の根拠がない場合は null を返す

--- 既存の仮説 ---
${hypothesesText}

--- すべての経験 ---
${allExpText}

必ず以下のJSON形式のみで返してください：
{
  "hypothesisUpdates": [
    {
      "knowledgeId": "知識のID文字列",
      "direction": "supporting" | "contradicting" | "unrelated",
      "likelihood": "high" | "medium" | "low"
    }
  ],
  "distilledProposal": {
    "content": "ログから見えたパターンの説明（日本語・1〜2文）",
    "confidenceScore": 0.0〜1.0の数値,
    "supportingExperienceIds": ["経験のID文字列", ...]
  } | null
}`;

  let analysisResult: {
    hypothesisUpdates?: { knowledgeId: string; direction: string; likelihood: string }[];
    distilledProposal?: {
      content: string;
      confidenceScore: number;
      supportingExperienceIds: string[];
    } | null;
  };

  try {
    const raw = await callGemini(prompt);
    analysisResult = JSON.parse(raw);
  } catch {
    // Gemini失敗時は経験をanalyzeのみ済みにして終了
    await Experience.updateMany(
      { _id: { $in: unanalyzed.map(e => e._id) } },
      { $set: { analyzed: true } },
    );
    res.json({ proposal: null });
    return;
  }

  // hypothesis スコア更新
  const updates = analysisResult.hypothesisUpdates ?? [];
  await Promise.all(
    updates
      .filter(u => u.direction !== 'unrelated')
      .map(async u => {
        const k = hypotheses.find(h => String(h._id) === u.knowledgeId);
        if (!k) return;
        const newScore = updateScore(k.confidenceScore, u.direction, u.likelihood);
        await Knowledge.findByIdAndUpdate(k._id, { confidenceScore: newScore });
      }),
  );

  // 経験を分析済みにマーク
  await Experience.updateMany(
    { _id: { $in: unanalyzed.map(e => e._id) } },
    { $set: { analyzed: true } },
  );

  // distilled候補を保存して返す
  const dp = analysisResult.distilledProposal;
  if (dp && dp.content) {
    const saved = await Proposal.create({
      field,
      content:                 dp.content,
      confidenceScore:         Math.min(1, Math.max(0, dp.confidenceScore)),
      supportingExperienceIds: dp.supportingExperienceIds ?? [],
      sourceKnowledgeId:       null,
    });
    res.json({ proposal: saved });
    return;
  }

  res.json({ proposal: null });
});

// DELETE /proposals/:id  （却下）
router.delete('/:id', async (req, res) => {
  await Proposal.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
