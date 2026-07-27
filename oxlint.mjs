// フリート共通の oxlint 設定。各アプリの oxlint.config.ts は
// `defineConfig(buildConfig({ ...アプリ固有分 }))` だけを書く。
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";

// ultracite 7.9.x で github/sonarjs/react-doctor の jsPlugins が react プリセットから
// オプトインの js-plugins プリセットへ分離されたため、明示的に継承する（フリート標準）
export const presets = [core, react, jsPlugins];

// extends では ignorePatterns がマージされない（2026-07 に実測確認済み）ため、
// トップレベルで必ず再宣言する。https://docs.ultracite.ai/provider/oxlint
export const ignorePatterns = [...(core.ignorePatterns ?? [])];

export const rules = {
  "sort-imports": ["error", { ignoreDeclarationSort: true }],
};

export const overrides = [
  {
    // React Native では StyleSheet.create() やコンポーネントをファイル末尾に定義する
    // 慣例のため、変数・関数の前方参照を許可し、クラス等の前方参照は検出する
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "eslint/no-use-before-define": [
        "error",
        { functions: false, variables: false },
      ],
    },
  },
];

/**
 * 共通設定にアプリ固有分をマージした config オブジェクトを返す。
 * @param {{ ignorePatterns?: string[], overrides?: object[], rules?: object }} app
 */
export function buildConfig(app = {}) {
  return {
    extends: presets,
    ignorePatterns: [...ignorePatterns, ...(app.ignorePatterns ?? [])],
    overrides: [...overrides, ...(app.overrides ?? [])],
    rules: { ...rules, ...(app.rules ?? {}) },
  };
}
