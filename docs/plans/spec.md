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

## ランダムアンケート

### 目的

定期ログでは拾えない無意識の傾向・感情・気づきを収集する。

### 設計

- **方式**：Geminiが経験ログ・知識の状態を読み、ユーザーの盲点になりそうな一問を動的生成
- **条件**：文脈（ログ・知識）が一定量ない場合は生成しない
- **周期**：バンドを設けたランダム（最短3日・最長14日）
- **形式**：選択肢メイン、10秒以内で完了

### 設計方針

固定の「問いの型」は使わない。パターン化された問いはユーザーが型を読んで表面的に答えるようになるため。Geminiが知識・経験の状態から「このユーザーが気づいていなさそうなこと」を逆算して問いを立てる。

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
- ランダムアンケートとは役割が異なる（アンケートは無意識の傾向・気づきの収集が目的）
