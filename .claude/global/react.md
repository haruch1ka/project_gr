# React / フロントエンド コーディングスタイル

## コンポーネント

- **アロー関数コンポーネント**を使用する（`const Foo = () => {}`）
- `React.FC` は使わず、Props 型を明示して引数で受け取る
- `children` は `React.PropsWithChildren<Props>` で型付け
- Props は分割代入で受け取る

## Tailwind CSS

- Tailwind utility を優先。独自クラスは必要な場合のみ
- 複数の関連クラスが長くなる場合は変数化して可読性を上げる
