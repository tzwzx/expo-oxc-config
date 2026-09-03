---
name: update-toolchain
description: >-
  expo-oxc-config が所有する oxfmt / ultracite を最新版へ更新し、 bun verify と bun lint まで回すスキル。「パッケージを更新して」「oxfmt を最新に」 「ツールチェーンを上げて」「ultracite を更新して」などの依頼で使う。
---

# ツールチェーン更新

このリポジトリの更新は **消費側の Expo アプリすべてに一斉に効く**。アプリ側の package.json には `oxfmt` / `ultracite` が無く、ここが配るバイナリと設定で全アプリの `bun lint` が動いている。壊した状態で push すると次に追従したアプリから順に整形が動かなくなる。

作業前に `.cursor/rules/general.mdc` を読む。

## Phase 1: 現状の記録

```bash
bun verify
cat package.json
```

## Phase 2: 更新

```bash
bunx npm-check-updates -u
bun install
```

バージョンは完全固定（exact）を維持する。`^` や `~` を付けない。

## Phase 3: 追従

Context7 MCP で最新仕様を確認する。MCP が使えない場合は推測で進めず、状況を報告する。

必ず確認する項目:

1. **oxfmt の合成方法が変わっていないか**

   oxfmt は `extends` を解釈しない前提で `{ ...ultracite }` のスプレッドで合成している。この前提が変わると、エラーも出ないまま整形が素通りする。`bun verify` の「oxfmt に ultracite の整形設定が効いている」がこれを検知する。

2. **非推奨になった設定が残っていないか**

3. **上流に新しい整形オプションが無いか**

   整形結果が変わるものは全アプリに差分が出るので、採用するかをユーザーに確認する。勝手に入れない。

## Phase 4: 検証

```bash
bun verify
bun lint
```

両方が緑になるまで push しない。`bun verify` はツールチェーンの健全性だけを見る。整形出力の変化は `bun lint` でしか落ちない。

`bun lint` が落ちたら `bun fix` を当ててから `git diff` を確認する。`bun fix` は配布物 `oxfmt.mjs` も自動修正しうる。

`bun verify` が落ちた場合:

| 落ちた項目 | 疑うこと |
| --- | --- |
| ultracite の oxfmt が整形設定を持っている | ultracite の export 構造が変わった |
| oxfmt の合成結果に整形設定が残っている | スプレッド合成の前提が壊れた |
| oxfmt に ultracite の整形設定が効いている | **スプレッド合成の前提が壊れた（最も静かな失敗）** |

メジャー更新時は消費側アプリを1つ、`file:../expo-oxc-config` で一時参照して `bun codesweep:check` する。確認後は `git restore package.json bun.lock && bun install` で戻す。

## Phase 5: コミットと展開

1. コミットは日本語・Conventional Commits 準拠
2. push は実行前にユーザーへ確認する
3. 各アプリへは次を案内する

```bash
bun update @tzwzx/expo-oxc-config
bun codesweep:check
```

## ガードレール

- `bun verify` と `bun lint` が緑になる前に push しない
- `bun fix` のあと `git diff` を確認する
- 新機能を勝手に採用しない
- バージョンの範囲指定（`^` / `~`）を入れない
- アプリ側の package.json に `oxfmt` / `ultracite` を戻さない
