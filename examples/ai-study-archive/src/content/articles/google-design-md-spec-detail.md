---
title: "DESIGN.mdの仕様を読み解く：トークン構造とバリデーション"
category: "デザインシステム"
updatedDate: 2026-07-12
status: "完了"
level: "中級"
tags: ["DESIGN.md", "Google Labs", "デザイントークン", "バリデーション"]
references:
  - label: "design.md/docs/spec.md (GitHub)"
    url: "https://github.com/google-labs-code/design.md/blob/main/docs/spec.md"
relatedArticles: ["google-design-md-basics", "prd-design-system-separation"]
---

## 前回の続き

[[google-design-md-basics]]でDESIGN.mdの全体像を把握したので、今回は仕様書（spec.md）の中身をもう少し細かく読んでみた。

## トークンの型と必須フィールド

YAML front matterには、型付きのトークングループを定義する。

- `colors: { token-name: Color }`
- `typography: { token-name: Typography }`
- `rounded: { scale-level: Dimension }`
- `spacing: { scale-level: Dimension | number }`
- `components: { component-name: { token-name: value } }`

仕様上必須なのは `name` フィールドで、加えて `version` / `description` / `colors` セクションが求められる。つまり最小構成でも「プロジェクト名」と「プライマリカラー」さえ定義すれば、形式としては成立する。

## コンポーネント定義とバリアント

コンポーネントは `backgroundColor` / `textColor` / `typography` / `rounded` / `padding` / `size` / `height` / `width` といったプロパティの組み合わせで表現する。`button-primary` に対して `button-primary-hover` のように関連キーを用意することで、状態（バリアント）ごとの見た目も表現できる。トークン参照は `{colors.primary}` のような記法で、値の重複定義を避ける。

## バリデーションの挙動

仕様書の「Consumer Behavior for Unknown Content」という章に、パーサーの振る舞いが明記されている。

- 未知のセクション見出し：無視せず保持する
- 無効なトークン値：エラーとして扱う
- セクション見出しの重複：ファイル自体を拒否する

このあたりの「曖昧な入力をどう扱うか」まで仕様化されているのは、複数の実装（別のツールやAIモデル）が同じファイルを解釈したときに解釈のブレが出ないようにするため、という理解。

## W3Cデザイントークン仕様との関係

DESIGN.mdのトークン構造は、Design Token JSON仕様（DTCG）の「型付きトークングループ」と「`{path.to.token}` 参照構文」をベースにしている。完全に独自規格を作るのではなく、既存のW3C標準に乗っかった上で、Markdown本文（人間向けの説明）を組み合わせているのが特徴。

npmパッケージ（`@google/design.md`）には `lint`（構造検証）・`diff`（差分検出）・`export`（Tailwind/DTCG形式への変換）というコマンドが用意されており、CIに組み込んで自動チェックすることも想定されている。

## 気づき

トークンの「型」と「参照構文」を既存標準（DTCG）に合わせているのは、[[prd-design-system-separation]]で書いた「何を明文化し、何をAIの判断に任せるか」という課題への一つの答えに見える。値の置き場所と参照方法を標準化してしまえば、AIが値を取り違えるリスクそのものを構造的に減らせる。
