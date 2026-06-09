import * as readline from 'readline';

const BACK_URL = process.env.BACK_URL ?? 'https://project-gr-back.vercel.app';
const ACTION_THRESHOLD = 4;

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type Knowledge = {
  _id?: string;
  field: string;
  category: string;
  content: string;
  confidenceScore: number;
  status: 'hypothesis' | 'verified' | 'disproved';
};
type Experience = {
  _id?: string;
  field: string;
  date: string;
  memo: string;
};

async function fetchKnowledge(field: string): Promise<Knowledge[]> {
  const res = await fetch(`${BACK_URL}/knowledge?field=${encodeURIComponent(field)}`);
  if (!res.ok) throw new Error(`knowledge fetch error: ${res.status}`);
  return res.json() as Promise<Knowledge[]>;
}

async function fetchExperiences(field: string): Promise<Experience[]> {
  const res = await fetch(`${BACK_URL}/experiences?field=${encodeURIComponent(field)}`);
  if (!res.ok) throw new Error(`experience fetch error: ${res.status}`);
  return res.json() as Promise<Experience[]>;
}

async function callGemini(
  messages: { role: 'user' | 'model'; parts: [{ text: string }] }[],
  systemInstruction?: string,
  jsonMode = false,
): Promise<string> {
  const res = await fetch(`${BACK_URL}/gemini/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemInstruction, jsonMode }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json() as { text?: string };
  return data.text ?? '';
}

function buildSystemPrompt(field: string, knowledge: Knowledge[], experiences: Experience[]): string {
  const knowledgePart =
    knowledge.length > 0
      ? knowledge
          .map(k => {
            const label = k.status === 'verified' ? '検証済' : k.status === 'disproved' ? '反証' : '仮説';
            return `- [${label} ${Math.round(k.confidenceScore * 100)}%] ${k.content}`;
          })
          .join('\n')
      : '（まだ知識がありません）';

  const experiencePart =
    experiences.length > 0
      ? experiences
          .slice(0, 5)
          .map(e => `- ${e.date}: ${e.memo}`)
          .join('\n')
      : '（まだ経験ログがありません）';

  return `あなたはユーザーの「${field}」分野での上達を支援するAIアシスタントです。
以下のユーザーの知識と経験ログを文脈として対話してください。

【現在の知識】
${knowledgePart}

【最近の経験ログ】
${experiencePart}

対話では：
- ユーザーの経験と既存の知識を結びつける
- 仮説の検証・反証につながる質問をする
- 具体的で実践的な洞察を提供する
必ず日本語で返答してください。`;
}

async function chatWithHistory(messages: ChatMessage[], systemInstruction: string): Promise<string> {
  const firstUser = messages.findIndex(m => m.role === 'user');
  const valid = firstUser >= 0 ? messages.slice(firstUser) : messages;
  const contents = valid.map(m => ({
    role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    parts: [{ text: m.text }] as [{ text: string }],
  }));
  return callGemini(contents, systemInstruction);
}

async function generateOpeningQuestion(
  field: string,
  experiences: Experience[],
  knowledge: Knowledge[],
): Promise<string> {
  const summary = {
    verified: knowledge.filter(k => k.status === 'verified').length,
    hypothesis: knowledge.filter(k => k.status === 'hypothesis').length,
    disproved: knowledge.filter(k => k.status === 'disproved').length,
  };
  const recentMemos = experiences
    .slice(0, 3)
    .map(e => `・${e.date}: ${e.memo}`)
    .join('\n');

  const prompt = `ユーザーの「${field}」分野の最近の状況：

【直近の経験ログ】
${recentMemos || '（まだログなし）'}

【知識の状態】
検証済: ${summary.verified}件 / 仮説: ${summary.hypothesis}件 / 反証: ${summary.disproved}件

以下の観点から最も文脈に合うものを選び、経験ログの内容を織り交ぜた一文の問いかけを生成してください。

最近「これは効いた」と感じた行動はありますか？
やる気が出なかった時、何が原因だったか振り返れますか？
直近の取り組みで予想外だったことはありましたか？
今の自分に一番足りていないと感じるものは何ですか？

条件：一文のみ・話しかけるトーン・ログがない場合は観点をそのまま使う`;

  return callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
}

async function doSavePlan(
  field: string,
  messages: ChatMessage[],
  knowledge: Knowledge[],
  experiences: Experience[],
): Promise<void> {
  const systemPrompt = buildSystemPrompt(field, knowledge, experiences);
  const history = messages.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`).join('\n');
  const proposal = await callGemini(
    [{ role: 'user', parts: [{ text: 'この会話から、ユーザーへの具体的な次の行動プランを1〜2文で提案してください。' }] }],
    `${systemPrompt}\n\n【会話履歴】\n${history}`,
  );

  const res = await fetch(`${BACK_URL}/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, proposal, dialogHistory: messages, reviewedAt: null, reviewNote: null }),
  });
  if (!res.ok) throw new Error(`plan save error: ${res.status}`);
  console.log(`\nプランを保存しました：\n${proposal}\n`);
}

async function doSaveKnowledge(field: string, messages: ChatMessage[]): Promise<void> {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`)
    .join('\n');

  const prompt = `分野：${field}
以下の対話から、最も重要な知識・洞察を1件抽出してください。

対話：
${conversationText}

JSON形式で返してください：{"content":"<知識を1文で>","category":"<カテゴリ（10文字以内）>"}`;

  const text = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    undefined,
    true,
  );
  const extracted = JSON.parse(text) as { content: string; category: string };

  const res = await fetch(`${BACK_URL}/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field,
      category: extracted.category.slice(0, 20),
      content: extracted.content,
      webSources: [],
      supportingExperiences: [],
      contradictingExperiences: [],
      confidenceScore: 0.05,
      status: 'hypothesis',
      tags: [],
    }),
  });
  if (!res.ok) throw new Error(`knowledge save error: ${res.status}`);
  console.log(`\n知識として保存しました：\n「${extracted.content}」\nカテゴリ：${extracted.category}\n`);
}

// ─── メイン ──────────────────────────────────────────────────────────────────

async function main() {
  const field = process.argv[2];
  if (!field) {
    console.error('使い方: pnpm chat <分野名>');
    process.exit(1);
  }

  console.log(`\n対話CLI  分野: ${field}`);
  console.log('コマンド: :plan（プラン保存）  :knowledge（知識保存）  :reset（履歴リセット）  :quit（終了）\n');
  console.log('コンテキストを取得中...');

  const [knowledge, experiences] = await Promise.all([fetchKnowledge(field), fetchExperiences(field)]);
  console.log(`知識: ${knowledge.length}件 / 経験: ${experiences.length}件\n`);

  const systemPrompt = buildSystemPrompt(field, knowledge, experiences);
  const messages: ChatMessage[] = [];

  process.stdout.write('AI: ');
  const opening = await generateOpeningQuestion(field, experiences, knowledge);
  messages.push({ role: 'assistant', text: opening });
  console.log(`${opening}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const loop = () => {
    rl.question('あなた: ', async line => {
      const text = line.trim();

      if (!text) { loop(); return; }

      if (text === ':quit') { rl.close(); return; }

      if (text === ':reset') {
        messages.length = 0;
        console.log('\n履歴をリセットしました。\n');
        loop();
        return;
      }

      if (text === ':plan') {
        if (messages.length === 0) { console.log('会話がありません。\n'); loop(); return; }
        try { await doSavePlan(field, messages, knowledge, experiences); }
        catch (e) { console.error('保存失敗:', e); }
        loop();
        return;
      }

      if (text === ':knowledge') {
        if (messages.length === 0) { console.log('会話がありません。\n'); loop(); return; }
        try { await doSaveKnowledge(field, messages); }
        catch (e) { console.error('保存失敗:', e); }
        loop();
        return;
      }

      messages.push({ role: 'user', text });
      process.stdout.write('\nAI: ');

      try {
        const reply = await chatWithHistory(messages.slice(-8), systemPrompt);
        messages.push({ role: 'assistant', text: reply });
        console.log(`${reply}\n`);
        if (messages.length >= ACTION_THRESHOLD && messages.length % ACTION_THRESHOLD === 0) {
          console.log('（ヒント: :plan でプラン保存 / :knowledge で知識保存）\n');
        }
      } catch (e) {
        console.error('\n送信失敗:', e);
      }

      loop();
    });
  };

  loop();
}

main().catch(console.error);
