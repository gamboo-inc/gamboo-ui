---
title: "getdesign.md ─ 300以上のDESIGN.mdを集めたブランド設計カタログ"
category: "デザインシステム"
updatedDate: 2026-07-14
status: "完了"
level: "初級"
tags: ["DESIGN.md", "デザインシステム", "AI技術", "ツール連携"]
references:
  - label: "getdesign.md"
    url: "https://getdesign.md/"
  - label: "GitHub - VoltAgent/awesome-design-md"
    url: "https://github.com/VoltAgent/awesome-design-md"
relatedArticles: []
---

## getdesign.mdとは

getdesign.md＝実在する有名ブランドのWebサイトを分析してつくられた「DESIGN.md」（＝配色・書体・余白などのブランドの見た目を、AIコーディングエージェント向けに記述したファイル形式）を集めたカタログサイト。300以上のブランドの配色・タイポグラフィ・余白・コンポーネントのルールが、すでにDESIGN.md形式でまとめられた状態で公開されている。

## 主な機能

- 300以上の分析済みデザインシステムをブラウズして探せる
- 色・タイポグラフィ・スペーシング・コンポーネント情報をそのまま取得できる
- 「Give your AI coder a reusable design brief（再利用できる設計指示書をAIコーダーに渡そう）」というコンセプトで、ジェネリックなAI生成デザインから抜け出すことを狙っている

## 使い方の想定

1. 参考にしたいブランドに近いDESIGN.mdをサイトから探す
2. そのDESIGN.mdをプロジェクトのルートに配置する
3. Claude CodeなどのAIエージェントへの指示文に、そのファイルを設計リファレンスとして参照させる

## 気づき

自分でDESIGN.mdをゼロから書かなくても、既存ブランドの分析結果を「借りてくる」という発想がおもしろい。ゼロから設計方針を言語化するより、近いテイストのカタログを見つけて調整する方が早そう。

## 今後調べたいこと

実際のDESIGN.mdの中身が、自分たちのmelta-uiやgamboo-uiのトークン構造とどこまで互換性があるか。コピーしてそのまま使えるのか、変換が必要なのか。
