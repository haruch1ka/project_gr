# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> グローバル設定 [`.claude/global/CLAUDE.md`](.claude/global/CLAUDE.md) も同等の優先度で適用される。コーディング規約は [`.claude/global/coding-style.md`](.claude/global/coding-style.md) を参照。

---

## プロジェクト概要

「あらゆる物事の上達を、Web知識と実経験の統合によって加速するツール」。

ユーザーが自由に分野（釣り・筋トレ等）を定義し、Web収集した情報（仮説）と自分の経験ログを、Gemini AIが統合・体系化する。知識はベイズ的な確信度スコアで管理され、経験の積み重ねにより `hypothesis → verified / disproved` へと遷移する。

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| Backend | Node.js + Express + TypeScript |
| Hosting | Vercel（無料枠、スリープなし） |
| Mobile | React Native（Expo） |
| DB | MongoDB Atlas M0（無料固定） |
| AI | Google Gemini API（gemini-2.5-flash） |
| Web検索 | Tavily API（確定・クレカ不要・月1000クレジット無料） |

**制約：無料かつクレジットカード登録不要のサービスのみ使用すること。**

---

## ディレクトリ構成（計画）

```
project_gr/
├── back/
│   ├── models/        # Mongoose スキーマ定義
│   ├── router/        # Express ルーター
│   └── server.ts
└── mobile/
    └── src/
        ├── screens/   # log / knowledge / dashboard / plan
        └── components/
            ├── charts/
            └── dialogue/
```

---

## データモデル

### Knowledge（中核モデル）

```typescript
{
  field: string,
  category: string,                              // ユーザー定義のカテゴリ
  content: string,
  webSources: ResearchResult[],
  supportingExperiences: Experience[],
  contradictingExperiences: Experience[],
  confidenceScore: number,           // ベイズ的に更新
  status: 'hypothesis' | 'verified' | 'disproved',  // 閾値設計は未決定
  tags: string[],
}
```

`verified` は「証明済み」ではなく「現時点で反証されていない」を意味する（ポパーの反証主義）。

### 知識の2層構造

| レイヤー | 内容 | 適用範囲 |
|----------|------|----------|
| Instance Knowledge | 各分野で学んだこと | その分野に閉じる |
| Meta Knowledge | 上達という行為自体の知識 | 全分野に適用・classを更新 |

その他モデル：`Experience`（経験ログ）・`Plan`（行動プラン）・`ResearchResult`（Web収集生データ）。詳細は [`docs/plans/spec.md`](docs/plans/spec.md) を参照。

---

## 設計上の重要な決定

- **confidenceScoreの意味**：「この知識が一般的に正しいか」ではなく「このユーザーにとって正しいか」を示す。同じ知識でもユーザーによってスコアが異なる。個人プロファイルは不要で、事実の積み重ねで判断する。
- **confidenceScore の更新ロジック**：経験1件で小幅増加、複数回再現で大幅増加。Geminiが証拠の尤度（高・中・低）を判断してスコアに変換する。閾値設計は未決定（[`docs/research/knowledge-verification-theory.md`](docs/research/knowledge-verification-theory.md) 参照）。
- **経験ログとKnowledgeの紐付け**：ユーザーは「書くだけ」でよい。仮説を意識する必要はなく、Geminiが自動で関連Knowledgeに紐付ける。
- **入力コスト設計**：軽量モード（経験ログ・アンケート）は摩擦ゼロが最優先。重量モード（Gemini対話）のみコストをかける。「一言入力 → Geminiが構造化 → ユーザーが確認タップ」がパターン。
- **ランダムアンケート**：3〜14日のランダム周期でGeminiが動的生成。Meta-Knowledge抽出の素材にする。
- **Web収集の役割分担**：Tavilyが情報収集、Geminiが思考・統合を担う。YouTube URLはGeminiが直接処理（Tavilyなし）。

---

## 開発コマンド

※ 実装前のため、セットアップ後は以下の想定コマンドを更新すること。

```bash
# Backend
cd back && pnpm dev    # 開発サーバー起動

# Mobile
cd mobile && pnpm start
```
