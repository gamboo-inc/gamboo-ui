# AI Study Archive（examples/ai-study-archive）

## 1. サイトの中身の紹介

AI活用に関する学習内容を蓄積・閲覧するための個人用アーカイブサイト。閲覧がメインの使い方で、記事の追加は随時・少しずつ行う想定。

**公開URL:** https://gamboo-inc.github.io/gamboo-ui/ai-study-archive/

### 今あるコンテンツ

| 種類 | 件数 | 備考 |
|---|---|---|
| 記事 | 12本 | 下記一覧参照 |
| 用語集 | 27件 | 用語＋説明の単語帳形式 |
| FAQ | 6件 | よく使うプロンプト・コマンドのQ&A |
| メディア | 3件 | 参考記事・外部リンク集 |

サイドバーのメニューは「記事一覧・カテゴリ・メディア・用語集・FAQ・設定」の6ページ構成。

**記事一覧（カテゴリ別）:**
- **AI技術**: MCP（Model Context Protocol）の基本 / Figma MCPでデザインとコードをつなぐ実践例
- **Claude Code**: Claude Codeへの指示文（プロンプト）の書き方の基本 / Figma × Claude Codeでデザインをコード化する
- **デザインシステム**: Atomic Designとコンポーネント設計の違い / デザイントークンをAIに読み込ませる仕組み
- **環境構築**: デザイナーのためのGitHub基礎知識 / デザイナーが覚えておきたいMarkdownの書き方 / WSL2でClaude Code環境を構築する
- **設計思想**: PRDとデザインシステムを分けて考える設計思想 / AIが書いたコードを人間がレビューするときの視点
- **フロントエンド**: React（Vite）で簡単なアプリを作る流れ

### 使用technology

- **Astro**（静的サイトジェネレーター、v7系）— Markdownファイルを自動でページ化する Content Collections 機能を利用
- **Tailwind CSS**（v4系）— `@theme` ディレクティブでデザイントークンを定義
- **TypeScript** / **Zod** — 記事・用語集などのfrontmatterのスキーマ検証
- サーバー・データベースなし。すべて `src/content/` 配下のMarkdownファイルで管理する静的サイト

---

## 2. サイトの中身の更新・実験の仕方

### 記事・コンテンツを追加/編集する

実体は `examples/ai-study-archive/src/content/` 配下。必ずこちらを編集すること。（以前あった重複フォルダ `examples/ai-study-archive/articles/` は削除済み）

| 内容 | フォルダ | frontmatter |
|---|---|---|
| 記事 | `src/content/articles/*.md` | `title`, `category`, `updatedDate`, `status`("学習中"\|"完了"), `level`, `tags[]`, `references[]`, `relatedArticles[]` |
| 用語集 | `src/content/glossary/*.md` | `term`, `description` |
| FAQ | `src/content/faq/*.md` | `question`, `order` |
| メディア | `src/content/media/*.md` | `title`, `url`, `memo`, `addedDate` |

スキーマは `src/content.config.ts` にZodで定義されている。必須フィールドが欠けていたり型が違うとビルド時にエラーになる。

### ローカルで確認しながら作業する

```bash
cd examples/ai-study-archive
npm install        # 初回のみ
npm run dev         # http://localhost:4321 で起動、保存すると自動リロード
```

本番ビルドを手元で確認したい場合:

```bash
npm run build
npm run preview
```

### GitHub上の公開サイトに反映する方法

**`main` に `examples/ai-study-archive/` 配下の変更を push すれば、GitHub Actions（`.github/workflows/deploy-ai-study-archive.yml`）が自動でビルド・デプロイする。** 手動でのビルドや `gh-pages` ブランチへの反映作業は不要。

1. `main` ブランチで `src/content/` 等を編集し、通常どおりコミット・push
2. push をトリガーに、GitHub Actions が `GH_PAGES=1 npm run build` を実行し、`gh-pages` ブランチの `ai-study-archive/` ディレクトリだけを自動で置き換える（`index.html` など他のディレクトリには影響しない）
3. 数分後に公開サイトに反映される（Actionsタブから進捗を確認できる）

以前は手動デプロイのみで、リポジトリ名変更時にビルド済みパスが古いまま残りサイトが壊れる事故があったが、自動デプロイ化により解消済み。

---

## 3. サイトの直し方・育て方

### デザイントークン（色・フォントなど）を変更したい場合

`examples/ai-study-archive/src/styles/global.css` の `@theme` ブロックを編集する。色（`--color-grey-*`, `--color-accent`）、フォント（`--font-sans`）、文字サイズ・行間（`--text-*`）、角丸（`--radius-*`）、余白（`--spacing-*`）が一式ここに定義されている。

このトークンセットはリポジトリ本体（gamboo-ui）の `design/contracts/` とは別物の、このサブプロジェクト専用の独立したトークン定義。gamboo-ui本体のトークンファイルを直接参照してはいない点に注意。

### ページのレイアウトやコンポーネントを追加したい場合

- 共通レイアウト（サイドバー込みの外枠）: `src/layouts/DashboardLayout.astro`
- サイドバーメニュー: `src/components/Sidebar.astro`
- 既存の小さいコンポーネント例: `src/components/Tag.astro`
- 新規ページはAstroのファイルベースルーティングに従い、`src/pages/` 配下にファイルを追加すれば自動的にルーティングされる（例: `src/pages/media/index.astro`）
- 新しい種類のコンテンツ（記事・用語集などの追加カテゴリ）を増やす場合は `src/content.config.ts` に `defineCollection` を追加する

### 注意点

- **内部リンクは絶対パス（`/foo`）を直書きしない。** `src/lib/base.ts` の `withBase()` を使うこと。このサイトはGitHub Pagesのサブパス（`/gamboo-ui/ai-study-archive/`）配下で公開されているため、パスを直書きするとローカルでは動いても本番で壊れる。既存のコンポーネントは概ね対応済みだが、新規追加時は要注意。
- `astro.config.mjs` の `base` は環境変数 `GH_PAGES` の有無で切り替わる仕組みになっている。ローカル開発時は `/`、本番ビルド時は `/gamboo-ui/ai-study-archive` になる。リポジトリ名・組織名が変わる場合はここも要修正。
- 自動デプロイは `examples/ai-study-archive/**` の変更 push のみをトリガーにしている。ワークフローファイル自体を修正した場合も再実行される。
