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
  // Expo Router の特殊ファイル名（_layout, [id], (group), +not-found 等）と
  // kebab-case 強制ルールが衝突するため無効化
  "github/filenames-match-regex": "off",
  // Hermes（Expo SDK 57 / RN 0.86）が toSorted() / toReversed() 未対応のため、
  // 不変メソッドへの書き換えを促す指摘・自動変換を無効化する
  "react-doctor/js-tosorted-immutable": "off",
  // Expo Router アプリのため、Next.js 前提のクライアントサイドリダイレクト検査は対象外
  "react-doctor/nextjs-no-client-side-redirect": "off",
  // Expo/RN 慣習の名前空間 import（例: `import * as Haptics`）と衝突するため無効化
  "sonarjs/no-wildcard-import": "off",
  // React コンポーネントの function 宣言（PascalCase）を許容する
  // （既定の '^[_a-z][a-zA-Z0-9]*$' はコンポーネントを誤検知する）
  "sonarjs/function-name": ["error", { format: "^_?[a-zA-Z][a-zA-Z0-9]*$" }],
  "sort-imports": ["error", { ignoreDeclarationSort: true }],
  "unicorn/no-array-reverse": "off",
  "unicorn/no-array-sort": "off",
};

export const overrides = [
  {
    // React Native では StyleSheet.create() やコンポーネントをファイル末尾に定義する
    // 慣例のため、変数・関数の前方参照を許可し、クラス等の前方参照は検出する。
    // ルール ID は接頭辞なしの bare 形式（typescript/ 等の誤 ID だと無効果 — sync で実測済み）
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-use-before-define": ["error", { functions: false, variables: false }],
    },
  },
  {
    // テストセットアップのモック群。React コンポーネントとして PascalCase 必須、
    // displayName 省略や実 API 互換のための forwardRef 使用も許容する
    files: ["jest.setup.ts"],
    rules: {
      "react-doctor/no-react19-deprecated-apis": "off",
      "react/display-name": "off",
      "sonarjs/function-name": "off",
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
