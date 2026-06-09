# project_gr 設計概念まとめ

## プロダクト定義

> あらゆる物事の上達を、Web知識と実経験の統合によって加速するツール

特定分野（釣り・筋トレ等）に限らず、ユーザーが自由に分野を定義できる。
JavaScriptのclass/instanceの関係で言えば、**このアプリが「上達する」という行為のclass**を提供し、ユーザーが各分野をinstanceとして生やす。

**コアの思想：個人の体験を元に、Webや書籍の点在する知識の中から「個々にとって正しいもの」を選べる仕組みを整える。**

同じ方法論でも（例：筋トレの高重量/低重量）、体格・性格によって最も有用な知識は変わる。一般知識は「正しいかもしれないリスト」として存在し、自分の経験がそれを検証するフィルターになる。

---

## コアコンセプト

「気になること」を投げるだけでAIが仮説プールを作り、実経験がその仮説を検証・更新していく。

```
気になること（一言）
    ↓ AIがWeb収集
仮説プール（一般知識のリスト）
    ×
実経験（個人フィルター）
    ↓
自分だけの体系化された知識
```

一般的な情報収集ツールや日記アプリとの違いは、**仮説の生成も経験の統合もGeminiが担うため、ユーザーは「やること」と「気になること」だけ入力すればよい**点。

confidenceScoreは「この知識が一般的に正しいか」ではなく、**「この知識がこのユーザーにとって正しいか」**を示す。同じ知識でもユーザーによってスコアが異なる。

---

## フロー

### フロー1：気になることを投げる → AIがプールを作る

```
① 気になっていることを一言投入（軽量）
   「ルアーの動かし方が気になる」など、ざっくりでよい
       ↓
   AIがWebを収集・整理 → 仮説候補を提示 → ユーザーが選択 → 知識プールへ
```

参照元の種類によって処理が分かれる：

| 参照元 | 処理 |
|--------|------|
| キーワード入力 | TavilyでWeb検索 → Geminiが仮説生成 |
| 特定URLを貼り付け | Tavily Extractでページ取得 → Geminiが仮説生成 |
| YouTube URLを貼り付け | GeminiがURLを直接処理（音声・映像を理解） |

**仮説はGeminiが候補を提示し、ユーザーは選ぶだけ**（手動入力不要）。

### フロー2：経験による知識の育成（このアプリのコア）

```
① 経験ログ記録（軽量・摩擦ゼロ）
   「今日こんなことをやった」を書くだけでよい

   投稿後、バックグラウンドでGeminiが2つの処理を実行：
   
   [処理A] hypothesis紐付け
     既存のhypothesisと経験を照合
     → 支持/反証を判定してconfidenceScoreを更新（DBに直接書く）
   
   [処理B] distilled検出
     当該分野の経験ログ全体を走査
     → パターンが見えたらdistilled候補を生成
     → 端末のAsyncStorageに一時保存

② Dashboardで提案を受け取る
   Dashboard表示時にAsyncStorageを確認
   → 提案があれば表示（なければGET /proposalsを叩く）
   → 確認タップ → POST /knowledge（distilledとしてDB登録）
   → 却下タップ → AsyncStorageから削除

③ Gemini対話による統合（重量・深い問い）
   経験 × Web情報 × 知識プールを文脈に
   対話後にアクション選択肢を提示
     [ プラン提案 / グラフ表示 / 知識保存 ]

④ 知識が育つ
   confidenceScoreが経験で上下（statusは存在しない）
   UIがスコア範囲に応じて視覚的に「育っている感」を表現

⑤ 体系化された知識 → 次の行動プランへ → ①に戻る
```

---

## データモデル

### Experience（経験ログ）
```typescript
{
  field: string,          // ユーザーが自由定義
  date: Date,
  memo: string,           // 自由記述（時間・内容・気づきなど）
  createdAt: Date,
}
```

### Knowledge（統合知識）
```typescript
{
  field: string,
  type: 'hypothesis' | 'distilled',             // 起源（不変）
  category: string,                              // ユーザー定義のカテゴリ
  content: string,
  webSources: ResearchResult[],                  // 元になったWeb情報（hypothesisのみ）
  supportingExperiences: Experience[],           // 裏付けた経験
  contradictingExperiences: Experience[],        // 反例になった経験
  confidenceScore: number,                       // 0〜1の連続値（statusは廃止）
  sourceKnowledgeId: string | null,              // distilledが参照するhypothesisのID
  tags: string[],
}
```

知識の2種類：
- `hypothesis`：Web情報から生成された仮説。経験によってconfidenceScoreが更新される
- `distilled`：経験ログの蓄積からGeminiが析出した個人的パターン。最初から自分の知識

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

| レイヤー | 内容 | 適用範囲 |
|---------|------|---------|
| Instance Knowledge | 各分野で学んだこと | その分野に閉じる |
| Meta Knowledge | 上達という行為自体についての知識 | 全分野に適用・classを更新 |

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

| モード | 場面 | 目標 |
|-------|------|------|
| 軽量モード | 経験ログ・アンケート・Web収集トリガー | 摩擦ゼロ・考えさせない |
| 重量モード | Gemini対話 | コストをかけて深く考える |

### 軽量モードの理想形
- 経験ログ：分野タップ → メモ入力 → 完了
- アンケート：通知 → 開く → 選択肢タップ → 完了（10秒以内）
- 「一言入力 → Geminiが構造化 → ユーザーが確認タップ」のパターンを基本とする

---

## 可視化

対話後のアクション選択肢の一つとして提供。指示があった時のみ表示。
具体的な可視化手法は別途検討。

---

## 技術スタック

- Backend: Node.js + Express + TypeScript（Vercel）
- Mobile: React Native（Expo）
- DB: MongoDB Atlas M0（無料固定）
- AI: Google Gemini API（gemini-2.0-flash）
- Web検索: Tavily API（確定）

詳細は [architecture.md](./architecture.md) を参照。

---

## MVP必須範囲

以下が揃って初めてコアバリューを検証できる：

| 機能 | 詳細 |
|------|------|
| 気になること入力 → 仮説生成 | Tavily/Geminiで候補生成、ユーザーが選択 |
| 経験ログ | 書くだけ（摩擦ゼロ） |
| Geminiによる自動紐付け | 経験ログ → 関連Knowledgeに自動紐付け |
| confidenceScoreの簡易表示 | 数値またはバー。育っている感の担保 |

MVP後に追加：MetaKnowledge・ランダムアンケート・プラン提案・詳細可視化。

---

## 未決事項

- Knowledge の status フィールドの閾値設計
- 可視化の具体的な手法（MVP時点ではスコア表示のみでよい）
- 分野データの永続化（現状はインメモリのみ）
