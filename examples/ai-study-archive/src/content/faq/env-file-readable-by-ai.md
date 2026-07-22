---
question: .envファイルはAIに読まれても平気？
category: "セキュリティ"
order: 4
---

何も設定していなければ読み取れてしまう。settings.jsonの`permissions.deny`に`.env`系ファイルを拒否するルールを明示的に追加する必要がある。
