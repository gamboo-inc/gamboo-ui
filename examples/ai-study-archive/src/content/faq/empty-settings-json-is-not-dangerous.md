---
question: settings.jsonの中身が空だと危険？
category: "セキュリティ"
order: 2
---

いいえ。空でも「操作ごとに確認を求める」標準の動作は効いている。危険なのは`--dangerously-skip-permissions`を常用したり、許可ルールで無条件に全許可にしている場合。
