# Badge

> バッジコンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **バッジはステータスや分類を簡潔に伝えるラベル**: 短いテキストで状態やカテゴリを即座に識別可能にする
- **色だけで情報を伝えない**: テキストを必ず含み、色覚多様性に対応する
- **サイズは小さく保つ**: メインコンテンツの邪魔をしない。補助的な情報としてコンパクトに表示する
- **一貫したカラーコード**: 成功=emerald, 警告=amber, エラー=red, ニュートラル=slate, アクセント=primary

---

## 2. 解剖

```
┌──────────────┐
│ [●] Label    │  ← Badge
└──────────────┘
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Container | バッジの外枠。背景色とボーダーで種類を示す | Yes |
| Dot Indicator | 色付きドットで視覚的に状態を補強する | No |
| Label Text | ステータスやカテゴリを示すテキスト | Yes |

---

## 3. パターン

### ステータスバッジ
完了、進行中、ブロック、未着手などの状態を示す。カラーコードでステータスの種類を直感的に伝える。

### カウントバッジ
通知数や未読件数などの数値を表示する。コンパクトな円形で表示。

### ドット付きバッジ
テキストの前に色付きドットを配置し、ステータスを視覚的に補強する。オンライン/オフライン表示などに使用。

### アウトラインバッジ
背景色なし、ボーダーのみのバリエーション。情報密度が高い画面での使用に適する。

---

## 4. 振る舞い

### インタラクション
- バッジは基本的にインタラクティブでない（クリック不可）
- 削除可能なラベル（タグ）が必要な場合は `components/tag.md` を参照する

### 動的更新
- ステータス変更時はバッジのカラーとテキストを同時に更新する
- カウントバッジは値が0の場合は非表示にすることを検討する

---

## 5. アクセシビリティ

### 必須事項
- テキストを必ず含む（色だけで伝達しない）
- コントラスト比は背景色とテキストで 4.5:1 以上を確保する
- スクリーンリーダーで読み上げ可能にする
- 削除可能なタグの仕様は `components/tag.md` を参照する

### 禁止事項

> 共通: `foundations/prohibited.md`「カラー」参照

- 色のみでステータスを伝達すること
- テキストなしの色付きドットのみでの使用
- コントラスト比が不十分な色の組み合わせ

---

## 6. Tailwind サンプル

### ステータスバッジ

```html
<!-- デフォルト/ニュートラル -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">未着手</span>

<!-- 成功/完了 -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">完了</span>

<!-- 警告/進行中 -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">進行中</span>

<!-- エラー/ブロック -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">ブロック</span>

<!-- アクセント -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">新規</span>
```

### ドット付きバッジ

```html
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
  オンライン
</span>
```

### カウントバッジ

```html
<span class="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-600 rounded-full">3</span>
```

### アウトラインバッジ

```html
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-slate-300 text-slate-700">下書き</span>
```

### 削除可能タグ

> 削除可能なラベル（タグ / チップ）は独立コンポーネントとして `components/tag.md` に定義。コード例・キーボード操作・アクセシビリティ仕様はそちらを参照。

### バッジの組み合わせ表示

```html
<div class="flex flex-wrap gap-2">
  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">完了</span>
  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">フロントエンド</span>
  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">優先度: 高</span>
</div>
```
