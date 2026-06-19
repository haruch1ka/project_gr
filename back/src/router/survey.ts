import { Router } from 'express';
import { Survey } from '../models/Survey';
import { Experience } from '../models/Experience';
import { Knowledge } from '../models/Knowledge';

const router = Router();

const GEMINI_MODEL   = 'gemini-flash-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MIN_DAYS = 3;
const MAX_DAYS = 14;
const MIN_EXPERIENCES = 3;
const MIN_KNOWLEDGE   = 1;

function randomDaysLater(min: number, max: number): Date {
  const days = min + Math.floor(Math.random() * (max - min + 1));
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
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

async function generateSurvey(field: string): Promise<{ question: string; choices: string[] } | null> {
  const [experiences, knowledge, recentSurveys] = await Promise.all([
    Experience.find({ field }).sort({ createdAt: -1 }).limit(10),
    Knowledge.find({ field }).sort({ createdAt: -1 }).limit(10),
    Survey.find({ field }).sort({ createdAt: -1 }).limit(3),
  ]);

  if (experiences.length < MIN_EXPERIENCES || knowledge.length < MIN_KNOWLEDGE) return null;

  const expText = experiences
    .map(e => `- 日付:${e.date} 内容:「${e.memo}」`)
    .join('\n');

  const knowledgeText = knowledge
    .map(k => `- [${k.type}] 確信度:${k.confidenceScore.toFixed(2)} 「${k.content}」`)
    .join('\n');

  const prevQText = recentSurveys.length > 0
    ? recentSurveys.map(s => `- 「${s.question}」`).join('\n')
    : '（なし）';

  const prompt = `あなたはユーザーの盲点を発見するAIです。分野は「${field}」です。

以下の経験ログと知識の状態を分析し、ユーザーが気づいていないかもしれない傾向・思い込み・見落としを一問（選択肢式）で問いかけてください。

制約：
- 過去の質問と実質的に同じ内容は避けること
- 答えを「知識として学ぶ」のではなく「自分の実態を振り返る」問いにすること
- 選択肢は2〜4個。10秒以内に選べる簡潔さにすること
- 文脈が不十分と判断した場合は null を返すこと

--- 最新の経験ログ ---
${expText}

--- 知識の状態 ---
${knowledgeText}

--- 最近の質問（重複回避） ---
${prevQText}

以下のJSON形式のみで返してください：
{
  "question": "質問文（日本語・1〜2文）",
  "choices": ["選択肢1", "選択肢2", "選択肢3"]
} | null`;

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.question || !Array.isArray(parsed.choices)) return null;
    return { question: parsed.question, choices: parsed.choices };
  } catch {
    return null;
  }
}

// GET /surveys?field=xxx
// アクティブなサーベイを返す。なければ生成条件を確認して生成を試みる
router.get('/', async (req, res) => {
  const { field } = req.query;
  if (!field || typeof field !== 'string') {
    res.status(400).json({ error: 'field は必須です' });
    return;
  }

  // アクティブなサーベイがあれば返す
  const active = await Survey.findOne({ field, status: 'active' });
  if (active) {
    res.json({ survey: active });
    return;
  }

  // 直近クローズ済みサーベイの nextSurveyAt を確認
  const last = await Survey.findOne({ field, status: { $in: ['answered', 'skipped'] } })
    .sort({ createdAt: -1 });

  const now = new Date();
  if (last?.nextSurveyAt && last.nextSurveyAt > now) {
    // まだ期間内 → 生成しない
    res.json({ survey: null });
    return;
  }

  // 生成を試みる（レスポンス時間短縮のためバックグラウンドでは実行できないので同期的に）
  const generated = await generateSurvey(field);
  if (!generated) {
    res.json({ survey: null });
    return;
  }

  const survey = await Survey.create({
    field,
    question: generated.question,
    choices:  generated.choices,
  });

  res.json({ survey });
});

// POST /surveys/:id/answer  { answer: string }
router.post('/:id/answer', async (req, res) => {
  const { answer } = req.body;
  if (!answer || typeof answer !== 'string') {
    res.status(400).json({ error: 'answer は必須です' });
    return;
  }

  const survey = await Survey.findByIdAndUpdate(
    req.params.id,
    {
      status:       'answered',
      answer,
      answeredAt:   new Date(),
      nextSurveyAt: randomDaysLater(MIN_DAYS, MAX_DAYS),
    },
    { new: true },
  );

  res.json({ survey });
});

// DELETE /surveys/:id  （スキップ）
router.delete('/:id', async (req, res) => {
  await Survey.findByIdAndUpdate(req.params.id, {
    status:       'skipped',
    nextSurveyAt: randomDaysLater(MIN_DAYS, MAX_DAYS),
  });
  res.json({ ok: true });
});

export default router;
