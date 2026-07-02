# Toast / Notification

> トースト通知コンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **操作結果のフィードバック**: ユーザーの操作に対する結果を一時的に通知する。保存成功、エラー発生等
- **非侵入的**: ユーザーの作業フローを中断しない。モーダルと異なり、操作を要求しない
- **自動消去**: 情報提供型（success / info）は一定時間で自動的に消える。エラー型は手動で閉じるまで残す
- **スタック表示**: 複数のトーストは上に積み重ねて表示する。古いものが上、新しいものが下

---

## 2. 解剖

```
+----------------------------------------------------+
|  [Icon]  メッセージテキスト              [x] 閉じる  |
|          補足テキスト（オプション）                    |
+----------------------------------------------------+
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Container | トースト本体。背景色・ボーダー・シャドウを持つ | Yes |
| Status Icon | 通知の種類を視覚的に示すアイコン（チェック、警告等） | Yes |
| Message | 主要なメッセージテキスト | Yes |
| Description | 補足説明テキスト | No |
| Close Button | 手動で閉じるためのボタン | Yes |
| Action Button | トーストから直接実行できるアクション（「元に戻す」等） | No |
| Progress Bar | 自動消去までの残り時間を示すバー | No |

---

## 3. パターン

### 3-1. 種類

| 種類 | アイコン | 配色 | 用途 |
|------|----------|------|------|
| Success | チェックマーク | `bg-emerald-50 border-emerald-200 text-emerald-800` | 操作成功（保存完了、送信成功等） |
| Error | 警告マーク | `bg-red-50 border-red-200 text-red-800` | 操作失敗（保存エラー、通信エラー等） |
| Warning | 注意マーク | `bg-amber-50 border-amber-200 text-amber-800` | 注意喚起（容量不足、期限接近等） |
| Info | 情報マーク | `bg-primary-50 border-primary-200 text-primary-800` | 一般的な情報通知（更新あり等） |

### 3-2. バリエーション

| バリエーション | 説明 | 用途 |
|----------------|------|------|
| シンプル | メッセージのみ | 短い通知（「保存しました」） |
| 説明付き | メッセージ + 補足テキスト | 詳しい説明が必要な場合 |
| アクション付き | メッセージ + アクションボタン | 「元に戻す」等の操作を提供 |

### 3-3. 表示位置

| 位置 | クラス | 用途 |
|------|--------|------|
| 右上 | `fixed top-4 right-4` | デスクトップの標準位置（推奨） |
| 上中央 | `fixed top-4 left-1/2 -translate-x-1/2` | 注目させたい場合 |
| 下中央 | `fixed bottom-4 left-1/2 -translate-x-1/2` | モバイルの標準位置 |

---

## 4. 振る舞い

### 4-1. 表示・消去

| 動作 | ルール |
|------|--------|
| 表示アニメーション | 右からスライドイン + フェードイン（`translateX(100%)` → `translateX(0)`） |
| 自動消去 | Success / Info: 5秒後に自動消去。Error / Warning: 手動閉じのみ |
| 手動閉じ | `x` ボタンクリック、または Escape キー（フォーカス中） |
| 消去アニメーション | フェードアウト + スライドアウト |
| ホバー時 | 自動消去タイマーを一時停止する |

### 4-2. スタック

- 同時に表示するトーストは最大5つまで
- 5つを超えた場合、最も古いトーストを消去する
- トースト間の間隔は `gap-3`（12px）

### 4-3. 永続性

- ページ遷移（SPA のルート変更）後もトーストは維持する
- ただし、フルページリロードでは消去される

---

## 5. アクセシビリティ

| 項目 | 要件 |
|------|------|
| Role | Success / Info: `role="status"` + `aria-live="polite"`。Error / Warning: `role="alert"` + `aria-live="assertive"` |
| 閉じるボタン | `aria-label="閉じる"` を付与 |
| フォーカス管理 | トースト表示時にフォーカスを移動しない（非侵入的） |
| キーボード | フォーカス中に Escape で閉じる |
| 自動消去 | スクリーンリーダーが読み上げるのに十分な時間（最低5秒）を確保 |
| コントラスト | テキスト・アイコンは WCAG AA (4.5:1) を満たす |
| モーション | `prefers-reduced-motion` 時はアニメーションを無効にする |

### 禁止事項

> 共通: `foundations/prohibited.md`「カラー」参照

- トーストを唯一のエラー通知手段にすること（フォームバリデーションは入力欄直下に表示）
- 色だけで通知の種類を伝達すること（アイコンを必ず併用）
- 重要な操作の確認にトーストを使うこと（モーダルを使用する）
- 自動消去時間を3秒未満にすること

---

## 6. Tailwind サンプル

> primary カラーの具体値は `foundations/theme.md` を参照。

### 6-1. トーストコンテナ（表示位置）

```html
<!-- 右上固定のトーストコンテナ -->
<div aria-label="通知" class="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm">
  <!-- ここにトーストが追加される -->
</div>
```

### 6-2. Success

```html
<div role="status" aria-live="polite"
  class="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
  <svg class="w-6 h-6 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
  </svg>
  <div class="flex-1">
    <p class="text-sm font-medium text-emerald-800">保存しました</p>
  </div>
  <button aria-label="閉じる" class="text-emerald-400 hover:text-emerald-600 transition-colors flex-shrink-0">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  </button>
</div>
```

### 6-3. Error

```html
<div role="alert" aria-live="assertive"
  class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
  <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
  </svg>
  <div class="flex-1">
    <p class="text-sm font-medium text-red-800">保存に失敗しました</p>
    <p class="text-sm text-red-700 mt-0.5">ネットワーク接続を確認して再度お試しください</p>
  </div>
  <button aria-label="閉じる" class="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  </button>
</div>
```

### 6-4. Warning

```html
<div role="alert" aria-live="assertive"
  class="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
  <svg class="w-6 h-6 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
  </svg>
  <div class="flex-1">
    <p class="text-sm font-medium text-amber-800">ストレージ容量が残りわずかです</p>
    <p class="text-sm text-amber-700 mt-0.5">残り容量: 120MB / 5GB</p>
  </div>
  <button aria-label="閉じる" class="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  </button>
</div>
```

### 6-5. Info

```html
<div role="status" aria-live="polite"
  class="flex items-center gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg shadow-sm">
  <svg class="w-6 h-6 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
  </svg>
  <div class="flex-1">
    <p class="text-sm font-medium text-primary-800">新しいアップデートがあります</p>
  </div>
  <button aria-label="閉じる" class="text-primary-400 hover:text-primary-500 transition-colors flex-shrink-0">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  </button>
</div>
```

### 6-6. アクション付き（元に戻す）

```html
<div role="status" aria-live="polite"
  class="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
  <svg class="w-6 h-6 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
  </svg>
  <div class="flex-1">
    <p class="text-sm font-medium text-emerald-800">アイテムを削除しました</p>
    <button type="button" class="mt-1 text-sm font-medium text-emerald-700 underline hover:text-emerald-900 transition-colors">
      元に戻す
    </button>
  </div>
  <button aria-label="閉じる" class="text-emerald-400 hover:text-emerald-600 transition-colors flex-shrink-0">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  </button>
</div>
```
