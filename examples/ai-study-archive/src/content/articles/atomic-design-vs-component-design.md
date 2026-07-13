---
title: "Atomic Designとコンポーネント設計の違い"
category: "デザインシステム"
updatedDate: 2026-07-11
status: "完了"
level: "中級"
tags: ["デザインシステム", "コンポーネント設計", "Atomic Design"]
references: []
relatedArticles: ["design-tokens-for-ai", "react-vite-app-flow"]
---

## Atomic Designとは

Atomic Design＝UIを「原子（Atoms）→分子（Molecules）→有機体（Organisms）→テンプレート→ページ」という5段階の粒度で分解して設計する考え方。

- Atoms：ボタン、テキスト、アイコンなど、それ以上分解できない最小単位
- Molecules：Atomsを組み合わせた小さな部品（例：検索フォーム＝入力欄＋ボタン）
- Organisms：Moleculesを組み合わせたより大きな部品（例：ヘッダー全体）

## コンポーネント設計との違い

コンポーネント設計自体は「画面を部品単位に分ける」という考え方全般を指す、より広い概念。Atomic Designはその中の1つの分類方法にすぎない。実務では、Atomic Designの5段階をそのまま厳密に使うのではなく、「共通部品（components）」「画面固有の部品（features）」くらいのゆるい分類で運用しているケースも多い。

## デザインシステムとの関係

melta-uiのようなデザインシステムでは、コンポーネントの粒度と命名がすでに決まっている。この「粒度の感覚」を理解しておくと、新しい部品が必要になったときに「これはAtomsレベルか、Moleculesレベルか」を判断しやすくなり、既存のシステムに馴染む形で追加できる。

## 気づき

粒度分けにこだわりすぎると逆に開発が重くなることもある。「再利用したいかどうか」を判断基準にすると、実務上はシンプルに分類しやすい。
