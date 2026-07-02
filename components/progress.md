# Progress

> リニアプログレスバーコンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **進捗の可視化**: 操作やプロセスの進行状況を視覚的に示す
- **4色対応**: Primary / Success / Warning / Error で意味を伝える
- **不確定対応**: 完了時間が不明な場合はアニメーションループで表現する
- **ラベル付き**: 進捗率のテキスト表示で正確な情報を補助する

---

## 2. 解剖

```
  アップロード中               65%
  ██████████████░░░░░░░░░░░░
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Track | 背景トラック。全体の範囲を示す | Yes |
| Fill | 進捗を示すフィルバー | Yes |
| Label | 上部のテキストラベル | No |
| Percentage | 進捗率の数値表示 | No |

---

## 3. パターン

### 3-1. カラー

| 種類 | フィル色 | 用途 |
|------|----------|------|
| Primary | `bg-primary-500` | デフォルト。一般的な進捗 |
| Success | `bg-emerald-600` | 完了・成功系の進捗 |
| Warning | `bg-amber-600` | 注意が必要な進捗 |
| Error | `bg-red-600` | エラー・危険レベルの進捗 |

### 3-2. バリエーション

| バリエーション | 説明 |
|----------------|------|
| 確定 | `style="width: N%"` で進捗値を指定 |
| 不確定 | CSS アニメーションでループ表示 |

---

## 4. 振る舞い

### Track

```
bg-slate-200 rounded-full h-2
```

### Fill

```
rounded-full h-2 transition-all
```

| プロパティ | 値 |
|-----------|------|
| 高さ | `h-2` (8px) |
| 角丸 | `rounded-full` |
| アニメーション | `transition-all`（値変更時のスムーズ遷移） |

### Label

```
text-sm font-medium text-slate-700
```

### 不確定アニメーション

```css
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
.progress-indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
  width: 25%;
}
```

Track に `overflow-hidden` を追加して、フィルバーがはみ出さないようにする。

---

## 5. アクセシビリティ

| 属性 | 値 |
|------|------|
| `role` | `"progressbar"` |
| `aria-valuenow` | 現在の進捗値（0-100）。不確定の場合は省略 |
| `aria-valuemin` | `"0"` |
| `aria-valuemax` | `"100"` |
| `aria-label` | 進捗の説明テキスト |
| 不確定 | `aria-valuenow` を省略して不確定状態を示す |

> 共通: prohibited.md「カラー」参照

---

## 6. Tailwind サンプル

### ラベル付き

```html
<div>
  <div class="flex justify-between items-center mb-1">
    <span class="text-sm font-medium text-slate-700">アップロード中</span>
    <span class="text-sm font-medium text-slate-700">65%</span>
  </div>
  <div class="bg-slate-200 rounded-full h-2" role="progressbar" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100" aria-label="アップロード進捗">
    <div class="bg-primary-500 rounded-full h-2 transition-all" style="width: 65%"></div>
  </div>
</div>
```

### 4色バリエーション

```html
<!-- Primary -->
<div class="bg-slate-200 rounded-full h-2" role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
  <div class="bg-primary-500 rounded-full h-2 transition-all" style="width: 75%"></div>
</div>
<!-- Success -->
<div class="bg-slate-200 rounded-full h-2" role="progressbar" aria-valuenow="90" aria-valuemin="0" aria-valuemax="100">
  <div class="bg-emerald-600 rounded-full h-2 transition-all" style="width: 90%"></div>
</div>
<!-- Warning -->
<div class="bg-slate-200 rounded-full h-2" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100">
  <div class="bg-amber-600 rounded-full h-2 transition-all" style="width: 45%"></div>
</div>
<!-- Error -->
<div class="bg-slate-200 rounded-full h-2" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100">
  <div class="bg-red-600 rounded-full h-2 transition-all" style="width: 20%"></div>
</div>
```

### 不確定

```html
<div class="bg-slate-200 rounded-full h-2 overflow-hidden" role="progressbar" aria-label="読み込み中">
  <div class="bg-primary-500 rounded-full h-2 progress-indeterminate"></div>
</div>
```
