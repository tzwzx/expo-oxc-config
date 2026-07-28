# @tzwzx/expo-oxc-config

Expo アプリ群で共有する **oxlint / oxfmt のツールチェーン一式と設定**。

このパッケージ1つを devDependencies に入れれば、`oxlint` / `oxfmt` コマンドと共有ルールがまとめて入る。アプリ側は**コマンドを叩くだけ**でよい。

> 🤖 **このリポジトリを変更する前に読むもの**
>
> - [`.rulesync/rules/general.md`](.rulesync/rules/general.md) — 破ると静かに壊れる罠（ここが最優先）
> - [`.rulesync/skills/update-toolchain/SKILL.md`](.rulesync/skills/update-toolchain/SKILL.md) — パッケージ更新・ルール追加・設定スリム化の全手順と判断基準
>
> どちらも rulesync の**編集元**。`AGENTS.md` / `.claude/skills/` は `bun rulesync` の生成物で gitignore 対象なので、クローン直後には存在しない（生成物を直接編集しないこと）。
>
> ここの変更は **Expo アプリ7本すべてに一斉に効く**。`bun verify` を通さずに push しないこと。

## 何を持っているか

| 種別 | 中身 |
| --- | --- |
| ツール本体 | `oxlint` / `oxfmt` の CLI（bun が推移的依存の bin もルートの `.bin` に張るため、アプリから直接実行できる） |
| プリセット | `ultracite` と、それが参照する `eslint-plugin-github` / `eslint-plugin-sonarjs` / `oxlint-plugin-react-doctor` |
| 共有ルール | `extends: [core, react, jsPlugins]` / **ignorePatterns の再宣言**（oxlint の `extends` はこれをマージしないため必須）/ Expo Router・Hermes・RN 慣習に由来する共通ルール |

## なぜツール本体まで持つのか

oxlint の JS プラグイン API はまだ `plugins-dev` 名義の不安定な面で、 `oxlint-plugin-react-doctor` は oxlint への peerDependency を宣言していない。つまり **oxlint とプラグインのバージョン不整合を誰も検知できない**。

アプリ側に oxlint を置くと、各リポで `bun update` した時にツール本体だけが上がり、共有側のプラグインが取り残されて静かに壊れうる。ツール・プリセット・プラグイン・ルールは必ず一緒に動く必要があるので、**まとめてこのパッケージが所有する**。

更新はこのリポジトリで一度だけ行い、各アプリは `bun update @tzwzx/expo-oxc-config` で追従する。

## 使い方

```jsonc
// アプリの package.json — oxlint / oxfmt / ultracite は書かない
"devDependencies": {
  "@tzwzx/expo-oxc-config": "github:tzwzx/expo-oxc-config"
},
"scripts": {
  // --report-unused-disable-directives-severity=error で不要になった抑止コメントを検出する
  "lint": "oxfmt --check && oxlint --report-unused-disable-directives-severity=error",
  "fix": "oxfmt && oxlint --fix"
}
```

```ts
// oxlint.config.ts（各アプリ）— oxlint を import しない
import { defineConfig } from "@tzwzx/expo-oxc-config/oxlint";

export default defineConfig({
  // アプリ固有分だけを書く
  ignorePatterns: ["store-shots/**"],
  overrides: [],
  rules: {},
});
```

```ts
// oxfmt.config.ts（各アプリ）— oxfmt を import しない
import { defineConfig } from "@tzwzx/expo-oxc-config/oxfmt";

export default defineConfig({ ignorePatterns: [] });
```

アプリが import するのは本パッケージだけなので、`fallow` の「未宣言の依存」検出とも整合する。ただし `oxlint.config.ts` は fallow が宣言済み依存からツールを検出する都合で到達不能扱いになるため、各アプリの `.fallowrc.jsonc` の `entry` に加えておくこと。

## アプリ側に残す例外

ルールの off は「スコープを絞った `overrides` + 恒久的に妥当な理由」または「該当1行の `oxlint-disable-next-line` + 理由」のいずれかにする。「あとで直す」類の暫定 off は置かない。

共有側に置いてよい無効化と、アプリ側へ委ねるべき無効化の判断基準は [`update-toolchain` スキル](.rulesync/skills/update-toolchain/SKILL.md)に書いてある。

## 更新の手順（重要）

oxlint / oxfmt / ultracite / プラグインの更新は**このリポジトリで行う** （アプリ側で `bun update` しても上がらない）。手順:

```bash
bun update          # または package.json のバージョンを編集
bun verify          # ← ツールチェーンが壊れていないか検査
git commit && git push
```

各アプリは `bun update @tzwzx/expo-oxc-config` で追従し、そのリポジトリの `bun codesweep:check` で最終確認する。

### `bun verify` が見るもの

**ルールの追加・改名・挙動変更は許容する**（アプリ側で追従すればよい）。検査するのは「まともに動かない状態のまま配ってしまう」ことだけ:

| 検査 | 何を防ぐか |
| --- | --- |
| ルールが読み込まれている | 設定・プリセットの解決に失敗したまま気づかない |
| 3プラグインが検出を出している | プラグインが静かに読み込まれなくなる |
| ignorePatterns が効いている | `extends` がマージしない仕様を踏んで生成物まで lint される |
| `src/**` / `jest.setup.ts` の override が効いている | override の書式が変わって緩和が失われる |
| off にしたルールが発火しない | 無効化の指定が効かなくなる |
| ultracite の各プリセットがルールを持っている | ultracite の export 構造が変わって空が混ざる |
| **oxfmt に ultracite の整形設定が効いている** | **設定の書き方が変わり、エラーも出ないまま整形が素通りする**（過去に実際に発生） |

最後の1つは、import を逆順にした一時ファイルを置いて `oxfmt --check` が「要整形」と判定するかで確かめている。プリセットが効いていないと素通りする（＝ exit 0 になる）ため、静かな失敗を検知できる。

`fixtures/` は「本来なら指摘されるコード」を意図的に置いている検査用の資材で、lint をきれいに通す場所ではない。

## リリース

npm には公開せず `github:tzwzx/expo-oxc-config` の Git URL 依存で消費する。バージョンを固定したい場合はタグを付けて `#v0.2.0` のように参照する。
