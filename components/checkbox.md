# Checkbox

> チェックボックスコンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **複数選択のための入力**: 選択肢群から複数を選ぶ場合、または単一のON/OFFトグルに使用する
- **確定操作が必要**: チェックの切り替えだけでは確定しない。送信/確認ボタンの押下で反映される
- **即時反映にはToggle Switchを使う**: 操作と同時に設定が反映されるケースにはCheckboxではなくToggle Switchを使用する
- **選択肢が多すぎる場合は別コンポーネント**: 選択肢が多数、または動的に増減する場合はDropDownを検討する

---

## 2. 解剖

```
  ┌──┐
  │✓ │  Label Text
  └──┘
  ↑      ↑
  Box    Label
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Box | チェック状態を視覚的に示す矩形エリア | Yes |
| Checkmark | 選択済みを示すアイコン（✓） | 選択時 |
| Indeterminate Mark | 一部選択を示すアイコン（−）。親子関係がある場合 | 条件付き |
| Label | 選択肢の内容を説明するテキスト | Yes |
| Group Label | チェックボックス群全体の見出し | グループ時 |
| Helper Text | 補足説明や注意事項 | No |
| Error Text | バリデーションエラーの説明 | 条件付き |

---

## 3. パターン

### 単一チェックボックス
利用規約への同意、メール通知の購読設定等。ON/OFFの2値切り替え。

```
  [✓] メールで通知を受け取る
```

### 複数チェックボックス（グループ）
複数の選択肢から任意の数を選択。

```
  通知設定
  [✓] メール通知
  [✓] プッシュ通知
  [ ] SMS通知
```

### 不確定状態（Indeterminate）
親子関係がある場合。子の一部のみ選択時に親が不確定状態になる。

```
  [−] すべて選択
    [✓] オプションA
    [ ] オプションB
    [✓] オプションC
```

### エラー状態
必須チェックが未選択のまま送信した場合。

```
  [  ] 利用規約に同意する  ← border-red
  ✕ 利用規約への同意が必要です
```

### Disabled状態
条件が整うまで操作不可。

```
  [✓] メール通知（変更不可）  ← opacity-50
```

---

## 4. 振る舞い

### 状態遷移

```
Unchecked → Checked（クリック/スペースキー）
Checked → Unchecked（クリック/スペースキー）
Unchecked/Checked → Indeterminate（子チェックボックスの状態により自動遷移）
Indeterminate → Checked（クリックで全選択）
Checked → Unchecked（クリックで全解除）
```

### 確定タイミング
- チェックの切り替え自体は即座に視覚反映
- 実際のデータ反映は送信ボタン押下時
- 即時反映が必要な場合はToggle Switchを使用する

### グループの振る舞い
- 選択肢が多い場合はDropDownへの切り替えを検討
- レイアウトは選択肢の数とコンテキストに合わせる（縦並び推奨）

---

## 5. アクセシビリティ

### 必須事項
- `<label>` を各チェックボックスに関連付ける（`for` 属性 or ラッピング）
- グループには `<fieldset>` + `<legend>` を使用する
- キーボード操作: Tab でフォーカス移動、Space で切り替え
- Indeterminate状態は `aria-checked="mixed"` で示す
- テキストのコントラスト比 4.5:1 以上
- Boxのコントラスト比（ボーダー/背景間）3:1 以上
- テキスト200%拡大時にクリッピングしない
- Disabled状態はキーボードからも操作不可にする
- エラー時は色だけでなくテキストとアイコンを併用する
- エラーメッセージを `aria-describedby` で関連付ける

### 禁止事項

> `foundations/prohibited.md`「フォーム」「カラー」参照

---

## 6. Tailwind サンプル

> primary カラーの具体値は `foundations/theme.md` を参照。

> **行間の注意**: `body { line-height: 2.0 }` 環境では、チェックボックスグループの包含 `<div>` に `leading-normal` を付与して行間をリセットすること。詳細は `foundations/typography.md` 参照。

### 単一チェックボックス

```html
<label class="inline-flex items-center gap-3 cursor-pointer">
  <input type="checkbox" name="agree"
    class="text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500/50">
  <span class="text-sm text-slate-700">利用規約に同意する</span>
</label>
```

### 複数チェックボックス（グループ）

```html
<fieldset>
  <legend class="text-sm font-medium text-slate-700 mb-3">通知設定</legend>
  <div class="space-y-3 leading-normal">
    <label class="inline-flex items-center gap-3 cursor-pointer">
      <input type="checkbox" name="notifications[]" value="email"
        class="text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">メール通知</span>
    </label>
    <label class="inline-flex items-center gap-3 cursor-pointer">
      <input type="checkbox" name="notifications[]" value="push"
        class="text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">プッシュ通知</span>
    </label>
    <label class="inline-flex items-center gap-3 cursor-pointer">
      <input type="checkbox" name="notifications[]" value="sms"
        class="text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500/50">
      <span class="text-sm text-slate-700">SMS通知</span>
    </label>
  </div>
</fieldset>
```

### エラー状態

```html
<div>
  <label class="inline-flex items-center gap-3 cursor-pointer">
    <input type="checkbox" name="agree"
      aria-invalid="true"
      aria-describedby="agree_error"
      class="text-primary-500 border-red-600 rounded focus:ring-2 focus:ring-red-600/50">
    <span class="text-sm text-slate-700">利用規約に同意する</span>
  </label>
  <p id="agree_error" class="mt-1 ml-7 text-xs text-red-600 flex items-center gap-1">
    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    利用規約への同意が必要です
  </p>
</div>
```

### Disabled

```html
<label class="inline-flex items-center gap-3 cursor-not-allowed">
  <input type="checkbox" name="locked" checked disabled
    class="text-primary-500 border-slate-300 rounded opacity-50 cursor-not-allowed">
  <span class="text-sm text-slate-400">メール通知（変更不可）</span>
</label>
```
