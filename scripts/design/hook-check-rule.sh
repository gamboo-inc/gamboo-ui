#!/bin/bash
# PostToolUse hook: 生成物(.html/.tsx/.jsx/.vue)の Write/Edit 後に禁止パターンをチェック
# 違反があれば警告を stdout に出力し、Claude のコンテキストに注入される
#
# 判定ロジックは共通 lint core(src/utils/lint-core.ts) に集約。
# 旧実装の独自 includes 判定（top-0→p-0 誤検出 / .html 限定）は廃止した。

set -euo pipefail

# stdin から tool use の JSON を読む
INPUT=$(cat)

# file_path を抽出
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)"/\1/')

# 対象拡張子でなければスキップ
case "$FILE_PATH" in
  *.html|*.tsx|*.jsx|*.vue) ;;
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

# 共通 lint core CLI に委譲（hook は助言のみ。違反でも exit 0 で Claude を止めない）
OUTPUT=$(cd "$ROOT" && npx tsx scripts/design/lint-generated.ts "$FILE_PATH" 2>/dev/null || true)

# CLI は PASSED 行も出すので、違反行(✗/⚠)が含まれる時だけ警告を出す
if echo "$OUTPUT" | grep -qE '[✗⚠]'; then
  echo "⚠️ melta UI 禁止パターン検出:"
  echo "$OUTPUT" | grep -E '[✗⚠]'
fi
