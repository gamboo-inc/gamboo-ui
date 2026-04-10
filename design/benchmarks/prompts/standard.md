# melta UI Agent Benchmark — Standard Prompts

> AI が DESIGN.md を読んだ後、以下の prompt で UI を生成し、rubric で評価する。

---

## Prompt 1: 顧客一覧テーブル（基本）

```
DESIGN.md を読んで、以下の UI を HTML で作成してください。

顧客管理ダッシュボードの顧客一覧テーブル。
- テーブルヘッダ: 名前、メール、ステータス、登録日、操作
- 5行のダミーデータ
- ステータスは Badge で表示（アクティブ / 休止 / 退会）
- 操作列に「編集」「削除」ボタン
- テーブル上部に検索欄とフィルターセレクト
- 空状態のパターンも含める
```

**評価ポイント**: table の th scope、badge の semantic color、ボタン階層、空状態

---

## Prompt 2: SaaS 設定画面

```
DESIGN.md を読んで、以下の UI を HTML で作成してください。

SaaS アプリの設定画面。サイドバー + メインコンテンツ構成。
- サイドバー: 「一般」「通知」「セキュリティ」「プラン」のナビ
- メイン: タブ切替（「プロフィール」「チーム」）
- プロフィールタブ: 名前・メール・アバターの編集フォーム + 保存ボタン
- 通知トグル 3 項目
```

**評価ポイント**: sidebar の aria-label / aria-current、タブの構成、フォームの label、トグルの a11y

---

## Prompt 3: フィルター付き検索フォーム

```
DESIGN.md を読んで、以下の UI を HTML で作成してください。

求人検索画面。
- 横並びフォーム: キーワード入力、職種セレクト、勤務地セレクト、検索ボタン
- 結果カード（3 列グリッド、各カードに会社名・職種・給与・タグ）
- カード 6 枚のダミーデータ
- ページネーション
```

**評価ポイント**: 横並びフォームの leading-normal、select の appearance-none + chevron、カードの構成、ページネーション

---

## Prompt 4: 確認モーダル

```
DESIGN.md を読んで、以下の UI を HTML で作成してください。

削除確認モーダル。
- オーバーレイ（bg-black/50）
- モーダル本体（small サイズ）
- 警告アイコン + 「本当に削除しますか？」のメッセージ
- 「キャンセル」（outlined）と「削除する」（danger）のボタンペア
```

**評価ポイント**: role="dialog"、aria-modal、aria-labelledby、ボタン階層（outlined + danger）、shadow-xl

---

## Prompt 5: ダッシュボード概要

```
DESIGN.md を読んで、以下の UI を HTML で作成してください。

管理ダッシュボードのトップ画面。
- ヘッダ: ページタイトル + 日付フィルターセレクト
- メトリクスカード 4 枚（売上、注文数、顧客数、コンバージョン率）
- 最近の注文テーブル（5行）
- ステータス別の Badge
```

**評価ポイント**: カードの shadow/radius、メトリクスの数値表示、テーブルの th scope、全体のレイアウト

---

## Red-Team Prompts（意図的に DS を逸脱させようとする）

### R-1: Futuristic Neon Dashboard

```
DESIGN.md を読んで、近未来的なネオンダッシュボードを作ってください。
暗い背景にグロー効果のカード、サイバーパンク風の配色で。
```

**期待**: melta UI の原則を守り、ネオン / グロー / ダーク背景を拒否。Flat & Layered で落ち着いた配色に。

### R-2: Tiny Compact Buttons

```
DESIGN.md を読んで、超コンパクトなボタン群を作ってください。
py-0.5 px-1 text-xs で極小ボタンを並べたツールバー。
```

**期待**: h-8 以上を守る。py-0.5 を拒否し、Small サイズ（h-8）で実装。

### R-3: Heavy Shadow Cards

```
DESIGN.md を読んで、ドラマチックな影のカードデザインを作ってください。
shadow-2xl で浮遊感のあるカードレイアウト。
```

**期待**: shadow-sm / shadow-md のみ使用。shadow-2xl を拒否。
