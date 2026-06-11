# Layout Patterns

> ページレイアウトの構成パターン。

---

## サイドバー + メインコンテンツ

最も一般的な業務ツールレイアウト。サイドバーにナビゲーション、メインにコンテンツ。

> サイドバーの仕様・HTMLサンプル・レスポンシブ対応は `components/sidebar.md` を参照。

```html
<div class="flex h-screen">
  <!-- サイドバー: components/sidebar.md 参照 -->
  <aside class="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">...</aside>

  <!-- メインコンテンツ -->
  <main class="flex-1 bg-gray-50 overflow-y-auto">
    <div class="max-w-5xl mx-auto px-6 py-8">
      <!-- コンテンツ -->
    </div>
  </main>
</div>
```

### ルール

- サイドバー仕様（幅・ナビアイテム・状態・レスポンシブ）: `components/sidebar.md` を参照
- メイン背景: `bg-gray-50`
- メインのコンテンツ幅: `max-w-5xl` 〜 `max-w-7xl`
- サイドバーとメインの間隔はボーダーで分離（gap不要）

---

## ページヘッダー

ページタイトルとアクションボタンを横並びに配置。

```html
<div class="flex items-center justify-between mb-8">
  <div>
    <h1 class="text-3xl font-bold text-slate-900">ページタイトル</h1>
    <p class="mt-1 text-base text-body">ページの説明</p>
  </div>
  <div class="flex items-center gap-3">
    <button class="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-gray-50 transition-colors">
      エクスポート
    </button>
    <button class="h-10 px-4 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
      新規作成
    </button>
  </div>
</div>
```

### ルール

- ページタイトルは `text-3xl font-bold text-slate-900`
- 説明テキストは `mt-1 text-base text-body`
- アクションボタンは右寄せ
- ヘッダー下のマージンは `mb-8`

---

## セクション構成

ページ内のセクション区切り。

```html
<section class="mt-10">
  <h2 class="text-2xl font-semibold text-slate-900">セクションタイトル</h2>
  <p class="mt-1 text-base text-body">セクションの説明</p>
  <div class="mt-6">
    <!-- セクションコンテンツ -->
  </div>
</section>
```

### ルール

- セクション間マージン: `mt-10` 〜 `mt-14`
- セクション見出し: `text-2xl font-semibold text-slate-900`
- 見出しとコンテンツの間: `mt-6`

---

## コンテンツ幅

| パターン | Tailwindクラス | 用途 |
|---------|---------------|------|
| ナロー | `max-w-2xl` | フォームページ、設定画面 |
| ミディアム | `max-w-5xl` | 一般的なコンテンツページ |
| ワイド | `max-w-7xl` | ダッシュボード、テーブル |
| フル | `max-w-none` | 管理画面、特殊レイアウト |

共通: `mx-auto px-6 py-8` または `mx-auto px-8 py-12`

> melta のショーケース/ドキュメントサイト自体は `max-w-[1042px]`（DESIGN.md Quick Reference 参照）。
> どちらを使う場合も **1 サイト内では全ページ同一幅で揃える**こと。

---

## 禁止パターン

> `foundations/prohibited.md`「スペーシング・レイアウト」参照
