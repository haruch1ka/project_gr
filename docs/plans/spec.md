# 仕様詳細

## データモデル

### Field（分野）

```typescript
{
  name: string,   // ユーザーが自由定義
  icon: string,   // 絵文字アイコン
}
```

### Experience（経験ログ）

```typescript
{
  field: string,          // ユーザーが自由定義
  date: Date,
  memo: string,           // 自由記述（時間・内容・気づきなど）
  createdAt: Date,
}
```

### KnowledgeFolder（知識フォルダ）

```typescript
{
  field: string,
  title: string,
  parentId: string | null,  // ネスト構造（現状は1階層のみ使用）
  order: number,
  createdAt: Date,
}
```

### Knowledge（統合知識）

```typescript
{
  field: string,
  type: 'hypothesis' | 'distilled',             // 起源（不変）
  // hypothesis: Web情報から生成された仮説。経験で検証される
  // distilled: 経験ログのパターンからGeminiが析出した知識
  category: string,                              // ユーザー定義のカテゴリ
  subcategory: string,                           // サブカテゴリ（省略可）
  folderId: string | null,                       // 所属フォルダ（省略可）
  content: string,
  webSources: ResearchResult[],                  // 元になったWeb情報（hypothesisのみ）
  supportingExperiences: Experience[],           // 裏付けた経験
  contradictingExperiences: Experience[],        // 反例になった経験
  confidenceScore: number,                       // ベイズ的に更新（0〜1）
  sourceKnowledgeId: string | null,              // distilledが参照するhypothesisのID（任意）
  tags: string[],
  createdAt: Date,
}
```

`status`フィールドは廃止。確信度は`confidenceScore`の連続値のみで表現する（UIがスコア範囲で視覚的に表示）。

### Plan（行動プラン）

```typescript
{
  field: string,
  proposal: string,              // Geminiの提案テキスト
  dialogHistory: ChatMessage[],  // 対話ログ（次回の文脈用）
  reviewedAt: Date | null,
  reviewNote: string | null,
  createdAt: Date,
}
```

### ResearchResult（Web収集生データ）

```typescript
{
  field: string,
  query: string,
  results: [{ title, url, snippet }],
  collectedAt: Date,
  usedInKnowledgeIds: string[],  // 紐付いたKnowledgeのID
}
```

### KnowledgeProposal（端末一時保存・DB不使用）

経験ログ投稿後にGeminiが検出したdistilled候補。ユーザーが確認するまでAsyncStorageにのみ保持される。

```typescript
{
  field: string,
  content: string,
  confidenceScore: number,
  supportingExperienceIds: string[],
  sourceKnowledgeId: string | null,
  detectedAt: Date,
}
```

- 確認タップ → `POST /knowledge`（distilledとしてDB登録）→ AsyncStorageから削除
- 却下タップ → AsyncStorageから削除（DBには何も残らない）

---

### MetaKnowledge（classレベルの知識）※MVP後

```typescript
{
  content: string,           // 上達という行為自体についての知識
  sourceInstances: string[], // 抽出元の分野
  createdAt: Date,
}
```

---

## 知識の2層構造

| レイヤー           | 内容                             | 適用範囲                  |
| ------------------ | -------------------------------- | ------------------------- |
| Instance Knowledge | 各分野で学んだこと               | その分野に閉じる          |
| Meta Knowledge     | 上達という行為自体についての知識 | 全分野に適用・classを更新 |

インスタンスの成功体験をclassに還元することで、**仕組み自体がアップデートされる**。

---

## ランダムアンケート

### 目的

定期ログでは拾えない無意識の傾向・感情・気づきを収集し、Meta-Knowledge抽出の素材にする。

### 設計

- **方式**：固定の「問いの型（約10問）」を骨格に、Geminiが文脈を挿入して動的生成
- **周期**：バンドを設けたランダム（最短3日・最長14日）
- **形式**：選択肢メイン、10秒以内で完了

### 問いの型

1. 最近どの分野に一番エネルギーを注いでいますか？
2. 直近の取り組みで予想外だったことは？
3. やる気が出なかった時、何が原因でしたか？
4. 最近「これは効いた」と感じた行動は？
5. 今一番上達を実感している分野は？
6. 逆に停滞を感じている分野と、その理由の仮説は？
7. 最近無視していた知識・仮説はありますか？
8. 次に試してみたいことは何ですか？
9. 今の自分に一番足りていないものは？
10. 最近の経験から、別の分野にも使えそうな気づきはありますか？

10番が特にMeta-Knowledge抽出に直結する。

---

## 入力コスト設計

### 基本方針

> ユーザーの入力は「意思・感情・気づき」だけに集中させる。構造化はGeminiが担う。

### 2モードの分離

| モード     | 場面                                  | 目標                     |
| ---------- | ------------------------------------- | ------------------------ |
| 軽量モード | 経験ログ・アンケート・Web収集トリガー | 摩擦ゼロ・考えさせない   |
| 重量モード | Gemini対話                            | コストをかけて深く考える |

### 軽量モードの理想形

- 経験ログ：分野タップ → メモ入力 → 完了
- アンケート：通知 → 開く → 選択肢タップ → 完了（10秒以内）
- 「一言入力 → Geminiが構造化 → ユーザーが確認タップ」のパターンを基本とする

---

## 可視化

### MVPでの必須要件

confidenceScoreの変化をユーザーが実感できる最小表示が必要。「育っている感」がモチベーション維持に直結するため、MVP段階から提供する。

- 各Knowledgeのconfidenceスコアをバーまたは数値で表示
- 経験ログを書いた後にスコアが変化したことがわかること

### MVP後

詳細な可視化（グラフ・時系列推移など）は対話後のアクション選択肢として提供。指示があった時のみ表示。

---

## Geminiによる仮説提案

経験ログが一定量蓄積されると、Geminiが「この傾向からこんな仮説が立てられそう」と候補を定期提案する。

- ユーザーは選択するだけで仮説プールに追加できる
- ランダムアンケートとは役割が異なる（アンケートはMeta-Knowledge抽出が目的）
