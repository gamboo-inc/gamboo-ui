# AI Study Archive

AI学習の記録を蓄積・閲覧するための個人用アーカイブサイト。Astro + Tailwind CSS + [gamboo UI](../../README.md)（このリポジトリルートのデザインシステム）で構築している。

- 公開URL: https://gamboo-inc.github.io/gamboo-ui/ai-study-archive/
- 用途: 記録の追加はたまに、閲覧がメインの使い方
- データ管理: サーバー・DBなし。`src/content/` 以下のMarkdownファイルで管理（Astro Content Collections）

## セットアップ

```bash
cd examples/ai-study-archive
npm install
```

## 開発

```bash
npm run dev      # http://localhost:4321 でローカル確認
npm run build    # dist/ に静的ビルド（ローカル確認用。base path は "/"）
npm run preview  # build 結果をローカルでプレビュー
```

## 記事の追加方法

`src/content/articles/` に Markdown ファイルを1つ追加するだけでよい。ファイル名がそのままURLのslugになる（例: `melta-ui-overview.md` → `/articles/melta-ui-overview/`）。

frontmatterのスキーマは `src/content/config.ts` で定義されている。

```yaml
---
title: string
category: string
updatedDate: date          # YYYY-MM-DD
status: "学習中" | "完了"
level: string               # 難易度レベル（例: 初級/中級）
tags: string[]
references:                  # 参考リンク（任意）
  - label: string
    url: string
relatedArticles: string[]    # 関連記事のslug（拡張子なし）
---

## 本文はここから（Markdown）
```

同様に `src/content/media/`（参考リンク集）・`src/content/glossary/`（用語集）・`src/content/faq/`（Q&A）にもそれぞれ専用のスキーマがあるので、追加前に `src/content/config.ts` を確認すること。

## デザインルール

コンポーネントは必ず gamboo UI（リポジトリルートの `design/contracts/components/`）の contract に従うこと。独自の配色・シャドウ・装飾は追加しない（ルートの `DESIGN.md` の Do's/Don'ts を参照）。

## デプロイの仕組み

`main` ブランチに `examples/ai-study-archive/**` の変更をpushすると、GitHub Actions（`.github/workflows/deploy-ai-study-archive.yml`）が自動的に以下を行う。

1. `GH_PAGES=1 npm run build`（GitHub Pages用のbase path `/gamboo-ui/ai-study-archive` でビルド）
2. ビルド成果物を `gamboo-ui` リポジトリのGitHub Pages（Organization: `gamboo-inc`）にデプロイ

手動でのデプロイ操作は不要。pushしてActionsが緑になれば数分後に本番へ反映される。

> `astro.config.mjs` の `site` は `GH_PAGES=1` 時に組織のPages URL（`https://gamboo-inc.github.io`）を指す。個人アカウント名などをハードコードしないこと（過去にOrganization移行前の個人アカウント名が残ったまま気づかれず、sitemap/canonical URLが誤ったままになっていた事例あり）。
