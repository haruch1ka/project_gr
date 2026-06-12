---
name: jest-output-in-non-tty
description: 非TTY環境でjest --verboseのテスト名が出力されない問題と解決パターン
---

# jest: 非TTY環境でのテスト名出力

## 問題

`pnpm test --verbose` や `jest.config.js` に `verbose: true` を設定しても、
Claude Code（Bash ツール）のような非 TTY 環境ではテスト名が一切出力されない。

```
# 試したが効果なかったパターン
pnpm test --verbose
pnpm exec jest --verbose
pnpm exec jest --colors --expand
jest.config.js に verbose: true を追加
```

**原因**：jest は TTY を検出しない場合、verbose 出力を抑制する。

---

## 解決パターン

`--json` でファイルに書き出し、Node.js で整形して出力する。

```bash
# 1. JSON に書き出す
pnpm exec jest --json --outputFile="$TEMP/jest-results.json"

# 2. Node.js で整形
node -e "const fs=require('fs'),p=require('path'),tmp='C:/Users/taiho/AppData/Local/Temp',d=JSON.parse(fs.readFileSync(p.join(tmp,'jest-results.json'),'utf8'));for(const s of d.testResults){const n=s.name.split('__tests__').pop().slice(1);console.log('\n'+n);for(const t of s.assertionResults){const m=t.status==='passed'?'PASS':'FAIL';console.log('  ['+m+'] '+t.fullName);}}"
```

### 出力例

```
gemini.test.ts
  [PASS] SCORE_DELTA supporting/highが最大増加量
  [PASS] isValidCategory valid: "ルアーカラー"
  [PASS] updateKnowledgeFromExperience 知識が0件なら Gemini を呼ばずに終了する
  ...
```

---

## 特定ファイルだけ確認したい場合

```bash
pnpm exec jest --json --outputFile="$TEMP/jest-results.json" src/services/__tests__/gemini.test.ts
```

## 特定テスト名でフィルターしたい場合

```bash
# 件数だけ確認できる（テスト名は出ない）
pnpm exec jest --testNamePattern "updateKnowledge"
# → Tests: 39 skipped, 7 passed, 46 total
```
