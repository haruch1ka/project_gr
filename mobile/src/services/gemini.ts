import * as SecureStore from 'expo-secure-store';
import { Knowledge } from '../types';
import { knowledgeApi } from './api';

const MODEL = 'gemini-2.0-flash';

// ─── 基本API呼び出し ──────────────────────────────────────────────────────

export async function chat(prompt: string, context: string = ''): Promise<string> {
  const apiKey = await SecureStore.getItemAsync('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Gemini API Key未設定');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: context ? `${context}\n\n${prompt}` : prompt }] },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function saveGeminiKey(apiKey: string) {
  await SecureStore.setItemAsync('GEMINI_API_KEY', apiKey);
}

export async function getGeminiKey(): Promise<string | null> {
  return SecureStore.getItemAsync('GEMINI_API_KEY');
}

export async function clearGeminiKey() {
  await SecureStore.deleteItemAsync('GEMINI_API_KEY');
}

// ─── 構造化JSON出力 ──────────────────────────────────────────────────────

async function chatJSON<T>(prompt: string, context?: string): Promise<T> {
  const text = await chat(
    `${prompt}\n\n必ずJSONのみを返してください。説明文・Markdownコードブロック不要。`,
    context,
  );
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error('JSON not found in Gemini response');
  return JSON.parse(match[0]) as T;
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

/**
 * 経験ログを保存したあとに呼ぶ。
 * 既存の知識リストと照合し、confidenceScore を更新する。
 * 失敗しても呼び出し元には伝播させない（fire-and-forget）。
 */
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

各知識について、以下のJSON配列で返してください：
[{"knowledgeId":"<id>","relation":"supporting"|"contradicting"|"neutral","likelihood":"high"|"medium"|"low"}]

- supporting: 経験が知識を裏付ける
- contradicting: 経験が知識を反証する
- neutral: 関係なし（neutral は省略可）`;

  const evidence = await chatJSON<EvidenceItem[]>(prompt);

  for (const item of evidence) {
    if (item.relation === 'neutral') continue;
    const k = knowledgeItems.find(k => k._id === item.knowledgeId);
    if (!k?._id) continue;

    const delta    = SCORE_DELTA[item.relation][item.likelihood] ?? 0;
    const newScore = Math.max(0, Math.min(1, k.confidenceScore + delta));
    const newStatus = toStatus(newScore);

    await knowledgeApi.patch(k._id, { confidenceScore: newScore, status: newStatus });
  }
}

// ─── 仮説候補生成 ─────────────────────────────────────────────────────────

import { TavilyResult } from './tavily';

export type HypothesisCandidate = {
  content:  string;
  category: string;
};

/**
 * Tavily検索結果またはYouTube URLからGeminiが仮説候補を生成する。
 * YouTubeの場合はyoutubeUrlを渡す（Geminiが直接処理）。
 */
export async function generateHypotheses(
  field:       string,
  query:       string,
  sources:     TavilyResult[],
  youtubeUrl?: string,
): Promise<HypothesisCandidate[]> {
  let prompt: string;

  if (youtubeUrl) {
    prompt = `分野：${field}
気になっていること：「${query}」
YouTube動画URL：${youtubeUrl}

上記の動画の内容を踏まえ、この分野で実践・検証できる仮説を3〜5件生成してください。
各仮説は具体的な行動や観察に基づくものにしてください。

以下のJSON配列で返してください：
[{"content":"<仮説を1文で>","category":"<カテゴリ（10文字以内）>"}]`;
  } else {
    const sourcesText = sources
      .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
      .join('\n\n');

    prompt = `分野：${field}
気になっていること：「${query}」

以下のWeb情報を参考に、この分野で実践・検証できる仮説を3〜5件生成してください。
各仮説は具体的な行動や観察に基づくものにしてください。

Web情報：
${sourcesText}

以下のJSON配列で返してください：
[{"content":"<仮説を1文で>","category":"<カテゴリ（10文字以内）>"}]`;
  }

  return chatJSON<HypothesisCandidate[]>(prompt);
}

// ─── 対話からの構造化知識抽出 ─────────────────────────────────────────────

type ExtractedKnowledge = {
  content:  string;
  category: string;
};

/**
 * 対話履歴から知識を1件抽出する。
 * saveKnowledge() で使用。
 */
export async function extractKnowledgeFromChat(
  field: string,
  conversationText: string,
): Promise<ExtractedKnowledge> {
  const prompt = `分野：${field}
以下の対話から、最も重要な知識・洞察を1件抽出してください。

対話：
${conversationText}

以下のJSON形式で返してください：
{"content":"<知識を1文で>","category":"<カテゴリ（10文字以内）>"}`;

  return chatJSON<ExtractedKnowledge>(prompt);
}
