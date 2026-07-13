---
title: "WSL2でClaude Code環境を構築する"
category: "環境構築"
updatedDate: 2026-06-28
status: "完了"
level: "初級"
tags: ["WSL2", "Claude Code", "環境構築"]
references:
  - label: "Claude Code 公式ドキュメント"
    url: "https://docs.claude.com"
relatedArticles: ["figma-claude-code-implementation"]
---

## なぜWSL2を使うか

WSL2＝Windows上でLinux環境を動かせる仕組み。Claude Codeを含む多くの開発ツールはLinux/Mac環境を前提に作られていることが多く、WSL2を使うとWindowsのパソコンでもそれらのツールをそのまま使える。

デザイナーが開発ツールに触れる最初のハードルは、この「環境構築」であることが多い。一度整えてしまえば、あとは同じ手順の繰り返しで済む。

## 構築の流れ（概要）

1. WindowsにWSL2をインストールする
2. WSL2上にUbuntu（Linuxの一種）をセットアップする
3. Node.js（JavaScriptを動かすための実行環境）をインストールする
4. Claude Codeをインストールする
5. プロジェクトフォルダに移動し、`claude` コマンドで起動する

## つまずきやすいポイント

- **ファイルの場所**：WindowsのフォルダとWSL2内のフォルダは別物。WSL2内で作業したファイルは、Windowsのエクスプローラーから `\\wsl.localhost\` から始まるパスで開く
- **パスの違い**：Windowsは `C:\Users\...`、WSL2（Linux）は `/home/...` という書き方になる。最初は混乱しやすいので、都度どちらの環境で作業しているかを意識する

## 学んだこと

環境構築は一度理解してしまえば、その後の作業効率が大きく上がる。最初は聞き慣れない用語が多くて大変だが、「今何をしているか」を1つずつ言葉で理解しながら進めると、次第に迷わなくなる。
