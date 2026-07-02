# Select / Dropdown

> セレクトコンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **選択肢が多い場合の第一選択**: 選択肢が5つ以上の場合はセレクトを使用する。4つ以下ならRadio Buttonを検討する
- **ネイティブ要素を優先**: 特別なUIが不要であれば `<select>` を使用し、OSネイティブの操作性を活用する
- **プレースホルダーで用途を示す**: 初期状態は「選択してください」等のプレースホルダーで、何を選ぶかを明示する
- **確定操作が必要**: 選択後にフォーム送信で確定する。即時反映が必要な場合はフィルターUIとして明示する

---

## 2. 解剖

```
         +-- Label -----------------------------------+
         |  カテゴリ *                                 |
         +--------------------------------------------+
         +-- Select Container ------------------------+
         | [Icon]  選択されたテキスト          [v]     |
         +--------------------------------------------+
         +-- Helper / Error --------------------------+
         |  ヘルパーテキストまたはエラーメッセージ      |
         +--------------------------------------------+
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Label | 選択内容を説明するテキスト。`<label>` で `select` と紐付ける | Yes |
| Required マーク | 必須フィールドに `*` を表示 | No |
| Select Container | ボーダー・背景・パディングを持つ外枠 | Yes |
| Leading Icon | 選択内容のカテゴリを示すアイコン | No |
| Selected Value | 現在選択されている値のテキスト表示 | Yes |
| Chevron | ドロップダウンの開閉を示す矢印アイコン | Yes |
| Option List | 選択肢の一覧（ネイティブ or カスタム） | Yes |
| Option | 個々の選択肢 | Yes |
| Option Group | 選択肢のグループ見出し（`<optgroup>`） | No |
| Helper Text | 補足説明や注意事項 | No |
| Error Text | バリデーションエラーの説明 | 条件付き |

---

## 3. パターン

### 3-1. 状態

| 状態 | ボーダー | 背景 | テキスト | 説明 |
|------|----------|------|----------|------|
| Default | `border-slate-300` | `bg-white` | `text-slate-900` | 初期状態 |
| Hover | `border-slate-400` | `bg-white` | `text-slate-900` | マウスオーバー時 |
| Focus | `border-primary-500` + `ring-2 ring-primary-500/50` | `bg-white` | `text-slate-900` | フォーカス時 |
| Error | `border-red-600` + `ring-2 ring-red-500/50` | `bg-white` | `text-slate-900` | バリデーションエラー時 |
| Disabled | `border-slate-200` | `bg-slate-50` | `text-slate-400` | 選択不可 |

### 3-2. バリエーション

| バリエーション | 説明 | 用途 |
|----------------|------|------|
| ネイティブセレクト | `<select>` 要素を使用 | 標準フォーム（推奨） |
| プレフィックスアイコン付き | 左端にアイコンを配置 | カテゴリ選択・国選択 |
| グループ付き | `<optgroup>` で選択肢をグループ化 | 大量の選択肢 |

### 3-3. サイズ

| サイズ | クラス | 高さ | 用途 |
|--------|--------|------|------|
| Small | `px-3 py-1.5 text-sm` | 32px | テーブル内・密なレイアウト |
| Medium | `px-3 py-2 text-base` | 52px | 標準フォーム（デフォルト） |
| Large | `px-4 py-3 text-lg` | 56px | 大きなフォーム |

> ※ `text-base` は `line-height: 2.0` のため、`py-2` との組み合わせで実高 52px になる。横並び（インラインフォーム）では `h-11 leading-normal`（44px）を使用する。いずれのサイズでも `appearance-none` + `pr-10` + カスタムSVGシェブロンは必須（ネイティブ矢印はブラウザ間で位置・余白が不安定なため）。→ `patterns/form.md`、本ファイル §6 参照。

---

## 4. 振る舞い

### 4-1. 開閉

| トリガー | 動作 |
|----------|------|
| クリック | ドロップダウンを開閉する |
| Space / Enter | フォーカス時にドロップダウンを開く |
| Escape | ドロップダウンを閉じる |
| 選択肢クリック | 値を確定しドロップダウンを閉じる |
| 外部クリック | ドロップダウンを閉じる（値は変更しない） |

### 4-2. キーボードナビゲーション

- `Arrow Down` / `Arrow Up`: 選択肢間を移動
- `Home` / `End`: 最初/最後の選択肢に移動
- 文字キー: 先頭一致で選択肢にジャンプ（ネイティブ select の標準動作）

### 4-3. バリデーション

| タイミング | 動作 |
|------------|------|
| 送信時 | 必須フィールドが未選択の場合エラーを表示 |
| フォーカスアウト時 | 必須で未選択の場合にエラーを表示 |

### 4-4. 選択肢が多い場合

- 選択肢が20を超える場合は検索機能付きのカスタムセレクトを検討する
- ネイティブ `<select>` でも `<optgroup>` でグループ化して探しやすくする

---

## 5. アクセシビリティ

| 項目 | 要件 |
|------|------|
| Label 紐付け | `<label for="id">` と `<select id="id">` を一致させる |
| Required | 必須フィールドに `aria-required="true"` を付与。視覚的に `*` も表示 |
| Error 紐付け | エラーテキストに `id` を付け、`aria-describedby` で紐付ける |
| Error 通知 | エラーテキストに `role="alert"` を付与 |
| aria-invalid | エラー状態のセレクトに `aria-invalid="true"` を付与 |
| Disabled | `disabled` 属性を使用 |
| コントラスト | ラベル・選択テキストは WCAG AA (4.5:1) を満たす |
| キーボード操作 | Tab でフォーカス、Space/Enter で開閉、矢印キーで選択肢移動 |

### 禁止事項

> 共通: `foundations/prohibited.md`「フォーム」参照

- ラベルなしのセレクト
- `<option>` の `value=""` をプレースホルダーとして使い、送信可能にすること
- 選択変更だけでページ遷移やフォーム送信を行うこと（確定ボタンが必要）

---

## 6. Tailwind サンプル

> primary カラーの具体値は `foundations/theme.md` を参照。

### 6-1. 基本

```html
<div>
  <label for="select-category" class="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
  <div class="relative">
    <select
      id="select-category"
      name="category"
      class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-base text-slate-900
             hover:border-slate-400
             focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none
             transition-colors">
      <option value="" disabled selected>選択してください</option>
      <option value="design">デザイン</option>
      <option value="development">開発</option>
      <option value="marketing">マーケティング</option>
    </select>
    <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </div>
</div>
```

### 6-2. 必須 + ヘルパーテキスト

```html
<div>
  <label for="select-role" class="block text-sm font-medium text-slate-700 mb-1">
    役割
    <span class="text-red-600 ml-0.5">*</span>
  </label>
  <div class="relative">
    <select
      id="select-role"
      name="role"
      required
      aria-required="true"
      aria-describedby="select-role-helper"
      class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-base text-slate-900
             hover:border-slate-400
             focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none
             transition-colors">
      <option value="" disabled selected>選択してください</option>
      <option value="admin">管理者</option>
      <option value="editor">編集者</option>
      <option value="viewer">閲覧者</option>
    </select>
    <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </div>
  <p id="select-role-helper" class="mt-1 text-xs text-slate-500">プロジェクト内での権限を決定します</p>
</div>
```

### 6-3. エラー状態

```html
<div>
  <label for="select-priority" class="block text-sm font-medium text-slate-700 mb-1">
    優先度
    <span class="text-red-600 ml-0.5">*</span>
  </label>
  <div class="relative">
    <select
      id="select-priority"
      name="priority"
      required
      aria-required="true"
      aria-invalid="true"
      aria-describedby="select-priority-error"
      class="w-full appearance-none rounded-lg border border-red-600 bg-white px-3 py-2 pr-10 text-base text-slate-900
             focus:ring-2 focus:ring-red-600/50 outline-none
             transition-colors">
      <option value="" disabled selected>選択してください</option>
      <option value="high">高</option>
      <option value="medium">中</option>
      <option value="low">低</option>
    </select>
    <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </div>
  <p id="select-priority-error" role="alert" class="mt-1 text-xs text-red-600 flex items-center gap-1">
    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    優先度を選択してください
  </p>
</div>
```

### 6-4. グループ付き

```html
<div>
  <label for="select-region" class="block text-sm font-medium text-slate-700 mb-1">地域</label>
  <div class="relative">
    <select
      id="select-region"
      name="region"
      class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-base text-slate-900
             hover:border-slate-400
             focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none
             transition-colors">
      <option value="" disabled selected>選択してください</option>
      <optgroup label="関東">
        <option value="tokyo">東京</option>
        <option value="kanagawa">神奈川</option>
        <option value="chiba">千葉</option>
      </optgroup>
      <optgroup label="関西">
        <option value="osaka">大阪</option>
        <option value="kyoto">京都</option>
        <option value="hyogo">兵庫</option>
      </optgroup>
    </select>
    <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </div>
</div>
```

### 6-5. 無効（Disabled）

```html
<div>
  <label for="select-disabled" class="block text-sm font-medium text-slate-400 mb-1">ステータス</label>
  <div class="relative">
    <select
      id="select-disabled"
      name="status"
      disabled
      class="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-base text-slate-400
             cursor-not-allowed">
      <option value="active" selected>アクティブ</option>
    </select>
    <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </div>
</div>
```
