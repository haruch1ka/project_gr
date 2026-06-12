/**
 * Geminiプロンプトの実動確認スクリプト
 * pnpm check:prompts で実行
 *
 * - アプリを起動せず実Gemini APIを呼んでカテゴリ名・フォルダ名を検証する
 * - isValidCategory のルール（10文字以内・助詞不使用・単一概念）で自動判定
 */

const BACK_URL = 'https://project-gr-back.vercel.app';

// isValidCategory と同じルール（gemini.ts からのコピー）
function isValidCategory(name) {
  if (!name || name.trim().length === 0) return { valid: false, reason: '空文字' };
  if (name.length > 10)                  return { valid: false, reason: `長すぎる（${name.length}文字）` };
  if (/[とやを]/.test(name))             return { valid: false, reason: `助詞「${name.match(/[とやを]/)[0]}」で結合` };
  return { valid: true };
}

async function callGemini(messages, jsonMode = false) {
  const res = await fetch(`${BACK_URL}/gemini/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, jsonMode }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.text);
}

// ─── テストケース ────────────────────────────────────────────────────────────

const CASES = [
  { field: '釣り',   query: '木曽川でのルアーカラー選び' },
  { field: '釣り',   query: '朝マズメのトップウォーター攻略' },
  { field: '筋トレ', query: '睡眠と筋肥大の関係' },
  { field: '読書',   query: '速読の効果について' },
];

async function checkGenerateHypotheses() {
  console.log('\n=== generateHypotheses カテゴリ名チェック ===\n');
  let pass = 0, fail = 0;

  const existingCategories = ['ルアーカラー', 'キャスト', '種目・フォーム', '回復・睡眠'];

  const categoryRules = `カテゴリのルール：
- 単一概念を表す名詞1語にする（日本語・英語どちらも可）
- 場所・条件・手段・目的を組み合わせた名称は禁止。例：「木曽川ルアーカラー攻略」「光量とルアーカラー」はNG
- 広い粒度で抽象化する。例：「ルアーカラー」「キャスト」「食事」「睡眠」はOK
- 既存カテゴリと同じ意味の場合は既存のものをそのまま使い、重複した分類名を絶対に作らない`;

  for (const { field, query } of CASES) {
    const categoryHint = `\n既存カテゴリ一覧：[${existingCategories.map(c => `"${c}"`).join(', ')}]\n`;
    const schema = `{"groupCategory":"<全仮説をまとめる単一概念の名詞1語（広い粒度）>","hypotheses":[{"content":"<仮説>","subcategory":"<細分類（1語）、不要なら空文字>"}]}`;
    const prompt = `分野：${field}\n気になっていること：「${query}」\n${categoryHint}\n${categoryRules}\n\nWeb情報なしで、実践・検証できる仮説を2〜3件生成してください。JSON形式で返してください：${schema}`;

    try {
      const raw = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], true);
      const category = raw.groupCategory;
      const validation = isValidCategory(category);
      const mark = validation.valid ? '✓' : '✗';
      console.log(`${mark} [${field}] "${query}"`);
      console.log(`    → category: "${category}" ${validation.valid ? '' : `← ${validation.reason}`}`);
      if (validation.valid) pass++; else fail++;
    } catch (e) {
      console.log(`! [${field}] "${query}" → エラー: ${e.message}`);
      fail++;
    }
  }

  return { pass, fail };
}

async function checkReorganizeFolders() {
  console.log('\n=== reorganizeIntoFolders フォルダ名チェック ===\n');
  let pass = 0, fail = 0;

  const knowledge = [
    { itemId: 'k1', content: 'ゴースト系カラーは澄み潮で有効',         currentFolder: 'ルート' },
    { itemId: 'k2', content: '赤金はスローリトリーブで反応が増える',   currentFolder: 'ルート' },
    { itemId: 'k3', content: 'ケイムラは日中の紫外線下で集魚効果が高い', currentFolder: 'ルート' },
    { itemId: 'k4', content: 'チャート系は夜間の光量不足に有効',       currentFolder: 'ルート' },
    { itemId: 'k5', content: '金ベースは濁り潮で有効',                 currentFolder: 'ルート' },
  ];

  const prompt = `分野：釣り
以下の知識を、内容だけを見て2階層のフォルダ構造に整理してください。現在のフォルダ構造は参考程度に示しますが、それに縛られず最適な構造を作り直してください。

ルール：
- 意味が近い知識は共通の「親フォルダ」にまとめること
- 「子フォルダ」は親フォルダ内に8件以上ある場合のみ作成する。それ未満は子フォルダなし（folderName=親フォルダ名、parentFolderName=null）
- フォルダ名は単一概念の名詞1語（最大10文字）にすること。場所・条件・手段を組み合わせた名称は禁止（例：「木曽川ルアーカラー攻略」はNG、「ルアーカラー」はOK）
- 目安：知識10件に対して親フォルダ2〜4個

現在のフォルダ（参考）：（なし）

知識一覧：
[${knowledge.map(k => JSON.stringify(k)).join(',\n')}]

各知識の配置先をJSON配列で返してください：
[{"itemId":"...","folderName":"...","parentFolderName":null}]`;

  try {
    const assignments = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], true);
    const folderNames = [...new Set(assignments.map(a => a.folderName))];
    console.log(`フォルダ名一覧: ${folderNames.map(n => `"${n}"`).join(', ')}`);
    for (const name of folderNames) {
      const v = isValidCategory(name);
      const mark = v.valid ? '✓' : '✗';
      console.log(`  ${mark} "${name}" ${v.valid ? '' : `← ${v.reason}`}`);
      if (v.valid) pass++; else fail++;
    }
  } catch (e) {
    console.log(`! エラー: ${e.message}`);
    fail++;
  }

  return { pass, fail };
}

// ─── メイン ──────────────────────────────────────────────────────────────────

const r1 = await checkGenerateHypotheses();
const r2 = await checkReorganizeFolders();

const total = r1.pass + r1.fail + r2.pass + r2.fail;
const passed = r1.pass + r2.pass;
console.log(`\n結果: ${passed}/${total} 合格`);
if (r1.fail + r2.fail > 0) process.exit(1);
