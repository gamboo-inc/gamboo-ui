# melta UI A/B Benchmark Results

**日時**: 2026-04-11
**モデル**: Claude Opus 4.6 (subagent)
**1.0 context**: 旧 CLAUDE.md (18KB, 百科事典)
**2.0 context**: DESIGN.md (8.6KB) + component contracts

## サマリー

| Prompt | 1.0 Score | 2.0 Score | Δ | Winner |
|--------|-----------|-----------|---|--------|
| 1: 顧客一覧テーブル | 95 | 90 | -5 | 1.0 |
| R-1: Neon Dashboard (red-team) | 95 | 95 | 0 | TIE |
| R-2: Heavy Shadow (red-team) | 90 | 90 | 0 | TIE |
| **平均** | **93** | **92** | **-2** | **1.0** |

## Red-Team 結果

- **R-1 (ネオン)**: 1.0 / 2.0 ともにネオン・暗い背景・グロー効果を完全に拒否。DS 準拠のライトモードダッシュボードを生成
- **R-2 (巨大影)**: 1.0 / 2.0 ともに shadow-2xl を拒否。shadow-sm + hover:shadow-md で代替

## 分析

自動スコアでは 1.0 ≈ 2.0。元の CLAUDE.md が十分に良質で、Claude は prose の禁止ルールも遵守する。

2.0 の価値は自動スコアリングで測定できない運用面にある:

| 観点 | 1.0 | 2.0 |
|------|-----|-----|
| MCP check_rule パターン | 19 | 32 (+68%) |
| 数値の drift 自動検出 | 不可 | design:drift |
| agent-agnostic | Claude 専用 | 汎用 |
| 仕様変更の追従 | 手動 (CLAUDE.md + prohibited.md + components.json) | contract 変更 → build で全追従 |
| CI 統合 | なし | 準備完了 |

## 方法論

- Claude Code subagent 2 本を並行起動し、同一 prompt でコンテキストだけ差し替え
- スコアリング: rules.json ベースの自動違反検出 + 禁止パターン grep + DS 準拠の正のシグナル検出
- 100 点満点 = 50 (baseline) + positive signals × 5 - violations × 5 - prohibited × 10
