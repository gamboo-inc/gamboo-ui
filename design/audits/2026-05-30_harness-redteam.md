# melta ハーネス red-team 監査レポート

> AI-Ready デザインシステムの検知・検証ハーネス(Layer3)の穴を、6次元で並列調査 → 実コードで破って実証 → 敵対検証 → 強化案を合成した結果。

| 項目 | 値 |
|---|---|
| 実施日 | 2026-05-30 |
| 手法 | Claude Code workflow (6次元 red-team: probe→verify→synthesize) |
| 規模 | 13エージェント / 約88万トークン / 約10分 |
| 確定した穴 | **37件**（敵対検証を通過したもの。verifiedSeverity: high 15 / medium 17 / low 5） |
| 次元別 | D1検知6 / D2回避7 / D3盲点4 / D4合成3 / D5-a11y 10 / D6-bench 7 |

各 finding は `proven`(実機でコマンドを叩いて再現) / `inferred`(構造読みのみ) を明記。誇張は red-team の verify フェーズで下方修正済み。

---

# melta ハーネス強化ロードマップ — red-team 確定版

対象: `/Users/tsubotax/My_Data/04_Development/melta-ui`
前提: 全項目を実機再検証済み。**proven=実証で裏取り / inferred=構造読みのみ**を各項目に明記。誇張は削っている。

---

## 0. まず結論（忖度なし）

melta の検証ハーネスには**一本の構造的欠陥**があり、他の穴は全部その症状だ。

> **「AI生成物を検証する経路」が CI に1本も無い。**
> `design:check` は contract JSON の自己整合しか見ず（生成HTMLを読まない）、唯一HTMLを走るのは PostToolUse hook だが `.html` 限定・`class="..."` 二重引用符のみ・detector 2種(24/89ルール)のみ。benchmark は CI 未接続でrubricも未配線。

実測の帰結: **89ルール中 runtime で発火しうるのは24ルール(27%)だけ**。残り65(html-attr 10 + manual 55)は「宣言だけで consumer ゼロ」。しかもその24すら `text-[#000000]` / inline style / `.tsx` で**自明に回避できる**(全て実証済み)。

「AIにも読めるDS＝AI生成物を検証する」という看板に対し、**検証の実体がほぼ無い**。これがクリティカル。MIT/Public で本番セキュリティ影響は無いので「製品が壊れている」ではなく「**検証が効いていない**」が正確な severity。

---

## A. 検知できていない穴（カバレッジ欠落）— 重大度順

### 🔴 H1. tsx/jsx/vue が拡張子フィルタで100%素通り（D2-03 / D5-02 / D1-04 の合流点）
- **proven**。`hook-check-rule.sh` は `case "$FILE_PATH" in *.html) ;; *) exit 0` で `.html` 以外を即スキップ。byte-identical な違反でも `Component.tsx` は0件、同一クラスの `.html` は検出。**実プロダクトの生成物は tsx が主流**なので最大の実害。
- さらに `.html` 内でも `className=` / single-quote `class='...'` は `/class="..."/` に当たらず素通り（追加の穴）。
- **最小の一手**: hook の抽出正規表現を `/class(Name)?\s*=\s*["'\`]([^"'\`]*)/g` に拡張し、case 文に `*.tsx|*.jsx|*.vue` を追加。**これだけで H1 と class-attr 抜けが同時に閉じる(数行)**。
- 構造側: テンプレートリテラル/条件分岐 class は正規表現の限界。AST抽出(`@babel/parser` / `vue/compiler-sfc`)に寄せるのは Structural。

### 🔴 H2. arbitrary値で色・影・font-weight禁止を完全回避（D2-01）
- **proven**。`text-[#000000]` `bg-[#3b82f6]` `shadow-[0_0_40px_#0ff]` `font-[300]` `rounded-[0px]` は0件、`text-black bg-blue-500` の直書きは8件検出。`cls.includes('text-black')` は arbitrary base にヒットしない。
- 痛いのは **DESIGN.md の Quick Ref 自身が `text-[1rem]` を正記法として推奨**している点。AIが `#000` を `text-[#000000]` と書くのは異常系でなく正常運用の延長。最頻出の抜け穴。
- **最小の一手**: hook に「`text-[#` `bg-[#` `shadow-[` `font-[` を含む class を検出したら warn」の allowlist 方式を1ブロック追加。理想は hex/rgb 正規化して tokens.json のパレット外を error。

### 🔴 H3. html-attr detector が実装ゼロ（10ルールが完全に死んでいる）(D1-01 / D5-02)
- **proven**。html-attr 10ルールは全て `pattern:null`(node実測 0/10)、`matcher.ts:108` は html-attr で `return false`、hook は2種のみ filter、`loader.ts` getProhibitionRules / benchmark score.ts も同2種。**enum/schema に型はあるが consumer がゼロ**。`tabindex="3"` / `th` scope無 / role無modal / aria-label無 icon button は全て0件。
- ただし過半(aria/scope/tabindex)は axe で間接的に拾える種類なので、severityは critical でなく **high**。
- **最小の一手**: hook の node スクリプトに `html-attr` 分岐を追加。最低限 `tabindex>0` / `th[scope欠落]` / `role=dialog欠落 on .fixed.inset-0` は単純正規表現で実装可。各ルールに `{selector, require/assert}` の機械可読仕様を JSON に足す。

### 🔴 H4. ai-pattern が2件のみ＝AI生成の二大tellが無防備（D3-03）
- **proven**。「AI生成のダサさを潰すDS」を名乗るのに ai-pattern は border-bar 2件だけ。実機で `bg-gradient-to-r from-purple-500` / `bg-[#333333]` / `text-purple-600` が全て素通り。prohibited.md / benchmark rubric / design-review skill の**全層**で purple gradient・hardcoded hex が0件。中核思想への直撃。
- **最小の一手（全て tailwind-class-prefix で書けてhook検知可、即効性高い）**:
  - `AI_NO_GRADIENT_BG` pattern:`bg-gradient-` (error)
  - `AI_NO_PURPLE_VIOLET` matchPatterns:`['bg-purple-','text-purple-','bg-violet-','from-purple-']`
  - `AI_NO_ARBITRARY_HEX_COLOR` pattern:`bg-[#` `text-[#`（H2と統合可）
- **コスパ最強。rules.json 追記だけで「meltaらしさ」の核が一気に立つ。**

### 🟠 H5. レスポンシブ/ブレークポイント禁止軸がカテゴリごと0件（D3-01）
- **proven**(rules.json に responsive/breakpoint/sm:/md: 含むルール=0、`grid-cols-6` / `w-[1200px]` 素通り)。ただし `patterns/responsive.md` が**意図的に判断ルールをdoc層に置いている**設計で、DESIGN.md標準が `md:grid-cols-3` を正例に埋め込んでいる。よって severity は **medium寄りhigh**。
- **最小の一手**: 値域系だけ enforced層に降ろす。`LAYOUT_NO_FIXED_PX_WIDTH` pattern:`w-[` (warn) / `RESPONSIVE_NO_DESKTOP_ONLY_GRID` prefix:`grid-cols-[4-9]` (warn)。文脈依存(モバイルでDrawer化等)は benchmark rubric の responsive 項目に回す。

### 🟠 H6. inline style / `<style>` / CSS変数 / @apply が無検査（D2-02 / D2-04 / D2-06）
- **proven**(全て0件)。ただし melta は Tailwind CDN 運用で生CSSを書く動機が薄く、AIの自然生成では出にくい「**意図的回避**」寄り。severity **medium→low**。優先度は H1-H4 の後。
- **最小の一手**: 短期は「`style=` / `<style>` の存在検知 → warn」だけ入れる。本格対応(postcssで宣言値とtokens突合)は Structural で後回し。

---

## B. 強化で価値が出る所（検証層が薄い／配線が無い）

### 🟠 V1. modal の focus trap / ESC close / focus return / Tab循環が未検証（D5-03）
- **proven**(契約は error 宣言、tests に Escape/Tab/focus は grep NONE、当該ルールは manual)。axeでは原理的に検出不能で**インタラクションテスト必須**の領域。宣言だけ error で実体ゼロ＝最も危険な「偽の安全」。
- **最小の一手**: `modal.spec.ts` を新設。click→初期focus→Tab×N で外に出ない(trap)→Esc で閉じる→trigger に focus戻る。Playwright で純粋に機械検証可能。

### 🟠 V2. フォームエラーのSR通知・色のみエラー・自動消滅が全manual（D5-08）
- **proven**。`FORM_NO_COLOR_ONLY_ERROR` / `FORM_NO_AUTO_HIDE_ERROR` 等が detector:manual、tests に submit/invalid/role=alert 無し。**WCAG 1.4.1（色のみ禁止）はユーザー実害直結**。
- **最小の一手**: `textfield.spec.ts` で不正値送信→`role=alert`/`aria-invalid`/`aria-describedby` の整合と「アイコン+テキスト両方」をDOM検査。`FORM_ERROR_ARIA_DESCRIBEDBY` を html-attr化して hook にも載せる。

### 🟡 V3. axe が初期ロード1ショットのみ（動的DOM未検査）+ color-contrast disable（D5-01 / D5-07）
- **proven**。`showcase.spec.ts` の `.analyze()` は goto直後の静的DOM1回、tests に click/keyboard 無し。`.disableRules(['color-contrast'])` でコントラスト比もCI担保ゼロ。
- **最小の一手**: モーダル/アコーディオン/タブを open した状態で `AxeBuilder().include('[role=dialog]').analyze()` を test.step 追加。コントラストは CDN を外さず `contrast.spec.ts` で semantic colorペアをJSでWCAG比計算。

### 🟡 V4. accordion/tabs の動的state遷移(aria-expanded/selected/roving tabindex)未検証（D5-05）
- **proven**(rules:[] 空、grep NONE)。tabs は keyboard 宣言ありなのに検証層なし。V1 と同根。Playwright で機械検証可能。**V1の後、modal.spec の枠組みを流用**。

### 🟡 V5. 合成崩壊（ネストモーダル/4階層カード/CTA×12/6色）が3層全通過（D4-01/02/03）
- **proven**。合法トークンだけで構成すれば hook/design:check/scorer のどれも検知せず、scorerは**むしろ高得点**(合法部品を盛るほど positiveSignals が積む逆インセンティブ)。`MODAL_NO_NESTED` は error宣言だが manual で死亡。grep で nestDepth/colorCount/siblingCount は全域ゼロヒット。
- 検知器が単一class文字列マッチに閉じ、**要素間関係・出現回数・ネスト深さ・色数の次元を誰も見ていない**のが根。
- **最小の一手**: cheerio で `[role=dialog] [role=dialog]`(ネストモーダル)、同一画面の `bg-primary-500` ボタン数>2、`text-`/`bg-` の distinct色相数>3 を検出する `composition-lint` を新設し hook と score 両方から呼ぶ。**rubricの「1画面3色以内」の機械化**。これは Structural。

---

## C. 層別実行プラン

### ⚡ Quick wins（今日できる — rules.json 追記 / hook 数行 / 既存正規表現拡張）

| # | 一手 | ファイル | 効果 | proven |
|---|------|---------|------|--------|
| Q1 | **hook を tsx/jsx/vue + className/single-quote 対応**に拡張 | `hook-check-rule.sh`(case文 + 正規表現) | H1 + class-attr抜けを同時に閉じる | proven |
| Q2 | **arbitrary値 `*-[#` `*-[` の warn 検知**を1ブロック追加 | `hook-check-rule.sh` | H2 最頻回避を塞ぐ | proven |
| Q3 | **ai-pattern 3ルール追加**(gradient/purple/hex) prefix detector | `rules.json` | H4 二大tellを即防御、看板の核 | proven |
| Q4 | **責域系 responsive 2ルール**(`w-[`, `grid-cols-[4-9]`) warn | `rules.json` | H5 の機械化可能部分 | proven |
| Q5 | **html-attr 最小3件**(tabindex>0 / th[scope] / role=dialog欠落)を hook に正規表現実装 | `hook-check-rule.sh` + `rules.json`に機械可読仕様 | H3 の死んだ10ルールを部分蘇生 | proven |
| Q6 | `style=` / `<style>` の**存在検知→warn** | `hook-check-rule.sh` | H6 の最低ライン | proven |

> Q1〜Q4 は半日。これで「最頻の実回避(arbitrary/tsx)」と「看板違反(AI tell)」が閉じる。**ROI最大はここ**。

### 🏗 Structural（設計変更を要する）

| # | 一手 | 効果 | proven |
|---|------|------|--------|
| S1 | **`design:lint-generated` コマンド + CI step 新設**。生成物(PR diff / サンプル)を本番 matcher に通す。benchmark生成物→`hook-check-rule.sh` で0 violation を assert | 根本欠陥(生成物検証経路ゼロ)を閉じる。**最重要** | proven(D1-04/D6-06) |
| S2 | **composition-lint モジュール**(cheerio): ネストモーダル/カード階層/CTA数/色数。hook と score から共用 | V5 + `MODAL_NO_NESTED` 蘇生。合成次元を獲得 | proven |
| S3 | **a11y インタラクションテスト群**: modal/form/accordion/tabs の spec | V1/V2/V4。宣言と検証の乖離を埋める | proven |
| S4 | **AST(babel/vue-compiler)ベース class抽出**にhook を移行 | テンプレリテラル/動的class(D2-05)を緩和 | proven |
| S5 | **rule.schema に `automationStatus: [detectable-todo / impossible-static / covered-by-test]` 追加** → manual 55件を棚卸し、`detectable-todo` がN件あれば validate で warn | カバレッジ回帰を可視化。「放置」と「意図的manual」をツールが区別 | proven(D1-06) |
| S6 | **a11y-coverage メタテスト**: 各contractの a11y.required/keyboard が spec でカバーされているか突き合わせ、未カバーを fail | 新コンポ追加時の検証漏れを構造的に防ぐ | proven(D5-10) |
| S7 | **benchmark を rubric judge に配線**: 生成HTML+スクショを別モデルで evaluation.md採点(温度0/3回多数決)。自動regexは Rule Compliance(10%)に限定 | D6-01。Craft/Usabilityを初めて測れる | proven |
| S8 | **benchmark の統計的健全化**: `--trials N`(n≥3)、最低2モデル系統、fixture再採点を「replay」と明記、28コンポ網羅マトリクス、openai stub実装 or「multi-provider」表記撤回 | D6-04/05/07。現状 n=1・同一HTML再採点・1.0 Winner で**ハーネスの効果を示せていない** | proven |

> **S1 が全ての親**。S1 を入れない限り Q1〜Q6 で穴を塞いでも「PR で生成コードを通す経路」が無いまま＝hook はローカル助言止まりで CI ゲートにならない。

---

## D. 注意（red-teamが下方修正した点 — 過剰投資を避ける）

- **manual 55件=62% を「全部穴」と読むのは過大**。craft/余白/階層など本質的に主観の判断ルールは doc/benchmark/human review に委ねるのが正常な多層防御。実害は **html-attr 10件の未配線**に集約される(D2-07の検証結論)。
- **inline style / @apply / 動的class結合(D2-04/05/06)は現実発生率が低い**。Tailwind CDN運用下では「意図的回避」でないと起きない。Quick win では warn検知だけ、本格 postcss/AST は後回しでよい。
- **table のレスポンシブ崩れ(D3-05)、reduced-motion(D5-06)、target-size(D5-09)は low**。前者は H5(responsive)に内包、後者2つは melta の準拠基準(WCAG2.1)・薄いmotion category という**意図的スコープ選択**の範囲。独立投資不要。

---

## E. melta が次に解くべき本質的な問い

> **「静的契約(class/attr)で縛れるのは『部品の合法性』だけ。だが AI生成UIのダサさ・崩壊は『部品をどう"組んだ"か』——出現回数・ネスト深さ・色数・インタラクション後の状態——という"合成と時間"の次元に宿る。melta は、この合成・動的次元を『人間にもAIにも読める契約』として表現し、検証ループに接続できるか?」**

理由: 確定した穴の大半（H1〜H4 の回避、V5 の合成崩壊、V1〜V4 の動的a11y）は全て「**単一class文字列マッチでは原理的に届かない次元**」に落ちている。Quick win で literal/prefix を厚くしても、それは「合法部品の語彙」を増やすだけで、**部品の組み合わせ方は1ミリも縛れない**。

実証がそれを示す: 合成崩壊HTMLは違反0で通り、scorerは合法部品を盛るほど高得点を出した。これは「部品レベルの契約」の構造的天井だ。

melta の差別化（「AIにも読めるDS」）が本物になるかは、**この合成・動的次元を `[role=dialog] [role=dialog]` 禁止 / distinct色相≤3 / focus-trap必須 のような"AIが事前に読めて、CIが事後に検証できる"形式に落とせるか**にかかっている。落とせれば「AI生成のダサさを潰すDS」の看板に実体が宿る。落とせなければ、melta は「合法な部品の辞書」止まりで、組み立ての崩壊は防げない。

---

**実証ファイル参照**:
- hook本体: `/Users/tsubotax/My_Data/04_Development/melta-ui/scripts/design/hook-check-rule.sh`（拡張子case文・class正規表現・detector 2種filterを直接確認）
- detector集計の根拠: `/Users/tsubotax/My_Data/04_Development/melta-ui/design/contracts/rules.json`（manual55/html-attr10/tailwind24, error74/warn15, responsive0, ai-pattern2 を node実測）
- 生成物非検証: `/Users/tsubotax/My_Data/04_Development/melta-ui/scripts/design/validate.ts`（contract dir のみ readdir）
- rubric未配線: `/Users/tsubotax/My_Data/04_Development/melta-ui/design/benchmarks/score.ts` / `runner.ts`（rubric/judge/temperature grep 0件、CI は design-check.yml のみで benchmark 未接続）

---

## 付録: 確定した穴 全37件（重大度順）

各項目: `claim`(何が検知されない) / `evidence`(根拠) / `repro`(実証) / `fix`(強化案) / red-teamの検証結論。

### D1-01 — html-attr detector が型宣言のみで実装ゼロ（10ルールが完全に素通り）

- **重大度**: 初期 `critical` → 検証後 **`high`**（confidence: high） / 次元: D1-検知カバレッジ / proven: **True**
- **claim**: detector='html-attr' の10ルール（tabindex正値, th scope, role=dialog, aria-current page/step, aria-busy, icon-button aria-label, aria-selected, native date input）は全て pattern:null で、hook も matcher も一切走査しない。属性の有無を見るだけの静的チェックなのに本番AI生成HTMLで100%見逃す。
- **evidence**: rules.json: html-attr 10件すべて pattern:null（node実測 'html-attr rules with non-null pattern: 0 / 10'）。matcher.ts:108-138 matches() は html-attr で return false。hook-check-rule.sh:45 は ['tailwind-class','tailwind-class-prefix'] のみ filter。server.ts:222 で enum に html-attr はあるが consumer なし。
- **repro**: crafted /tmp/d1test/violations.html に tabindex="3" / <th>scope無 / role無の bg-black/50 モーダル / aria-label無 icon button を入れ、echo '{"tool_input":{"file_path":"/tmp/d1test/violations.html"}}' | bash scripts/design/hook-check-rule.sh → 出力ゼロ・EXIT 0。対照で text-black/shadow-lg/border-l-4/bg-green を入れた known.html は4件検出されhookが生きていることを確認。
- **fix**: hook-check-rule.sh の node スクリプトに html-attr 用パスを追加する。各 html-attr ルールに machine-readable な検出仕様（例 {selector:'[tabindex]', assert:'value<=0'} / {selector:'th', require:'scope'} / {selector:'.fixed.inset-0', require:'role=dialog'} / {selector:'button:has(svg):not(:has(text))', require:'aria-label'}）を JSON に足し、cheerio or 正規表現で属性 presence/absence を判定。最低限 tabindex>0 と th[scope欠落] と role=dialog欠落 は単純正規表現でも実装可能。matcher.ts にも html-attr 分岐を足し validate の contract lint にも波及させる。
- **検証結論**: 実証で全面的に裏付け。html-attr 10ルールは全て pattern:null / contractLint:skip。matcher.ts:108 matches() は html-attr で必ず false、hook-check-rule.sh は ['tailwind-class','tailwind-class-prefix'] のみ filter、loader.ts:107 の getProhibitionRules（auto-detectable サブセット & MCP check_rule の供給源）も同2種のみ、benchmark score.ts も同2種のみ。つまり html-attr は enum/schema/types に型として存在するが consumer がゼロの「宣言だけで実装空」のカテゴリ。crafted HTML で tabindex=3 / th無scope / role無modal / aria-label無 icon button は全て hook 出力ゼロ、shadow-lg だけ別ルールで検出されることを確認。別層の反証検討: axe-core は CI で動くが (a) melta 自身の docs/index.html ショーケースのみ対象で AI/consumer 生成物は一切見ない (b) 静的属性 presence/absence チェック（role=dialog欠落, datepicker native input 等）は axe の WCAG ルールと一致せず拾えない。ハーネスの主目的『AI生成コードの検知』に対し検証経路が無いのは事実。severity だけ調整: MIT/Public の DS であり本番セキュリティ影響は無く、html-attr ルールの過半は axe で間接的に拾える種類（aria/scope/tabindex）なので critical までは行かず high が妥当。

### D1-04 — design:check は生成コードを一切見ず contract JSON 内 class のみ検証（カバレッジの構造的死角）

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D1-検知カバレッジ / proven: **True**
- **claim**: npm run design:check は 28 contract の 250 class 文字列を走査するだけで、AI が実際に生成する .tsx/.jsx/.vue/.html を CI で検査しない。hook は .html 限定かつ tsx/jsx/vue 対象外。つまり『AI生成物の検知』というハーネスの主目的に対し CI 経路が存在しない。
- **evidence**: validate.ts:515-545 は contractFiles のみループ。hook-check-rule.sh:14-17 は *.html 以外 exit 0。実測 design:check は '28 contract / 250 class 文字列を走査、違反 0 / PASSED'。
- **repro**: npx tsx scripts/design/validate.ts → errors=0 PASSED（contract 内に違反が無いことを言っているだけで生成コードは無関係）。hook に tsx を食わせると拡張子で exit 0 になる（hook-check-rule.sh:15 *.html case のみ）。
- **fix**: (1)hook の対象拡張子を *.html|*.tsx|*.jsx|*.vue に拡張し、className=/class: の抽出正規表現を足す（JSX は className、Vue は :class も）。(2)CI に『生成物 lint』ステップを新設：リポ内のサンプル/ベンチ成果物 or PR diff の対象拡張子を validate と同じ matcher に通す design:lint-output コマンドを追加。(3)tailwind の任意値・テンプレートリテラル class は静的抽出限界があるため、eslint-plugin or AST(typescript) ベースの className 抽出に寄せると堅い。
- **検証結論**: 最も構造的で正鵠。validate.ts:322-331/515 は *.contract.json のみ readdir してループ、design:check 実行で『28 contract / 250 class 文字列を走査』PASSED を確認＝contract 内の自己整合のみ。hook は *.html case 以外 exit 0 で tsx/jsx/vue 非対象。benchmark score.ts は CI 未接続（.github/workflows に benchmark 無し、npm run benchmark 手動のみ）。axe テストは docs/index.html ショーケース固定。結果、AI/consumer が生成する .tsx/.jsx/.vue/.html を CI で lint する経路が存在しない。これが D1-01/02/03 が個別症状として現れる根本原因。反証は見つからず。MIT/Public DS であり『consumer の生成物まで CI で検証する』のは責務外という解釈の余地はあるが、README/DESIGN が掲げる『AIにも読める＝AI生成物を検証する』設計思想に対して経路欠落は実在。high 維持。

### D2-01 — arbitrary値(text-[#000000]/bg-[#3b82f6])で色・影・font-weight禁止を完全回避

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D2-detector回避 / proven: **True**
- **claim**: tailwind arbitrary syntax で書くと視覚的に text-black/bg-blue-500/shadow-2xl/font-light/rounded-none と同一でも、pattern が literal 'text-black' 等の substring マッチなので一切ヒットしない。AIが #000 や #3b82f6 を arbitrary で吐く確率は高く、最も現実的な抜け穴。
- **evidence**: hook-check-rule.sh の判定は cls.includes(p)（p='text-black' 等）。/tmp/d2-evasion/evade1-arbitrary.html に text-[#000000] bg-[#3b82f6] shadow-[...] font-[300] rounded-[0px] text-[rgb(156,163,175)] border-l-[4px] を記述。rules.json の tailwind系24ルールに arbitrary値の正規化処理は皆無。
- **repro**: echo '{"tool_input":{"file_path":"/tmp/d2-evasion/evade1-arbitrary.html"}}' | bash scripts/design/hook-check-rule.sh → 出力なし(0件)。対して direct.html(class="text-black bg-blue-500 shadow-2xl font-light tracking-tight rounded-none")は8件検知。
- **fix**: detector に arbitrary値正規化レイヤを追加: (a) text-[#000000]/text-[#000]/text-[rgb(0,0,0)] を hex/rgb 正規化し tokens.json の許可パレットに無い色を error にする (b) bg-[...] box-shadow arbitrary を spacing/shadow トークンと突き合わせる (c) font-[100..300] / rounded-[0px] / border-l-[4px] を対応する禁止 literal にマッピング。最低限 'text-[' 'bg-[' 'shadow-[' を含む class を検出したら『arbitrary値はトークン経由に』と warn する allowlist 方式を入れる。
- **検証結論**: 実証済み。hook の cls.includes('text-black') は base 'text-[#000000]' にヒットせず repro で 0 件確認。反証を狙って他層を当たったが、validate.ts は matcher.ts の exact-base 一致（ctx.base === pattern）でむしろ arbitrary を絶対に拾わず、かつ contract JSON しか見ないので生成物に無関係。benchmark score.ts も class="..."+includes で同じく素通り。決定打: DESIGN.md の Quick Ref 自身が text-[1rem]/text-[0.875rem] を正規記法として推奨しているため、AI が arbitrary を吐くのは『異常系』ではなくむしろ正常運用の延長で、#000 を text-[#000000] と書く確率は現実的。『わざと許容』の線も検討したが、7原則(Semantic Color/3-Color)は色のハードコードを明確に禁じており意図的許容ではない＝純粋な検知漏れ。severity は high 妥当（最頻出かつ視覚的に完全同一の違反をすり抜ける）。

### D2-03 — tsx/jsx/vue は拡張子フィルタで即 exit 0、byte-identicalな違反でも完全無検査

- **重大度**: 初期 `critical` → 検証後 **`high`**（confidence: high） / 次元: D2-detector回避 / proven: **True**
- **claim**: hook は case "$FILE_PATH" in *.html) ;; *) exit 0 で .html 以外を即スキップ。className="text-black bg-blue-500 shadow-2xl ..." と .html の class= と同一文字列でも、tsx/jsx/vue で書けば 100% 素通り。実プロダクトの生成物は tsx が主流なので、これが最大の盲点。
- **evidence**: hook-check-rule.sh 16-19行目の case 文。/tmp/d2-evasion/Component.tsx は direct.html と同じ禁止クラス（className化）。Component.jsx/Component.vue も同様。validate.ts も生成コードを読まない(contracts JSONのみ)ため二重に無防備。
- **repro**: Component.tsx/.jsx/.vue を hook に投入 → 全て0件。direct.html(同一クラス)は8件。さらに同一 .html 内でも className=/single-quote class='' は /class="..."/ に当たらず0件（evade-classname.html / evade-singlequote.html で確認）。
- **fix**: (a) 対象拡張子を .html,.htm,.tsx,.jsx,.vue,.astro,.svelte に拡張 (b) 抽出正規表現を class/className 両対応かつ single/double/backtick quote 対応へ（/class(Name)?\s*=\s*["'\`]([^"'\`]*)/g）(c) 恒久対策として ESLint plugin or AST(tsx は @babel/parser / vue は compiler-sfc)で JSXAttribute name=class/className の値を解析し、テンプレートリテラル・条件式の各分岐 literal も走査。CI に design:lint-generated を新設し PR で生成コードを必ず通す。
- **検証結論**: 実証済み。case *.html) ;; *) exit 0 を 16-17 行目で確認、Component.tsx は repro で 0 件(同一クラスの direct.html は 6 件)。これが最大の穴である点も支持: 実プロダクト生成物は tsx/jsx が主流で、byte-identical な違反が拡張子だけで 100% 素通りする。反証を全層で試したが防御ゼロ — validate.ts/drift は contract のみ、benchmark は .html 前提、Playwright は showcase のみ。single-quote/className 抽出漏れ(class="..."のみマッチ)も .html 内ですら追加の穴。ただし severity critical → high に調整: melta は現状『Tailwind CDN + .html 単体生成』を主用途として明示(DESIGN.md/CLAUDE.md)しており、tsx パイプラインは現リポのスコープ外＝『未実装』であって『壊れている』ではない。設計思想上の前提を踏まえると critical はやや過大、高インパクトの未カバー gap として high が妥当。

### D3-03 — ai-pattern が2件のみで、AI生成UIの最頻 tell（hardcoded color / purple gradient / カードネスト / feature-cardテンプレ）を禁止していない

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D3-カテゴリ盲点 / proven: **True**
- **claim**: melta は『meltaらしさ＝AI生成のダサさを潰すDS』を名乗るのに、ai-pattern カテゴリは border-t-4 / border-l-4 の2件だけ。複数のAIアンチパターン記事が口を揃える『purple→blueグラデ』『#333等のhardcoded color』『カードの中にカードを3階層』『rounded-square icon上に見出しのfeature-cardテンプレ』のどれも禁止していない。COLOR_ONLY_FORBIDDEN はあるが任意HEX hardcoded(bg-[#...])は別軸。
- **evidence**: ai-pattern=2件(AI_NO_CARD_COLOR_BAR_TOP/LEFT)のみ。grep で gradient/from-/to-/bg-gradient を pattern に持つルール=0、bg-[# 等 arbitrary value hardcoded を禁じるルール=0（COLOR_ONLY_FORBIDDEN は tailwindのcolor名限定で arbitrary value をカバーしない）。WebSearch(GenDesigns/BSWEN/prg.sh): purple gradient と hardcoded #333 がAI生成の二大tellと一致。
- **repro**: python3: category=='ai-pattern' → ['AI_NO_CARD_COLOR_BAR_TOP','AI_NO_CARD_COLOR_BAR_LEFT'] のみ。grep -i 'gradient\|from-\|bg-\[' rules.json の pattern フィールド → 0件。テスト: /tmp の bg-gradient-to-r from-purple-500 を含むhtmlをhookに食わせても検知されない（該当ルール不在）。
- **fix**: ai-pattern を厚くする（全て detector を class に倒せるので hook 検知可）: {id:AI_NO_GRADIENT_BG, category:ai-pattern, detector:tailwind-class-prefix, pattern:'bg-gradient-', severity:error, alternative:'単色 bg-slate-50 等。装飾グラデは使わない'} / {id:AI_NO_PURPLE_VIOLET, category:ai-pattern, detector:tailwind-class-prefix, matchPatterns:['bg-purple-','text-purple-','bg-violet-','from-purple-','to-blue-'], alternative:'primary トークン経由の色のみ'} / {id:AI_NO_ARBITRARY_HEX_COLOR, category:ai-pattern, detector:tailwind-class-prefix, pattern:'bg-[#', alternative:'tokens.json のカラートークン(bg-primary-600等)を使う。hardcoded HEX禁止'} / {id:AI_NO_NESTED_CARD, category:ai-pattern, detector:manual, alternative:'border+shadowのカードを2階層以上ネストしない'}。
- **検証結論**: 最も実体のある穴。全層を突き合わせて反証を試みたが守りが無かった。(1) rules.json ai-pattern=2件(border-bar top/left)のみ。(2) hook 実機テストで bg-gradient-to-r from-purple-500、bg-[#333333]、text-purple-600 が全て素通り(MOTION_NO_LONG_DURATION の1件しか発火せず)を確認。(3) SSOT である prohibited.md を grep しても gradient/purple/violet/bg-[#/hardcoded hex/nested-card いずれも0件(nestは『モーダル2階層』のみでカード非対象)。(4) benchmark rubric にも該当項目なし。(5) design-review skill のチェックリストにも無い。つまり doc/enforced/benchmark/human-review の全層で AI生成の二大tell(purple gradient・hardcoded hex)が完全に無防備。これは『AI生成のダサさを潰すDS』を名乗る melta の中核思想に対する直接の盲点で、わざとではなく欠落。fix案は全て tailwind-class-prefix で書けて hook検知可能になるので費用対効果も高い。severity high 維持。COLOR_ONLY_FORBIDDEN が arbitrary value を拾わない指摘も正しい(hook の substring一致は class名内包なので bg-[#... は color名ルールに引っかからない)。

### D3-07 — 薄いカテゴリ以前に『65/89ルール(73%)が runtime検知不能』で、カテゴリ追加してもmanual/html-attrに倒れると素通りする構造問題

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D3-カテゴリ盲点 / proven: **True**
- **claim**: D3で新カテゴリ(state/responsive)を足しても、それらは性質上 detector=manual になりがちで、melta の唯一の生成コード検査(hook-check-rule.sh)は tailwind-class(-prefix)の24件・.htmlのみ・substring一致しか見ない。現状すでに html-attr10+manual55=65件(73%)が hook/matcher で false 固定。薄いカテゴリを埋めるなら『detector を class に倒せる形に再設計』までやらないと盲点は閉じない。
- **evidence**: matcher.ts:108 コメント『html-attr / manual: class matching では検出不可（false）』。matches() は html-attr/manual を実質 return false。hook-check-rule.sh は detector が tailwind-class(-prefix) のものだけループ。実測: /tmp/d3_test.html に tabindex=3(html-attr) と layout table(manual) と placeholder-only(manual)を入れても hook は class系5件しか検知せず html-attr/manual違反は0件報告。
- **repro**: echo '{"tool_input":{"file_path":"/tmp/d3_test.html"}}' | bash scripts/design/hook-check-rule.sh → MOTION/TYPO/AI の class系5件のみ検出、tabindex="3"(A11Y_NO_TABINDEX_POSITIVE, html-attr)とlayout table(TABLE_NO_LAYOUT_TABLE, manual)とplaceholder-only は無検出。npm run design:check は『自動検出可能32件(24ルール展開)』と表示＝残りは静的検査外。matcher.ts:108で構造確認。
- **fix**: (1) html-attr 10件は実装容易: hook-check-rule.sh に html.matchAll(/(scope|role|aria-current|aria-label|tabindex)=...) の属性検査ブランチを追加し detector:html-attr を有効化（TABLE_TH_SCOPE/A11Y_NO_TABINDEX_POSITIVE等が即検知可能になる）。(2) 新規 state/responsive ルールは可能な限り tailwind-class-prefix で書く（grid-cols-N, w-[, z-[, bg-gradient-, bg-[# 等）。(3) hook を .html だけでなく .tsx/.jsx/.vue にも拡張し className=/class= 両方を走査（case文に追加）。(4) manual に倒れる STATE_NO_MISSING_EMPTY_STATE 等は benchmark の rubric(evaluation.md)に採点項目として明示し、静的検知できない分を生成評価でカバーする二段構えにする。
- **検証結論**: 構造問題として完全に実証済みで、これが他findingの真の根。matcher.ts と hook-check-rule.sh を読み、hook は detector が tailwind-class(-prefix)のもの(24件)だけをループし、.html のみ、class substring一致のみであることを確認。実機テストで html-attr の tabindex=3、manual の layout-table が無検出、class系のみ発火を再現。html-attr10+manual55=65件(73%)が runtime無検知という集計も正確。重要なのは、この層構造のため D3-01/02/05 の fix を manual で足しても素通りする=findings の核心が正しい。fix の優先度評価も妥当: (1)html-attr10件の属性検査追加は実装容易で TH_SCOPE/tabindex 等が即検知可能、(2)新ルールは可能な限り prefix で書く、(3)hook を tsx/jsx/vue に拡張、(4)manual残差は benchmark rubric で二段構え。ただし『カテゴリを埋めるなら detector再設計まで』という結論は正しいが、manual=62% 自体は『機械検知できない判断ルールは doc/benchmark/human review に委ねる』という多層防御の正常な姿でもあり、73%全てが盲点なのではなく『新規追加分を manual に倒すと盲点になる』という条件付き問題として捉えるべき。severity high 維持。

### D4-01 — 合成崩壊HTMLが3層すべてを違反ゼロで通過（ネストモーダル/4階層カード/CTA×12/6色）

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D4-合成パターン階層 / proven: **True**
- **claim**: 個々のコンポーネントが全て合法な class のみで構成されていれば、モーダル内モーダル・カード4階層ネスト・primary CTA を12個並列・1画面6色という明確なパターン崩壊があっても、hook/design:check/benchmark scorer のいずれも違反を検知しない。検知器が単一class文字列マッチに閉じているため、要素間の関係・出現回数・ネスト深さ・色の種類数といった『合成』の次元を一切見ていない。
- **evidence**: scripts/design/hook-check-rule.sh はnodeワンライナーで class を Set 化し rule.detector が tailwind-class/tailwind-class-prefix のものだけ cls.includes(p) で判定（要素間関係なし）。design/benchmarks/score.ts:42-46 も同様に r.pattern && [tailwind-class,tailwind-class-prefix] のみ filter。scripts/design/validate.ts はそもそも contract JSON のスキーマ整合のみで生成HTMLを読まない（design:check 出力『28 contract / 250 class 文字列を走査』）。matcher.ts/src/scripts/skills 全体に countDistinct/colorCount/nestDepth/siblingCount 系の語が grep でゼロヒット。
- **repro**: /tmp/d4/compose-broken.html を作成（CTA×12, role=dialog のネスト, bg-white border rounded-lg p-6 を4重ネスト, text-{primary-500,red-500,green-600,amber-500,purple-600,pink-500}）。(1) hook: echo '{"tool_input":{"file_path":"/tmp/d4/compose-broken.html"}}' | bash scripts/design/hook-check-rule.sh → 出力なし・exit 0。(2) 陽性対照 /tmp/d4/single-violation.html(text-black/bg-primary-400) は同hookで『⚠️ 禁止パターン検出(2件)』を出すので hook 自体は生きている。(3) scoreHTML(compose-broken) → {ruleViolations:0, prohibitedPatterns:0, totalScore:80}（npx tsx /tmp/d4/score-test.ts）。(4) npm run design:check → PASSED（生成HTMLは対象外）。
- **fix**: 合成レベルの lint を新設する。rules.json に detector:'dom-structure' / 'composition-metric' を追加し、(a) ネスト深さ: role=dialog の入れ子、同一カードパターン(border rounded p-N)のN階層超を検出、(b) 出現回数: 同一画面内 bg-primary-500 ボタン数 > 1〜2 を warn（CTA階層崩壊）、(c) 色種類数: text-/bg- の色相トークン distinct count > 3 を warn（rubric『1画面3色以内』の機械化）。実装は cheerio 等でHTMLをDOMパースし、hook-check-rule.sh と score.ts の両方から呼べる共通 composition-lint モジュールに切る。
- **検証結論**: 実証完全再現。compose-broken.html（CTA×12 / role=dialog 2重 / カード4階層 / 6色）を hook に食わせると exit0・出力ゼロ、陽性対照(text-black/bg-primary-400)は『禁止パターン検出2件』を出すので hook は生きている。scorer は totalScore 85・ruleViolations0・prohibitedPatterns0（findings の80とは数値差あるが合法トークン多用で正シグナル積み上げという主張は不変）。design:check は contract JSON の class 文字列のみ走査し生成HTMLを読まない。grep で nestDepth/countDistinct/colorCount/siblingCount/composition/nested-dialog 系がscripts/src/tests/design全域でゼロヒット。Playwright(showcase.spec/matcher.spec)は showcase ページ自身にしか走らず生成物を検査しない=別層カバーなし。3層すべてが単一class文字列マッチに閉じているのは構造的事実で、合成次元(関係/回数/ネスト/色数)は誰も見ていない。これは未カバーの穴として実在。

### D5-01 — axe-coreがインタラクション後の動的DOMを一切検査しない（初期ロード1ショットのみ）

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: showcase.spec.ts の axe 呼び出しは page.goto 直後の静的DOMに対して1回 .analyze() するだけ。モーダルを開く・アコーディオンを展開する・タブを切り替える・トーストを発火する、といったインタラクション後の状態にaxeを当てる箇所が皆無。よって『開いたモーダルにフォーカスが移っているか』『展開したパネルが見えてaria-expanded=trueに変わったか』等の動的a11yは検査対象外。
- **evidence**: tests/showcase.spec.ts:46-51（AxeBuilder(...).analyze() の前に click/press 等のインタラクションなし）。tests全体で click/keyboard/press/focus()/Tab/hover() を grep → NONE FOUND。docs/index.html には <script> 5個・イベントハンドラ149件があり実際にインタラクティブだが、axeはその初期状態しか見ない。
- **repro**: grep -rn 'click|keyboard|press|focus()|Tab|Escape|hover()' tests/ → NONE FOUND。npx playwright test → 45 passed、axeテストは 1.1s で初期DOMのみ評価。
- **fix**: showcase.spec.ts に動的axeテストを追加：(1) モーダルトリガーを click → page.locator('[role=dialog]') を待つ → その状態で new AxeBuilder({page}).include('[role=dialog]').analyze() を実行。(2) アコーディオン trigger を click 後に axe再実行。(3) タブを ArrowRight で移動後に axe。各動的状態を別 test.step に分け、開いた状態のコントラスト/ロール整合をaxeで拾えるようにする。
- **検証結論**: 実証で確認: showcase.spec.ts:46-51 の AxeBuilder は page.goto + waitForLoadState('networkidle') 直後の静的DOMに1回 .analyze() するのみ。tests/ 全体で click/keyboard/press/focus/Tab/hover は grep NONE。axe は原理的に動的状態(開いたモーダル/展開パネル)を見ない。他の防御層の検討: (a) benchmark rubric に a11y 15% があるが runner.ts は CI 非搭載(design-check.yml に無い)で手動実験ハーネス、しかも score.ts は aria-label の文字列presenceを+5するだけの粗いヒューリスティックで動的axeの代替にならない。(b) drift-check は件数照合のみ。よって動的状態のa11yはCI上で完全に未カバー。severityは high 妥当(critical までは行かない: 初期DOMの静的axeは効いている部分カバーがある)。

### D5-02 — hook-check-rule.sh が html-attr / manual detector を全無視（aria属性ルール24個が生成コードで未検知）

- **重大度**: 初期 `critical` → 検証後 **`high`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: PostToolUse hook は rule.detector が tailwind-class / tailwind-class-prefix のものだけを評価し、html-attr(10) と manual(55) を完全にスキップする。つまり MODAL_FOCUS_TRAP_REQUIRED / MODAL_ESC_CLOSE_REQUIRED / SKELETON_ARIA_BUSY_REQUIRED / TAG_X_ARIA_LABEL_REQUIRED / STEPPER_ARIA_CURRENT_REQUIRED / BTN_ICON_ONLY_ARIA_REQUIRED 等の a11y必須属性ルールは、AI生成HTMLに対して一切発火しない。contractで error severity を宣言していても runtime では素通り。
- **evidence**: scripts/design/hook-check-rule.sh:44-45 `if (!rule.pattern || !['tailwind-class','tailwind-class-prefix'].includes(rule.detector)) continue;`。rules.json実測で html-attr=10/manual=55 はこのcontinueで全除外。
- **repro**: /tmp/d5-modal-broken.html に focus-trap無し dialog・aria-live無し role=status・aria-controls無し aria-expanded button を書き、echo '{"tool_input":{"file_path":"/tmp/d5-modal-broken.html"}}' | bash scripts/design/hook-check-rule.sh → 出力空・EXIT=0（違反ゼロ検知）。
- **fix**: hook に html-attr detector の最小実装を足す：role=dialog を検出したら同要素配下に focus-trap マーカー(data-focus-trap 等)とaria-modal/aria-labelledbyの有無を確認、role=status/alert検出時にaria-liveの有無を確認、aria-expanded検出時にaria-controlsの有無を確認。属性のpresence/ペア整合は正規表現+簡易DOM(node:html parser)で機械判定可能なので manual から html-attr へ昇格させ、hookに rule.detector==='html-attr' 分岐を追加する。
- **検証結論**: hook-check-rule.sh:44-45 の continue 条件を実証再現。/tmp/d5-modal-broken.html(focus-trap無し dialog・aria-live無し role=status・aria-controls無し aria-expanded) を食わせて出力空・EXIT=0 を確認。さらに踏み込むと穴はもっと深い: html-attr 10ルールは『hookがスキップ』以前に全て pattern=null で、validate.ts:277-278 でも manualOnly バケットに落ちてどの層でも検査されない(design:check は構造整合のみ)。ただし severity を critical→high に下げる: (1) hookは PostToolUse の助言注入であり物理ブロックではない=『生成コードのa11yゲート』として元から弱い設計。(2) これら属性ルールは『AI生成HTMLを走査する仕組み自体が melta に存在しない』という設計上の既知の限界(validate.tsはcontract内class文字列のみ走査)であり、hook固有のバグというより層の不在。critical(=本番ユーザー被害が即時)というより high(検証層の穴)。fix の『manual→html-attr昇格して正規表現判定』は技術的に妥当だが、属性presence判定は簡単でもペア整合(aria-controls先のid実在 等)は簡易parserで誤検知リスクあり、過大評価気味。

### D5-03 — focus trap / focus return / ESCで閉じる / Tab循環 が一切テストされない（modal contractの宣言が未検証）

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: modal.contract.json は required に 'focus trap'、keyboard に Escape/Tab/Shift+Tab を宣言し MODAL_FOCUS_TRAP_REQUIRED/MODAL_ESC_CLOSE_REQUIRED を error で持つが、(a)モーダルを開いた時に最初のフォーカス可能要素にフォーカスが移るか、(b)Tabがモーダル内を循環し背後に抜けないか、(c)Escでモーダルが閉じるか、(d)閉じた後トリガーボタンにフォーカスが戻るか、を確認するテストが存在しない。これらはaxeでも原理的に検出不能（axeは静的ロール/属性しか見ない）でインタラクションテスト必須の領域。
- **evidence**: design/contracts/components/modal.contract.json a11y.required=['aria-labelledby','aria-modal=true','focus trap'], keyboard=['Escape','Tab','Shift+Tab']。rules.json: MODAL_FOCUS_TRAP_REQUIRED/MODAL_ESC_CLOSE_REQUIRED は detector=manual(=hook未処理・test未実装)。tests/ に Escape/Tab/focus の語が皆無。
- **repro**: grep 'Escape|Tab|focus()' tests/ → NONE。modal.contract.json の MODAL_* ルールは detector=manual で hook/validate/test いずれにも検証ロジックなし。
- **fix**: modal.spec.ts を新設：trigger.click() → expect(dialog).toBeVisible() → expect(page.locator('[role=dialog] :focus')).toBeVisible()（初期フォーカス）→ 連続 page.keyboard.press('Tab') を要素数+1回打って :focus が dialog 外に出ないこと(focus trap)→ page.keyboard.press('Escape') → expect(dialog).toBeHidden()（ESC close）→ expect(trigger).toBeFocused()（focus return）。Shift+Tab逆循環も同様に。
- **検証結論**: modal.contract.json で MODAL_FOCUS_TRAP_REQUIRED/MODAL_ESC_CLOSE_REQUIRED を error 宣言、a11y.required に 'focus trap'、keyboard に Escape/Tab/Shift+Tab を宣言。しかし当該6ルールは全て detector=manual ないし html-attr(MODAL_ROLE_DIALOG_REQUIRED)で hook/validate いずれも非実行、tests に Escape/Tab/focus は grep NONE。focus trap/return/ESC close/Tab循環は axe では原理的に検出不能でインタラクションテスト必須。他層の反証なし(benchmarkはCI外)。宣言だけ error で実体検証ゼロという『契約と検証の乖離』が実在。high 妥当。

### D5-08 — フォーム誤りのSR通知・色のみエラー・自動消滅エラーが全てmanualで未検証

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: form category 11ルール中 FORM_NO_COLOR_ONLY_ERROR / FORM_NO_AUTO_HIDE_ERROR / FORM_NO_DISTANT_ERROR / FORM_LABEL_REQUIRED 等の a11y核がすべて detector=manual。エラーメッセージが aria-describedby/aria-invalid/role=alert でSRに通知されるか、色だけでなくアイコン+テキストで示されるか、ユーザーが読む前に消えないか、を検証する層がゼロ。validate.tsはcontractのclassのみ、hookはmanualスキップ、testにフォーム送信→エラー表示の動的シナリオなし。
- **evidence**: rules.json: FORM_NO_COLOR_ONLY_ERROR/FORM_NO_AUTO_HIDE_ERROR は detector=manual。textfield.contract等のフォームエラー状態をインタラクションで誘発するテストがtests/に存在しない。form category 11ルールの多くがmanual。
- **repro**: rules.json でFORM_*の主要a11yルールがdetector=manual（python抽出で確認）。tests/に submit/invalid/aria-describedby の語なし(grep NONE)。
- **fix**: textfield.spec.ts: 不正値で送信トリガー → エラーメッセージ要素が role='alert' か aria-live を持ち、入力に aria-invalid='true' と aria-describedby=エラーID が付くことを assert。エラーがアイコン(SVG)+テキスト両方を含むこと（色のみでない）をDOM構造で確認。一定時間待ってエラーが消えないこと(auto-hide禁止)を検証。aria-describedby↔エラーIDの整合は機械判定可能なので FORM_ERROR_ARIA_DESCRIBEDBY を html-attr 化してhookにも載せる。
- **検証結論**: FORM_NO_COLOR_ONLY_ERROR/FORM_NO_AUTO_HIDE_ERROR/FORM_NO_AUTO_FOCUS_MOVE 等が detector=manual を実測確認。tests に submit/invalid/aria-describedby/role=alert は無し。フォームエラーのSR通知・色のみ禁止・自動消滅禁止を検証する層がゼロなのは事実で、これは『色のみでエラーを示さない(WCAG 1.4.1)』『エラーが読む前に消えない』というユーザー実害に直結する核。他層の反証なし(hook は manual スキップ実証済、validate は class のみ、benchmark は CI外)。fix の一部(aria-describedby↔エラーID整合の html-attr 化)は機械判定可能で妥当。high 妥当。

### D6-01 — rubric(evaluation.md)はコードから一度も使われず、自動スコアはCraft/Usabilityを測っていない

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D6-benchmark妥当性 / proven: **True**
- **claim**: evaluation.mdは5次元(Fidelity30/Craft25/Usability20/A11y15/Rule10%)の加重rubricを定義するが、benchmarkコードはscore.tsのregex 100点満点だけを使い、rubricを参照しない。Craft(余白/タイポ/洗練)とUsability(操作フロー)は定量化されておらず、判定ループ(LLM-as-judge/人手)も存在しない。スコアが何を意味するかとrubricの建前が乖離している。
- **evidence**: grep -rin 'rubric|judge|fidelity|craft|usability' design/benchmarks/*.ts providers/*.ts → 0件。score.ts は class regex と html.includes() の正シグナルのみ。runner.ts のreport出力も totalScore/ruleViolations/prohibitedPatterns だけで rubric 5次元は出力しない。
- **repro**: cd melta-ui && grep -rin 'rubric\|judge\|fidelity\|craft\|usability' design/benchmarks/*.ts design/benchmarks/providers/*.ts → 出力ゼロ(rubricはコードに無い)。score.ts全文に Craft/Usability の計測なし。
- **fix**: (a)生成HTMLをjudge LLM(別モデル・別providerで多重化、例 anthropic生成→openai判定)に evaluation.md のrubricで1-5採点させ、温度0・3回多数決でバイアスとブレを抑える。(b)judgeにはHTMLをレンダリングしたスクショ(Playwrightで撮る)も渡しCraft/Usabilityを視覚評価。(c)自動regexスコアはRule Compliance次元(10%)に限定し、総合スコアはrubric加重で算出するようrunner.tsを書き換える。
- **検証結論**: 実証済み。grep で rubric/judge/fidelity/craft/usability は design/benchmarks/*.ts と providers/*.ts に0件。score.ts(L38-115) は rules.json の tailwind 系 regex 違反カウント + html.includes() の正シグナル10個のみで、evaluation.md が定義する Fidelity30/Craft25/Usability20 の加重・judgeループは一切実装されていない。runner.ts のレポート出力(L278-285)も totalScore/ruleViolations/prohibitedPatterns だけで rubric 5次元を出さない。Craft(余白/タイポ/洗練)と Usability(操作フロー)は構造的に定量化されておらず、別レイヤ(test/hook/drift-check)もこれらを測らない。rubric は完全にドキュメント建前で、スコアの意味と乖離している。未カバーの穴として本物。

### D6-02 — score.tsはclass文字列限定でarbitrary値・inline styleの禁止パターンを検知できない＝red-teamを通過させる

- **重大度**: 初期 `critical` → 検証後 **`high`**（confidence: high） / 次元: D6-benchmark妥当性 / proven: **True**
- **claim**: score.tsの違反検出はrules.jsonのtailwind-class/prefixルール(literal includes)とpatternChecks(class="..."のregex)だけ。Tailwind JITのarbitrary値(bg-[#0a0a0f] shadow-[0_0_40px_#0ff] text-[#00ffff])やinline style(style="box-shadow:0 0 60px cyan")でネオン/グロー/巨大影を実装すると違反0・スコア50で素通り。R-1(neon)/R-2(heavy shadow)/R-3(color bar)のred-teamはまさにこの逃げ道で『拒否されたか』を測れていない。
- **evidence**: score.ts L43-68(autoRulesはtailwind-class系のみ)、L71-89(patternChecksはbg-blue-/shadow-2xl等の固定literalのみ、arbitrary色やstyle属性なし)。実証: neon arbitrary-value→total=50/violations=0、inline style→total=50/violations=0。
- **repro**: /tmp/d6-score-test.ts で scoreHTML('<div class="bg-[#0a0a0f] shadow-[0_0_40px_#0ff] text-[#00ffff]">') → {violations:0,prohibited:0,total:50}。inline style版も total:50。npx tsx /tmp/d6-score-test.ts の (D)(E) で再現。
- **fix**: (a)生成HTMLを本番の validate.ts / hook-check-rule.sh に実際に通す(score.tsで /tmp に書き出し→ hook-check-rule.sh に PostToolUse JSON を食わせ exit code と件数を回収)。(b)arbitrary値検出ルール(class内 [#hex] / [.*shadow.*] / [.*px.*glow] のregex)と style属性内の box-shadow/background hex/color スキャンを score と rules.json 両方に追加。(c)red-team合格条件を『禁止パターン0かつ DS正シグナルあり』の二項で明示判定する。
- **検証結論**: 検出器の穴自体は実証で確定。neon arbitrary値 → total=50/violations=0、inline style → total=50/violations=0(再現済み)。score.ts は class="..." literal/prefix と固定 patternChecks(bg-blue-/shadow-2xl 等)しか見ず、bg-[#0a0a0f] や style=box-shadow を完全に素通しする。本番 hook-check-rule.sh は .html を走査するが benchmark はそこへ通していない(D6-06)ので、red-team の『拒否されたか』を score 単体では測れないのは事実。ただし critical からは降格: 記録された実際の R1-v2.html を実検査すると neon arbitrary値0・primary-500 を9回使用しモデルは本当にネオンを拒否しており、結論『拒否』は HTML 内容(人手 review)で裏取りされている。つまり誤結論は起きていない=穴は『非準拠モデルが来たら検知できない潜在脆弱性』であって現状の判定を覆すものではない。red-team を score に頼る設計が脆い点は real なので high。

### D6-04 — 記録された実証はn=1・単一モデル・1回の実生成だけで、04-26は同一HTMLの再採点(独立サンプルでない)

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D6-benchmark妥当性 / proven: **True**
- **claim**: 実際に生成が走ったのは2026-04-11のstandard 1本+red-team R1/R2の計3〜4 HTML(Sonnet-4単一, n=1)のみ。2026-04-26のreportはfixture providerで同じ04-11由来HTMLを再採点しただけ(両日のHTMLがdiffで完全一致)。temperature/seed指定なし・同prompt反復なしで分散も出ていないため、Δ-5等の差がノイズか効果か区別できない。サンプル数も母集団も統計的主張に耐えない。
- **evidence**: results/2026-04-26/report.md は Provider:fixture, prompt 1本のみ, Δ-5。diff -q で 04-26 と 04-11 の 1-v1.html/1-v2.html が IDENTICAL。grep 'temperature' design/benchmarks/→0件。runner.ts は prompt毎に runOne 1回のみで反復ループなし。
- **repro**: diff -q results/2026-04-26/1-v1.html results/2026-04-11/1-v1.html → identical(両v1/v2)。grep -rin temperature design/benchmarks → 空。runner.ts L228-231 単一ループ。
- **fix**: (a)各promptを n>=3 回(temperature 0.7など固定明記)生成し、平均±標準偏差を report に出す。(b)モデルを最低2系統(Sonnet系/Opus系、可能ならGPT)で回し地力差とハーネス効果を分離。(c)再採点(fixture)は report に『replay/再生成なし』と明記し、独立runと混同しない。runner.ts に --trials N を追加。
- **検証結論**: 実証で完全確定。diff -q で 2026-04-26 の 1-v1/1-v2.html が 2026-04-11 と IDENTICAL(exit 0)=04-26 report は fixture provider による同一HTMLの再採点に過ぎず独立サンプルでない。grep temperature/seed は全 benchmark で0件。runner.ts は prompt 毎 runOne 1回(L228-231)で反復ループなし。n=1・単一モデル・分散なしで Δ-5 がノイズか効果か区別不能という統計的批判は妥当。これを救う別レイヤ(複数試行・複数モデル)は存在しない。

### D6-05 — 自動スコアでは1.0(ハーネス無し)が勝っており、ベンチはハーネスの効果を示せていない＝測定対象がズレている

- **重大度**: 初期 `high` → 検証後 **`high`**（confidence: high） / 次元: D6-benchmark妥当性 / proven: **True**
- **claim**: 両reportとも自動スコアは 1.0(旧CLAUDE.md) >= 2.0(DESIGN.md+contracts) で『1.0 Winner』。report自身が『元のCLAUDE.mdが十分良質でClaudeはprose禁止ルールも守る』『2.0の価値は自動スコアで測れない運用面にある』と認めている。つまり現状のbenchmarkは“ハーネス有無のA/B差分”ではなく“モデル地力＋prose指示の遵守力”を測っているだけで、ハーネス(contracts/MCP/hook/validate)の付加価値を定量化できていない。
- **evidence**: results/2026-04-11/report.md: 平均 1.0=93 vs 2.0=92, Winner=1.0。『自動スコアでは 1.0 ≒ 2.0』『2.0の価値は…運用面にある』と明記。results/2026-04-26/report.md: Δ-5 で 1.0 Winner。
- **repro**: 実証済HTML採点: 1-v1=95 vs 1-v2=90、R2-v1=90 vs R2-v2=90 (/tmp/d6-score-test.ts (A))。report.md の平均行で 1.0 が勝ち。
- **fix**: (a)ハーネスの本来の効果(『仕様変更追従』『agent-agnostic』『tool参照でルール把握』)を測れる指標に変える: 例 tokens.json/rules.json を意図的に1値変更し、v1(静的CLAUDE.md)とv2(contract+tool)で生成物が新値に追従するか率を測る drift-following ベンチを追加。(b)v2の差別化が出る難プロンプト(28コンポの未カバー領域・複合画面)を増やし、地力で差が出ない単純テーブルに依存しない。(c)report に『何を測ると2.0が勝つはずか』の仮説と測定指標を明記する。
- **検証結論**: 実証確定。両 report とも自動スコアで 1.0(旧CLAUDE.md) >= 2.0(DESIGN.md+contracts)、Winner=1.0。04-11 report 自身が『自動スコアでは 1.0≈2.0』『2.0の価値は自動スコアで測れない運用面にある』と明記=ハーネスの付加価値を定量化できていないことを著者が自認している。現状の benchmark は『モデル地力＋prose遵守力』を測っており『contract/MCP/hook/validate の効果』のA/Bになっていない。これを補う別の測定指標(drift追従ベンチ等)は未実装。測定対象がズレている穴は本物。ただし『ハーネスが無意味』ではなく『現ベンチでは効果が出ない設計』であり、深刻度は high 妥当(critical ではない=製品が壊れるわけではない)。

### D1-02 — TYPO_NO_XS_BODY 等、純粋な class リテラルなのに manual 指定で放置

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: high） / 次元: D1-検知カバレッジ / proven: **True**
- **claim**: text-xs(TYPO_NO_XS_BODY), outline-none(A11Y_NO_OUTLINE_NONE_WITHOUT_RING) は Tailwind class リテラルそのもので、既存 tailwind-class detector でゼロ追加実装で検知できるのに detector='manual' になっており素通りする。
- **evidence**: rules.json:169-177(TYPO_NO_XS_BODY pattern:null detector:manual) / :854-862(A11Y_NO_OUTLINE_NONE_WITHOUT_RING manual)。matcher の tailwind-class は base 完全一致でき text-xs/outline-none を問題なく拾える設計。
- **repro**: violations.html の <p class="text-xs"> と <button class="outline-none"> は hook 出力ゼロ。一方で同じ tailwind-class 機構で text-black は known.html で検出される＝機構は使えるのに rule 側が manual 指定で無効化されているのが原因と確認。
- **fix**: TYPO_NO_XS_BODY を detector:'tailwind-class', pattern:'text-xs', contractLint:'enforce' に変更（本文限定の文脈依存は requiresContext:true で warn 運用、または text-xs かつ p/span/li 親要素という二段判定を hook 側に実装）。A11Y_NO_OUTLINE_NONE_WITHOUT_RING は『outline-none を含むが同一class文字列に ring-/focus:ring を含まない』という否定条件付き detector を新設（detector:'tailwind-class-requires-sibling'）。
- **検証結論**: TYPO_NO_XS_BODY / A11Y_NO_OUTLINE_NONE_WITHOUT_RING が detector:manual / pattern:null で hook 素通りは実証済（violations.html で出力ゼロ）。ただし finding の核である『ゼロ追加実装で検知できる』は過大評価。(1) text-xs は prohibited.md / description が明示的に『for body text / 本文には』の文脈限定で、caption/badge の正当な text-xs を blunt exact-match すると誤検出する。finding 自身も requiresContext:true warn 運用や親要素二段判定を fix に挙げており『ゼロ実装』とは矛盾。(2) outline-none は『ring/focus:ring を同時に含まない』という否定条件付き detector が必要で、現 matcher.ts は base 完全一致 / prefix のみ対応、新 detector 種別（finding 自身が tailwind-class-requires-sibling を新設提案）＝非ゼロ実装。穴自体は実在するが『機構があるのに manual で無効化されてるだけ』という難易度評価が甘く、実態は新ロジック要。severity を high から medium に下げる。

### D1-03 — class リテラル/前置詞で表現可能な manual ルール群（約10件）が未 pattern 化

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: medium） / 次元: D1-検知カバレッジ / proven: **True**
- **claim**: SPACE_NO_DARK_SIDEBAR_BG(bg-slate-900系), DATEPICKER_Z_INDEX_20(z-50等の非z-20), DATEPICKER_NO_SHADOW_LG(shadow-lg), SKELETON_BG_SLATE_200_ONLY(bg-slate-200以外), STEPPER_NO_DARK_CONNECTOR, DIVIDER_NO_SLATE_400_PLUS(border-slate-400+), SPACE_NO_ROUNDED_XL_NAV(nav内rounded-xl), SPACE_NO_LARGE_NAV_ICON, STEPPER_MIN_INDICATOR_SIZE, TAG_X_MIN_TAP_TARGET は class 値 or 値域で表現でき、文脈（親要素/コンポーネント）を加えれば自動検知できる。今は全て manual で放置。
- **evidence**: rules.json 該当各ルール pattern:null detector:manual。DATEPICKER_NO_SHADOW_LG は description 自体に『汎用は SPACE_NO_SHADOW_LG で検出』と書いてあり、汎用版は tailwind-class で検知済＝datepicker文脈版だけ未実装という非対称。
- **repro**: violations.html の <aside class="bg-slate-900 w-64"> と <div class="z-50"> と nav内 <svg class="w-8 h-8"> は hook 出力ゼロで確認。ただし『文脈（sidebar/datepicker/nav）判定』部分は hook が未実装のため文脈付き再現は未実施。
- **fix**: 2段階。(1)文脈不要な値域系（DATEPICKER_NO_SHADOW_LG=shadow-lg, SKELETON_BG_SLATE_200_ONLY=bg-slate-[3-9]00, DIVIDER_NO_SLATE_400_PLUS=border-slate-[4-9]00 prefix）は tailwind-class/prefix へ即移行。(2)文脈依存系（sidebar/nav/datepicker）は contract.json の htmlSample 単位でコンポーネント種別が既知なので、hook ではなく contract lint 側（validate.ts の extractClassStrings ループ）に『このコンポ種別ならこの pattern 禁止』を scopedRule として追加し component contract 検証で止める。
- **検証結論**: 対象10ルールが detector:manual / null で hook 素通りは実証（bg-slate-900 / z-50 / nav svg w-8 出力ゼロ）。ただし内訳精査で『真の穴』と『既に別層カバー / 意図的冗長』が混在。DATEPICKER_NO_SHADOW_LG は description 自身に『汎用は SPACE_NO_SHADOW_LG で検出』と明記され、実際 violations.html の shadow-lg は generic ルールで検出済＝datepicker 版は文脈ラベル付き冗長エントリで、実クラス自体は守られている（真の穴ではない）。SKELETON_BG_SLATE_200_ONLY / DIVIDER_NO_SLATE_400_PLUS の値域系は prefix detector へ移行可能で真の未カバー。文脈依存系（sidebar/nav 内のみ NG）は現 class-only matcher では原理的に判定不能で、finding 自身が hook ではなく contract lint 側 scopedRule 実装を fix に挙げている＝非自明実装。混在のため medium。

### D1-05 — 原理的に静的検知不能な manual ルール（実行時/意味依存）はテスト側に寄せる方針が未明示

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: medium） / 次元: D1-検知カバレッジ / proven: **False**
- **claim**: MODAL_FOCUS_TRAP_REQUIRED, MODAL_ESC_CLOSE_REQUIRED, FORM_NO_AUTO_HIDE_ERROR, FORM_NO_AUTO_FOCUS_MOVE, A11Y_NO_TIME_LIMIT, LIST_NO_GESTURE_ONLY, DATEPICKER_KEYBOARD_NAV_REQUIRED, SKELETON_ARIA_BUSY_RELEASE などは挙動・JS実行時・意味判断に依存し静的 class/attr 検査では原理的に検知不能（カテゴリb）。これらが manual のまま放置され『ドキュメントに書いてあるだけ』で検証ループに接続していない。
- **evidence**: rules.json 該当ルール群はキーボード循環/Escハンドラ/タイマー有無/aria-busy の状態遷移など DOM の動的挙動を要求。tests/ は showcase.spec.ts と matcher.spec.ts のみ（focus-trap/Esc の E2E テスト無し）。
- **repro**: 静的検知不能であることの性質上、コマンド再現ではなく rule 内容とリポのテスト構成（tests/ に2 specのみ）からの判断。focus-trap 等を検証する Playwright テストが存在しないことは ls tests/ で確認可能だが本調査では未実行のため proven=false。
- **fix**: これらは detector を 'runtime-test' のような新カテゴリに再分類し、各ルールに対応 Playwright assertion（Tab循環/Esc押下でモーダル閉/aria-busy が false に遷移/タイマー不在）を tests/ に紐づける。axe-core で拾える一部（focus 可視性, aria 整合）は既存 axe テストの対象コンポーネントを28コンポ全件へ拡大する。rule JSON に testRef フィールドを足し『どの spec が担保するか』を SSOT 化して未テストルールを drift-check で検出可能にする。
- **検証結論**: focus-trap/Esc/timer/aria-busy 状態遷移など実行時挙動依存ルールが静的検知不能で manual 放置、tests/ は showcase.spec.ts と matcher.spec.ts の2本のみで focus-trap/Esc の E2E が無いことを ls で確認（finding proven:false だが本検証で裏取り）。反証検討: axe-core が CI で wcag2a/aa を docs/index.html に対して実行し focus 可視性・aria 整合の一部は拾うが、MODAL_FOCUS_TRAP / MODAL_ESC_CLOSE / A11Y_NO_TIME_LIMIT / SKELETON_ARIA_BUSY_RELEASE のような動的遷移は axe でもカバー外。ただしこれらは schema コメント『manual は自動検出不可』通り静的検知が原理的に無理なカテゴリで、manual 指定自体は誤りではない。穴の本質は『ドキュメント止まりで Playwright assertion / testRef に接続されていない』という未配線で、これは実在。意図的 manual と未配線の差を埋める finding の fix（runtime-test 種別 + testRef SSOT 化）は妥当。medium。

### D1-06 — manual ルールに『なぜ自動化しないか』のメタ情報が無く、放置と意図的manualが区別不能

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: high） / 次元: D1-検知カバレッジ / proven: **True**
- **claim**: manual 55件は『pattern化できるのに未着手(a)』『原理的に無理(b)』『test担保(c)』が JSON 上区別されておらず、contractLint:'skip' で一括無効化されているだけ。どれが本来CIで止まるべきかをツールが判定できず、カバレッジ低下が静かに進行する。
- **evidence**: rules.json: manual 55件すべて contractLint:'skip'。a/b/c を示すフィールド（automatable, detectionMethod 等）が存在しない。validate.ts:277-279 は detector!=='manual'||!pattern を機械的に manualOnly 集計するのみで質的区別なし。
- **repro**: node 実測で manual=55, html-attr pattern非null=0 を確認。JSON schema(design/schemas/rule.schema.json)上も automatable 区分フィールドは無い（validate が enum で弾く detector 4種のみ）。
- **fix**: rule.schema.json に automationStatus:['detectable-todo','impossible-static','covered-by-test'] を必須追加し、55 manual を棚卸し分類。validate.ts に『automationStatus=detectable-todo が N件以上あれば warn』のゲートを足し、未自動化の負債を可視化。detectable-todo がゼロに近づくよう CI で監視（カバレッジ回帰防止）。
- **検証結論**: manual 55件が全て contractLint:skip で、自動化可能(a)/原理的に無理(b)/test担保(c) を区別するフィールドが無いことを実証。schema に requiresContext は存在するが、それを使う6ルール（MOTION_NO_LONG_DURATION 等）は全て tailwind-class detector で、manual 55件中 requiresContext=true は0件＝この field は別目的で、manual の a/b/c 棚卸しには使われていない。detector enum コメント『manual は自動検出不可』は弱い意図シグナルだが質的区別フィールドではない。実在するが、これは検知の穴そのものではなくメタ情報/負債可視化の欠如で、放置と意図的 manual がツールで区別できず静かにカバレッジ低下が進むという保守性リスク。直接的な検知漏れではないため影響度は最小。medium。

### D2-02 — inline style属性は class正規表現の対象外で全違反が素通り

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: high） / 次元: D2-detector回避 / proven: **True**
- **claim**: style="color:#000;background:#3b82f6;box-shadow:...;font-weight:300;border-radius:0;letter-spacing:-0.05em" は class= を一切使わないため検出器の抽出対象にすら入らない。AIが Tailwind を諦めて inline style に逃げるのは頻出パターン。
- **evidence**: hook は html.matchAll(/class="([^"]*)"/g) のみ走査。style属性のパースは存在しない。/tmp/d2-evasion/evade2-inlinestyle.html で直書きと同一の違反を全て inline style 化。
- **repro**: echo '{"tool_input":{"file_path":"/tmp/d2-evasion/evade2-inlinestyle.html"}}' | bash scripts/design/hook-check-rule.sh → 0件。
- **fix**: inline style 検査器を追加: style属性を抽出し color/background/box-shadow/font-weight/border-radius/letter-spacing の値を tokens.json と突合。生 hex/rgb/px の禁止値（#000, font-weight<400, border-radius:0, letter-spacing<0, box-shadow の大判）を error 化。理想は『inline style 自体を philosophy 違反として warn』するルールを rules.json に新設（html-attr detector で style= の存在を検知）。
- **検証結論**: 実証済み(0件)。style 属性は hook/validate/score の全 class 抽出正規表現の対象外。反証として『別層が style を見るか』を確認したが、唯一 style に言及する showcase.spec.ts のコメントが『class 属性内の text-black を検出（style 属性は除外）』と明記しており、検知ではなく意図的スコープ外。axe の color-contrast も CI で disableRules 除外済み・かつ showcase ページ限定で生成物は対象外。ただし severity は high → medium に下げる: inline style 直書きは melta の運用フロー(Tailwind CDN 前提)から外れる『不自然な逃げ』で、arbitrary(D2-01)ほど自然発生しない。とはいえ Tailwind を諦めた AI が style= に倒すのは実在パターンで、未カバーは事実。

### D2-04 — CSS変数 + <style>ブロックで禁止値を定義しても無検査

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: high） / 次元: D2-detector回避 / proven: **True**
- **claim**: :root{--c-blue:#3b82f6} と .hero{background:var(--c-blue);font-weight:300;box-shadow:...} のように <style> 内で禁止値を定義すると、class名(.hero)は無害な文字列なので素通り。CSS本体は一切パースされない。
- **evidence**: hook は class属性値のみ抽出。<style>タグ内の宣言ブロックを読む処理なし。/tmp/d2-evasion/evade3-cssvar.html で再現。
- **repro**: echo '{"tool_input":{"file_path":"/tmp/d2-evasion/evade3-cssvar.html"}}' | bash scripts/design/hook-check-rule.sh → 0件。
- **fix**: <style> ブロックと .css ファイルを CSS パーサ(postcss)で解析し、color/background/box-shadow/font-weight 等の宣言値を tokens.json と突合する CSS-lint detector を追加。CSS変数も解決して最終値で判定。最低でも <style> の存在を検知し『生CSSはトークン経由に』と warn。
- **検証結論**: 実証済み(0件)。<style> ブロック / CSS 変数の宣言値は全層でパースされない。反証材料なし(postcss 等の CSS パーサはリポに存在しない)。ただし isReal は true だが severity medium 据え置きが妥当: CSS 変数 + <style> で禁止値を再定義するのは AI の自然な生成挙動ではなく、ほぼ意図的回避でないと起きない(Tailwind CDN 運用下で生 CSS を書く動機が薄い)。実在性は低いが、検知器が原理的に存在しない点は事実なので gap 自体は real。

### D2-05 — 動的class結合(template literal/clsx/文字列分割)を静的substringで追えない

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: medium） / 次元: D2-detector回避 / proven: **True**
- **claim**: 'text-' + 'black' や `bg-blue-${n}00` のように class名を実行時に組み立てると、ソース上に literal 'text-black' が現れないため substring マッチが空振りする。React/clsx 環境では常套手段。
- **evidence**: hook は静的 html 文字列の class= 値しか見ない。/tmp/d2-evasion/evade4-dynamic.html は <script> 内で 'text-'+'black','bg-blue'+'-500' を結合し innerHTML 注入。
- **repro**: echo '{"tool_input":{"file_path":"/tmp/d2-evasion/evade4-dynamic.html"}}' | bash scripts/design/hook-check-rule.sh → 0件。
- **fix**: 完全な静的追跡は困難だが緩和策: (a) AST で StringLiteral / TemplateLiteral の quasis を連結前後の断片単位でも禁止 prefix(text-,bg-,shadow-)と突合 (b) clsx/cn/classnames 呼び出しの引数 literal を抽出 (c) ビルド後の実 DOM/HTML スナップショット(Playwright)に対して検査を回す（tests/ にある showcase.spec の枠組みを流用し、レンダ後 class を axe 同様に走査）。静的で取り切れない分はランタイム検査でカバーする二段構え。
- **検証結論**: 実証済み(0件)。'text-'+'black' の実行時結合は静的 substring/exact-base のどちらでも追えない。これは静的解析の原理的限界であり melta 固有の欠陥とは言い切れない(どのlinterも完全には追えない)が、fix が認める通り Playwright レンダ後 DOM 検査という既存枠組み(showcase.spec)の流用で緩和可能なのに未実装、という点で gap は real。severity medium 妥当。confidence は medium に下げる: 実プロダクトで AI がここまで難読化した class 結合を生成する頻度は arbitrary(D2-01)/tsx(D2-03)より明確に低く、優先度は二段下。

### D2-07 — manual detector 55個(全体62%)はそもそもパターン無し=自動検知不能

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: high） / 次元: D2-detector回避 / proven: **True**
- **claim**: rules.json 89ルール中 detector=manual が55個。これらは pattern を持たずドキュメント記載のみで、hook も validate も一切検知しない。回避以前に『検知器が存在しない』状態。tailwind24個を堅牢化しても、禁止ルールの過半数は素通りのまま。
- **evidence**: タスク提供の実測(manual 55 / tailwind 24 / html-attr 10)。hook-check-rule.sh は detector が tailwind-class/tailwind-class-prefix のもの以外を continue でスキップ（!['tailwind-class','tailwind-class-prefix'].includes(rule.detector)）。html-attr 10個すら hook では未処理。
- **repro**: hook-check-rule.sh の node スクリプト内 if (!['tailwind-class','tailwind-class-prefix'].includes(rule.detector)) continue; を確認。manual/html-attr ルールはこの hook では評価されない。
- **fix**: (a) html-attr detector 10個を hook に実装（style属性・aria・特定タグの検査）。これは即できる。(b) manual 55個を棚卸しし、AST/CSSパーサ/Playwright DOM検査で機械化可能なものを detector 付きルールへ昇格。残る真に主観的なものだけ manual に残す。(c) manual ルールは『自動検知できない』ことを CI で可視化し、benchmark の rubric 採点(LLM-as-judge)に紐付けて間接検証する。
- **検証結論**: 実測一致を再検証で確認(manual 55 / tailwind-class 16 / tailwind-class-prefix 8 / html-attr 10、error74/warn15)。html-attr 10 個は pattern:null で hook の !['tailwind-class','tailwind-class-prefix'].includes(detector) continue により未評価＝実証通り。ただし isReal=true だが nuance を明記して severity を high→medium に下げる: (1) manual 55 のうち多くは本質的に主観判断(craft/余白/階層)で『自動検知不能なのは仕様』＝7原則の Content First/Minimal Elevation 系はベンチマーク rubric(LLM参照ドキュメント)で人間/judge が見る前提の意図的 manual 化。よって『55 個全部が穴』は過大評価。(2) 一方 html-attr 10 個(aria-current/role=dialog 等)は機械化可能なのに hook 未実装＝これは真の即修正可能 gap。(3) 重要な発見: benchmark の rubric(evaluation.md)は LLM-as-judge と書かれているが runner.ts は scoreHTML(class正規表現+includes)のみ呼び、rubric は自動採点に配線されていない＝『manual を benchmark で間接検証』という想定上の backstop も実際には機能していない。総じて gap は real だが『62% が穴』という frame は過大、実害は html-attr 10 個の未配線に集約されるため medium。

### D3-01 — レスポンシブ/ブレークポイント禁止軸がカテゴリごと欠落（rules.json に0件）

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: high） / 次元: D3-カテゴリ盲点 / proven: **True**
- **claim**: melta は『PCで正しく見えるがモバイルで崩れる』を1ルールも禁止していない。固定px幅、横はみ出し、ブレークポイント未対応のグリッドはすべて素通り。Material3/Polaris は『fixed幅にロックするな』『490px以下でbulk actionsを畳め』を明文化しているのに、melta の enforced contract 層(rules.json)には responsive/breakpoint/sm:/md: を含むルールが存在しない。
- **evidence**: rules.json 89件中 responsive/breakpoint/sm:/md:/mobile/viewport を含むルール=0件（python集計で 'NONE'）。CLAUDE.md:81 に patterns/responsive.md の存在はあるが、それは検証対象外のドキュメント層。enforced な rules.json には1件もない。category分布に 'responsive' / 'layout' カテゴリ自体が無い（color12 spacing14 form11 ... に対し layout崩れ系は0）。
- **repro**: cd /Users/tsubotax/My_Data/04_Development/melta-ui && python3 -c "import json;d=json.load(open('design/contracts/rules.json'));rules=d['rules'];print([r['id'] for r in rules if any(k in (r['id']+r['description']+str(r.get('pattern',''))).lower() for k in ['respons','breakpoint','sm:','md:','lg:','mobile','viewport'])])" → [] (空)。grep DESIGN.md でも責務はdoc層に逃げている。
- **fix**: rules.json に layout/responsive カテゴリを新設し、detector を tailwind-class(-prefix) に倒して hook で検知可能にする。追加案: {id:LAYOUT_NO_FIXED_PX_WIDTH, category:layout, detector:tailwind-class-prefix, pattern:'w-[', severity:warn, alternative:'w-full / max-w-* + min-w-0 で可変幅にする（モバイルではみ出し防止）'} / {id:RESPONSIVE_NO_OVERFLOW_X_HIDDEN_BODY, category:layout, detector:tailwind-class, pattern:'overflow-x-hidden', alternative:'横はみ出しはhiddenで隠さず、原因(固定幅/min-w-0欠落)を直す'} / {id:LAYOUT_NO_MIN_W_ZERO_MISSING はmanualになるので、代わりに} {id:RESPONSIVE_NO_DESKTOP_ONLY_GRID, category:layout, detector:tailwind-class-prefix, pattern:'grid-cols-[4-9]', severity:warn, alternative:'grid-cols-1 を base にし sm:/md: で段階的に増やす（モバイル前提のmobile-first）'}。さらに matcher.ts に『base に sm:/md: prefix が付かない grid-cols-N を検知』する responsive 専用 detector を追加するのが本筋。
- **検証結論**: 実証は正確。rules.json に responsive/breakpoint 系は0件、hook で grid-cols-6 や w-[1200px] が素通りすることを /tmp 実機テストで確認した。ただし『未カバーの穴』としては過大評価ぎみで severity を high→medium に下げる。反証材料: (1) patterns/responsive.md が実在し、モバイルファースト/44pxタッチ/段階的開示/サイドバーDrawer化まで詳細に規定されている=設計思想上わざと『判断ルール』をdoc層に置いている。melta はTailwind CDNベースの生成DSで、レスポンシブは固定class禁止より文脈依存の判断が支配的なため manual/doc に倒すのは合理的。(2) DESIGN.md のカードグリッド標準が `grid grid-cols-2 md:grid-cols-3` で md: prefix が正例として埋め込まれている=生成時のアンカーが効く。(3) prohibited.md:198 に『200%拡大時のテキスト切り詰め禁止』もある。穴は『enforced層(rules.json/hook)に降りていない』点に限定され、fix案の grid-cols-[4-9] prefix検知や overflow-x-hidden禁止は class detector化できるので部分的には妥当だが、責務はbenchmark rubricに responsive項目を足す方が筋。

### D4-02 — MODAL_NO_NESTED 等の合成ルールが detector:manual / pattern:null で『ドキュメントに書いてあるだけ』

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: medium） / 次元: D4-合成パターン階層 / proven: **True**
- **claim**: 合成崩れに直接対応するルール（MODAL_NO_NESTED=2階層以上禁止）は rules.json に error severity で存在するが detector:'manual', pattern:null, contractLint:'skip' のため、どの検証層でも発火しない。ルールが『ある』ことが安心材料になり実際には無防備という、最も危険な型の偽の安全。同様に nav 3階層以上禁止（patterns/navigation.md の表）も rubric『1画面3色以内』(evaluation.md:43) も機械検知ゼロ。error severity の manual ルールは43本あり、合成系はその一部。
- **evidence**: rules.json の MODAL_NO_NESTED = {severity:error, detector:manual, pattern:null, alternative:'設計を見直す（2階層以上禁止）', contractLint:skip}。patterns/navigation.md:33『3階層以上のネストナビ→2階層まで』は散文の表のみ。design/benchmarks/rubrics/evaluation.md:43『1画面3色以内』は人間用 [ ] チェックリスト。error severity かつ detector:manual のルールは計43本（=ドキュメント止まりで自動検知不能）。
- **repro**: node -e で rules.json から MODAL_NO_NESTED を抽出し pattern:null/detector:manual/contractLint:skip を確認。合成系 manual ルールの抽出と、error+manual の本数43をカウント。patterns/*.md を grep して『3階層以上のネストナビ』『モーダルのレスポンシブ』が散文のみであることを確認。
- **fix**: MODAL_NO_NESTED を pattern を持つ自動ルールに昇格させる（detector:'dom-structure', selector:'[role=dialog] [role=dialog]'）。同様に nav 階層・3色制限を D4-01 の composition-metric detector で機械化。あわせて『detector:manual かつ severity:error』のルールは CI で『未実装の error ルールが N 本』と可視化する drift-check を validate.ts に追加し、ドキュメント止まりルールが暗黙の安全感を生むのを防ぐ。
- **検証結論**: rules.json 実測でMODAL_NO_NESTED={severity:error,detector:manual,pattern:null,contractLint:skip}を確認、error+manual=43本も一致。どの検証層でも発火しないのは事実で『error severity のルールがあるのに無防備』という偽の安全は実在。evaluation.md:43『1画面3色以内』も human用 [ ] チェックリストのみで機械検知ゼロを確認。ただし減点要因2つ: (1) melta は『人間にもAIにも読める』DSで、manual ルールは契約を読むAIへのガイダンスとして doc-only が一部意図的な設計思想の側面がある(detector:manual=55個62%は仕様として割り切っている)。(2) 根本原因はD4-01と同一(composition detector 不在)で、独立した別の穴というより同じ穴の別側面。それでも『error表記が暗黙の安全感を生む』指摘自体は妥当でinvalidではない。severity は high→medium に調整。

### D5-04 — ライブリージョン(toast/aria-live)のSR通知が動的に検証されない

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: toast.contract.json は role=status + aria-live=polite + aria-atomic=true を required にするが、showcaseのトーストは初期DOMに静的に存在する形（aria-live 4箇所）でロードされており、『新規トーストがJSで後から挿入された時にaria-liveコンテナ経由でSRに読まれるか』という本来のライブリージョン挙動が検証されていない。axeは要素のロール/属性presenceは見るが『後から挿入されたノードがlive regionの子か』までは保証しない。toast contractは rules:[] でルールゼロ、hookも素通り。
- **evidence**: toast.contract.json a11y.required=['aria-live=polite','aria-atomic=true'] かつ rules=[]（ルール紐付けゼロ）。docs/index.html の aria-live は初期DOMに4件静的存在。tests に toast発火→aria-live確認のステップなし。
- **repro**: grep 'aria-live' tests/ → NONE。toast.contract.json の rules 配列は空でhook/validate対象ルール無し。/tmp実証(D5-02)で aria-live無し role=status が無警告通過。
- **fix**: toast.spec.ts を新設：トースト発火ボタンを click → 挿入されたトーストが aria-live='polite' を持つコンテナの子孫であることを expect(page.locator('[aria-live=polite] [role=status]')).toBeVisible() で確認。さらに自動消滅型なら『消える前に最低N秒表示される』（FORM_NO_AUTO_HIDE_ERROR相当）を待ち時間で検証。TOAST_ARIA_LIVE_REQUIRED ルールを新設し rules:[] を埋め、html-attr detector化してhookでも拾う。
- **検証結論**: toast.contract.json は rules:[] (ルール紐付けゼロ)を実測確認、a11y.required は aria-live=polite/aria-atomic=true。tests に aria-live は grep NONE。『後から挿入されたノードが live region の子か』はインタラクション検証が必要で未カバーなのは事実。ただし severity を high→medium に下げる: (1) live region の挙動は『静的DOMに aria-live コンテナが存在し、そこに後から子を挿す』実装パターンなら、初期DOMの aria-live presence は axe が見得る(showcase は実際 aria-live 4件を初期DOMに静的保持)ので最低ラインは担保。(2) 動的挿入の正しさはJS実装依存で、これは meltan の『静的契約でAI生成を縛る』思想の射程外(ランタイム挙動は契約で縛れない)。穴は実在するが影響度は modal の focus trap ほどクリティカルでない。

### D5-05 — 動的state遷移(aria-expanded/aria-selected)の整合がインタラクションで検証されない

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: accordion(aria-expanded)・tabs(aria-selected/tabindex management)・stepper(aria-current) は『クリック/キー操作で属性が正しく切り替わる』ことが本質だが、テストは初期DOMの属性presenceすら検査せず（axeも値の動的整合は見ない）。例えばアコーディオンtriggerをclickしてもaria-expandedがfalse→trueに変わるか、対応パネルがhidden解除されるか未検証。tabsの矢印キーナビ(ArrowLeft/Right/Home/End)とtabindex roving も未検証。
- **evidence**: accordion.contract.json a11y.required=['aria-expanded','aria-controls'], keyboard=[]。tabs.contract.json keyboard=['ArrowLeft','ArrowRight','Home','End'], required に 'tabindex management'。両者とも rules=[]。tests に aria-expanded/ArrowRight/aria-selected の語が皆無。
- **repro**: grep 'aria-expanded|ArrowRight|aria-selected' tests/ → NONE。accordion/tabs contractの rules 配列は空。
- **fix**: accordion.spec.ts: trigger を click → expect(trigger).toHaveAttribute('aria-expanded','true') かつ対応 panel が visible、再click で false かつ hidden。tabs.spec.ts: tablist にフォーカス → keyboard.press('ArrowRight') → 次タブが aria-selected=true・tabindex=0 になり前タブが tabindex=-1 になる(roving tabindex)、Home/End で端へ移動。これらは純粋にPlaywrightインタラクションで機械検証可能。
- **検証結論**: accordion.contract.json(rules:[], keyboard:[])・tabs.contract.json(rules:[], keyboard:['ArrowLeft','ArrowRight','Home','End'])を実測。tests に aria-expanded/ArrowRight/aria-selected は grep NONE。click/キー操作で属性が切替わる動的整合は未検証で事実。severityを high→medium: accordion は keyboard:[] と契約自身が宣言が薄く『矢印キーナビは契約していない』=tabsのrovingほど厳密要求が無い。tabs は keyboard 宣言ありだが、これも contract宣言と検証の乖離で D5-03 と同種・同根の問題(宣言した keyboard 挙動を検証する層が無い)。新規性はあるが modal ほどの重大度ではなく medium が妥当。

### D5-07 — 実レンダリングのコントラストが検証されない（axeのcolor-contrastをdisableしている）

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: showcase.spec.ts は color-contrast ルールを明示的に disableRules している（Tailwind CDN動的inline styleとの誤検出回避が理由）。結果、実レンダリング後の前景/背景コントラスト比(WCAG AA 4.5:1 / 3:1)がCIで一切担保されない。toast/tab/muted-text等の薄い配色（text-slate-400, text-emerald-800 on emerald-50 等）が基準を満たすかは目視頼り。color category はルール12個と厚いが全て『禁止class』であって『実コントラスト比』ではない。
- **evidence**: tests/showcase.spec.ts:48 `.disableRules(['color-contrast'])`。tabs.contract.json の bar-inactive は text-slate-400、toast info は text-primary-800 on bg-primary-50 等の薄色配色を許容。
- **repro**: showcase.spec.ts:48 を直接確認。axeテストはcolor-contrast除外で通過(45 passed)。
- **fix**: Tailwind CDN(JIT inline)をやめてビルド済みCSSをshowcaseにリンクすればaxeのcolor-contrastが正しく効く。短期策として、主要トークンの前景/背景ペア（tokens.jsonのsemantic color）をJSでWCAGコントラスト比計算する単体テスト(contrast.spec.ts)を追加し、4.5:1未満をfail。Don'tデモのexcludeはそのまま、本番ペアのみ対象にする。
- **検証結論**: showcase.spec.ts:48 .disableRules(['color-contrast']) を実測。実レンダリング後のコントラスト比は CI で一切担保されず、color category 12ルールは全て『禁止class』であって実比率ではない、という指摘は正確。Tailwind CDN JIT inline と axe static解析の噛み合わせ問題という disable 理由はコメントに明記されており『意図的』だが、それは回避策であって穴を塞いだわけではない。fix(主要semantic colorペアをJSでWCAG比計算する contrast.spec.ts)は CDN を外さずに実装可能で妥当。toast info の text-primary-800 on bg-primary-50 等の薄色配色が AA を満たすかは未検証。medium 妥当(本番配色のコントラストはユーザー実害に直結するが、トークン設計時点で概ね配慮されている前提で critical ではない)。

### D5-10 — contract a11yフィールドとtest/hookの紐付けゼロ（宣言の検証被覆率が機械担保されていない）

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: 28コンポーネントの contract が a11y.required/keyboard/role を宣言しているが、『その宣言項目が少なくとも1つのtestまたはhookルールでカバーされているか』を突き合わせる仕組みがない。modal/toast/tabs/accordion はいずれも rules=[]（または manual ルールのみ）で、宣言とCI検証の対応表が存在しない。新コンポーネント追加時にa11y宣言だけ書いてテスト未追加でも誰も気づけない。
- **evidence**: modal.contract.json は rules を6個持つが全て detector=manual で実行されない。toast/tabs/accordion は rules=[]（空）。validate.ts は a11y フィールドの存在(required配列にa11yがある)はチェックするが、宣言項目→検証手段の対応は未チェック。
- **repro**: validate.ts:334 の required に 'a11y' はあるが中身の keyboard/required 各項目の検証被覆チェックは無し。toast/tabs/accordion contractの rules=[] をcatで確認。
- **fix**: a11y-coverage.spec.ts（メタテスト）を追加：各 contract の a11y.keyboard と a11y.required を列挙し、対応する *.spec.ts にその挙動を検証するtest.stepが存在するか（命名規約 or アノテーション）を突き合わせ、未カバー項目を fail させる。最低限、a11y.required に 'focus trap' や keyboard に 'Escape' を持つcontractには対応spec必須、というlintをvalidate.tsの新セクションに足す。
- **検証結論**: modal は rules6個全て manual/html-attr(非実行)、toast/tabs/accordion は rules:[]空、を実測。validate.ts は contract.rules の ID が rules.json に存在するか(:354-358)と必須フィールド存在(:334)は見るが、a11y.required/keyboard の各宣言項目が test/hook で実際にカバーされているかの突き合わせは無い、という指摘は正確。これは D5-01〜09 を生む構造的根本原因(『宣言したa11yを検証する手段の対応表が機械担保されていない』)であり、メタレベルでは最も価値ある指摘。ただし severity medium: これ自体はユーザー実害でなくプロセスgap(回帰防止の仕組みの不在)。fix の a11y-coverage.spec.ts(命名規約で宣言↔spec突き合わせ)は実装可能だが、命名規約ベースの突き合わせは誤検知/メンテコストがあり過大評価気味。個別の D5-03/08 を埋める方が先で、D5-10 はその上位の仕組み化。medium 妥当。

### D6-03 — 正シグナルが文字列includesなのでコメント/隠し要素に詰めるだけで満点ゲーム可能

- **重大度**: 初期 `high` → 検証後 **`medium`**（confidence: high） / 次元: D6-benchmark妥当性 / proven: **True**
- **claim**: positiveSignalsは html.includes('primary-500') 等10個の素朴な文字列マッチ。HTMLコメントや非表示divに10語並べるだけで+50、違反0なら100点になり、実際に使えるUIが生成されたか・正しい場所で使われたかと無相関。逆に正規の良UIでも語彙が一致しなければ減点される。スコアの構成式(50+signal*5-violation*5-prohibited*10)が品質の代理指標になっていない。
- **evidence**: score.ts L92-106。実証: 10シグナル全部入りの無意味div→total=100。シグナルをコメントに入れ実prohibitedをclassに入れた gamed ケースでも prohibited3件あるのに total=55(50-30+加点で底上げ)。
- **repro**: /tmp/d6-score-test.ts (F): 意味のない単一div(全シグナル, 違反0)→total=100。(C): コメントにシグナル+classにbg-blue-700/shadow-2xl/text-black→total=55。npx tsx /tmp/d6-score-test.ts。
- **fix**: (a)正シグナルはコメント除去後のDOM上で、かつ要素の役割と紐付けて評価する(例: th に scope、icon-only button に aria-label が実際に付いているかを DOMパーサで検査)。(b)スコアを加点方式から『rubric judge採点 ＋ validatorのhard fail(error違反は即0/ゲート)』に変え、単純includesの加点ボーナスを廃止する。
- **検証結論**: ゲーム可能性は実証で確定。全シグナル入りの無意味 div → total=95(再現済み、UI として無価値でも満点近い)。positiveSignals は html.includes の素朴マッチで、要素の役割や DOM 位置と無相関。加点式(50+signal*5)が品質代理になっていないのは本物の穴。ただし claim 中の『コメントに詰めて prohibited を class に入れても底上げで55』のサブ主張は誇張: 再現(C)では prohibited 検出が効いて penalty が勝ち total=50 に落ち、コメント詰めによる『底上げ』は観測されなかった。中核(signal-stuffing で満点ゲーム可能)は真。別レイヤでも品質は測られないので未カバー。

### D6-06 — 生成HTMLを本番validator/hookに通さず、禁止パターンゼロが本物の検証で確認されていない

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: high） / 次元: D6-benchmark妥当性 / proven: **True**
- **claim**: benchmarkは独自のscore.ts regexで違反を数えるだけで、本番のscripts/design/validate.ts(design:check)やhook-check-rule.shに生成HTMLを通す処理が無い。よって『禁止パターンゼロ』はハーネス本体の検出器ではなくベンチ専用の弱い検出器でしか確認されておらず、本番hookが拾える違反/拾えない違反との整合も取れていない(2つの検出器が二重管理で drift する)。
- **evidence**: grep 'design:check|validate|hook-check|drift' design/benchmarks/*.ts → 0件。score.ts は rules.json を自前で再パースし独自judge。runner.ts も generated HTML を外部validatorに渡さない。
- **repro**: cd melta-ui && grep -rin 'design:check\|hook-check\|validate\|drift' design/benchmarks/*.ts → 出力ゼロ。
- **fix**: (a)score.ts/runner.ts から生成HTMLを /tmp に書き出し、echo の PostToolUse JSON を hook-check-rule.sh にパイプして exit code/件数を Rule Compliance スコアに採用する(本番検出器を単一の真実にする)。(b)CIに『benchmark生成物 → hook-check-rule.sh が0 violation』を assert する step を追加し、ベンチ独自regexは廃止 or hook結果の補助に降格。
- **検証結論**: 実証で stated より強く確定。grep で design:check/hook-check/validate/drift は benchmark に0件、生成HTMLを本番検出器へ通す処理なし。さらに validate.ts のヘッダを確認すると design:check は『rules/contract/token のスキーマ整合性 + check_rule のハードコード件数』を検証するもので、生成HTMLを一切スキャンしない=そもそも HTML linter ではない。HTML を走査する唯一の本番検出器 hook-check-rule.sh にも benchmark は接続していない。結果 score.ts の弱い自前 regex(D6-02 の穴持ち)と本番 hook が二重管理で drift しうる。別レイヤで担保されていない真の穴。severity は medium 妥当(運用統合の問題で、製品出力自体は本番 hook が .html を守る)。

### D6-07 — プロンプト網羅性の偏り: 28コンポ中3種(table/form/card)中心、24コンポ未検証＋multi-provider/tool発火は実体なし

- **重大度**: 初期 `medium` → 検証後 **`medium`**（confidence: high） / 次元: D6-benchmark妥当性 / proven: **True**
- **claim**: standardはテーブル/設定画面/ダッシュボードの3本で実質 table・form・card・badge しか叩かず、modal/tabs/toast/accordion/datepicker/stepper/tooltip 等24 contractは一度もベンチされない。red-teamも『色/影/ラベル省略』に集中し、motion/table/ai-pattern等の薄カテゴリは未カバー。さらにv2 contextは28中3 contract要約のみ、OpenAI providerはthrow stub、記録runの tool calls は全て0で、本番ハーネスのMCPツール参照機構は一度も発火していない。standard.md(prompts/)とprompts.ts も内容が食い違う(standard.mdのP3=求人検索/P4=モーダル/R-2=tiny button が prompts.ts に無い)二重管理。
- **evidence**: prompts.ts: standard 3本(顧客テーブル/設定/ダッシュボード)。contracts/components/ は28個。runner.ts L81 v2 context= button/card/table の3要約のみ。openai.ts は throw。report.md の Tool列/Tool Calls 全て0。standard.md と prompts.ts で prompt 構成が不一致。
- **repro**: ls design/contracts/components/*.contract.json|wc -l → 28。grep 'button.*card.*table' runner.ts → L81。report.md の Tool Calls=0。standard.md(P3求人/P4モーダル) vs prompts.ts(該当なし) を読み比べ。
- **fix**: (a)28 contractを最低1回ずつ叩く prompt セット(modal/tabs/toast/datepicker/stepper 等の複合画面)に拡充し、カテゴリ網羅マトリクスを作る。(b)v2 contextに全contract or MCP tool 経由参照を強制し、tool callsが実際に発火するrunを記録(現状の0を解消)。(c)OpenAI providerを実装するか、未実装なら『multi-provider』表記を撤回。(d)standard.md と prompts.ts を単一ソース化(prompts.tsを正にしstandard.mdを自動生成 or 削除)。
- **検証結論**: 多くが実証確定。contracts 28個に対し standard は 3本(table/form/card 中心)、v2 context(runner.ts L81)は button/card/table の3要約のみ=24 contract 未検証。openai.ts は throw stub(『multi-provider』は誇大)。prompts/standard.md(P3=求人検索/P4=確認モーダル)と prompts.ts(P3=ダッシュボード概要、modal 無し)が食い違う二重管理=確認済み。これらは別レイヤで担保されない網羅性の穴で real。ただし2点減点: (1) 記録 run の Tool Calls=0 は『MCP参照機構が一度も発火しない構造的欠陥』ではなく fixture replay の産物——anthropic.ts は MELTA_TOOLS 5個を実際に Claude API へ渡し tool_use ループを回す実装があるので、live anthropic run なら発火しうる。claim の『本番ハーネスのMCPツール参照機構は一度も発火していない』は fixture報告に限った話で構造批判としては過大。(2) 網羅の薄さは MVP段階としては意図的とも解せるが『28を最低1回』の網羅マトリクスが無いのは妥当な指摘。総合 real だが severity は medium に据え置き。

### D2-06 — @apply / 別CSSファイル参照で禁止Tailwindクラスを間接適用

- **重大度**: 初期 `medium` → 検証後 **`low`**（confidence: medium） / 次元: D2-detector回避 / proven: **True**
- **claim**: .btn-danger{@apply text-black bg-blue-500 shadow-2xl font-light} のように <style type="text/tailwindcss"> や別 .css の @apply で禁止クラスを束ね、HTML側は class="btn-danger" だけ書けば検出器は無害名しか見ない。
- **evidence**: hook は HTML の class属性のみ。@apply の中身(=禁止クラス文字列)を読まない。/tmp/d2-evasion/evade6-apply.html で再現。
- **repro**: echo '{"tool_input":{"file_path":"/tmp/d2-evasion/evade6-apply.html"}}' | bash scripts/design/hook-check-rule.sh → 0件。
- **fix**: <style> ブロックと .css/.scss を走査対象に追加し、@apply 行のトークン列にも同じ tailwind禁止pattern を適用。postcss-based detector で @apply の引数を class 同様に展開して突合。
- **検証結論**: 実証済み(0件)。@apply の中身は <style> 同様に全層で未パース。技術的には real gap。ただし severity medium はやや高い→ low 寄りで評価: <style type="text/tailwindcss"> + @apply で禁止クラスを束ねるのは melta の Tailwind CDN 運用(JIT @apply 非対応の構成)では実用上ほぼ発生せず、AI の自然生成でもまず出ない。D2-04 と同じ『原理的には漏れるが現実発生率が低い』カテゴリ。gap は認めるが優先度最下位。

### D3-05 — テーブルの『横スクロール/sticky header/カラム畳み』禁止軸が無い（table=2件、両方a11y/semanticsのみ）

- **重大度**: 初期 `medium` → 検証後 **`low`**（confidence: medium） / 次元: D3-カテゴリ盲点 / proven: **True**
- **claim**: melta の table カテゴリは TABLE_NO_LAYOUT_TABLE(semantics) と TABLE_TH_SCOPE_REQUIRED(a11y)の2件で、データ密度の高いテーブルがモバイルで崩れる/横はみ出す問題を全く扱っていない。Polaris/shadcn は『小画面ではカラムをカード化 or 横スクロール』『sticky header時のoverflow:visible衝突に注意』を明示。melta は overflow:visibleとposition:stickyの非互換も未言及。
- **evidence**: table=2件(TABLE_NO_LAYOUT_TABLE / TABLE_TH_SCOPE_REQUIRED)。データ密度/横スクロール/sticky を含むルール=0（grep density/sticky/overflow-x → table系該当0、overflowは TABLE外枠の DESIGN.md:105 書式のみ）。WebSearch(shadcn issue#1151): overflow親があると position:sticky が壊れる既知問題＝melta未統制。
- **repro**: python3: category=='table' → 2件。'sticky'/'density'/'overflow-x' を含むルール検索 → table カテゴリで0。DESIGN.md:105 の overflow-hidden は外枠書式の定義のみで sticky 互換性の禁止ではない。
- **fix**: {id:TABLE_NO_STICKY_UNDER_OVERFLOW_HIDDEN, category:table, detector:manual, severity:error, alternative:'sticky header を使うコンテナに overflow-hidden/auto を付けない（sticky が無効化される）。スクロールは内側要素で取る'} / {id:TABLE_NO_FIXED_PX_COLUMN, category:table, detector:tailwind-class-prefix, pattern:'w-[', severity:warn, alternative:'カラム幅は最小幅min-w-*とし、合計が狭画面を超える場合は親をoverflow-x-autoで横スクロール化（Polaris: small screenはhorizontal scroll）'} / {id:TABLE_NO_HIDDEN_DATA_NO_FALLBACK, category:table, detector:manual, alternative:'モバイルでカラムを隠す場合はカード表示等の代替を用意。単に display:none で情報欠落させない'}。
- **検証結論**: 部分的に実在するが過大評価。table カテゴリ2件(layout-table semantics / th-scope a11y)で密度/横スクロール/sticky を扱っていないのは事実で、prohibited.md/benchmark/rubric にも table のレスポンシブ崩れ統制は無い。ただし(1) sticky-under-overflow の非互換は manual detector でしか書けず hook検知不能=fix の実効性が低い。(2) テーブルのモバイル対応は D3-01(responsive)の特殊ケースで、responsive.md のモバイルファースト原則の射程に部分的に入る。(3) WebSearch由来の shadcn issue#1151 は外部事例で melta の実コンポ contract が壊れている実証ではない。穴の存在は認めるが severity medium→low に下げ、D3-01/D3-03 のレイアウト/responsive 整備に内包して扱うべき独立性の低い項目。

### D4-03 — benchmark scorer の totalScore が合成崩壊に対しplus方向に働き高得点を付与（positiveBonus 偏重）

- **重大度**: 初期 `medium` → 検証後 **`low`**（confidence: medium） / 次元: D4-合成パターン階層 / proven: **True**
- **claim**: score.ts の totalScore は 50 + positiveSignals*5 − penalty で、positiveSignals は『primary-500 を含む』『slate-200 を含む』『cursor-pointer を含む』等の文字列 includes 10種。合成崩壊HTMLは合法トークンを多用するほど positiveBonus が積み上がり、合成が崩れているほど（コンポを大量に並べるほど）むしろ高得点になりうる逆インセンティブがある。実測で崩壊HTMLが80点。AIがこのrubricに最適化すると『合法部品を盛る』方向に誘導される。
- **evidence**: score.ts:90-101 の positiveSignals は html.includes(...) ベース10項目。violationPenalty は per-class 違反と9種の正規表現(text-black/shadow-lg/bg-blue等)のみ。合成・反復・ネスト・色数のペナルティ項目が patternChecks に存在しない。実測 totalScore:80（ベース50 + 正シグナル primary-500/slate-200/slate-900/cursor-pointer/font-medium 等 ×5 − ペナルティ0）。
- **repro**: npx tsx /tmp/d4/score-test.ts → totalScore:80, ruleViolations:0, prohibitedPatterns:0。score.ts:90-101(positiveSignals)と:71-79(patternChecks)を読み、合成系チェックが無いことを確認。
- **fix**: score.ts に composition penalty を追加: 同一 bg-primary-500 ボタンの出現回数、role=dialog ネスト、同一カードパターンのネスト深さ、distinct 色相数>3 を patternViolations にカウントして *10 ペナルティ。さらに positiveSignals を『includes で文字列が1回でもあればbonus』方式から脱却し、合法部品の多用が点数を底上げしない正規化（密度・反復を割引）に変更。benchmark prompts に『1画面に同種CTAを並べる』『モーダル多重』の合成タスクを追加して回帰させる。
- **検証結論**: 逆インセンティブの方向性を実証: 合法ボタン1個=65点 vs 12個並べ=75点で、CTA階層崩壊(合成違反)ほど positiveSignals substring が積み上がり高得点。score.ts:90-101 が html.includes ベース10項目・合成/反復/ネスト/色数ペナルティなしも確認。ただし減点: これは consumer に出荷される guardrail ではなく内部の multi-provider 回帰ベンチ scorer であり、コメントで明示的に『ナイーブ includes』と割り切られている。AI をこの rubric に最適化する運用が現状ない以上、悪コードが通る『検知の穴』というより eval 品質の弱さ。includes-once 上限で点数は飽和し青天井ではない点も主張をやや過大評価させている。実在はするが影響度は低く、D4-01/02 と同一根本原因(合成次元不在)の3番目の側面。severity medium→low に調整。

### D5-06 — reduced-motion がレンダリングで検証されず宣言のみ

- **重大度**: 初期 `medium` → 検証後 **`low`**（confidence: high） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: MOTION_REDUCED_MOTION_REQUIRED は error severity だが detector=manual・contractLint=skip で、validate/hook/test のどこでも検証されない。prefers-reduced-motion メディアクエリが実際に効くか（reduced-motion環境でアニメーション/トランジションが無効化されるか）をエミュレートして確認する層がない。axeは reduced-motion を評価しない。
- **evidence**: rules.json: MOTION_REDUCED_MOTION_REQUIRED detector=manual, contractLint=skip。prefers-reduced-motion は docs/meltan-bounce.html, icons.html, tools/generate-css.ts には存在するが showcase本体(docs/index.html)とtestには検証ロジックなし。motion category はルール2個のみで薄い。
- **repro**: grep -rl 'prefers-reduced-motion' で showcase/index.html はヒットせず（meltan-bounce.html等のみ）。rules.json で MOTION_REDUCED_MOTION_REQUIRED は contractLint=skip。
- **fix**: showcase.spec.ts に test.use({ reducedMotion: 'reduce' }) を使った別describeを追加し、page.emulateMedia({ reducedMotion:'reduce' }) 後にアニメーション要素の getComputedStyle で animation-duration/transition-duration が 0s 相当か、または transform が静止しているかを assert。CSS生成側(generate-css.ts)が出力する @media (prefers-reduced-motion: reduce) ブロックの存在を docs/*.css に対して静的grepするテストも併設。
- **検証結論**: MOTION_REDUCED_MOTION_REQUIRED は detector=manual・contractLint=skip を実測、docs/index.html に prefers-reduced-motion は grep 0件(meltan-bounce.html/icons.html のみ)。reduced-motion をエミュレートして実効を確認する層は無い。ただし severity を medium→low に下げる: (1) showcase 本体(index.html)はアニメーションが限定的で、reduced-motion 違反の実害面が小さい。(2) Playwright の reducedMotion emulate + getComputedStyle で検証する fix は技術的には正しいが、そもそも showcase に対象アニメーションが乏しく投資対効果が低い。(3) motion category 自体ルール2個と意図的に薄く、meltan が優先度を低く置いている領域と読める。穴は実在だが low。

### D5-09 — ヒット領域サイズ(最小44x44px等)とキーボード可視フォーカスリングが検証されない

- **重大度**: 初期 `medium` → 検証後 **`low`**（confidence: medium） / 次元: D5-a11y動的層 / proven: **True**
- **claim**: contractの focusRing 宣言(focus-visible:ring-2 等)はvalidate.tsでclass文字列としてlintされるが、『実際にフォーカスした時に可視のリングが描画されるか』はレンダリング検証がない。またアイコンボタン/タグのxボタン等のタッチ/クリックヒット領域が最小サイズ(WCAG 2.5.5 / 2.5.8の24-44px)を満たすかのバウンディングボックス検証もない。axeはtarget-size(WCAG2.2)を一部見るがwcag2a/2aaタグ指定では含まれない可能性が高い。
- **evidence**: showcase.spec.ts:47 `.withTags(['wcag2a','wcag2aa'])`（wcag22aa非指定→target-size未評価）。validate.ts:484 で focusRing はclass lint対象だがレンダリング非検証。
- **repro**: showcase.spec.ts:47 のタグ指定を確認（wcag22aa不在）。focusRingはvalidate.tsのextractClassStringsで静的lintのみ。
- **fix**: axeのwithTagsに 'wcag22aa' を追加して target-size を有効化。加えて button.spec.ts でアイコンボタンの boundingBox() を取得し width/height>=24(理想44) を assert。フォーカスリングは要素を focus() 後に getComputedStyle で outline/box-shadow が非noneか確認するテストを追加。
- **検証結論**: showcase.spec.ts:47 .withTags(['wcag2a','wcag2aa']) を実測、wcag22aa 不在=target-size(WCAG2.2 2.5.8)は axe 評価対象外なのは正しい。focusRing は validate.ts で class lint されるがレンダリング非検証も事実。ただし severity を medium→low に下げる: (1) ヒット領域・可視フォーカスリングのレンダリング検証は『あれば良い』領域で、focus-visible:ring-2 のclass presenceは validate で担保済=最低ラインはある。(2) target-size は WCAG2.2 で melta が wcag2aa(=2.1)を基準と明示しており、2.2非対応は『基準設定の選択』であって穴とは言い切りにくい(意図的スコープ)。confidence medium(target-size を axe に足すのは低コストだが、meltan の準拠基準が2.1である以上『未カバーの穴』と断じるのは過大評価寄り)。

---

## 付録2: Codex セカンドレビュー（2026-05-30）

本レポートを別実体（Codex / `~/.codex-tsubotax`）が実コードを読み直して検証した結果。Claude の自己採点バイアスを排し、中核結論への同意・反論・見落としを独立に出させた。

### 総評
Codex は中核結論「AI生成物を CI で検証する経路が無い」に**同意**。独立の裏取り根拠: CI は `.github/workflows/design-check.yml` で `design:check` / `design:drift` / `validate` / `build` / `test` のみ実行し、benchmark も生成HTML lint も呼ばない。`validate.ts:321,515` は contract dir のみ走査。

### Codex が追加した新規 finding（= Claude red-team の見落とし）

#### 🔴 NEW-01 — hook が共有 matcher を使わず includes() 判定で drift（medium）
- **claim**: `hook-check-rule.sh:49` は `cls.includes(p)` で判定し、token-aware に直された `src/utils/matcher.ts` の判定とロジックが乖離している。`top-0` vs `p-0` の旧 includes 誤検出は `tests/matcher.spec.ts:201` でテスト済みの既知バグ。**Quick wins を hook に直足しすると、この false positive を引き継ぐ**。
- **fix**: hook / score / 新CLI を `tokenize()` + `matches()` に寄せ、検出器を一本化（共通 lint core）。

#### 🔴 NEW-02 — 現行 hook はそのままでは CI gate に使えない（medium）
- **claim**: S1「benchmark生成物 → hook で 0 violation assert」案は成立しない。hook は benchmark results を明示除外（`hook-check-rule.sh:21`）し、違反時も stdout に出すだけで**非ゼロ終了しない**（`:61`）。
- **fix**: hook を CI 流用せず、共通 lint core を呼ぶ**専用 CLI**を作り violation count に応じて `exit 1`。

### Codex による既存 finding / fix の修正

| 項目 | Codex 判定 | 修正内容 |
|---|---|---|
| **パス訂正** | ⚠️ | レポート本文/付録の `src/lib/matcher.ts` `src/lib/loader.ts` は誤り。実体は **`src/utils/matcher.ts` / `src/utils/loader.ts`**（内容は概ね一致） |
| **Q2** | ⚠️ | `*-[` は広すぎ。`text-[1rem]` 等の正規 Quick Ref 記法（`DESIGN.md:91`）に当たる → `text-[#` / `bg-[#` / `shadow-[` に**絞る** |
| **Q4** | ⚠️ | `w-[` は modal/datepicker contract が正規使用（`modal.contract.json:41` / `datepicker.contract.json:29`）→ **error化は危険、warn のみ** |
| **Q5** | ⚠️ | `tabindex>0` / `th[scope]` は実装容易だが、`role=dialog 欠落`は「何を modal とみなすか」が文脈依存で難しい |
| **Q6** | ✅ | inline style は既存 contract samples にも存在（`progress.contract.json:63`）→ 禁止でなく**存在 warn** が妥当 |
| **S2** | ⚠️ | cheerio は未依存（`package.json:28`）→ 導入要。CTA数・色数は最初 **warn** にしないと false positive 多発 |
| **H4** | ➕ | rubric には「一部ハードコードカラーあり」の抽象減点基準は存在（`evaluation.md:13`）→「rubric に hex 0件」はやや言い過ぎ。明示ルール無し+未配線の結論自体は正しい |

### Codex 推奨の着手順（Claude 案を修正）

Claude の元案 **①Quick wins(hook直足し)→②S1→③S2** に対し、Codex は「**共通 lint core 先行**」版を推奨：

1. **①' 共通 lint core**: `tokenize()`+`matches()` を hook / score / 新CLI が共用する検出器として切り出す（NEW-01/02 を同時解消）
2. **② ルール投入**: その core に Q1〜Q4 + ai-pattern（Q2/Q4 は絞った形で）
3. **③ CI gate (S1)**: hook 流用ではなく専用 CLI で violation>0 → `exit 1`
4. **④ 合成 (S2)**: composition-lint（cheerio 追加要、初手 warn）

**理由**: 現 hook が includes 判定・benchmark 除外・exit 0 という CI 不向きな形なので、先に共通検出器を切らないと同じロジックを三重管理し、NEW-01 の drift が残り続ける。「**ルールを足す前に検出器を一本化する**」が①の前に挟まる。

---

## 実装ログ

### 2026-05-30 — Q2 実装完了（arbitrary 値による色・影・font 回避の検知）✅

H2（D2-01）の最頻回避を塞いだ。Codex 補正に従い `*-[` ではなく **`#`始まりの色 + shadow/font に絞り**、`text-[1rem]` 等の正規 Quick Ref 記法を誤爆しない形で実装。

- **方式**: 新 detector は追加せず、既存 `tailwind-class-prefix`（single `pattern` は `startsWith` 判定）で実現 → `matcher.ts`/`types.ts`/schema/`validate.ts`/`server.ts` は無改修。`rules.json` 追記のみ。
- **追加ルール 5件（全 warn）**: `COLOR_NO_ARBITRARY_TEXT_HEX`(`text-[#`) / `COLOR_NO_ARBITRARY_BG_HEX`(`bg-[#`) / `COLOR_NO_ARBITRARY_BORDER_HEX`(`border-[#`) / `SPACE_NO_ARBITRARY_SHADOW`(`shadow-[`) / `TYPO_NO_ARBITRARY_FONT`(`font-[`)
- **非回帰の裏取り**: contract/docs の arbitrary 値は全て font-size（`text-[1rem]`×56 / `text-[0.875rem]`×10 / `text-[10px]` 等）で `text-[#` は 0 件 → 誤爆ゼロを grep で実証。`design:check` 緑維持。
- **スコープ外（意図的）**: `rounded-[`(円形アバター `rounded-[50%]` と衝突) / `w-[`(Q4 responsive の領域) / 色の `rgb()`/`hsl()` 関数記法（AI 生成での出現率低、追加は trivial な follow-up）
- **テスト**: `tests/lint-core.spec.ts` 新設（rules.json→loader→matcher→lint-core を通しで検証、12 ケース）。hook 経由(`hook-check-rule.sh`)の発火も実機確認。全 48 unit test green。
- **残課題（H2 の理想形 = Structural）**: hex/rgb 正規化して `tokens.json` パレット外を **error** にする昇格は未実装。warn 止まりで「気づける」段階まで。

### 2026-05-30 — Q5 実装完了（html-attr ルールの部分蘇生）✅

H3（D1-01）の「型宣言だけで consumer ゼロ」だった html-attr 10ルールのうち、**機械判定できる3件を活性化**。cheerio 未導入のため正規表現ベース。

- **方式**: rules.json の html-attr ルールに機械可読 spec `htmlAttrCheck` を付与し、新モジュール `src/utils/attr-lint.ts` が raw source(HTML/JSX) を属性検査する。`lint-core.lintSource` が class 検出と attr 検出をマージ → hook / lint-generated が自動で追従。
- **活性化3ルール**: `A11Y_NO_TABINDEX_POSITIVE`(tabindex 正値, error) / `TABLE_TH_SCOPE_REQUIRED`(`<th>` scope 欠落, error) / `DATEPICKER_NO_NATIVE_INPUT`(`<input type="date">`, warn)
- **spec の3 kind**: `attr-value-forbidden`(値が regex 一致) / `tag-missing-attr`(タグが必須属性欠落) / `element-present`(該当要素の存在)。`types.ts` / `rule.schema.json` に型追加
- **Codex 補正の反映**: `role=dialog 欠落`(MODAL_ROLE_DIALOG_REQUIRED) は「何を modal とみなすか」が文脈依存のため**今回は活性化せず**（htmlAttrCheck 未付与＝従来どおり dead）。S2(cheerio)で DOM 構造判定を入れてから。
- **誤検知ガード（実証）**: `<thead>`(word boundary で `<th>` と区別) / `data-tabindex`(negative lookbehind) / `tabindex="0"`/`"-1"`(許可値) / `scope` 付き `<th>` を全て非検知。JSX の `tabIndex={2}`(camelCase + brace) は検知。docs/index.html の `<th>`×31 は全て scope 付きで誤爆ゼロを grep 実証。
- **テスト**: `tests/lint-core.spec.ts` に Q5 検知4 + ガード6 ケース追加。tsc 緑 / design:check 緑 / 全 59 unit test green。
- **残課題**: html-attr 残り7件（aria-current / icon-button aria-label / aria-selected / aria-busy / role=dialog 等）は文脈・DOM 構造依存が強く、cheerio 導入(S2)後に棚卸し。
