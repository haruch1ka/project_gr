# アーキテクチャ

## 技術スタック

- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript + Tailwind CSS
- DB: MongoDB Atlas
- AI: Anthropic Claude API（claude-sonnet-4-6）
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
└── front/
    └── src/
        ├── pages/
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
- 可視化の具体的な手法
- MVP対象分野・機能範囲の絞り込み
