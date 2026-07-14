---
title: "tsubotaxさんのmelta-ui：AIにも読めるデザインシステム"
category: "デザインシステム"
updatedDate: 2026-07-13
status: "完了"
level: "初級"
tags: ["melta-ui", "tsubotax", "デザインシステム", "Claude Code"]
references:
  - label: "tsubotax/melta-ui (GitHub)"
    url: "https://github.com/tsubotax/melta-ui"
  - label: "melta UI 公式サイト"
    url: "https://melta.tsubotax.com/"
relatedArticles: ["design-tokens-for-ai", "melta-ui-drift-detection"]
---

## melta-uiとは

melta-ui＝坪田朋（tsubotax）さんが公開している、「人間にも、AIにも、読めるデザインシステム」。Claude CodeやCursorのようなAIコーディングエージェント向けに設計されている点が最大の特徴で、今回このサイト（AI Study Archive）のUI実装にもそのまま採用した。

これまでのデザインシステムは人間が読むこと前提で作られていたが、melta-uiは「人間の可読性を犠牲にせず、AIの可読性を足す」という発想で作られている。

## 構成規模

- コンポーネント：28個（Web実装）＋アプリ向け12個
- デザイントークン：101個
- 禁止ルール：99個（IDと重大度、検出方法付き）
- ファウンデーション：13個 / パターン：5個

## 3層アーキテクチャ

| 層 | 役割 | 形式 |
|---|---|---|
| 層1 | 憲法（DESIGN.md + CLAUDE.md） | Markdown |
| 層2 | 機械可読仕様（tokens.json、rules.json、components/） | JSON |
| 層3 | 検証（CI、hook、テスト） | TypeScript + Playwright |

[[google-design-md-basics]]で調べたDESIGN.mdフォーマットを「層1（憲法）」として採用しつつ、その下にJSONの機械可読仕様と、自動検証の仕組みを重ねているのが特徴。DESIGN.md単体では「読ませる」ところまでだが、melta-uiは「守らせ続ける」ところまで踏み込んでいる。

## 7つのデザイン原則

1. Content First — UIは黒子、コンテンツが主役
2. WCAG 2.1 AA準拠（コントラスト比4.5:1以上）
3. セマンティックカラー（`color.primary.500`など語彙統一）
4. 3色ルール（1画面で3色まで）
5. 4pxグリッド（スペーシングは4の倍数）
6. 最小限の立体感（`shadow-sm`〜`shadow-md`基本）
7. AI風装飾禁止（カラーバー禁止、全周ボーダーで構成しない）

## MCPサーバーで何ができるか

AIエージェントがオンデマンドで参照できるツールが用意されている。

- `get_token` — トークン検索
- `get_component` — コンポーネント仕様取得
- `check_rule` — クラス文字列の禁止パターン検査
- `check_html` — 生成HTML/JSXの全体lint
- `get_rules` / `search` — ルール参照・全文検索

Claude Codeの場合、リポジトリをプロジェクトルートに置くだけで`DESIGN.md`と`CLAUDE.md`を自動で読み込み、`.mcp.json`によってMCP接続も自動有効化される。指示文で細かくトークンや配色を説明しなくても、「melta-uiのルールに従って実装して」と伝えるだけで済むのが実感として大きい。

## 気づき

コンポーネント数やトークン数のような「量」よりも、「禁止ルールにID・重大度・検出方法までセットで付いている」という部分に一番驚いた。ルールを言葉で書くだけでなく、機械的に検出できる形にまで落とし込まないと、AIに守らせ続けるのは難しいということだと思う。

## 今後調べたいこと

melta-uiが「守らせ続ける」ためにどんな仕組み（ドリフト検出・自動修正）を持っているかは、[[melta-ui-drift-detection]]で詳しく調べる。
