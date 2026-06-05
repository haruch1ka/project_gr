import * as SecureStore from 'expo-secure-store';
import { Knowledge, Experience } from '../types';
import { knowledgeApi } from './api';
import { TavilyResult } from './tavily';

const MODEL   = 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;

type GeminiMessage = { role: 'user' | 'model'; parts: [{ text: string }] };

// ─── 低レベル呼び出し ─────────────────────────────────────────────────────

async function getApiKey(): Promise<string> {
  const key = await SecureStore.getItemAsync('GEMINI_API_KEY');
  if (!key) throw new Error('Gemini API Key未設定');
  return key;
}

async function callGemini(
  messages: GeminiMessage[],
  systemInstruction?: string,
  jsonMode = false,
): Promise<string> {
  const apiKey = await getApiKey();

  const body: Record<string, unknown> = { contents: messages };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }
  if (jsonMode) {
    body.generationConfig = { response_mime_type: 'application/json' };
  }

  const res = await fetch(`${BASE_URL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── 公開API ─────────────────────────────────────────────────────────────

export async function saveGeminiKey(apiKey: string) {
  await SecureStore.setItemAsync('GEMINI_API_KEY', apiKey);
}
export async function getGeminiKey(): Promise<string | null> {
  return SecureStore.getItemAsync('GEMINI_API_KEY');
}
export async function clearGeminiKey() {
  await SecureStore.deleteItemAsync('GEMINI_API_KEY');
}

// 単発の問いかけ（system_instruction を明示的に分離）
export async function chat(prompt: string, systemInstruction = ''): Promise<string> {
  return callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction || undefined,
  );
}

// マルチターン対話（ChatScreen 用）
// ChatMessage[] をそのまま渡せば Gemini の contents に変換する
export async function chatWithHistory(
  messages: Array<{ role: 'user' | 'assistant'; text: string }>,
  systemInstruction: string,
): Promise<string> {
  // user から始まる連続した alternating sequence を構築
  const firstUser = messages.findIndex(m => m.role === 'user');
  const valid = firstUser >= 0 ? messages.slice(firstUser) : messages;

  const contents: GeminiMessage[] = valid.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  return callGemini(contents, systemInstruction);
}

// 構造化 JSON 出力（response_mime_type: application/json で正規表現不要）
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

// ─── 仮説候補生成 ─────────────────────────────────────────────────────────

export type HypothesisCandidate = {
  content:  string;
  category: string;
};

export async function generateHypotheses(
  field:       string,
  query:       string,
  sources:     TavilyResult[],
  youtubeUrl?: string,
): Promise<HypothesisCandidate[]> {
  const prompt = youtubeUrl
    ? `分野：${field}
気になっていること：「${query}」
YouTube動画URL：${youtubeUrl}

上記の動画を踏まえ、この分野で実践・検証できる仮説を3〜5件生成してください。
JSON配列で返してください：[{"content":"<仮説>","category":"<カテゴリ（10文字以内）>"}]`
    : `分野：${field}
気になっていること：「${query}」

以下のWeb情報を参考に、実践・検証できる仮説を3〜5件生成してください。

${sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`).join('\n\n')}

JSON配列で返してください：[{"content":"<仮説>","category":"<カテゴリ（10文字以内）>"}]`;

  return chatJSON<HypothesisCandidate[]>(prompt);
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
