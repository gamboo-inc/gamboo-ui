# Alert

> インライン通知コンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **常時表示**: ページ内にインラインで配置し、手動で閉じるまで残る。Toast（一時的・fixed）とは対になる存在
- **状態・注意の通知**: システム状態、注意事項、成功確認、エラー内容をユーザーに伝える
- **色+アイコン併用**: 色だけで種類を伝達しない。必ずアイコンとテキストを併用する
- **閉じるボタンはオプション**: 永続的な注意事項（利用規約変更等）には閉じるボタンを付けない

### Alert と Toast の違い

| | Alert | Toast |
|--|-------|-------|
| 表示方式 | インライン（ページ内フロー） | オーバーレイ（`fixed` 位置） |
| 永続性 | 手動で閉じるまで残る | 自動消去（5秒） |
| 用途 | 状態・注意の通知 | 操作結果のフィードバック |
| 出現タイミング | ページ読み込み時 or 状態変化時 | ユーザー操作の直後 |

---

## 2. 解剖

```
+----------------------------------------------------------+
|  [Icon]  タイトル（オプション）              [x] 閉じる    |
|          メッセージテキスト                  （オプション） |
+----------------------------------------------------------+
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Container | Alert 本体。背景色・ボーダーを持つ | Yes |
| Icon | 通知の種類を視覚的に示すアイコン | Yes |
| Title | 通知の見出し（太字） | No |
| Message | メッセージテキスト | Yes |
| Close Button | 手動で閉じるためのボタン | No |

---

## 3. パターン

### 3-1. 種類

| 種類 | アイコン | 配色 | 用途 |
|------|----------|------|------|
| Info | Info.svg | `bg-primary-50 border-primary-200 text-primary-800` | 一般的な情報・お知らせ |
| Success | Check.svg | `bg-emerald-50 border-emerald-200 text-emerald-800` | 完了・成功の確認 |
| Warning | Warning.svg | `bg-amber-50 border-amber-200 text-amber-800` | 注意喚起（データ制限、期限等） |
| Error | Error.svg | `bg-red-50 border-red-200 text-red-800` | エラー・問題の通知 |

### 3-2. バリエーション

| バリエーション | 説明 | 用途 |
|----------------|------|------|
| シンプル | アイコン + メッセージのみ | 短い通知（「変更が保存されました」） |
| タイトル付き | アイコン + タイトル + メッセージ | 詳しい説明が必要な場合 |
| 閉じるボタン付き | + Close ボタン | ユーザーが確認後に非表示にできる |

---

## 4. 振る舞い

### 4-1. 閉じる動作

| 動作 | ルール |
|------|--------|
| 閉じるアニメーション | フェードアウト（`opacity 0`, `150ms`）→ DOM から除去 |
| `prefers-reduced-motion` | アニメーションを無効にし、即時非表示 |

### 4-2. 配置

- ページコンテンツのフロー内にインラインで配置する
- フォーム上部、セクション先頭など、関連するコンテンツの直前に置く
- 複数の Alert を表示する場合は `space-y-3` で間隔を空ける

---

## 5. アクセシビリティ

| 項目 | 要件 |
|------|------|
| Role | Info / Success: `role="status"`。Warning / Error: `role="alert"` |
| 閉じるボタン | `aria-label="閉じる"` を付与 |
| コントラスト | テキスト・アイコンは WCAG AA (4.5:1) を満たす |
| 色の併用 | 色だけで種類を伝達しない。アイコンを必ず併用する |
| モーション | `prefers-reduced-motion` 時は閉じるアニメーションを無効にする |

### 禁止事項

> 共通: `foundations/prohibited.md`「カラー」参照

- 色だけで通知の種類を伝達すること（アイコンを必ず併用）
- 一時的なフィードバックに Alert を使うこと（Toast を使用する）
- ページ内に同種の Alert を重複表示すること

---

## 6. Tailwind サンプル

> primary カラーの具体値は `foundations/theme.md` を参照。
> アイコンは `assets/icons/` の Charcoal Icons を使用（fill ベース）。

### 6-1. Info

```html
<div role="status"
  class="flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg">
  <svg class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
    <!-- Info.svg -->
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
  <p class="text-sm text-primary-800">新しいバージョンが利用可能です。</p>
</div>
```

### 6-2. Success

```html
<div role="status"
  class="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
  <svg class="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
    <!-- Check.svg -->
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
  <p class="text-sm text-emerald-800">変更が正常に保存されました。</p>
</div>
```

### 6-3. Warning

```html
<div role="alert"
  class="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
  <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
    <!-- Warning.svg -->
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
  <p class="text-sm text-amber-800">ストレージ容量が残り10%を下回りました。</p>
</div>
```

### 6-4. Error

```html
<div role="alert"
  class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
  <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
    <!-- Error.svg -->
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
  <p class="text-sm text-red-800">接続エラーが発生しました。ネットワーク設定を確認してください。</p>
</div>
```

### 6-5. タイトル付き（Info）

```html
<div role="status"
  class="flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg">
  <svg class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
  <div>
    <p class="text-sm font-semibold text-primary-800">アップデートのお知らせ</p>
    <p class="text-sm text-primary-800 mt-1">v2.1.0 が利用可能です。新機能と改善点については更新履歴をご確認ください。</p>
  </div>
</div>
```

### 6-6. 閉じるボタン付き（Success）

```html
<div role="status"
  class="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
  <svg class="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
  <p class="flex-1 text-sm text-emerald-800">プロフィールが更新されました。</p>
  <button onclick="closeAlert(this)" aria-label="閉じる"
    class="text-emerald-400 hover:text-emerald-600 transition-colors flex-shrink-0">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <!-- Close.svg -->
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  </button>
</div>
```
