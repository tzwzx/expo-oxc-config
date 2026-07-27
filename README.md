# @tzwzx/expo-oxc-config

tazawa の Expo アプリ群で共有する oxlint / oxfmt 設定。ultracite をラップし、次を一元化する:

- `extends: [core, react, jsPlugins]`（github / sonarjs / react-doctor プラグインをフリート標準で有効化）
- **ignorePatterns の再宣言**（oxlint の `extends` は ignorePatterns をマージしない — 実測確認済み。放置すると `**/*.gen.*` / `**/dist` 等が lint 対象になる）
- `src/` の `no-use-before-define` 緩和（RN の「コンポーネントを末尾定義」慣例対応）
- `sort-imports`（ignoreDeclarationSort）

## 使い方

```ts
// oxlint.config.ts（各アプリ）
import { defineConfig } from "oxlint";
import { buildConfig } from "@tzwzx/expo-oxc-config/oxlint";

export default defineConfig(
  buildConfig({
    // アプリ固有分だけを書く
    ignorePatterns: ["store-shots/**"],
    rules: {
      "react/style-prop-object": ["error", { allow: ["StatusBar"] }],
    },
  }),
);
```

```ts
// oxfmt.config.ts（各アプリ）
import { defineConfig } from "oxfmt";
import { buildConfig } from "@tzwzx/expo-oxc-config/oxfmt";

export default defineConfig(
  buildConfig({ ignorePatterns: ["store-shots/output/**"] }),
);
```

## 検討メモ（標準へ入れるか未決のルール）

- `unicorn/no-array-sort` / `unicorn/no-array-reverse` off（Hermes が `toSorted` / `toReversed` 未対応 — shikaku-collection で採用中。Hermes が対応したら不要になるため、現状はアプリ側判断）
- `react/jsx-no-constructed-context-values` off（React Compiler 前提 — shikaku-collection で採用中。Compiler の有効状況がリポで揃ったら標準化を検討）
- `no-use-before-define` のルール ID は `eslint/` プレフィックス付きと bare が混在していた（widget-now は bare）。**このパッケージ導入時に、プレフィックス付きで実際に効いているか各リポで実測確認すること**（oxlint の版によって解決挙動が異なる可能性がある）

## 配布（npm には公開しない）

GitHub リポジトリを直接依存として消費する（`agent-session-gate` と同方式）:

```jsonc
// 各アプリの package.json devDependencies
"@tzwzx/expo-oxc-config": "github:tzwzx/expo-oxc-config"
```

- バージョンを固定したい場合はタグ/コミットを付ける: `github:tzwzx/expo-oxc-config#v0.1.0`
- ultracite / oxlint / oxfmt は peerDependencies（バージョンは各アプリが管理）
