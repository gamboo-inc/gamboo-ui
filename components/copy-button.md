# Copy Button

> クリップボードコピー + アイコン切替アニメーション付きボタン。
> Tailwind CSS 4

---

## 1. 原則

- **即時フィードバック**: コピー成功をアイコン切替で即座に伝える。トーストを出す必要がない軽量なフィードバック
- **バネ感**: `cubic-bezier(0.175, 0.885, 0.32, 1.275)` によるオーバーシュートで「ポンッ」とした物理的な手応えを演出する
- **自動復帰**: 2秒後にデフォルト状態に戻る。ユーザーの追加操作は不要
- **アイコンのみ**: ラベルなしのアイコンボタンとして使用。`aria-label` 必須

---

## 2. 解剖

```
┌─────────────────────────┐
│                         │
│     [Copy Icon]         │  ← デフォルト状態
│     [Check Icon]        │  ← コピー完了状態（absolute で重ねる）
│                         │
└─────────────────────────┘
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Container | ボタン外枠。hover/active の transform を受ける | Yes |
| Copy Icon | コピー操作を示すアイコン（デフォルト表示） | Yes |
| Check Icon | コピー完了を示すアイコン（完了時に pop 表示） | Yes |

---

## 3. パターン

### サイズ

| サイズ | Container | アイコン | 角丸 | パディング | 用途 |
|--------|-----------|---------|------|-----------|------|
| Large | 48×48px | w-6 h-6 | rounded-2xl | p-3 | 単体デモ、ヒーロー領域 |
| Medium | 40×40px | w-5 h-5 | rounded-xl | p-2.5 | コードブロックのヘッダー（デフォルト） |
| Small | 32×32px | w-4 h-4 | rounded-lg | p-2 | テーブルセル、コンパクトUI |

### スタイルバリエーション

| バリエーション | Container | ボーダー | 用途 |
|---------------|-----------|---------|------|
| Outlined | `bg-white` | `border border-slate-200` | カード内、明るい背景上 |
| Subtle | `bg-transparent` | なし | ツールバー、コードブロック上 |

---

## 4. 振る舞い

### 状態遷移

```
Default → Hover(scale 1.05) → Active(scale 0.9) → Copied(icon swap) → Default(2s後)
```

| 状態 | 視覚変化 | Duration / Easing |
|------|---------|-------------------|
| Default | Copy アイコン表示 | — |
| Hover | `scale(1.05)` | 250ms `cubic-bezier(0.175, 0.885, 0.32, 1.275)` |
| Active | `scale(0.9)` | 100ms `ease-out` |
| Copied | Copy→Check アイコン切替（pop） | 180ms `cubic-bezier(0.175, 0.885, 0.32, 1.275)` |
| 復帰 | Check→Copy アイコン切替 | 180ms（2秒後に自動実行） |

### アイコン切替の仕組み

- 2つの SVG を `position: absolute` で重ねる
- `opacity` + `scale` の同時遷移で pop エフェクトを実現
- `.copied` クラスの付け外しで状態を制御

### JavaScript

```js
const btn = document.getElementById('copyBtn');
const textToCopy = '対象テキスト';
let timer;

btn.addEventListener('click', () => {
  navigator.clipboard.writeText(textToCopy).catch(() => {});
  btn.classList.add('copied');
  clearTimeout(timer);
  timer = setTimeout(() => btn.classList.remove('copied'), 2000);
});
```

---

## 5. アクセシビリティ

### 必須事項
- `aria-label="コピー"` 必須（アイコンのみボタンのため）
- コピー完了時に `aria-label` を `"コピーしました"` に更新し、2秒後に戻す
- フォーカスリング: `focus:ring-2 focus:ring-primary-500/50`
- `prefers-reduced-motion: reduce` 時は `scale` アニメーションを無効化し、`opacity` 切替のみにする

### 禁止事項

- `aria-label` の省略
- コピー完了フィードバックなし（アイコン切替を省略しない）
- 復帰タイマーの省略（必ず自動で元に戻す）

---

## 6. CSS

```css
/* ボタン本体 */
.copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: #ffffff;
  border: 1px solid #e2e8f0; /* border-slate-200 */
  border-radius: 0.75rem;    /* rounded-xl */
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.copy-button:hover {
  transform: scale(1.05);
  background-color: #f8fafc; /* hover:bg-slate-50 */
}

.copy-button:active {
  transform: scale(0.9);
  transition: transform 0.1s ease-out;
}

.copy-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); /* ring-primary-500/50 */
}

/* アイコン共通 */
.copy-button .cb-icon {
  position: absolute;
  transition: opacity 0.18s ease,
              transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* デフォルト: コピーアイコン表示、チェック非表示 */
.copy-button .cb-icon-copy  { opacity: 1; transform: scale(1); }
.copy-button .cb-icon-check { opacity: 0; transform: scale(0.5); }

/* コピー完了時 */
.copy-button.copied .cb-icon-copy  { opacity: 0; transform: scale(0.5); }
.copy-button.copied .cb-icon-check { opacity: 1; transform: scale(1); }

/* アクセシビリティ: モーション軽減 */
@media (prefers-reduced-motion: reduce) {
  .copy-button,
  .copy-button .cb-icon {
    transition-duration: 0.01ms;
  }
  .copy-button:hover,
  .copy-button:active {
    transform: none;
  }
}
```

---

## 7. Tailwind サンプル

### Medium（デフォルト — Outlined）

```html
<button
  class="copy-button"
  aria-label="コピー"
  id="copyBtn"
>
  <svg class="cb-icon cb-icon-copy w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="13" height="13" rx="2.5" ry="2.5"></rect>
    <path d="M8 21h11a2 2 0 0 0 2-2v-11"></path>
  </svg>
  <svg class="cb-icon cb-icon-check w-5 h-5" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15"/>
    <polyline points="7 12.5 10.5 16 17 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>
```

### Small（コードブロック用 — Subtle）

```html
<button
  class="copy-button"
  style="width:32px;height:32px;border:none;background:transparent;"
  aria-label="コピー"
>
  <svg class="cb-icon cb-icon-copy w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="13" height="13" rx="2.5" ry="2.5"></rect>
    <path d="M8 21h11a2 2 0 0 0 2-2v-11"></path>
  </svg>
  <svg class="cb-icon cb-icon-check w-4 h-4" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15"/>
    <polyline points="7 12.5 10.5 16 17 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>
```

### コードブロックでの使用例

```html
<div class="relative bg-slate-900 rounded-xl p-4">
  <pre class="text-sm text-slate-100"><code>npm install gamboo-ui</code></pre>
  <button
    class="copy-button absolute top-3 right-3 text-slate-400 hover:text-slate-200"
    style="width:32px;height:32px;border:none;background:transparent;"
    aria-label="コピー"
    onclick="copyCode(this)"
  >
    <svg class="cb-icon cb-icon-copy w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="13" height="13" rx="2.5" ry="2.5"></rect>
      <path d="M8 21h11a2 2 0 0 0 2-2v-11"></path>
    </svg>
    <svg class="cb-icon cb-icon-check w-4 h-4" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15"/>
      <polyline points="7 12.5 10.5 16 17 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>
```
