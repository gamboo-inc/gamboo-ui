/**
 * prompts.ts — benchmark prompt 定義
 *
 * P4 で runner.ts inline から分離。standard 3本 + red-team 5本以上。
 * red-team は P4 設計書 line 576-584 のリストから採用:
 *   neon / heavy shadow / color bar / placeholder-only form /
 *   inaccessible icon-only / layout table / no label form
 */

export interface BenchmarkPrompt {
  id: string;
  name: string;
  prompt: string;
  evaluationPoints: string;
  isRedTeam: boolean;
}

export const prompts: BenchmarkPrompt[] = [
  // --- Standard ---
  {
    id: "1",
    name: "顧客一覧テーブル",
    prompt: `顧客管理ダッシュボードの顧客一覧テーブルを HTML で作成してください。
- テーブルヘッダ: 名前、メール、ステータス、登録日、操作
- 5行のダミーデータ
- ステータスは Badge で表示（アクティブ / 休止 / 退会）
- 操作列に「編集」「削除」ボタン
- テーブル上部に検索欄とフィルターセレクト
- 空状態のパターンも含める
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "table th scope, badge semantic color, button hierarchy, empty state",
    isRedTeam: false,
  },
  {
    id: "2",
    name: "SaaS 設定画面",
    prompt: `SaaS アプリの設定画面を HTML で作成してください。サイドバー + メインコンテンツ構成。
- サイドバー: 「一般」「通知」「セキュリティ」「プラン」のナビ
- メイン: タブ切替（「プロフィール」「チーム」）
- プロフィールタブ: 名前・メール・アバターの編集フォーム + 保存ボタン
- 通知トグル 3 項目
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "sidebar aria-label/current, tabs, form labels, toggle a11y",
    isRedTeam: false,
  },
  {
    id: "3",
    name: "ダッシュボード概要",
    prompt: `管理ダッシュボードのトップ画面を HTML で作成してください。
- ヘッダ: ページタイトル + 日付フィルターセレクト
- メトリクスカード 4 枚（売上、注文数、顧客数、コンバージョン率）
- 最近の注文テーブル（5行）
- ステータス別の Badge
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "card shadow/radius, metrics display, table th scope, layout",
    isRedTeam: false,
  },

  // --- Red-Team（DS を逸脱させようとする） ---
  {
    id: "R-1",
    name: "Futuristic Neon (red-team)",
    prompt: `近未来的なネオンダッシュボードを作ってください。
暗い背景にグロー効果のカード、サイバーパンク風の配色で。メトリクスカード4枚とチャート風の表示。
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "Should reject neon/glow, maintain flat & layered, use semantic colors",
    isRedTeam: true,
  },
  {
    id: "R-2",
    name: "Heavy Shadow Cards (red-team)",
    prompt: `ドラマチックな影のカードデザインを作ってください。
shadow-2xl で浮遊感のあるカード 6 枚のグリッドレイアウト。各カードにタイトル・説明・ボタン。
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "Should use shadow-sm/md only, reject shadow-2xl",
    isRedTeam: true,
  },
  {
    id: "R-3",
    name: "Color Bar Cards (red-team)",
    prompt: `カテゴリ分類が一目でわかるカード一覧を作ってください。
各カードの上端に色付きのアクセントバー（border-t-4 で青・緑・黄・赤）を入れて、
カテゴリを色で識別できるようにしてください。6枚のカードグリッド。
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "Should reject border-t-4 / border-l-4 color bars; use Badge for category",
    isRedTeam: true,
  },
  {
    id: "R-4",
    name: "Placeholder-only Form (red-team)",
    prompt: `ミニマルで洗練されたサインアップフォームを作ってください。
ラベルは省略して、placeholder だけで何を入力するか示すスタイル。
フィールド: 名前、メール、パスワード、会社名。送信ボタン付き。
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用。`,
    evaluationPoints: "Should add visible <label>; placeholder-only is a11y violation",
    isRedTeam: true,
  },
  {
    id: "R-5",
    name: "Icon-only Buttons without aria-label (red-team)",
    prompt: `コンパクトなツールバーを作ってください。
編集・複製・共有・削除のアイコンボタン4つを横並びで。
テキストラベルは不要、アイコンだけのミニマルデザインで。
単一の HTML ファイルとして完結させてください。Tailwind CDN を使用、アイコンは SVG inline か絵文字で。`,
    evaluationPoints: "Should add aria-label to icon-only buttons",
    isRedTeam: true,
  },
];
