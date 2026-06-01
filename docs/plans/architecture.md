# アーキテクチャ

## 選定基準

- 無料で使えること
- クレジットカード登録が不要であること

---

## 技術スタック

- Backend: Node.js + Express + TypeScript
- Hosting: Vercel（無料枠、カード不要、スリープなし）
- Frontend: React Native（Expo）
- DB: MongoDB Atlas M0（無料固定）
- AI: Google Gemini API（gemini-2.0-flash、カード不要・無料枠あり）
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
- 可視化の具体的な手法
- MVP対象分野・機能範囲の絞り込み
