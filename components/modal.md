# モーダル (Modal)

モーダルコンポーネント仕様。Tailwind CSS 4

---

## 1. 原則

| # | 原則 | 説明 |
|---|------|------|
| 1 | 中断を最小限に | モーダルはユーザーの作業フローを一時的に中断する。本当に必要な場面だけで使い、インラインで解決できる操作には使わない。 |
| 2 | 目的を絞る | 1 モーダル = 1 タスク。複数の目的を詰め込まない。 |
| 3 | 脱出経路を常に提供 | 閉じるボタン・オーバーレイクリック・Escape キーの 3 経路を必ず用意する。 |
| 4 | コンテキストの保持 | モーダルを閉じたとき、背面のページ状態が失われてはならない。スクロール位置・入力途中のデータを維持する。 |

---

## 2. 解剖

```
┌──────────────────────────────────────────── Overlay (黒 50%) ─┐
│                                                                │
│   ┌────────────────────────── Dialog ──────────────────────┐   │
│   │  [Header]  タイトル                        [×] 閉じる  │   │
│   │────────────────────────────────────────────────────────│   │
│   │                                                        │   │
│   │  [Body]                                                │   │
│   │   コンテンツ領域                                       │   │
│   │                                                        │   │
│   │────────────────────────────────────────────────────────│   │
│   │  [Footer]                    [キャンセル] [実行ボタン]  │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

| パーツ | 要素 | 必須 | 説明 |
|--------|------|:----:|------|
| Overlay | `<div>` | Yes | 背面コンテンツを覆う半透明レイヤー。クリックでモーダルを閉じる。 |
| Dialog | `<div role="dialog">` | Yes | モーダル本体コンテナ。`aria-modal="true"` を付与。 |
| Header | 見出し + 閉じるボタン | Yes | `<h2>` で見出し、右端に `×` ボタン。 |
| Body | 自由コンテンツ | Yes | テキスト・フォーム・リストなど用途に応じた内容。 |
| Footer | アクションボタン群 | No | 確認・キャンセルなどのボタンを右寄せで配置。 |

---

## 3. パターン

### 3-1. 確認ダイアログ

```
┌────────────────────────────────────────┐
│  このアイテムを削除しますか？    [×]   │
│────────────────────────────────────────│
│  この操作は取り消せません。            │
│  選択したアイテムを完全に削除します。  │
│────────────────────────────────────────│
│              [キャンセル] [削除する]    │
└────────────────────────────────────────┘
```

- 破壊的操作の最終確認に使用
- 主ボタンに `bg-red-600` を適用し、危険であることを視覚的に伝える
- 本文で「何が起きるか」を具体的に説明する

### 3-2. フォームモーダル

```
┌────────────────────────────────────────┐
│  アイテムを追加                  [×]   │
│────────────────────────────────────────│
│  タイトル  [________________________]  │
│  説明      [________________________]  │
│            [________________________]  │
│────────────────────────────────────────│
│              [キャンセル] [保存する]    │
└────────────────────────────────────────┘
```

- 簡易なデータ入力・編集に使用
- フィールド数は最大 5 つ程度に抑える。多い場合はページ遷移を検討
- 送信後はモーダルを閉じ、一覧を更新する

### 3-3. アラートモーダル

```
┌────────────────────────────────────────┐
│  ⚠ 注意                         [×]   │
│────────────────────────────────────────│
│  保存されていない変更があります。      │
│  ページを離れると変更は失われます。    │
│────────────────────────────────────────│
│              [戻る] [ページを離れる]    │
└────────────────────────────────────────┘
```

- システムからの重要な通知に使用
- `role="alertdialog"` を付与し、スクリーンリーダーに即座に読み上げさせる
- オーバーレイクリックでは閉じない（明示的なボタン操作を要求）

### 3-4. サイズバリエーション

| サイズ | max-width クラス | 用途 |
|--------|-----------------|------|
| Small | `max-w-sm` (384px) | 確認ダイアログ・シンプルなアラート |
| Medium | `max-w-lg` (512px) | フォーム入力・標準的なコンテンツ |
| Large | `max-w-2xl` (672px) | 複雑なフォーム・プレビュー表示 |
| Full | `max-w-5xl` (1024px) | テーブル・大量データの表示 |

---

## 4. 振る舞い

### 4-1. 開閉トリガー

| トリガー | 動作 | 備考 |
|----------|------|------|
| ボタンクリック | モーダルを開く | トリガーボタンに `aria-haspopup="dialog"` を付与 |
| `×` ボタンクリック | モーダルを閉じる | |
| オーバーレイクリック | モーダルを閉じる | アラートモーダルでは無効化 |
| `Escape` キー | モーダルを閉じる | |
| フォーム送信成功 | モーダルを閉じる | 成功時のみ。バリデーションエラー時は開いたまま |

### 4-2. フォーカス管理

1. モーダルが開いたとき、フォーカスをモーダル内の最初のフォーカス可能な要素に移動する
2. モーダル内でフォーカスをトラップする（Tab / Shift+Tab でモーダル外に出ない）
3. モーダルを閉じたとき、フォーカスをトリガー要素に戻す

### 4-3. フレームワーク連携

フレームワーク固有の実装は `foundations/theme.md` の Tech Stack に従う。

### 4-4. モーダルの重ね表示

- モーダルの上にモーダルを重ねることは **原則禁止**
- どうしても必要な場合は最大 2 層まで。背面モーダルは `pointer-events-none` で操作不可にする
- z-index は Overlay: `z-40`、Dialog: `z-50` を基準とし、2 層目は `z-60` / `z-70` を使用

---

## 5. アクセシビリティ

| 項目 | 要件 |
|------|------|
| Role | `role="dialog"`（通常）/ `role="alertdialog"`（アラート） |
| aria-modal | `aria-modal="true"` を Dialog に付与 |
| aria-labelledby | Header の見出し `id` を参照 |
| aria-describedby | Body に補足テキストがある場合、その `id` を参照 |
| フォーカストラップ | モーダル内でフォーカスを循環させる |
| Escape キー | モーダルを閉じる |
| 背面スクロール | モーダル表示中は `body` に `overflow-hidden` を付与し、背面スクロールを防止 |

> 共通: prohibited.md「モーダル」参照

---

## 6. Tailwind サンプル

### 6-1. 確認ダイアログ

```html
<!-- モーダルを開くトリガーボタン -->
<button
  type="button"
  aria-haspopup="dialog"
  class="h-10 px-4 text-[1rem] font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
  削除する
</button>

<!-- モーダル本体（JS で表示/非表示を切り替える） -->
<!-- Overlay -->
<div class="fixed inset-0 bg-black/50 z-40"></div>
<!-- Dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title"
  class="fixed inset-0 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <h2 id="modal-title" class="text-lg font-semibold text-slate-900">このアイテムを削除しますか？</h2>
      <button aria-label="閉じる" class="text-slate-500 hover:text-body rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <!-- Body -->
    <div class="px-6 py-4">
      <p class="text-sm text-body leading-relaxed">この操作は取り消せません。選択したアイテムを完全に削除します。</p>
    </div>
    <!-- Footer -->
    <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
      <button class="h-10 px-4 text-[1rem] font-medium text-body rounded-lg hover:bg-gray-100 transition-colors">キャンセル</button>
      <button class="h-10 px-4 text-[1rem] font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">削除する</button>
    </div>
  </div>
</div>
```

### 6-2. フォームモーダル

```html
<!-- Overlay -->
<div class="fixed inset-0 bg-black/50 z-40"></div>
<!-- Dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="form-modal-title"
  class="fixed inset-0 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-lg">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <h2 id="form-modal-title" class="text-lg font-semibold text-slate-900">アイテムを追加</h2>
      <button aria-label="閉じる" class="text-slate-500 hover:text-body rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <!-- Body -->
    <form action="/items" method="post">
      <div class="px-6 py-4 space-y-4">
        <!-- タイトル -->
        <div>
          <label for="item-title" class="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
          <input
            type="text"
            id="item-title"
            name="title"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none transition-colors"
            placeholder="タイトルを入力" />
        </div>
        <!-- 説明 -->
        <div>
          <label for="item-description" class="block text-sm font-medium text-slate-700 mb-1">説明</label>
          <textarea
            id="item-description"
            name="description"
            rows="3"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 outline-none transition-colors resize-y"
            placeholder="説明を入力"></textarea>
        </div>
      </div>
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
        <button type="button" class="h-10 px-4 text-[1rem] font-medium text-body rounded-lg hover:bg-gray-100 transition-colors">キャンセル</button>
        <button type="submit" class="h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">保存する</button>
      </div>
    </form>
  </div>
</div>
```

### 6-3. アラートモーダル

```html
<!-- Overlay（クリックで閉じない） -->
<div class="fixed inset-0 bg-black/50 z-40"></div>
<!-- Dialog -->
<div role="alertdialog" aria-modal="true" aria-labelledby="alert-modal-title" aria-describedby="alert-modal-desc"
  class="fixed inset-0 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h2 id="alert-modal-title" class="text-lg font-semibold text-slate-900">注意</h2>
      </div>
      <button aria-label="閉じる" class="text-slate-500 hover:text-body rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <!-- Body -->
    <div id="alert-modal-desc" class="px-6 py-4">
      <p class="text-sm text-body leading-relaxed">保存されていない変更があります。ページを離れると変更は失われます。</p>
    </div>
    <!-- Footer -->
    <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
      <button class="h-10 px-4 text-[1rem] font-medium text-body rounded-lg hover:bg-gray-100 transition-colors">戻る</button>
      <button class="h-10 px-4 text-[1rem] font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors">ページを離れる</button>
    </div>
  </div>
</div>
```
