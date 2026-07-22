---
question: Claude Codeのセキュリティ対策、何から手をつければいい？
category: "セキュリティ"
order: 1
---

サンドボックス機能（`/sandbox`）を有効にすることと、`.env`や秘密鍵など機密ファイルへのアクセスを拒否するルールをsettings.jsonに追加すること。この2つが最優先。
