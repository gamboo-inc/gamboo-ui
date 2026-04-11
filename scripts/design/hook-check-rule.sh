#!/bin/bash
# PostToolUse hook: HTML ファイルの Write/Edit 後に禁止パターンをチェック
# 違反があれば警告を stdout に出力し、Claude のコンテキストに注入される

set -euo pipefail

# stdin から tool use の JSON を読む
INPUT=$(cat)

# file_path を抽出
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)"/\1/')

# HTML ファイルでなければスキップ
case "$FILE_PATH" in
  *.html) ;;
  *) exit 0 ;;
esac

# テスト / ベンチマーク / デモ用ファイルは除外
case "$FILE_PATH" in
  */tests/*|*/test/*|*/benchmarks/results/*|*/verification/*) exit 0 ;;
esac

# ファイルが存在しなければスキップ
[ -f "$FILE_PATH" ] || exit 0

# プロジェクトルートを特定
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RULES_FILE="$ROOT/design/contracts/rules.json"

[ -f "$RULES_FILE" ] || exit 0

# rules.json から自動検出パターンを抽出して HTML をチェック
VIOLATIONS=$(node -e "
const fs = require('fs');
const rules = JSON.parse(fs.readFileSync('$RULES_FILE', 'utf-8'));
const html = fs.readFileSync('$FILE_PATH', 'utf-8');
const classes = new Set();
for (const m of html.matchAll(/class=\"([^\"]*)\"/g)) {
  for (const cls of m[1].split(/\s+/)) if (cls) classes.add(cls);
}
const violations = [];
for (const rule of rules.rules) {
  if (!rule.pattern || !['tailwind-class','tailwind-class-prefix'].includes(rule.detector)) continue;
  const patterns = rule.matchPatterns || [rule.pattern];
  for (const p of patterns) {
    for (const cls of classes) {
      if (cls.includes(p)) {
        violations.push(rule.id + ': ' + cls + ' → ' + rule.alternative);
      }
    }
  }
}
if (violations.length > 0) {
  console.log('⚠️ melta UI 禁止パターン検出 (' + violations.length + '件):');
  violations.forEach(v => console.log('  - ' + v));
}
" 2>/dev/null || true)

if [ -n "$VIOLATIONS" ]; then
  echo "$VIOLATIONS"
fi
