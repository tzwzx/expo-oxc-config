# @tzwzx/expo-oxc-config

tazawa の Expo アプリ群で共有する **oxlint / oxfmt のツールチェーン一式と設定**。

このパッケージ1つを devDependencies に入れれば、`oxlint` / `oxfmt` コマンドと
共有ルールがまとめて入る。アプリ側は**コマンドを叩くだけ**でよい。

## 何を持っているか

| 種別 | 中身 |
|---|---|
| ツール本体 | `oxlint` / `oxfmt` の CLI（bun が推移的依存の bin もルートの `.bin` に張るため、アプリから直接実行できる） |
| プリセット | `ultracite` と、それが参照する `eslint-plugin-github` / `eslint-plugin-sonarjs` / `oxlint-plugin-react-doctor` |
| 共有ルール | `extends: [core, react, jsPlugins]` / **ignorePatterns の再宣言**（oxlint の `extends` はこれをマージしないため必須）/ Expo Router・Hermes・RN 慣習に由来する共通ルール |

## なぜツール本体まで持つのか

oxlint の JS プラグイン API はまだ `plugins-dev` 名義の不安定な面で、
`oxlint-plugin-react-doctor` は oxlint への peerDependency を宣言していない。
つまり **oxlint とプラグインのバージョン不整合を誰も検知できない**。

アプリ側に oxlint を置くと、各リポで `bun update` した時にツール本体だけが上がり、
共有側のプラグインが取り残されて静かに壊れうる。ツール・プリセット・プラグイン・
ルールは必ず一緒に動く必要があるので、**まとめてこのパッケージが所有する**。

更新はこのリポジトリで一度だけ行い、各アプリは
`bun update @tzwzx/expo-oxc-config` で追従する。

## 使い方

```jsonc
// アプリの package.json — oxlint / oxfmt / ultracite は書かない
"devDependencies": {
  "@tzwzx/expo-oxc-config": "github:tzwzx/expo-oxc-config"
},
"scripts": {
  "lint": "oxfmt --check && oxlint",
  "fix": "oxfmt && oxlint --fix"
}
```

```ts
// oxlint.config.ts（各アプリ）
import { buildConfig } from "@tzwzx/expo-oxc-config/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig(
  buildConfig({
    // アプリ固有分だけを書く
    ignorePatterns: ["store-shots/**"],
    overrides: [],
    rules: {},
  })
);
```

```ts
// oxfmt.config.ts（各アプリ）
import { buildConfig } from "@tzwzx/expo-oxc-config/oxfmt";
import { defineConfig } from "oxfmt";

export default defineConfig(buildConfig({ ignorePatterns: [] }));
```

`fallow` は設定ファイルからの import を解析しないため、各アプリの
`.fallowrc.jsonc` の `ignoreDependencies` に `@tzwzx/expo-oxc-config` を入れておく。

## アプリ側に残す例外

ルールの off は「スコープを絞った `overrides` + 恒久的に妥当な理由」または
「該当1行の `oxlint-disable-next-line` + 理由」のいずれかにする。
「あとで直す」類の暫定 off は置かない。

フリート共通で妥当と確認済みの例外（`unstable_settings` の命名、非暗号用途の
`Math.random`、TS optional 型への `undefined` 代入など）は
`my-unify-expo-config` スキルの `references/standards.md` を参照。

## リリース

npm には公開せず `github:tzwzx/expo-oxc-config` の Git URL 依存で消費する。
バージョンを固定したい場合はタグを付けて `#v0.2.0` のように参照する。
