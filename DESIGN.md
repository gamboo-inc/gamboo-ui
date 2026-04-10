# melta UI — Design Constitution

> AI エージェントが UI を生成するとき、最初に読むファイル。
> 思想・非交渉原則・クイックリファレンス・参照先をこの 1 枚に集約する。

---

## Brand Identity

**"声を張らずに伝わる UI"** — 機能的な黒子であり、たまに微笑む。

| キーワード | 意味 |
|---|---|
| Quiet Precision | 静かだが精密。目立たないところほど丁寧に |
| Breathable | 文字・要素の周囲に空気がある |
| Flat & Layered | Background → Surface → Text の 3 層で奥行き |
| Subtle Warmth | 控えめだが冷たくない。機能性にエモーショナルな温度 |

参考: Linear / Notion / Stripe / Vercel
アンチ: ネオン SaaS、Bootstrap 的テンプレート

---

## Non-Negotiable Principles

1. **Content First** — UI は黒子。コンテンツが主役
2. **WCAG 2.1 AA** — コントラスト 4.5:1 以上。アクセシビリティはデフォルト
3. **Semantic Color** — `bg-primary-500` を使う。`bg-blue-*` は使わない
4. **3-Color Rule** — 1 画面に使う色は 3 色まで（背景・アクセント・テキスト）
5. **4px Grid** — スペーシングは 4 の倍数、8 の倍数推奨
6. **Minimal Elevation** — `shadow-sm` 〜 `shadow-md`。`shadow-lg` 以上はオーバーレイ限定
7. **No AI-ish Decoration** — カード上部/左端のカラーバー禁止。全周ボーダーで構成

---

## Quick Reference

> この section だけで基本的な UI コード生成が可能。

### HTML テンプレート（Tailwind CDN）

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50:'#f0f5ff',100:'#dde8ff',200:'#c0d4ff',300:'#95b6ff',
          400:'#6492ff',500:'#2b70ef',600:'#2250df',700:'#1a40b5',
          800:'#13318d',900:'#0e266a',950:'#07194e'
        },
        wf: { bg:'#FFFFFF', surface:'#F5F5F5', border:'#E0E0E0', text:'#333333', 'text-sub':'#888888', accent:'#666666' }
      },
      fontFamily: {
        sans: ['Inter','Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP','sans-serif']
      }
    }
  }
}
</script>
<style>.text-body { color: #3d4b5f; }</style>
```

### レイアウト

```
ページ全体         : bg-gray-50 min-h-screen
ページコンテンツ   : max-w-7xl mx-auto px-8 py-12
サイドバー＋メイン : flex h-screen（ボーダー分離、gap不要）
セクション間隔     : mt-10 〜 mt-14
仕切り線           : border-t border-slate-200
```

### テキスト

```
見出し             : text-3xl font-bold text-slate-900（32px）
本文               : text-base text-body leading-relaxed（18px, line-height 2.0）
フォーム制御ラベル : 包含 <div> に leading-normal（body の lh 2.0 リセット）
空状態メッセージ   : text-base text-slate-500 text-center py-16
フォントスタック   : Inter, Hiragino Sans, Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif
```

### コンポーネント

```
カード             : bg-white rounded-xl border border-slate-200 p-6 shadow-sm
カードグリッド     : grid grid-cols-2 md:grid-cols-3 gap-6
CTAボタン（M）     : inline-flex items-center justify-center gap-2 h-10 px-4 text-[1rem] font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-700 cursor-pointer
CTAボタン（L）     : inline-flex items-center justify-center gap-2 h-12 px-6 text-[1rem] font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-700 cursor-pointer
CTAボタン（S）     : inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[0.875rem] font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-700 cursor-pointer
サブボタン         : inline-flex items-center justify-center gap-2 h-10 px-4 text-[1rem] font-medium bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-gray-50 cursor-pointer
Icon+Textボタン    : inline-flex items-center justify-center gap-2 h-10 pl-3 pr-4 text-[1rem] font-medium（アイコン側を狭く）
アイコンボタン（M）: w-10 h-10 inline-flex items-center justify-center cursor-pointer + aria-label（icon w-5 h-5）
アイコンボタン（S）: w-8 h-8 inline-flex items-center justify-center cursor-pointer + aria-label（icon w-4 h-4）
アイコンボタン（L）: w-12 h-12 inline-flex items-center justify-center cursor-pointer + aria-label（icon w-5 h-5）
入力欄             : w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 caret-primary-500
セレクト           : appearance-none pl-3 pr-10 + relative wrapper + SVG chevron（absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4）← ネイティブ矢印は使用禁止
横並びフォーム     : flex flex-wrap items-end gap-4 + 各 div.leading-normal > label + 要素 h-11
バッジ             : bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium
タグ（削除可能）   : inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium + ×ボタン
Alert（Info）      : flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 text-primary-800 rounded-lg
テーブル外枠       : bg-white rounded-xl border border-slate-200 overflow-hidden
テーブルヘッダ     : <th scope="col"> text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider
テーブルデータ行   : hover:bg-gray-50 transition-colors
```

### ナビゲーション

```
サイドバー（標準） : w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col h-screen
ナビ（Active）     : flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg + aria-current="page"
ナビ（Default）    : flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-body hover:bg-gray-50 rounded-lg transition-colors
タブ（Active）     : text-sm font-semibold text-primary-500 border-b-2 border-primary-500
パンくず           : text-sm + text-slate-500 hover:text-slate-700 / 現在ページ text-slate-900 font-medium
```

### アイコン

```
Charcoal           : w-5 h-5 fill="currentColor" text-body ← assets/icons/{Name}.svg（207個）
Lucide             : w-5 h-5 stroke="currentColor" fill="none" ← assets/icons/lucide/{name}.svg（15個）
小サイズ           : w-4 h-4
```

### ワイヤーフレーム（低忠実度プロトタイプ用）

```
背景               : bg-wf-bg (#FFFFFF)
サーフェス         : bg-wf-surface (#F5F5F5)
ボーダー           : border-wf-border (#E0E0E0)
テキスト           : text-wf-text (#333333)
サブテキスト       : text-wf-text-sub (#888888)
アクセント         : text-wf-accent / bg-wf-accent (#666666)
```

### 禁止パターン要約（Top 10）

| 禁止 | 代替 |
|------|------|
| `text-black` | `text-slate-900` |
| `bg-indigo-*` / `bg-blue-*` | `primary-*` |
| `shadow-lg` / `shadow-2xl` | `shadow-sm` 〜 `shadow-md` |
| `rounded-none` on cards | `rounded-xl` |
| `border-t-4` / `border-l-4` カラーバー | `border border-*-200 rounded-lg` 全周 |
| `text-gray-400` for body | `text-body` (#3d4b5f) |
| `font-light` | `font-normal` 以上 |
| `tracking-tight` | `tracking-normal` 以上 |
| `py-0.5` for buttons | `h-8` 以上 |
| `bg-green-*` / `bg-yellow-*` | `bg-emerald-*` / `bg-amber-*` |

> 全ルール（89 件）: `design/contracts/rules.json`（machine-readable）
> 人間向け解説: `foundations/prohibited.md`

---

## Source of Truth 読み順

| # | ファイル | 役割 |
|---|---------|------|
| 1 | `DESIGN.md`（本ファイル） | 憲法 + quick ref |
| 2 | `design/authority.md` | SSOT 宣言 |
| 3 | `design/contracts/tokens.json` | トークン exact value |
| 4 | `design/contracts/rules.json` | 禁止ルール registry |
| 5 | `design/contracts/components/*.contract.json` | コンポーネント仕様 |
| 6 | `foundations/theme.md` | テーマ設定・CSS 変数 |
| 7 | `foundations/design_philosophy.md` | 哲学の詳細 |
| 8 | `components/*.md` / `patterns/*.md` | 人間向けの詳細ガイド |

---

## Agent Prompt Guide

### クイック（単体 UI 生成）

`DESIGN.md` のみ読めば OK。Quick Reference のクラスをそのまま使う。

### 標準（ページ単位）

`DESIGN.md` → `foundations/theme.md` → 関連 `components/*.md` or `*.contract.json`

### フル（新規プロジェクト / DS 変更）

全ファイルを読み順に従って読む。

### MCP

MCP ツール `get_token` / `get_component` / `check_rule` / `search` を使用。

---

## Theme

| 設定 | 値 |
|------|-----|
| ダークモード | `OFF`（ライトモードのみ） |
| Primary | `#2B70EF`（WCAG AA 4.50:1） |
| Font | Inter, Hiragino Sans, Noto Sans JP |
| Icon | Charcoal 207 個 + Lucide 15 個 |
| Locale | ja（日本語） |

> 詳細: `foundations/theme.md`
