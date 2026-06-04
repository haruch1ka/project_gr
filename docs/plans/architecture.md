# アーキテクチャ

## 選定基準

- 無料で使えること
- クレジットカード登録が不要であること

---

## 技術スタック

- Mobile: React Native（Expo）
- Backend: Node.js + Express + TypeScript（Vercel、DBのCRUD APIのみ）
- DB: MongoDB Atlas M0（無料固定）
- AI: Google Gemini API（gemini-2.0-flash、モバイルから直叩き）
- Web検索: 未定

---

## API呼び出し方針

| 対象 | 呼び出し元 | APIキー管理 |
|------|-----------|------------|
| MongoDB | back/（Vercel） | 環境変数 |
| Gemini | mobile（直叩き） | SecureStore |

---

## ディレクトリ構成

```
project_gr/
├── back/
│   ├── models/
│   │   ├── Experience.ts
│   │   ├── Knowledge.ts
│   │   ├── Plan.ts
│   │   └── ResearchResult.ts
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
