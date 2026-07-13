---
name: design-review
description: HTMLファイルをgamboo UIデザインシステムに照らしてレビューし、違反を検出・分類・修正提案する。トリガー: 「デザインレビュー」「DSチェック」「禁止パターンチェック」「design review」「check compliance」「DS準拠確認」。対象ファイルのパスを引数で受け取る。
---

# デザインレビュー

HTMLファイルを gamboo UI デザインシステム（CLAUDE.md + foundations/prohibited.md）に照らしてレビューし、違反を検出・分類・修正提案する。

## 手順

### Step 1: 対象のHTMLファイルを特定する

- 引数でファイルパスが指定されている場合 → そのファイルを読み込む
- 引数がない場合 → `examples/` 配下のHTMLファイルを一覧表示し、ユーザーに選択してもらう
- 対象がHTMLファイルでない場合 → 「HTMLファイルを指定してください」と返す

対象ファイルを全文読み込む。

### Step 2: DSリファレンスを読む

以下を読み込む:
- `CLAUDE.md`（クイックリファレンス・禁止パターン要約）
- `foundations/prohibited.md`（全禁止パターン — SSOT）

### Step 3: チェックリストに沿って違反を検出する

`references/checklist.md` を読み込み、以下のカテゴリ順にHTMLを走査する:

1. カラー
2. スペーシング・レイアウト
3. タイポグラフィ
4. モーション
5. ボーダー
6. フォーム（fieldset/legend カード干渉、日付セレクト幅を含む）
7. アクセシビリティ

### Step 4: 偽陽性を排除し、重大度を判定する

`references/severity-rules.md` を読み込み、以下を実行:

1. **「推奨」と「必須」を区別** — 推奨事項は違反として報告しない
2. **文脈判定で偽陽性を排除** — label/aria-current/text-xs の文脈確認
3. **重大度を割り当て** — Critical / High / Medium / Low の4段階。固定ルールに従う

### Step 5: レポートを出力する

`references/report-template.md` を読み込み、テンプレートに沿ってレポートを出力する。

出力前に **サマリー整合チェック** を実施: 本文中の各重大度の件数と冒頭サマリーの件数が一致することを確認する。
