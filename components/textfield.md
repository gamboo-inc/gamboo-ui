# テキストフィールド (TextField)

テキストフィールドコンポーネント仕様。Tailwind CSS 4

---

## 1. 原則

| # | 原則 | 説明 |
|---|------|------|
| 1 | ラベルを常に表示 | プレースホルダーだけに頼らない。入力後もラベルが見えることで、何を入力したか常に把握できる。 |
| 2 | エラーは即座に、具体的に | バリデーションエラーはフィールド直下に表示し、何が間違っているか・どう直すかを明示する。 |
| 3 | 適切な入力タイプ | `type` 属性を正しく設定し、モバイルで最適なキーボードを表示する（`email`, `tel`, `url` など）。 |
| 4 | 十分なタッチターゲット | 縦並び時は `py-2 text-base`（実高 52px）、横並び時は `h-11 leading-normal`（44px）でタップ領域を確保する。 |
| 5 | カーソルカラー | テキストカーソル（キャレット）に `caret-color: primary-500` を適用し、入力中にブランドの存在を静かに伝える。 |

---

## 2. 解剖

```
         ┌─ Label ──────────────────────────────┐
         │  タイトル *                            │
         └───────────────────────────────────────┘
         ┌─ Input Container ─────────────────────┐
         │ [Icon]  入力テキスト           [Icon]  │
         └───────────────────────────────────────┘
         ┌─ Helper / Error ──────────────────────┐
         │  ヘルパーテキストまたはエラーメッセージ │
         └───────────────────────────────────────┘
```

| パーツ | 要素 | 必須 | 説明 |
|--------|------|:----:|------|
| Label | `<label>` | Yes | 入力内容を説明するテキスト。`for` 属性で `input` と紐付ける。 |
| Required マーク | `<span>` | No | 必須フィールドに `*` を表示。`aria-required="true"` も付与。 |
| Input Container | `<div>` | Yes | ボーダー・背景・パディングを持つ外枠。 |
| Leading Icon | `<svg>` / `<span>` | No | 入力内容のヒントとなるアイコン（検索虫眼鏡など）。 |
| Input | `<input>` / `<textarea>` | Yes | 実際の入力フィールド。 |
| Trailing Icon | `<svg>` / `<button>` | No | クリア・パスワード表示切替などのインタラクティブアイコン。 |
| Helper Text | `<p>` | No | 入力のヒントや制約を伝える補足テキスト。 |
| Error Text | `<p>` | No | バリデーションエラーのメッセージ。`role="alert"` を付与。 |
| Character Counter | `<span>` | No | 文字数制限がある場合の現在値 / 上限表示。 |

---

## 3. パターン

### 3-1. 状態

| 状態 | ボーダー | 背景 | テキスト | 説明 |
|------|----------|------|----------|------|
| Default | `border-slate-300` | `bg-white` | `text-slate-900` | 初期状態 |
| Hover | `border-slate-400` | `bg-white` | `text-slate-900` | マウスオーバー時 |
| Focus | `border-primary-500` + `ring-2 ring-primary-500/50` | `bg-white` | `text-slate-900` | フォーカス時 |
| Error | `border-red-600` + `ring-2 ring-red-500/50` | `bg-white` | `text-slate-900` | バリデーションエラー時 |
| Disabled | `border-slate-200` | `bg-slate-50` | `text-slate-400` | 入力不可 |
| Read-only | `border-slate-200` | `bg-slate-50` | `text-slate-700` | 閲覧のみ |

### 3-2. バリエーション

| バリエーション | 説明 | 用途 |
|----------------|------|------|
| 基本テキスト | 単一行入力 | 名前・タイトル・URL など |
| パスワード | `type="password"` + 表示切替ボタン | ログイン・登録フォーム |
| テキストエリア | `<textarea>` 複数行入力 | 説明文・コメント・メモ |
| 検索 | `type="search"` + 虫眼鏡アイコン | 検索バー |
| プレフィックス付き | 左端に固定テキスト（`https://` など） | URL・通貨入力 |

### 3-3. サイズ

| サイズ | クラス | 高さ | 用途 |
|--------|--------|------|------|
| Small | `px-3 py-1.5 text-sm` | 32px | テーブル内・密なレイアウト |
| Medium | `px-3 py-2 text-base` | 52px | 標準フォーム（デフォルト） |
| Large | `px-4 py-3 text-lg` | 56px | ヒーロー検索・大きなフォーム |

> ※ `text-base` は `line-height: 2.0` のため、`py-2` との組み合わせで実高 52px になる。横並び（インラインフォーム）では `h-11 leading-normal`（44px）を使用すること（→ `patterns/form.md`）。

---

## 4. 振る舞い

### 4-1. バリデーション

| タイミング | 動作 | 備考 |
|------------|------|------|
| 送信時 | すべてのフィールドを検証し、エラーを表示 | 最初のエラーフィールドにフォーカスを移動 |
| フォーカスアウト時 | 入力済みフィールドを検証 | 未入力のまま離れた場合は検証しない（送信時に検証） |
| 入力中 | エラー表示中のフィールドはリアルタイムで再検証 | エラーが解消したら即座にエラー表示を消す |

### 4-2. 文字数カウンター

- 上限が設定されている場合、入力欄の右下に `{現在の文字数} / {上限}` を表示
- 残り 10% 以下で `text-amber-600` に変化
- 上限超過で `text-red-600` に変化し、エラー状態にする
- JS による文字数カウントの実装が必要

### 4-3. パスワード表示切替

- 目のアイコンをクリックで `type="password"` と `type="text"` を切り替え
- `aria-label` を「パスワードを表示」/「パスワードを隠す」で切り替え
- JS による type 属性の切り替え実装が必要

### 4-4. オートコンプリート

- ブラウザのオートコンプリートを活用するため、`autocomplete` 属性を適切に設定する
- `autocomplete="name"`, `autocomplete="email"`, `autocomplete="current-password"` など

---

## 5. アクセシビリティ

| 項目 | 要件 |
|------|------|
| Label 紐付け | `<label for="id">` と `<input id="id">` を一致させる |
| Required | 必須フィールドに `aria-required="true"` を付与。視覚的に `*` も表示 |
| Error 紐付け | エラーテキストに `id` を付け、入力に `aria-describedby` で紐付ける |
| Error 通知 | エラーテキストに `role="alert"` を付与し、スクリーンリーダーに即座に読み上げさせる |
| aria-invalid | エラー状態の入力に `aria-invalid="true"` を付与 |
| Helper 紐付け | ヘルパーテキストも `aria-describedby` で紐付ける（エラーと共存時はスペース区切りで複数 ID） |
| Disabled | `disabled` 属性を使用。`aria-disabled` ではなく HTML ネイティブの `disabled` を推奨 |
| コントラスト | ラベル・入力テキスト・エラーテキストすべて WCAG AA (4.5:1) を満たす |

> 共通: prohibited.md「フォーム」参照

---

## 6. Tailwind サンプル

### 6-1. 基本

```html
<div>
  <label for="field-title" class="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
  <input
    type="text"
    id="field-title"
    name="title"
    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900
           placeholder:text-slate-500
           hover:border-slate-400
           focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none
           caret-primary-500 transition-colors"
    placeholder="タイトルを入力" />
</div>
```

### 6-2. 必須

```html
<div>
  <label for="field-name" class="block text-sm font-medium text-slate-700 mb-1">
    名前
    <span class="text-red-600 ml-0.5">*</span>
  </label>
  <input
    type="text"
    id="field-name"
    name="name"
    required
    aria-required="true"
    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900
           placeholder:text-slate-500
           hover:border-slate-400
           focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none
           caret-primary-500 transition-colors"
    placeholder="名前を入力" />
  <p class="mt-1 text-xs text-slate-500">表示名として使用されます</p>
</div>
```

### 6-3. エラー

```html
<div>
  <label for="field-email" class="block text-sm font-medium text-slate-700 mb-1">
    メールアドレス
    <span class="text-red-600 ml-0.5">*</span>
  </label>
  <input
    type="email"
    id="field-email"
    name="email"
    required
    aria-required="true"
    aria-invalid="true"
    aria-describedby="field-email-error"
    class="w-full rounded-lg border border-red-600 px-3 py-2 text-base text-slate-900
           placeholder:text-slate-500
           focus:ring-2 focus:ring-red-600/50 outline-none
           transition-colors"
    value="invalid-email" />
  <p id="field-email-error" role="alert" class="mt-1 text-xs text-red-600 flex items-center gap-1">
    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    有効なメールアドレスを入力してください
  </p>
</div>
```

### 6-4. パスワード

```html
<div>
  <label for="field-password" class="block text-sm font-medium text-slate-700 mb-1">パスワード</label>
  <div class="relative">
    <input
      type="password"
      id="field-password"
      name="password"
      autocomplete="current-password"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-base text-slate-900
             placeholder:text-slate-500
             hover:border-slate-400
             focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none
             transition-colors caret-primary-500"
      placeholder="パスワードを入力" />
    <!-- 表示切替ボタン（JS で type 属性を password/text に切り替える） -->
    <button
      type="button"
      aria-label="パスワードを表示"
      class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-body transition-colors">
      <!-- Eye icon（非表示状態） -->
      <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    </button>
  </div>
</div>
```

### 6-5. テキストエリア

```html
<div>
  <label for="field-description" class="block text-sm font-medium text-slate-700 mb-1">説明</label>
  <textarea
    id="field-description"
    name="description"
    rows="4"
    maxlength="500"
    aria-describedby="field-description-counter"
    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900
           placeholder:text-slate-500
           hover:border-slate-400
           focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none
           transition-colors resize-y"
    placeholder="説明を入力"></textarea>
  <!-- 文字数カウンター（JS で現在の文字数を更新する） -->
  <div class="flex justify-end mt-1">
    <span id="field-description-counter" class="text-xs text-slate-500">
      <span>0</span> / 500
    </span>
  </div>
</div>
```

### 6-6. 無効（Disabled）

```html
<div>
  <label for="field-disabled" class="block text-sm font-medium text-slate-400 mb-1">ステータス</label>
  <input
    type="text"
    id="field-disabled"
    name="status"
    disabled
    value="処理中"
    class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400
           cursor-not-allowed" />
</div>
```
