# project_gr 設計概念まとめ

## プロダクト定義

> あらゆる物事の上達を、Web知識と実経験の統合によって加速するツール

特定分野（釣り・筋トレ等）に限らず、ユーザーが自由に分野を定義できる。
JavaScriptのclass/instanceの関係で言えば、**このアプリが「上達する」という行為のclass**を提供し、ユーザーが各分野をinstanceとして生やす。

---

## コアコンセプト

Web上に散在する断片的な情報（理論・Tips・データ）を、自分の実経験というフィルターを通して統合・体系化する。

```
Web情報（断片・仮説の種）
    ×
実経験（検証・文脈）
    ↓
自分だけの体系化された知識
```

一般的な情報収集ツールや日記アプリとの違いは、**Claudeが統合・対話を担うことで手間をかけずに知識が育つ**点。

---

## フロー

```
① Web情報収集（手動トリガー）
   断片情報を取得 → 「仮説」として知識プールに投入

② 経験ログ記録（軽量・摩擦ゼロ）
   仮説を意識しながら実践・記録

③ Claude対話による統合（重量・深い問い）
   経験 × Web情報 × 知識プールを文脈に
   対話後にアクション選択肢を提示
     [ プラン提案 / グラフ表示 / 知識保存 ]

④ 知識が育つ
   hypothesis → verified / disproved
   信頼度スコアが経験で上下

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
  category: string,                              // ユーザー定義のカテゴリ
  content: string,
  webSources: ResearchResult[],                  // 元になったWeb情報
  supportingExperiences: Experience[],           // 裏付けた経験
  contradictingExperiences: Experience[],        // 反例になった経験
  confidenceScore: number,
  status: 'hypothesis' | 'verified' | 'disproved',  // 閾値設計は未決定
  tags: string[],
}
```

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
- **方式**：固定の「問いの型（約10問）」を骨格に、Claudeが文脈を挿入して動的生成
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
> ユーザーの入力は「意思・感情・気づき」だけに集中させる。構造化はClaudeが担う。

### 2モードの分離

| モード | 場面 | 目標 |
|-------|------|------|
| 軽量モード | 経験ログ・アンケート・Web収集トリガー | 摩擦ゼロ・考えさせない |
| 重量モード | Claude対話 | コストをかけて深く考える |

### 軽量モードの理想形
- 経験ログ：分野タップ → 自己評価タップ → 完了（5秒以内）
- アンケート：通知 → 開く → 選択肢タップ → 完了（10秒以内）
- 「一言入力 → Claudeが構造化 → ユーザーが確認タップ」のパターンを基本とする

---

## 可視化

対話後のアクション選択肢の一つとして提供。指示があった時のみ表示。
具体的な可視化手法は別途検討。

---

## 技術スタック

- Backend: Node.js + Express + TypeScript
- Frontend: React Native（Expo）
- DB: MongoDB Atlas
- AI: Google Gemini API（gemini-2.0-flash）
- Web検索: Tavily API（検討中）

---

## ディレクトリ構成

```
project_gr/
├── back/
│   ├── models/
│   │   ├── Experience.ts
│   │   ├── Knowledge.ts
│   │   ├── Plan.ts
│   │   ├── ResearchResult.ts
│   │   └── MetaKnowledge.ts
│   ├── router/
│   │   ├── experience.ts
│   │   ├── knowledge.ts
│   │   ├── plan.ts
│   │   └── research.ts
│   └── server.ts
└── mobile/
    └── src/
        ├── screens/
        │   ├── log/
        │   ├── knowledge/
        │   ├── dashboard/
        │   └── plan/
        └── components/
            ├── charts/
            └── dialogue/
```

---

## 未決事項

- Web検索APIの選定（Tavily推奨）
- Knowledge の status フィールドの閾値設計
- 可視化の具体的な手法
- MVP対象分野・機能範囲の絞り込み
