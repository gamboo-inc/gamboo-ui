---
title: "Google Labs「DESIGN.md」とは何か"
category: "デザインシステム"
updatedDate: 2026-07-12
status: "完了"
level: "初級"
tags: ["DESIGN.md", "Google Labs", "デザインシステム", "AI技術"]
references:
  - label: "google-labs-code/design.md (GitHub)"
    url: "https://github.com/google-labs-code/design.md"
  - label: "Stitch's DESIGN.md format is now open-source (Google Blog)"
    url: "https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/"
relatedArticles: ["design-tokens-for-ai", "google-design-md-spec-detail"]
---

## DESIGN.mdとは

DESIGN.md＝ビジュアルアイデンティティ（配色・書体・余白などのブランドの見た目）を、AIコーディングエージェントに向けて記述するためのフォーマット仕様。GoogleのAIデザインツール「Stitch」で使われていた形式が、Google Labsによってオープンソース化され、特定のツールに縛られない共通規格として公開された。

「AIエージェントに、デザインシステムの永続的で構造化された理解を与える」ことが目的。プロジェクトルートに1ファイル置いておけば、Claude CodeなどのAIが毎回参照できる「デザインの説明書」になる。

## ファイル構造

DESIGN.mdは2層構成になっている。

1. **YAML front matter（上部）**：機械可読な設計トークン。色コード・フォントサイズ・余白の数値など、正確な値を定義する
2. **Markdown本文（下部）**：人間向けの説明文。なぜその値なのか、どう使うべきかを`##`見出しで記述する

推奨セクション順は Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts。トークンは`{colors.accent}`のような参照記法で、コンポーネント定義から呼び出せる。

## デザイントークンをAIに読ませる意義との関係

以前まとめた[[design-tokens-for-ai]]の内容とほぼ同じ発想だが、DESIGN.mdは「トークンの持たせ方」自体を標準規格として定義した点が新しい。トークンがW3C Design Token Format（DTCG）準拠になっているため、tokens.jsonやTailwind configへのエクスポートも仕様として保証されている。

## 気づき

「AIに一度説明したことを覚えておいてもらう」ための手段として、これまでは各プロジェクトで独自にドキュメントを書いていたが、DESIGN.mdのような共通フォーマットが広まれば、複数のAIツール・エージェント間でも同じファイルを使い回せるようになる。フォーマットが標準化されることの価値は、人間向けのドキュメントよりもAI向けの方が大きいのかもしれない。

## 今後調べたいこと

DESIGN.mdの詳しい仕様（バリデーションの仕組みやCLIコマンド）は[[google-design-md-spec-detail]]で別途まとめる。
