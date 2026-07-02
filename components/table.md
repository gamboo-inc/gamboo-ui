# Table

> テーブルコンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **テーブルは構造化データの表示に使用する**: レイアウト目的では使用しない。行と列の関係性が意味を持つデータに限定する
- **ヘッダーは必須**: 各列のデータが何を示すかを明確にし、スクリーンリーダーでも列の意味を伝達する
- **行のホバー状態でインタラクティブ性を示す**: `hover:bg-gray-50` で現在の行を視覚的にハイライトする
- **レスポンシブ**: 狭い画面では横スクロールまたはカード表示への切り替えを検討する

---

## 2. 解剖

```
┌──────────────────────────────────────────────┐
│  名前          ステータス       作成日        │  ← Header
├──────────────────────────────────────────────┤
│  アイテムA      完了           2026-01-15    │  ← Row
├──────────────────────────────────────────────┤
│  アイテムB      進行中         2026-01-20    │  ← Row
└──────────────────────────────────────────────┘
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Container | テーブルの外枠。ボーダーとラウンドで境界を示す | Yes |
| Header Row | 列名を表示する行。データの意味を定義する | Yes |
| Data Rows | データを表示する行 | Yes |
| Cell | 個々のデータを格納するセル | Yes |
| Sort Indicator | ソート方向を示す矢印アイコン | No |
| Pagination | 行数が多い場合のページ送り | No |

---

## 3. パターン

### 基本テーブル
ヘッダー + データ行のシンプルな構成。情報の一覧表示に使用。

### バッジ付きテーブル
ステータス列にバッジコンポーネントを使用。状態を視覚的に識別しやすくする。

### アクション付きテーブル
行末にアクションボタン（編集・削除等）を配置。データの操作を行う場合に使用。

### ソート可能テーブル
ヘッダークリックで昇順/降順を切り替える。大量データの中から目的の項目を見つけやすくする。

---

## 4. 振る舞い

### 状態遷移

| 状態 | 視覚変化 | 備考 |
|------|---------|------|
| Default | 標準表示 | 初期状態 |
| Row Hover | 行の背景色が変化 | `hover:bg-gray-50` |
| Row Selected | 背景色 + ボーダー強調 | 選択可能テーブルの場合 |

### ソート
- ヘッダークリックで昇順 → 降順 → ソートなしの順に切り替え
- 現在のソート方向を矢印アイコンで表示する
- `aria-sort` 属性でスクリーンリーダーにソート状態を伝達する

### ページネーション
- 行数が多い場合はテーブル下部にページネーションを配置する
- 1ページあたりの表示件数は 10 / 25 / 50 を選択可能にする

### 空状態
- データがない場合は `colspan` を使用してメッセージを表示する

---

## 5. アクセシビリティ

### 必須事項
- `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` の正しいセマンティクスを使用する
- `<th>` には `scope="col"` を付与する
- ソート可能な列は `aria-sort` を使用してソート状態を伝達する
- レイアウト目的でテーブルを使わない
- 行のアクションボタンにはキーボードでアクセス可能にする

### 禁止事項

> 共通: `foundations/prohibited.md`「テーブル」参照

- `<div>` でテーブルを模倣すること（データテーブルには `<table>` を使用する）

---

## 6. Tailwind サンプル

### 基本テーブル

```html
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-slate-200 bg-gray-50">
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">名前</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">ステータス</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">作成日</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムA</td>
        <td class="py-3 px-4 text-body">完了</td>
        <td class="py-3 px-4 text-body">2026-01-15</td>
      </tr>
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムB</td>
        <td class="py-3 px-4 text-body">進行中</td>
        <td class="py-3 px-4 text-body">2026-01-20</td>
      </tr>
    </tbody>
  </table>
</div>
```

### バッジ付きテーブル

```html
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-slate-200 bg-gray-50">
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">名前</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">ステータス</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">作成日</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムA</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">完了</span>
        </td>
        <td class="py-3 px-4 text-body">2026-01-15</td>
      </tr>
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムB</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">進行中</span>
        </td>
        <td class="py-3 px-4 text-body">2026-01-20</td>
      </tr>
    </tbody>
  </table>
</div>
```

### アクション付きテーブル

```html
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-slate-200 bg-gray-50">
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">名前</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">ステータス</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">作成日</th>
        <th scope="col" class="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">アクション</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムA</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">完了</span>
        </td>
        <td class="py-3 px-4 text-body">2026-01-15</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button aria-label="アイテムAを編集" class="p-1 text-slate-500 hover:text-body transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button aria-label="アイテムAを削除" class="p-1 text-slate-500 hover:text-red-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムB</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">進行中</span>
        </td>
        <td class="py-3 px-4 text-body">2026-01-20</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button aria-label="アイテムBを編集" class="p-1 text-slate-500 hover:text-body transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button aria-label="アイテムBを削除" class="p-1 text-slate-500 hover:text-red-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### ソート可能テーブル

```html
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-slate-200 bg-gray-50">
        <th scope="col" aria-sort="ascending" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
          <div class="flex items-center gap-1">
            名前
            <!-- 昇順アイコン -->
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
            </svg>
          </div>
        </th>
        <th scope="col" aria-sort="none" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
          <div class="flex items-center gap-1">
            ステータス
            <!-- ソート未適用: アイコン非表示またはニュートラル -->
            <svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </div>
        </th>
        <th scope="col" aria-sort="none" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none">
          <div class="flex items-center gap-1">
            作成日
            <svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </div>
        </th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムA</td>
        <td class="py-3 px-4 text-body">完了</td>
        <td class="py-3 px-4 text-body">2026-01-15</td>
      </tr>
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4 text-slate-900">アイテムB</td>
        <td class="py-3 px-4 text-body">進行中</td>
        <td class="py-3 px-4 text-body">2026-01-20</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 空状態

```html
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-slate-200 bg-gray-50">
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">名前</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">ステータス</th>
        <th scope="col" class="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">作成日</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="3" class="py-16 text-center text-base text-slate-500">データがありません</td>
      </tr>
    </tbody>
  </table>
</div>
```

### レスポンシブラッパー（横スクロール）

```html
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm min-w-[640px]">
      <!-- thead / tbody -->
    </table>
  </div>
</div>
```
