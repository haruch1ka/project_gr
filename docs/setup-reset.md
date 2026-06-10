# 環境リセット手順

## 実行手順

```bash
# 1. キャッシュ・生成物を削除
cd mobile
rm -rf node_modules .expo

# 2. クリーンインストール
pnpm install

# 3. 開発ビルドを端末に再インストール
pnpm android
```

Android Studio 側：
- Build > Clean Project
- File > Invalidate Caches > Invalidate and Restart

## 前提バージョン確認

```bash
node -v   # 20以上
pnpm -v   # 10以上
```

## 注意

- `pnpm android` = `expo run:android`（カスタムAPKのビルド）
- **Expo Go では動かない**（`@react-native-async-storage/async-storage` 等のネイティブモジュールが null になる）
- 必ずカスタムAPKをビルドして端末にインストールしてから起動すること
