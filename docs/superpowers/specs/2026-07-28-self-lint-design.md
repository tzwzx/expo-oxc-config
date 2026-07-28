# expo-oxc-config 自身に oxlint / oxfmt を適用する

2026-07-28

## 目的

このリポジトリが配布している oxlint / oxfmt の共有設定を、**このリポジトリ自身のコードにも適用する**。

現状 `bun verify` は `fixtures/`（意図的に指摘されるサンプルコード）に設定を当ててツールチェーンが壊れていないかだけを見ており、リポジトリ本体のコード（`oxlint.mjs` / `oxfmt.mjs` / `scripts/*.ts`）は lint も整形もされていない。

配布する設定が自分自身に適用できていない状態を解消し、あわせて CI で継続的に検査する。

## 方針

消費側アプリと**完全に同じ入口**（`defineConfig`）を自己参照で通す。

```ts
import { defineConfig } from "@tzwzx/expo-oxc-config/oxlint";
```

自己参照は package.json の `exports` 経由で解決され、`fixtures/oxlint.config.ts` が既に同じ形で動作している。これによりアプリと同じ経路を通るため、共有設定が壊れた場合にこのリポジトリで先に気づける。

**共有ルール（`oxlint.mjs` の `rules` / `overrides`）は変更しない。** ここを緩めると消費側アプリすべてに一斉に効いてしまう。自リポジトリ都合の緩和は必ず root の `oxlint.config.ts` に置く。

### 検討して採らなかった案

- **ultracite の core プリセットだけを当てる**: このリポジトリは Expo アプリではないため React / Expo 向けルールは不要、という発想。しかし `defineConfig` を迂回して設定を二重管理することになり、AGENTS.md の「`defineConfig` が唯一の入口」という原則に反する。実測では React 関連ルールによるノイズは 0 件だったため、採らない。
- **oxfmt だけ入れる**: 要求より小さい。

## 変更内容

### 1. `oxlint.config.ts`（新規・root）

```ts
import { defineConfig } from "@tzwzx/expo-oxc-config/oxlint";

export default defineConfig({
  ignorePatterns: ["fixtures/**"],
  overrides: [
    {
      files: ["scripts/**/*.ts"],
      rules: { "sonarjs/no-os-command-from-path": "off" },
    },
  ],
});
```

- `fixtures/**` を除外する。fixtures は「本来なら指摘されるコード」を意図的に置いている場所で、lint をきれいに通す場所ではない
- `sonarjs/no-os-command-from-path` は `scripts/verify.ts` の `spawnSync("oxlint", ...)` / `spawnSync("oxfmt", ...)` に対する指摘。verify は「アプリと同じように PATH（`node_modules/.bin`）からツールを起動できること」自体を検証しているため、絶対パス化すると検証が弱くなる。`scripts/**` に限定して無効化する

### 2. `oxfmt.config.ts`（新規・root）

```ts
import { defineConfig } from "@tzwzx/expo-oxc-config/oxfmt";

export default defineConfig({ ignorePatterns: ["fixtures/**"] });
```

### 3. 既存の指摘 25 件を解消する

原則としてコードを直す。ローカル無効化で対応するのは上記 `sonarjs/no-os-command-from-path` の 1 ルール（2 件）のみで、残る 23 件は下表のとおりコードを修正する。

| ルール | 件数 | 対応 |
| --- | --- | --- |
| `eslint(sort-keys)` | 4 | `rules` / `overrides` 内のキーをアルファベット順に並べ替える。コメントはルールと一緒に移動する |
| `eslint(func-style)` | 4 | `export function buildConfig(...)` → `export const buildConfig = (...) => ...` |
| `jsdoc(require-param-description)` | 4 | `@param` に説明を追記する |
| `unicorn(no-useless-fallback-in-spread)` | 1 | `...(app.rules ?? {})` → `...app.rules` |
| `unicorn(text-encoding-identifier-case)` | 4 | `"utf8"` → `"utf-8"` |
| `unicorn(prefer-import-meta-properties)` | 1 | `dirname(fileURLToPath(import.meta.url))` → `import.meta.dirname`。`node:url` の import ごと削除する |
| `unicorn(import-style)` | 1 | `node:path` を名前付き import からデフォルト import に変える |
| `eslint(sort-imports)` | 1 | import メンバーの並べ替え（自動修正） |
| `eslint(no-nested-ternary)` / `unicorn(no-nested-ternary)` / `sonarjs(no-nested-conditional)` | 3 | `scripts/verify.ts` の三項ネストを if / else if / else に展開する |

加えて oxfmt が 4 ファイル（`oxlint.mjs` / `oxfmt.mjs` / `scripts/verify.ts` / `scripts/list-consumers.ts`）を整形する。

#### 公開 API への影響

`func-style` の修正で `buildConfig` / `defineConfig` が関数宣言からアロー関数式になるが、名前付き export のままなので消費側の import は変わらない。 `oxlint.d.mts` / `oxfmt.d.mts` の `export declare function` も実装形式に依存しないため変更しない。

#### ソートで失われるコメントの手当て

`oxlint.mjs` の `node/global-require` と `unicorn/prefer-module` は「RN / Expo で `require` が必要な 4 ケース」という 1 つの長いコメントを共有している。アルファベット順に並べ替えると両者が離れるため、本文は `node/global-require` に残し、 `unicorn/prefer-module` には参照コメントを置く。

同様に `unicorn/no-array-reverse` / `unicorn/no-array-sort` は `react-doctor/js-tosorted-immutable` の Hermes に関するコメントと理由を共有しているため、参照コメントを足す。

### 4. `package.json` にスクリプトを追加する

```jsonc
"lint": "oxfmt --check && oxlint --report-unused-disable-directives-severity=error",
"fix": "oxfmt && oxlint --fix",
"rulesync:check": "bunx rulesync install --frozen && bunx rulesync generate && .rulesync/scripts/post-generate.sh && git diff --exit-code -- rulesync.lock .cursorrules"
```

`lint` / `fix` は消費側アプリと同じ命名・同じ内容にする。

`rulesync:check` は消費側アプリ版から 2 点変えている。

1 点目は `.rulesync/scripts/post-generate.sh` を挟むこと。このリポジトリで git 管理されている rulesync 生成物は `.cursorrules` と `rulesync.lock` の 2 つだけで、`.cursorrules` は `rulesync generate` ではなく post-generate.sh が書き出すため、これを走らせないと差分検出にならない。

2 点目は `generate --check` ではなく素の `generate` を使うこと。`--check` は「生成結果がディスク上のファイルと一致するか」を見るが、`AGENTS.md` / `CLAUDE.md` / `.claude/*` は gitignore されていて git 追跡されていない。そのため CI のクリーンチェックアウトには存在せず、`--check` は必ず `Files are not up to date` で落ちる（クリーンクローンで実測確認）。実際に生成してから `git diff --exit-code` で追跡対象の差分だけを見る形にすれば、gitignore された生成物が CI に無くても正しく動き、検出したい対象（`.cursorrules` / `rulesync.lock` の古さ）はそのまま拾える。

なお**消費側アプリ 7 本すべてが `generate --check` を使っており、同じ潜在バグを抱えている**（生成物の gitignore 状況も同一であることを確認済み）。これらの修正は本作業のスコープ外。

### 5. CI（GitHub Actions）

このリポジトリには `.github/` が無いため新規作成する。消費側アプリと同じく共有の再利用 workflow を呼び、lint と test を分ける。

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push]
jobs:
  lint:
    uses: tzwzx/expo-workflows/.github/workflows/lint.yml@main
    with:
      commands: |
        bun rulesync:check
        bun lint
```

```yaml
# .github/workflows/test.yml
name: Test
on: [push]
jobs:
  test:
    uses: tzwzx/expo-workflows/.github/workflows/test.yml@main
    with:
      commands: |
        bun verify
```

共有 workflow 側が checkout / Node 24 / bun / `bun install --frozen-lockfile` を行うため、呼び出し側はコマンドだけを渡せばよい。

## 検証

AGENTS.md の「破ると静かに壊れる罠」に該当しうる変更のため、以下を実測で確認する。

1. **`bun verify` が全チェック通過すること。** `scripts/verify.ts` 自体を書き換えるため必須
2. **root に設定ファイルを置いても `bun verify` の設定解決が変わらないこと。** verify は cwd を `fixtures/` にして oxlint / oxfmt を起動している。root の `oxlint.config.ts` / `oxfmt.config.ts` が優先されていないかを、verify の出力（`number_of_rules` と各チェックの成否）で確認する
3. **`bun lint` が指摘 0 件・整形差分なしで通ること**
4. **`fixtures/` が oxlint / oxfmt 双方の対象外であること。** `oxlint --format=json .` の `number_of_files` と対象ファイル一覧で確認する
5. **消費側アプリへの影響が無いこと。** 変更するのは配布物 `oxlint.mjs` / `oxfmt.mjs` のコードスタイルのみで、`presets` / `ignorePatterns` / `rules` / `overrides` の内容は変えない。念のため `buildConfig()` の戻り値が変更前後で等価であることを確認する

## スコープ外

- lefthook（pre-commit フック）の導入
- cspell の CI 組み込み
- `fixtures/` の整形
- 共有ルール（`oxlint.mjs` の `rules` / `overrides`）の内容変更
