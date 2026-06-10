/**
 * マイグレーション: status フィールド削除
 *
 * 旧スキーマの `status` フィールドが全 Knowledge ドキュメントに残っているため削除する。
 * 手順: 削除 → 同じ _id で再投入（folderId 等の参照を維持するため _id を固定）
 *
 * 使い方:
 *   pnpm ts-node --transpile-only scripts/migrate-remove-status.ts --dry-run  # 確認
 *   pnpm ts-node --transpile-only scripts/migrate-remove-status.ts             # 実行
 */

const BACK_URL = process.env.BACK_URL ?? 'https://project-gr-back.vercel.app';
const DRY_RUN  = process.argv.includes('--dry-run');

type KnowledgeRaw = {
  _id: string;
  field: string;
  category: string;
  type: string;
  status?: string;
  __v?: number;
  [key: string]: unknown;
};

async function fetchAll(): Promise<KnowledgeRaw[]> {
  const res = await fetch(`${BACK_URL}/knowledge`);
  if (!res.ok) throw new Error(`GET /knowledge → ${res.status}`);
  return res.json() as Promise<KnowledgeRaw[]>;
}

async function del(id: string): Promise<void> {
  const res = await fetch(`${BACK_URL}/knowledge/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE /knowledge/${id} → ${res.status}`);
}

async function post(body: object): Promise<KnowledgeRaw> {
  const res = await fetch(`${BACK_URL}/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /knowledge → ${res.status}: ${text}`);
  }
  return res.json() as Promise<KnowledgeRaw>;
}

function clean(d: KnowledgeRaw): object {
  const { status, __v, ...rest } = d;
  return rest;
}

async function main() {
  console.log(`\n================================================`);
  console.log(` マイグレーション: status フィールド削除`);
  if (DRY_RUN) console.log(' ※ ドライランモード（実際には変更しません）');
  console.log(`================================================\n`);

  const all = await fetchAll();
  const withStatus = all.filter(d => 'status' in d);

  console.log(`全件数: ${all.length}`);
  console.log(`status フィールドあり: ${withStatus.length} 件\n`);

  if (withStatus.length === 0) {
    console.log('対象データなし。マイグレーション不要。');
    return;
  }

  console.log('--- 対象一覧 ---');
  withStatus.forEach(d => {
    console.log(`  [${d.field}] ${d.category} | type=${d.type} status=${d.status} | id=${d._id}`);
  });

  if (DRY_RUN) {
    console.log('\nドライランのため変更なし。');
    return;
  }

  console.log('\n--- マイグレーション実行 ---');
  let ok = 0;
  let ng = 0;

  for (const d of withStatus) {
    const cleaned = clean(d);
    try {
      await del(d._id);
      await post(cleaned);
      console.log(`  ✓ ${d._id} (${d.field} / ${d.category})`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${d._id}:`, e instanceof Error ? e.message : e);
      ng++;
    }
  }

  console.log(`\n完了: 成功 ${ok} 件 / 失敗 ${ng} 件`);

  if (ng === 0) {
    console.log('\n--- 検証: status フィールドが残っていないか確認 ---');
    const after = await fetchAll();
    const remaining = after.filter(d => 'status' in d);
    console.log(`status 残存: ${remaining.length} 件`);
    if (remaining.length === 0) console.log('✓ クリーン完了');
    else remaining.forEach(d => console.warn(`  残存: ${d._id}`));
  }
}

main().catch(e => {
  console.error('\nエラー:', e);
  process.exit(1);
});
