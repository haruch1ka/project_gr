import { Knowledge, Experience } from '../types';
import { knowledgeApi } from './api';
import { TavilyResult } from './tavily';

const BACK_URL = 'https://project-gr-back.vercel.app';

type GeminiMessage = { role: 'user' | 'model'; parts: [{ text: string }] };

async function callGemini(
  messages: GeminiMessage[],
  systemInstruction?: string,
  jsonMode = false,
): Promise<string> {
  const res = await fetch(`${BACK_URL}/gemini/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages, systemInstruction, jsonMode }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.text ?? '';
}

// ─── 公開API ─────────────────────────────────────────────────────────────

export async function chat(prompt: string, systemInstruction = ''): Promise<string> {
  return callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction || undefined,
  );
}

export async function chatWithHistory(
  messages: Array<{ role: 'user' | 'assistant'; text: string }>,
  systemInstruction: string,
): Promise<string> {
  const firstUser = messages.findIndex(m => m.role === 'user');
  const valid = firstUser >= 0 ? messages.slice(firstUser) : messages;

  const contents: GeminiMessage[] = valid.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  return callGemini(contents, systemInstruction);
}

async function chatJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
  const text = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction,
    true,
  );
  return JSON.parse(text) as T;
}

// ─── 経験 → 知識 確信度更新 ──────────────────────────────────────────────

type EvidenceItem = {
  knowledgeId: string;
  relation:    'supporting' | 'contradicting' | 'neutral';
  likelihood:  'high' | 'medium' | 'low';
};

const SCORE_DELTA: Record<EvidenceItem['relation'], Record<EvidenceItem['likelihood'], number>> = {
  supporting:    { high: 0.12, medium: 0.06, low: 0.02 },
  contradicting: { high: -0.12, medium: -0.06, low: -0.02 },
  neutral:       { high: 0, medium: 0, low: 0 },
};

function toStatus(score: number): Knowledge['status'] {
  if (score >= 0.8) return 'verified';
  if (score <= 0.2) return 'disproved';
  return 'hypothesis';
}

export async function updateKnowledgeFromExperience(
  field: string,
  experienceMemo: string,
): Promise<void> {
  const knowledgeItems = await knowledgeApi.list({ field });
  if (knowledgeItems.length === 0) return;

  const knowledgeList = knowledgeItems
    .filter(k => k._id)
    .map(k => `{"id":"${k._id}","content":"${k.content}"}`)
    .join(',\n');

  const prompt = `分野：${field}
新しい経験ログ：「${experienceMemo}」

以下の知識リストに対して、この経験がどの程度の証拠になるかを評価してください：
[${knowledgeList}]

各知識について JSON 配列で返してください：
[{"knowledgeId":"<id>","relation":"supporting"|"contradicting"|"neutral","likelihood":"high"|"medium"|"low"}]`;

  const evidence = await chatJSON<EvidenceItem[]>(prompt);

  for (const item of evidence) {
    if (item.relation === 'neutral') continue;
    const k = knowledgeItems.find(k => k._id === item.knowledgeId);
    if (!k?._id) continue;

    const delta    = SCORE_DELTA[item.relation][item.likelihood] ?? 0;
    const newScore = Math.max(0, Math.min(1, k.confidenceScore + delta));
    await knowledgeApi.patch(k._id, { confidenceScore: newScore, status: toStatus(newScore) });
  }
}

// ─── クエリ関連知識の特定 ──────────────────────────────────────────────────

export async function findRelatedKnowledge(
  query: string,
  knowledgeItems: Knowledge[],
): Promise<string[]> {
  const items = knowledgeItems.filter(k => k._id);
  if (items.length === 0) return [];

  const list = items.map(k => `{"id":"${k._id}","content":"${k.content}"}`).join(',\n');
  const prompt = `クエリ：「${query}」
以下の知識リストから、クエリと関連する知識のIDを最大5件選んでください（関連がなければ空配列）。
[${list}]
JSON配列で返してください：["id1","id2",...]`;

  try {
    return await chatJSON<string[]>(prompt);
  } catch {
    return [];
  }
}

// ─── 仮説候補生成 ─────────────────────────────────────────────────────────

export type HypothesisCandidate = {
  content:     string;
  category:    string;
  subcategory: string;
};

export async function generateHypotheses(
  field:              string,
  query:              string,
  sources:            TavilyResult[],
  youtubeUrl?:        string,
  existingCategories: string[] = [],
): Promise<HypothesisCandidate[]> {
  const jsonSchema = `{"groupCategory":"<全仮説をまとめる共通カテゴリ（15文字以内）>","hypotheses":[{"content":"<仮説>","subcategory":"<細分類（10文字以内）、不要なら空文字>"}]}`;

  const categoryHint = existingCategories.length > 0
    ? `\n既存カテゴリ一覧：[${existingCategories.map(c => `"${c}"`).join(', ')}]\n類似するカテゴリがあれば既存のものをそのまま使い、なければ新たに命名してください。\n`
    : '';

  const prompt = youtubeUrl
    ? `分野：${field}
気になっていること：「${query}」
YouTube動画URL：${youtubeUrl}
${categoryHint}
上記の動画を踏まえ、この分野で実践・検証できる仮説を3〜5件生成してください。
また、これら仮説全体をまとめる共通カテゴリ名も返してください。
JSON形式で返してください：${jsonSchema}`
    : `分野：${field}
気になっていること：「${query}」
${categoryHint}
以下のWeb情報を参考に、実践・検証できる仮説を3〜5件生成してください。
また、これら仮説全体をまとめる共通カテゴリ名も返してください。

${sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`).join('\n\n')}

JSON形式で返してください：${jsonSchema}`;

  type RawResponse = {
    groupCategory: string;
    hypotheses: Array<{ content: string; subcategory: string }>;
  };
  const raw = await chatJSON<RawResponse>(prompt);
  return raw.hypotheses.map(h => ({
    content:     h.content,
    category:    raw.groupCategory,
    subcategory: h.subcategory,
  }));
}

// ─── 知識の再分類 ─────────────────────────────────────────────────────────

export type ReclassifyResult = { id: string; category: string; subcategory: string };

export async function reclassifyKnowledge(
  field: string,
  knowledge: Knowledge[],
): Promise<ReclassifyResult[]> {
  const items = knowledge.filter(k => k._id);
  if (items.length === 0) return [];

  const list = items.map(k => `{"id":"${k._id}","content":"${k.content}"}`).join(',\n');
  const targetCount = Math.max(2, Math.round(items.length / 3));

  const prompt = `分野：${field}
以下の${items.length}件の知識を、意味的なまとまりで再グルーピングしてください。
カテゴリ数の目安：${targetCount}〜${targetCount + 2}個。
類似テーマはひとつのcategoryに統合し、必要に応じてsubcategoryで細分類してください。

知識リスト：
[${list}]

JSON配列で返してください：[{"id":"<id>","category":"<カテゴリ（15文字以内）>","subcategory":"<サブカテゴリ（10文字以内）、不要なら空文字>"}]`;

  return chatJSON<ReclassifyResult[]>(prompt);
}

// ─── 対話 → 知識抽出 ──────────────────────────────────────────────────────

type ExtractedKnowledge = { content: string; category: string };

export async function extractKnowledgeFromChat(
  field: string,
  conversationText: string,
): Promise<ExtractedKnowledge> {
  const prompt = `分野：${field}
以下の対話から、最も重要な知識・洞察を1件抽出してください。

対話：
${conversationText}

JSON形式で返してください：{"content":"<知識を1文で>","category":"<カテゴリ（10文字以内）>"}`;

  return chatJSON<ExtractedKnowledge>(prompt);
}

// ─── 対話の開口質問生成 ───────────────────────────────────────────────────

const QUESTION_ANGLES = [
  '最近「これは効いた」と感じた行動はありますか？',
  'やる気が出なかった時、何が原因だったか振り返れますか？',
  '直近の取り組みで予想外だったことはありましたか？',
  '最近無視していた仮説や知識はありますか？',
  '今停滞を感じていることがあれば、その理由の仮説を聞かせてください。',
  '次に試してみたいことはありますか？',
  '今の自分に一番足りていないと感じるものは何ですか？',
  '最近の経験から、別の分野にも使えそうな気づきはありましたか？',
];

export async function generateOpeningQuestion(
  field: string,
  experiences: Experience[],
  knowledgeSummary: { verified: number; hypothesis: number; disproved: number },
): Promise<string> {
  const recentMemos = experiences
    .slice(0, 3)
    .map(e => `・${e.date}: ${e.memo}`)
    .join('\n');

  const prompt = `ユーザーの「${field}」分野の最近の状況：

【直近の経験ログ】
${recentMemos || '（まだログなし）'}

【知識の状態】
検証済: ${knowledgeSummary.verified}件 / 仮説: ${knowledgeSummary.hypothesis}件 / 反証: ${knowledgeSummary.disproved}件

以下の観点から最も文脈に合うものを選び、経験ログの内容を織り交ぜた一文の問いかけを生成してください。

${QUESTION_ANGLES.join('\n')}

条件：一文のみ・話しかけるトーン・ログがない場合は観点をそのまま使う`;

  try {
    return await chat(prompt);
  } catch {
    return `${field}について、最近の経験や疑問を話してください。一緒に整理しましょう。`;
  }
}
