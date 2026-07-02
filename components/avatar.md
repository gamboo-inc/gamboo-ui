# Avatar

> ユーザー画像/イニシャル表示コンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **ユーザー識別**: ユーザーのプロフィール画像またはイニシャルを表示する
- **フォールバック**: 画像がない場合はイニシャルを表示する
- **ステータス表示**: オンライン/離席/オフラインをドットで表現する
- **グループ対応**: 複数アバターを重ねて表示できる

---

## 2. 解剖

```
  ┌────┐
  │ 画像 │ ●  ← ステータスドット
  └────┘
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Container | 円形のコンテナ。`rounded-full` | Yes |
| Image | ユーザーのプロフィール画像 | No |
| Initials | 画像がない場合の代替テキスト | No |
| Status Dot | オンライン状態を示すドット | No |

---

## 3. パターン

### 3-1. サイズ

| サイズ | クラス | ピクセル | イニシャル文字サイズ |
|--------|--------|---------|---------------------|
| Small | `w-8 h-8` | 32px | `text-xs` |
| Medium | `w-10 h-10` | 40px | `text-sm` |
| Large | `w-12 h-12` | 48px | `text-base` |

### 3-2. コンテンツ

| 種類 | 説明 |
|------|------|
| 画像 | `<img>` + `rounded-full object-cover` |
| イニシャル | `bg-primary-50 text-primary-600 font-medium` |

### 3-3. ステータスドット

| 状態 | 色 | aria-label |
|------|------|------|
| Online | `bg-emerald-500` | `"オンライン"` |
| Away | `bg-amber-400` | `"離席中"` |
| Offline | `bg-slate-300` | `"オフライン"` |

共通: `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white`

### 3-4. グループ

```
flex -space-x-2
```

各アバターに `border-2 border-white` を追加して重なり部分を区切る。

---

## 4. 振る舞い

> このコンポーネントは静的表示のため、スタイル仕様を記載する。

### 画像アバター

```
rounded-full object-cover
```

### イニシャルアバター

```
rounded-full bg-primary-50 flex items-center justify-center font-medium text-primary-500
```

### ステータスドット

```
absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
```

### グループ（残数表示）

```
rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-body
```

---

## 5. アクセシビリティ

| 属性 | 値 |
|------|------|
| `alt` | 画像に必ず代替テキストを設定 |
| `role="img"` + `aria-label` | イニシャルアバターにユーザー名を設定 |
| `aria-label` | ステータスドットに状態を記述 |
| グループ | 各アバターに個別の `alt` テキスト |
| 装飾的な場合 | `alt=""` で読み上げをスキップ |

> 共通: prohibited.md「カラー」参照

---

## 6. Tailwind サンプル

### 画像アバター（3サイズ）

```html
<!-- Small -->
<img src="..." alt="ユーザーアバター" class="w-8 h-8 rounded-full object-cover">
<!-- Medium -->
<img src="..." alt="ユーザーアバター" class="w-10 h-10 rounded-full object-cover">
<!-- Large -->
<img src="..." alt="ユーザーアバター" class="w-12 h-12 rounded-full object-cover">
```

### イニシャルアバター

```html
<div role="img" aria-label="田中 太郎" class="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-sm font-medium text-primary-500">TK</div>
```

### ステータスドット付き

```html
<div class="relative inline-block">
  <img src="..." alt="ユーザーアバター" class="w-10 h-10 rounded-full object-cover">
  <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-emerald-500" aria-label="オンライン"></span>
</div>
```

### アバターグループ

```html
<div class="flex -space-x-2">
  <img src="..." alt="ユーザー 1" class="w-10 h-10 rounded-full border-2 border-white object-cover">
  <img src="..." alt="ユーザー 2" class="w-10 h-10 rounded-full border-2 border-white object-cover">
  <img src="..." alt="ユーザー 3" class="w-10 h-10 rounded-full border-2 border-white object-cover">
  <div class="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-body">+3</div>
</div>
```
