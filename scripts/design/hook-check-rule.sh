#!/bin/bash
# PostToolUse hook: 生成物(.html/.tsx/.jsx/.vue)の Write/Edit 後に禁止パターンをチェック
#
# 出力は lint-generated.ts --hook が生成する PostToolUse 用 JSON:
#   - error あり → {"decision":"block","reason":...} で Claude に自動フィードバック（修正ループ）
#   - warn のみ → hookSpecificOutput.additionalContext で助言注入
# 旧実装の plain stdout + exit 0 は transcript 表示のみで model に届かなかった。
# 判定ロジックは共通 lint core(src/utils/lint-core.ts) に集約。

set -uo pipefail

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
cd "$ROOT"

# tsx 未解決（npm install 前）は silent no-op にせず、その旨をコンテキストに注入する
if ! npx --no-install tsx --version >/dev/null 2>&1; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"melta UI: 禁止パターン lint をスキップしました（node_modules 未インストール）。リポジトリルートで npm install を実行すると Write/Edit 直後の自動 lint が有効になります。"}}
JSON
  exit 0
fi

# JSON 生成は TS 側（lint-generated.ts --hook）に集約。常に exit 0
npx --no-install tsx scripts/design/lint-generated.ts --hook "$FILE_PATH"
exit 0
