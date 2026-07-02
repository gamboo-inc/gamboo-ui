# Radio Button

> ラジオボタンコンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **排他的な単一選択**: 選択肢群から1つだけを選ぶ場合に使用する。複数選択にはCheckboxを使う
- **選択肢は2〜5つ**: 選択肢が多すぎる場合はSelect / Dropdownを使用する
- **全選択肢を同時に表示**: ユーザーが全選択肢を比較して選べるよう、常にすべてを表示する
- **確定操作が必要**: 選択の切り替えだけでは確定しない。送信/確認ボタンの押下で反映される
- **デフォルト選択を設ける**: 原則として1つの選択肢を初期選択状態にする。未選択状態で始めるのは特別な理由がある場合のみ

---

## 2. 解剖

```
  ( )  Label Text
   ^      ^
  Radio  Label
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Radio Circle | 選択状態を視覚的に示す円形エリア | Yes |
| Selected Indicator | 選択済みを示す内側の塗りつぶし（●） | 選択時 |
| Label | 選択肢の内容を説明するテキスト | Yes |
| Group Label | ラジオボタン群全体の見出し（`<legend>`） | Yes |
| Description | 選択肢の補足説明 | No |
| Helper Text | グループ全体の補足説明 | No |
| Error Text | バリデーションエラーの説明 | 条件付き |

---

## 3. パターン

### 基本（縦並び）

最も標準的な配置。選択肢を縦に並べる。

```
  お支払い方法
  (●) クレジットカード
  ( ) 銀行振込
  ( ) コンビニ払い
```

### 横並び

選択肢が2〜3つで短いラベルの場合に使用。

```
  性別
  (●) 男性    ( ) 女性    ( ) その他
```

### 説明付き

各選択肢に補足説明を追加。プランの選択等に使用。

```
  プラン
  (●) フリー
      基本機能のみ。無料でご利用いただけます
  ( ) プロ
      全機能が利用可能。月額 ¥980
  ( ) エンタープライズ
      カスタマイズ対応。お問い合わせください
```

### エラー状態

必須グループが未選択のまま送信した場合。

```
  お支払い方法        ← legend
  ( ) クレジットカード  ← border が赤に
  ( ) 銀行振込
  ( ) コンビニ払い
  x お支払い方法を選択してください
```

### Disabled 状態

条件が整うまで操作不可。

```
  ( ) クレジットカード（現在利用不可）  ← opacity-50
```

---

## 4. 振る舞い

### 状態遷移

```
Unselected → Selected（クリック / Space キー）
Selected → （同グループの別選択肢を選ぶまで Selected を維持）
```

- ラジオボタンは一度選択すると、同グループ内で別の選択肢を選ばない限り解除できない
- Checkbox と異なり、クリックで選択解除はできない

### キーボード操作

| キー | 動作 |
|------|------|
| Tab | グループにフォーカスを移動（選択済みの項目、またはグループの最初の項目） |
| Arrow Down / Arrow Right | 次の選択肢に移動して選択 |
| Arrow Up / Arrow Left | 前の選択肢に移動して選択 |
| Space | 現在フォーカス中の選択肢を選択 |

### グループの振る舞い

- 同一 `name` 属性のラジオボタンは1つのグループとして動作する
- グループ内で1つだけが選択可能
- レイアウトは選択肢の数と文字数に合わせる（縦並び推奨、3つ以下で短ければ横並びも可）

---

## 5. アクセシビリティ

### 必須事項

- `<fieldset>` + `<legend>` でグループを構成する
- `<label>` を各ラジオボタンに関連付ける（`for` 属性 or ラッピング）
- キーボード操作: Tab でグループにフォーカス、矢印キーで選択肢間を移動
- テキストのコントラスト比 4.5:1 以上
- Radio Circle のコントラスト比（ボーダー/背景間）3:1 以上
- テキスト200%拡大時にクリッピングしない
- Disabled 状態はキーボードからも操作不可にする
- エラー時は色だけでなくテキストとアイコンを併用する
- エラーメッセージを `aria-describedby` で `<fieldset>` に関連付ける

### 禁止事項

> 共通: `foundations/prohibited.md`「フォーム」「カラー」参照

- 単一のラジオボタンの使用（2つ以上の選択肢が必要。ON/OFF は Checkbox か Toggle Switch を使う）

---

## 6. Tailwind サンプル

> primary カラーの具体値は `foundations/theme.md` を参照。

> **行間の注意**: `body { line-height: 2.0 }` 環境では、ラベル + 説明テキストを含む `<div>` に `leading-normal` を付与して行間をリセットすること。詳細は `foundations/typography.md` 参照。

### 基本（縦並び）

```html
<fieldset>
  <legend class="text-sm font-medium text-slate-700 mb-3">お支払い方法</legend>
  <div class="flex flex-col gap-4">
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="payment" value="credit" checked
        class="text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">クレジットカード</span>
    </label>
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="payment" value="bank"
        class="text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">銀行振込</span>
    </label>
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="payment" value="convenience"
        class="text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">コンビニ払い</span>
    </label>
  </div>
</fieldset>
```

### 横並び

```html
<fieldset>
  <legend class="text-sm font-medium text-slate-700 mb-3">性別</legend>
  <div class="flex flex-wrap gap-6">
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input type="radio" name="gender" value="male" checked
        class="text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">男性</span>
    </label>
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input type="radio" name="gender" value="female"
        class="text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">女性</span>
    </label>
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input type="radio" name="gender" value="other"
        class="text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">その他</span>
    </label>
  </div>
</fieldset>
```

### 説明付き（カードスタイル）

```html
<fieldset>
  <legend class="text-sm font-medium text-slate-700 mb-3">プラン</legend>
  <div class="space-y-3">
    <label class="flex items-start gap-3 cursor-pointer p-4 border border-slate-200 rounded-lg hover:bg-gray-50 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-colors">
      <input type="radio" name="plan" value="free" checked
        class="mt-[3px] text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50 flex-shrink-0">
      <div class="leading-normal">
        <span class="text-sm font-medium text-slate-900">フリー</span>
        <p class="text-sm text-body mt-0.5">基本機能のみ。無料でご利用いただけます</p>
      </div>
    </label>
    <label class="flex items-start gap-3 cursor-pointer p-4 border border-slate-200 rounded-lg hover:bg-gray-50 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-colors">
      <input type="radio" name="plan" value="pro"
        class="mt-[3px] text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50 flex-shrink-0">
      <div class="leading-normal">
        <span class="text-sm font-medium text-slate-900">プロ</span>
        <p class="text-sm text-body mt-0.5">全機能が利用可能。月額 &yen;980</p>
      </div>
    </label>
    <label class="flex items-start gap-3 cursor-pointer p-4 border border-slate-200 rounded-lg hover:bg-gray-50 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-colors">
      <input type="radio" name="plan" value="enterprise"
        class="mt-[3px] text-primary-500 border-slate-300 focus:ring-2 focus:ring-primary-500/50 flex-shrink-0">
      <div class="leading-normal">
        <span class="text-sm font-medium text-slate-900">エンタープライズ</span>
        <p class="text-sm text-body mt-0.5">カスタマイズ対応。お問い合わせください</p>
      </div>
    </label>
  </div>
</fieldset>
```

### エラー状態

```html
<fieldset aria-describedby="payment-error">
  <legend class="text-sm font-medium text-slate-700 mb-3">
    お支払い方法
    <span class="text-red-600 ml-0.5">*</span>
  </legend>
  <div class="flex flex-col gap-4">
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="payment_err" value="credit"
        aria-invalid="true"
        class="text-primary-500 border-red-600 focus:ring-2 focus:ring-red-600/50">
      <span class="text-sm text-slate-700">クレジットカード</span>
    </label>
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="payment_err" value="bank"
        aria-invalid="true"
        class="text-primary-500 border-red-600 focus:ring-2 focus:ring-red-600/50">
      <span class="text-sm text-slate-700">銀行振込</span>
    </label>
  </div>
  <p id="payment-error" role="alert" class="mt-1 text-xs text-red-600 flex items-center gap-1">
    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    お支払い方法を選択してください
  </p>
</fieldset>
```

### Disabled

```html
<fieldset>
  <legend class="text-sm font-medium text-slate-700 mb-3">プラン（確定済み）</legend>
  <div class="flex flex-col gap-4">
    <label class="flex items-center gap-2 cursor-not-allowed">
      <input type="radio" name="plan_dis" value="pro" checked disabled
        class="text-primary-500 border-slate-300 opacity-50 cursor-not-allowed">
      <span class="text-sm text-slate-400">プロ（変更不可）</span>
    </label>
    <label class="flex items-center gap-2 cursor-not-allowed">
      <input type="radio" name="plan_dis" value="enterprise" disabled
        class="text-primary-500 border-slate-300 opacity-50 cursor-not-allowed">
      <span class="text-sm text-slate-400">エンタープライズ（変更不可）</span>
    </label>
  </div>
</fieldset>
```

---

## 7. カスタムCSS（必須）

ブラウザデフォルトのチェックボックス・ラジオボタンのスタイルを完全にリセットし、デザインシステム準拠の見た目を実現するため、以下のCSSをプロジェクトのスタイルシートに含めること。

```css
/* Radio Button カスタムスタイル */
input[type="radio"] {
  -webkit-appearance: none;
  appearance: none;
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid #cbd5e1;
  border-radius: 9999px;
  background-color: #fff;
  outline: none !important;
  box-shadow: none !important;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
}

input[type="radio"]:checked {
  border-color: #2b70ef;       /* primary-500 */
  border-width: 2px;
  background-color: #fff;
}

input[type="radio"]:checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: #2b70ef;   /* primary-500 */
}

input[type="radio"]:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
}

input[type="radio"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* エラー状態 */
input[type="radio"][aria-invalid="true"] {
  border-color: #ef4444;
}

input[type="radio"][aria-invalid="true"]:focus {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3) !important;
}

input[type="radio"][aria-invalid="true"]:checked {
  border-color: #ef4444;
}

input[type="radio"][aria-invalid="true"]:checked::after {
  background-color: #ef4444;   /* エラー時は内側ドットも赤 */
}
```

> **注意**: `appearance: none` によりブラウザデフォルトを完全にリセットしている。選択状態の表示（ボーダー色変更 + 内側ドット）はすべてCSSで制御される。
