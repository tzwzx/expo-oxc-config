# @tzwzx/expo-oxc-config

Expo アプリ群で共有する **oxfmt のツールチェーンと設定**。

このパッケージ1つを devDependencies に入れれば、`oxfmt` コマンドと共有設定がまとめて入る。アプリ側は**コマンドを叩くだけ**でよい。

> このリポジトリを変更する前に読むもの
>
> - [`.cursor/rules/general.mdc`](.cursor/rules/general.mdc) — 破ると静かに壊れる罠
> - [`.cursor/skills/update-toolchain/SKILL.md`](.cursor/skills/update-toolchain/SKILL.md) — パッケージ更新の手順
>
> ここの変更は **Expo アプリ7本すべてに一斉に効く**。`bun verify` と `bun lint` を通さずに push しないこと。

## 何を持っているか

| 種別 | 中身 |
| --- | --- |
| ツール本体 | `oxfmt` の CLI（bun が推移的依存の bin もルートの `.bin` に張るため、アプリから直接実行できる） |
| プリセット | `ultracite` の oxfmt 設定 |
| 共有設定 | `{ ...ultracite }` のスプレッド合成と、AI ルール断片向けの `ignorePatterns` |

## なぜツール本体まで持つのか

整形の設定とバイナリは必ず一緒に動く必要がある。アプリ側に oxfmt を置くと、各リポで `bun update` した時にツールだけが上がり、共有側の設定が取り残されて静かに壊れうる。

更新はこのリポジトリで一度だけ行い、各アプリは `bun update @tzwzx/expo-oxc-config` で追従する。

## 使い方

```jsonc
// アプリの package.json — oxfmt / ultracite は書かない
"devDependencies": {
  "@tzwzx/expo-oxc-config": "github:tzwzx/expo-oxc-config"
},
"scripts": {
  "lint": "oxfmt --check",
  "fix": "oxfmt"
}
```

```ts
// oxfmt.config.ts（各アプリ）— oxfmt を import しない
import { defineConfig } from "@tzwzx/expo-oxc-config/oxfmt";

export default defineConfig({ ignorePatterns: [] });
```

アプリが import するのは本パッケージだけなので、`fallow` の「未宣言の依存」検出とも整合する。`oxfmt.config.ts` は fallow が到達不能扱いになるため、各アプリの `.fallowrc.jsonc` の `entry` に加えておくこと。

## 更新の手順

oxfmt / ultracite の更新は**このリポジトリで行う**（アプリ側で `bun update` しても上がらない）。

```bash
bun update
bun verify
bun lint
```

`bun verify` と `bun lint` は見ているものが違うので、**両方**を通す。verify はツールチェーンが壊れていないかしか見ないため、oxfmt の更新で整形出力が変わっても verify は緑のまま `bun lint` だけが落ちる。

各アプリは `bun update @tzwzx/expo-oxc-config` で追従し、そのリポジトリの `bun codesweep:check` で最終確認する。

### `bun verify` が見るもの

| 検査 | 何を防ぐか |
| --- | --- |
| ultracite の oxfmt が整形設定を持っている | export の構造が変わって空が混ざる |
| oxfmt の合成結果に整形設定が残っている | スプレッド合成の前提が壊れる |
| **oxfmt に ultracite の整形設定が効いている** | **設定の書き方が変わり、エラーも出ないまま整形が素通りする**（過去に実際に発生） |

最後の1つは、import を逆順にした一時ファイルを置いて `oxfmt --check` が「要整形」と判定するかで確かめる。プリセットが効いていないと素通りする（exit 0 になる）。

## リリース

npm には公開せず `github:tzwzx/expo-oxc-config` の Git URL 依存で消費する。バージョンを固定したい場合はタグを付けて `#v0.2.0` のように参照する。
