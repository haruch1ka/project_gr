# アーキテクチャ

## 選定基準

- 無料で使えること
- クレジットカード登録が不要であること

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| Mobile | React Native（Expo） |
| Backend | Node.js + Express + TypeScript（Vercel） |
| DB | MongoDB Atlas M0（無料固定） |
| AI | Google Gemini API（gemini-2.0-flash）|
| Web検索 | 未定 |

---

## API呼び出し方針

| 対象 | 呼び出し元 | APIキー管理 |
|------|-----------|------------|
| MongoDB | back/（Vercel） | 環境変数 |
| Gemini | mobile（直叩き） | SecureStore |

---

## ディレクトリ構成（現状）

```
project_gr/
├── back/
│   └── src/
│       ├── models/
│       │   ├── Experience.ts
│       │   ├── Knowledge.ts
│       │   ├── Plan.ts
│       │   └── ResearchResult.ts
│       ├── router/
│       │   ├── experience.ts
│       │   ├── knowledge.ts
│       │   └── plan.ts
│       └── server.ts
└── mobile/
    └── src/
        ├── screens/
        │   ├── DashboardScreen.tsx    # ホームタブ（分野タブ・知識ウィジェット・アンケート）
        │   ├── KnowledgeScreen.tsx    # 知識一覧（カテゴリ別）
        │   ├── KnowledgeCategoryScreen.tsx
        │   ├── KnowledgeItemScreen.tsx
        │   ├── ChatScreen.tsx         # Gemini対話
        │   ├── PlanScreen.tsx         # 行動プラン管理
        │   ├── LogScreen.tsx          # 経験ログ一覧
        │   ├── QuickLogScreen.tsx     # モーダル・簡易ログ入力
        │   ├── HomeScreen.tsx         # 分野選択（初期画面）
        │   ├── WebScreen.tsx          # Web収集トリガー
        │   └── SettingsScreen.tsx     # 設定（分野管理・アプリ情報）
        ├── context/
        │   └── FieldContext.tsx       # 分野状態（activeField・fields・追加削除）
        ├── services/
        │   ├── api.ts                 # バックエンドAPI呼び出し（experience / knowledge / plan）
        │   └── gemini.ts              # Gemini API ラッパー
        ├── constants/
        │   ├── theme.ts               # colors / font / radius
        │   └── mockData.ts            # 開発用モックデータ
        └── types/                     # 共通型定義
```

---

## ナビゲーション構成

```
RootStack（NativeStack）
├── FieldTabs（BottomTab）
│   ├── Dashboard
│   ├── Knowledge
│   ├── _FieldLog（中央ボタン → QuickLog へ遷移）
│   ├── Chat
│   └── Plan
├── Home
├── Log
├── KnowledgeCategory
├── KnowledgeItem
├── Web
├── QuickLog（modal）
└── Settings
```

`FieldProvider` は `FieldTabNavigator` 内にスコープされ、タブ間で `activeField` を共有する。

---

## バックエンドAPI（実装済み）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/experiences` | GET / POST | 経験ログ一覧・作成 |
| `/experiences/:id` | DELETE | 削除 |
| `/knowledge` | GET / POST | 知識一覧・作成 |
| `/knowledge/:id` | GET / PATCH / DELETE | 取得・更新・削除 |
| `/plans` | GET / POST | プラン一覧・作成 |
| `/plans/:id` | PATCH / DELETE | 更新・削除 |

ホスト: `https://project-gr-back.vercel.app`

---

## 未決事項

- 可視化の具体的な手法
- ResearchResult の router 未実装（モデルのみ存在）
- 分野データの永続化（現状は FieldContext のインメモリ状態のみ）

---

## Mobile ネイティブ層（Android）

### バージョン

| 項目 | 値 |
|------|----|
| React Native | 0.85.3 |
| Expo SDK | 56.0.x |
| React | 19.2.3 |
| JSエンジン | Hermes |
| アーキテクチャ | New Architecture（Bridgeless / Fabric）有効 |
| Expo ワークフロー | Bare（`android/` を git 管理） |

### Android ビルド設定

| 項目 | 値 |
|------|----|
| compileSdk / targetSdk | 36（Android 16） |
| minSdk | 24（Android 7.0） |
| 対象 ABI | armeabi-v7a, arm64-v8a, x86, x86_64 |
| Kotlin | 2.1.20 |

### 注意事項

- `MainApplication.kt` は Expo SDK 56 方式（`ExpoReactHostFactory`）で実装済み。旧方式の `ReactNativeHostWrapper` は SDK 56 で削除されているため使用不可。
- `npx expo prebuild --clean` を実行すると `android/` が再生成され、上記の修正が失われる。実行後は再適用が必要。
- Web検索は Tavily API を採用（`src/services/tavily.ts` 実装済み）。
