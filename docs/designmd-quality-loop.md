# DESIGN.md 品質ループ — Google 公式ツールで「AI 向け仕様書」を鍛える（他プロジェクト向け）

デザインシステムの DESIGN.md を、雰囲気で書いて置きっぱなしにせず、**機械検証つきの改善ループ**に載せるための手順書。
melta UI で 2026-07-03 に実走した内容の言語化。DESIGN.md を持つ（持ちたい）どの DS チームにも適用できる。

> 検知ハーネス自体の設計原則（誤検知・exit code・drift 検知など）は姉妹編 `ds-harness-playbook.md`。
> 本書は「DESIGN.md という成果物の品質」に焦点を絞る。

## 0. 前提 — DESIGN.md とは

- **Google Stitch 発の規格**（spec: [google-labs-code/design.md](https://github.com/google-labs-code/design.md)）。AI コーディングエージェントが「この UI はどう見えるべきか」を読むための、プロジェクト直下に置く Markdown ファイル。`AGENTS.md`（どう作るか）と対になる（どう見えるか）。
- **2層構造が思想の核**:
  1. **YAML front matter** = 機械可読な token（colors / typography / rounded / spacing / components）。**正規値はこちら**。
  2. **Markdown 本文** = 人間可読な rationale。「なぜこの値か」「どこで使うか」。
- エコシステム: [getdesign.md](https://getdesign.md/)（VoltAgent）が有名サイトの分析 DESIGN.md を 70+ 配布しており、規格としての普及が進んでいる。

## 1. 道具箱 — Google 公式 CLI `@google/design.md`

npm パッケージ（発行者は Google 公式 bot `google-wombot`。導入前に `npm view @google/design.md maintainers` で出所を確認する習慣を推奨）。

### lint — spec 準拠 + アクセシビリティ + token 参照の機械検証

```bash
npx @google/design.md lint DESIGN.md
```

構造化 JSON で findings が返る。検査内容:

| 検査 | severity | 意味 |
|---|---|---|
| spec 構造違反 | error | front matter のスキーマ逸脱、壊れた token 参照（`{colors.xxx}` の宙吊り） |
| WCAG コントラスト | warning | components の textColor × backgroundColor の実測比が AA (4.5:1) を下回る |
| 未参照 token | warning | 定義した色をどの component も参照していない（＝使い所を示していない） |
| 統計 | info | token 数 / component 数の棚卸し |

### diff — 2 バージョン間の後退検知

```bash
npx @google/design.md diff DESIGN.md DESIGN-v2.md
```

token の added / removed / modified と prose の変化を返し、`"regression": true/false` を判定する。
**トークンを消した・変えた PR を機械で見つける**ための道具。契約層に互換ゲートが既にある DS でも、「公開 DESIGN.md の後退」という導出物レイヤの検知として対になる。

## 2. 改善ループ（6 ステップ）

```
①用意 → ②lint → ③トリアージ → ④components 全量化 → ⑤prose rationale → ⑥CI ゲート化（+ 変更時 diff）
```

### ① DESIGN.md を用意する

- 既にあるなら次へ。無いなら書く — ただし **SSOT（tokens.json 等）が別にあるなら手書きせず生成せよ**（§4）。

### ② lint を実行する

エラーが出れば即修正（spec 逸脱は AI の読解も壊す）。errors 0 が出発点。

### ③ findings をトリアージする

warning は機械的に潰さず、種類ごとに扱いを変える:

| finding | 正体 | アクション |
|---|---|---|
| コントラスト warning | **本物のデザイン知見**の可能性 | 実装の該当色を確認 → 番手を上げるか、境界上と意図宣言するか**デザイン判断**（§3 の罠も参照） |
| 未参照 token | components セクションが痩せているシグナル | token を消すのではなく **components を充実させる**（④へ） |
| 壊れた参照 | 生成バグ or 手書きミス | 即修正 |

### ④ components セクションを全量化する

ここが一番効く。**AI は DESIGN.md に書かれていないコンポーネントを「存在しない」ものとして扱う**。
DS に 28 コンポーネントあるのに front matter に 2 個しか無ければ、AI に見えているのは 2 個だけ。
実装（または契約・recipe）から components を全量生成し、各エントリで token を `{colors.xxx}` 参照させる。
→ 未参照 warning が構造的に消え、DESIGN.md の情報密度が上がる。

### ⑤ token に prose rationale を付ける

spec の思想は「token が値、prose が理由」。高品質な DESIGN.md（getdesign.md の上位サンプル）は色 1 つずつに
「**なぜこの色か・どこで使うか**」の 1 行が付く:

```md
- **Primary (#2b70ef):** 主要 CTA とリンク。彩度を抑えた青で「声を張らない」。
- **Neutral (#f9fafb):** ページ背景。純白より一段沈めて面の階層を作る。
```

rationale の無い token は AI にとって「値はわかるが使い分けられない」状態。SSOT に description
フィールドがあるなら、そこから生成で流し込む。

### ⑥ CI ゲート化 + 変更時 diff

- `lint` の **errors 0 を CI ゲート**にする（warnings は当面レポートのみ → 段階的にゼロへ。
  「直さなくても通る warn」を溜めない工夫は姉妹編 §4 の warn ラチェットを参照）。
- token を変更する PR では旧版と `diff` を取り、`regression: true` なら breaking として扱う。

## 3. 罠

- **丸め境界でツール間の判定が割れる**。実例: 白文字 × #2b70ef は計算上ほぼぴったり 4.50:1 で、
  axe は pass（≥4.5）、Google linter は fail（<4.5）と割れた。境界ちょうどの色はどちらかのツールを
  黙らせる対症療法ではなく、**余裕を持った番手に上げるか「境界上で意図的」と文書化するか**をデザイン判断として決める。
- **warning ゼロを目的化しない**。未参照 warning は「token を消せ」ではなく「使い所を書け」のシグナル。
- **npx で外部 CLI を実行する前に出所検証**（`npm view <pkg> maintainers repository.url`）。

## 4. 一段上 — DESIGN.md は「書く」ものではなく「生成する」もの

getdesign.md 型の手書き DESIGN.md は**書いた瞬間から腐り始める**（元の実装が変われば乖離する）。
melta UI の運用はこれを構造的に防ぐ:

1. SSOT は契約（tokens.json / component 契約）。DESIGN.md は **generator（melta では `export-designmd.ts`）で導出**し、冒頭に「Generated — do not edit by hand」を明記。
2. 再生成して差分が出たら drift として CI が落とす（generated view の drift 検知は姉妹編 §6）。
3. その生成物に対して本書の lint / diff を重ねる。
   **「spec 準拠を自称する」のではなく、第三者（Google 公式）ツールで機械証明する**。

## 5. 移植チェックリスト

- [ ] DESIGN.md が spec 2層構造（front matter + prose）になっている
- [ ] `npx @google/design.md lint` が errors 0
- [ ] コントラスト warning を全件トリアージした（デザイン判断の記録を残す）
- [ ] components が DS の実コンポーネントを全量カバーしている
- [ ] 主要 token に prose rationale がある
- [ ] lint が CI に入っている（errors 0 ゲート）
- [ ] token 変更 PR で diff による後退検知を回している
- [ ] （SSOT がある場合）DESIGN.md は生成物で、手編集禁止 + drift 検知がある

## 実走ログ（melta UI, 2026-07-03）

初回 lint の結果: **errors 0 / warnings 16 / info 1**。

- warning 1 件 = contained ボタン（白 × primary-500）が 4.50:1 の AA 境界 → デザイン判断として起票
- warning 15 件 = 未参照 token → 原因は components が 2 個しか生成されていないこと → components 全量生成を起票
- info = 17 colors / 7 typography / 4 rounded / 11 spacing / **2 components** ← 痩せの定量的な証拠

「公式 linter を入れた初日に、自分の DS の境界ケースと情報密度の穴が炙り出された」が本書の存在理由。
