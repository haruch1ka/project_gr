# Claude Design 調査メモ

調査日: 2026-06-04

## 概要

**Anthropic Labs** が2026年4月17日にローンチしたAI設計ツール。
テキストプロンプトでデザイン・プロトタイプ・スライドなどのビジュアルコンテンツを生成・編集できる。

- 駆動モデル: Claude Opus 4.7
- 利用条件: Claude Pro / Max / Team / Enterprise（現在リサーチプレビュー中）

## 主な機能

| 機能 | 内容 |
|------|------|
| デザインシステム統合 | コードベース・デザインファイルを読み込み、色・フォント・コンポーネントを自動適用 |
| 柔軟な入力 | テキスト・画像・DOCX/PPTX/XLSX・Webキャプチャ |
| 反復編集 | インラインコメント・テキスト直接編集・調整スライダー |
| エクスポート | Canva / PDF / PPTX / スタンドアロンHTML |

## 作成できるもの

- アプリプロトタイプ・Webページ
- ピッチデック・ワンペイジャー
- ソーシャルメディア素材
- 音声・3D等を含むフロンティアデザイン（コード駆動）

## Claude Code との連携

デザイン完成後に「ハンドオフバンドル」を生成し、Claude Code に渡すことで
**設計 → プロトタイプ → 本番コード** のワークフローが Anthropic エコシステム内で完結する。

## 参考リンク

- https://www.anthropic.com/news/claude-design-anthropic-labs
- https://support.claude.com/en/articles/14604416-get-started-with-claude-design
- https://claude.com/plugins/design
