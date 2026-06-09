/**
 * Gemini再分類テストスクリプト
 *
 * 使い方: pnpm ts-node --transpile-only scripts/test-proposals.ts [分野名]
 * 例: pnpm ts-node --transpile-only scripts/test-proposals.ts 釣り
 *
 * 流れ:
 * 1. テスト用仮説 2件と未分析経験 3件を投入
 * 2. GET /proposals を呼び出して Gemini 分析を実行
 * 3. スコア変化と提案内容を表示
 * 4. テストデータを削除（クリーンアップ）
 */

const BACK_URL = process.env.BACK_URL ?? 'https://project-gr-back.vercel.app';
const FIELD    = process.argv[2] ?? '釣り';

type Knowledge = {
  _id: string;
  field: string;
  type: string;
  category: string;
  content: string;
  confidenceScore: number;
};

type Experience = {
  _id: string;
  field: string;
  date: string;
  memo: string;
  analyzed: boolean;
};

type Proposal = {
  _id: string;
  field: string;
  content: string;
  confidenceScore: number;
  supportingExperienceIds: string[];
};

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BACK_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BACK_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) console.warn(`  DELETE ${path} → ${res.status}`);
}

async function getProposals(field: string): Promise<{ proposal: Proposal | null }> {
  const res = await fetch(`${BACK_URL}/proposals?field=${encodeURIComponent(field)}`);
  if (!res.ok) throw new Error(`GET /proposals → ${res.status}`);
  return res.json() as Promise<{ proposal: Proposal | null }>;
}

async function getKnowledge(id: string): Promise<Knowledge> {
  const res = await fetch(`${BACK_URL}/knowledge/${id}`);
  if (!res.ok) throw new Error(`GET /knowledge/${id} → ${res.status}`);
  return res.json() as Promise<Knowledge>;
}

// ─── メイン ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n====================================`);
  console.log(` Gemini 再分類テスト  分野: ${FIELD}`);
  console.log(`====================================\n`);

  const createdKnowledgeIds: string[] = [];
  const createdExperienceIds: string[] = [];
  let proposalId: string | null = null;

  try {
    // ── 1. テストデータ投入 ────────────────────────────────────────────────

    console.log('[1/4] テストデータを投入します...');

    const k1 = await post<Knowledge>('/knowledge', {
      field: FIELD,
      type: 'hypothesis',
      category: 'テクニック',
      content: '朝マズメの時間帯は活性が高くバイトが増える',
      confidenceScore: 0.4,
      webSources: [],
      supportingExperiences: [],
      contradictingExperiences: [],
      tags: [],
    });
    createdKnowledgeIds.push(k1._id);
    console.log(`  仮説1投入 (初期score: ${k1.confidenceScore}): 「${k1.content}」`);

    const k2 = await post<Knowledge>('/knowledge', {
      field: FIELD,
      type: 'hypothesis',
      category: 'テクニック',
      content: 'フローティングミノーは澄み潮で効果的',
      confidenceScore: 0.5,
      webSources: [],
      supportingExperiences: [],
      contradictingExperiences: [],
      tags: [],
    });
    createdKnowledgeIds.push(k2._id);
    console.log(`  仮説2投入 (初期score: ${k2.confidenceScore}): 「${k2.content}」`);

    const e1 = await post<Experience>('/experiences', {
      field: FIELD,
      date: '2026-06-01',
      memo: '朝6時から3時間。朝マズメ狙いでシーバス2匹。やはり朝は活性が高い印象。',
    });
    createdExperienceIds.push(e1._id);
    console.log(`  経験1投入: 「${e1.memo}」`);

    const e2 = await post<Experience>('/experiences', {
      field: FIELD,
      date: '2026-06-03',
      memo: '夕方の釣行。フローティングミノーを使ったが全くバイトなし。濁り潮だったせいか。',
    });
    createdExperienceIds.push(e2._id);
    console.log(`  経験2投入: 「${e2.memo}」`);

    const e3 = await post<Experience>('/experiences', {
      field: FIELD,
      date: '2026-06-05',
      memo: '早朝5時半から。朝マズメで連続ヒット。バイブレーションが効いた。',
    });
    createdExperienceIds.push(e3._id);
    console.log(`  経験3投入: 「${e3.memo}」`);

    // ── 2. Gemini 分析実行 ─────────────────────────────────────────────────

    console.log('\n[2/4] GET /proposals を実行します（Gemini 分析中...）');
    const start = Date.now();
    const { proposal } = await getProposals(FIELD);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  完了 (${elapsed}秒)`);

    // ── 3. 結果表示 ────────────────────────────────────────────────────────

    console.log('\n[3/4] 分析結果');

    // 仮説スコアの変化
    console.log('\n  ■ hypothesis スコア更新:');
    const updated1 = await getKnowledge(k1._id);
    const updated2 = await getKnowledge(k2._id);
    const delta1   = (updated1.confidenceScore - k1.confidenceScore).toFixed(4);
    const delta2   = (updated2.confidenceScore - k2.confidenceScore).toFixed(4);
    const sign1    = parseFloat(delta1) >= 0 ? '+' : '';
    const sign2    = parseFloat(delta2) >= 0 ? '+' : '';
    console.log(`  「${k1.content}」`);
    console.log(`    ${k1.confidenceScore.toFixed(4)} → ${updated1.confidenceScore.toFixed(4)} (${sign1}${delta1})`);
    console.log(`  「${k2.content}」`);
    console.log(`    ${k2.confidenceScore.toFixed(4)} → ${updated2.confidenceScore.toFixed(4)} (${sign2}${delta2})`);

    // distilled 提案
    console.log('\n  ■ distilled 提案:');
    if (proposal) {
      proposalId = proposal._id;
      console.log(`  内容: 「${proposal.content}」`);
      console.log(`  確信度: ${(proposal.confidenceScore * 100).toFixed(0)}%`);
      console.log(`  根拠経験: ${proposal.supportingExperienceIds.length}件`);
    } else {
      console.log('  （パターンが検出されませんでした）');
    }

  } finally {
    // ── 4. クリーンアップ ─────────────────────────────────────────────────

    console.log('\n[4/4] テストデータを削除します...');
    for (const id of createdKnowledgeIds) await del(`/knowledge/${id}`);
    for (const id of createdExperienceIds) await del(`/experiences/${id}`);
    if (proposalId) await del(`/proposals/${proposalId}`);
    console.log('  完了\n');
  }
}

main().catch(e => {
  console.error('\nエラー:', e);
  process.exit(1);
});
