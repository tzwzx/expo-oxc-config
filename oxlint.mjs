// フリート共通の oxlint 設定。各アプリの oxlint.config.ts は
// `defineConfig({ ...アプリ固有分 })` だけを書く。
//
// oxlint 本体の import をここに閉じ込めることで、アプリ側は oxlint を
// 直接参照しなくて済む（＝アプリの package.json に oxlint を書かなくてよい）。
import { defineConfig as defineOxlintConfig } from "oxlint";
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
  // react-navigation の headerLeft/headerRight は「要素を返す関数」を受け取る API のため、
  // props 経由のコンポーネント生成を許可する
  "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
  // expo-status-bar の StatusBar は style prop に文字列 enum（"auto" | "light" | "dark"）を
  // 取るため、オブジェクト限定チェックから除外する
  "react/style-prop-object": ["error", { allow: ["StatusBar"] }],
  // Expo/RN 慣習の名前空間 import（例: `import * as Haptics`）と衝突するため無効化
  "sonarjs/no-wildcard-import": "off",
  // React コンポーネントの function 宣言（PascalCase）を許容する
  // （既定の '^[_a-z][a-zA-Z0-9]*$' はコンポーネントを誤検知する）
  "sonarjs/function-name": ["error", { format: "^_?[a-zA-Z][a-zA-Z0-9]*$" }],
  "sort-imports": ["error", { ignoreDeclarationSort: true }],
  "unicorn/no-array-reverse": "off",
  "unicorn/no-array-sort": "off",
  // React Compiler が Context value の安定参照を自動メモ化するため、手動メモ化を
  // 促すこのルールは react-compiler-no-manual-memoization と矛盾する
  "react/jsx-no-constructed-context-values": "off",
  // oxlint の react-compiler は reanimated の共有値参照や Gesture.Pan() を
  // コンポーネントと誤検出し、意図的な exhaustive-deps 抑制まで error にする。
  // React Native の慣用パターンと相性が悪いためフリート全体で無効化する
  "react/react-compiler": "off",
  // このフリートは消費者向けモバイルアプリで暗号用途の乱数を持たない。
  // Math.random は ID 生成・演出の抽選・シャッフルにのみ使う
  // （暗号強度が要る箇所は expo-crypto を使う方針）
  "sonarjs/pseudo-random": "off",
  // マウント時に一度だけ計算して以降更新しない値は `const [x] = useState(() => ...)`
  // と書くのが正しいが、このルールは [thing, setThing] の対を必須とする。
  // setter を受け取ると今度は未使用変数（sonarjs/no-unused-vars・no-dead-store）に
  // なるため両立しない（kata / yugaku で実測確認）。4アプリで同じ形が現れており、
  // 命名規約より凍結値の正しい表現を優先する
  "react/hook-use-state": "off",
  // TypeScript では `T | undefined` を要求する引数へ明示的に undefined を渡す
  // 必要がある（省略と「明示的に未設定」は別物）。このルールはそれを
  // 「無駄な undefined」と誤検出する
  "unicorn/no-useless-undefined": "off",
  // setTimeout や旧来のコールバック API を await するには new Promise で
  // 包むしかない。RN / Expo の API にはコールバック形式が残っている
  "promise/avoid-new": "off",
};

/** テストコードとみなすパス（jest の慣習に合わせる） */
const TEST_FILES = [
  "**/*.{test,spec}.{ts,tsx}",
  "**/__tests__/**/*.{ts,tsx}",
];

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
      // jest.mock のファクトリは巻き上げられるため ESM import を使えず、
      // 各パッケージ公式モックの読み込みに require が必須
      "node/global-require": "off",
      "unicorn/prefer-module": "off",
    },
  },
  {
    // Expo の設定ファイル。Node のコンテキストで評価されるため CommonJS 由来の
    // API（__dirname など）を使い、Expo の慣例として無名の default export で書く
    files: ["app.config.ts"],
    rules: {
      "node/global-require": "off",
      "unicorn/no-anonymous-default-export": "off",
      "unicorn/prefer-module": "off",
    },
  },
  {
    // テストコード。プロダクトコードとは求めるものが違うため、可読性より
    // 網羅性・素直さを優先する箇所のルールを緩める
    files: TEST_FILES,
    rules: {
      // 逐次実行が読みやすいセットアップ、モック用の空実装、簡易な正規表現など
      "eslint/no-await-in-loop": "off",
      "eslint/no-empty-function": "off",
      "eslint/no-inline-comments": "off",
      "eslint/no-plusplus": "off",
      "eslint/prefer-named-capture-group": "off",
      "eslint/require-await": "off",
      "eslint/require-unicode-regexp": "off",
      "unicorn/no-await-expression-member": "off",
      // ループ内の early return/break はテスト基盤の読みやすさに寄与する
      "sonarjs/too-many-break-or-continue-in-loop": "off",
      // 「既定値のまま」と「明示的に未設定へ上書きした」の区別そのものが検証対象に
      // なるため（TypeScript では undefined と null は別物）
      "sonarjs/no-undefined-assignment": "off",
      // `jest.mock<typeof import("...")>(...)` はモックファクトリに型を付ける
      // 定石で、jest/no-untyped-mock-factory の自動修正もこの形を生成する。
      // インラインの import() 型注釈を禁じるこのルールと直接衝突するため、
      // テストコードでは無効にする（モジュールごとに import type * as を
      // 足す形にすると、モック対象1つにつき1行の重複が増えるだけになる）
      "typescript/consistent-type-imports": "off",
    },
  },
  {
    // jest 由来のテスト品質ルール。ultracite の jest プリセットは overrides で
    // 供給されるため後から上書きできず、フリートの慣習（test() 表記・日本語の
    // テスト名・jest-expo が供給するグローバル）と噛み合わない。
    // そのため必要なルールだけをここで opt-in する
    files: TEST_FILES,
    plugins: ["jest"],
    rules: {
      // フリートは test() で統一している（it() ではない）
      "jest/consistent-test-it": ["error", { fn: "test", withinDescribe: "test" }],
      // `expectPressedStyle(...)` のように expect 接頭辞で自作した
      // アサーションヘルパーも「検証している」とみなす
      "jest/expect-expect": ["error", { assertFunctionNames: ["expect", "expect*"] }],
      "jest/no-alias-methods": "error",
      "jest/no-deprecated-functions": "error",
      "jest/no-done-callback": "error",
      "jest/no-duplicate-hooks": "error",
      "jest/no-export": "error",
      // 集中実行（fdescribe/fit）の commit を防ぐ
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/no-interpolation-in-snapshots": "error",
      "jest/no-jasmine-globals": "error",
      "jest/no-mocks-import": "error",
      "jest/no-standalone-expect": "error",
      "jest/no-test-prefixes": "error",
      "jest/no-test-return-statement": "error",
      "jest/prefer-hooks-in-order": "error",
      "jest/prefer-hooks-on-top": "error",
      "jest/prefer-spy-on": "error",
      "jest/prefer-to-be": "error",
      "jest/prefer-to-contain": "error",
      "jest/prefer-to-have-length": "error",
      "jest/valid-describe-callback": "error",
      "jest/valid-expect": "error",
      "jest/valid-expect-in-promise": "error",
      "jest/valid-title": "error",
      // テストの無効化は削除ではなくコメントアウトする、という規約があるため
      "jest/no-commented-out-tests": "off",
      // 自動修正が `jest.mock<typeof import("m")>(...)` を生成するが、これは
      // ファクトリがモジュール全体の型を満たすことを要求する。RN / Expo の
      // テストでは必要な export だけを返す部分モックが常道で、型エラーになる
      // （実測: 7アプリの37箇所すべてが部分モックで tsc が通らなくなった）
      "jest/no-untyped-mock-factory": "off",
      // TypeScript の判別可能ユニオンを絞り込む `if` を「条件付きアサーション」と
      // 誤検出する。`expect(r.found).toBe(true); if (r.found) { expect(r.data)... }` の
      // ように、直前で表明した内容を型として絞るための if が対象になってしまう
      // （フリート7アプリの全29件を確認したところ、すべてこの絞り込みだった）。
      // 本来の対象である try/catch でのアサーション握り潰しも一緒に見逃す点は
      // 承知のうえで無効化する
      "jest/no-conditional-expect": "off",
    },
  },
  {
    // expo-router の予約エクスポート名 `unstable_settings`（initialRouteName を
    // 宣言する唯一の手段）。Router が名前で読み取るためリネームできない
    files: ["src/app/**/_layout.tsx"],
    rules: {
      "sonarjs/variable-name": "off",
    },
  },
  {
    // 開発用スクリプト（アプリのバンドルには入らない）。ESM の __dirname シムや
    // データ変換など本質的に複雑な処理を含むため一部ルールを緩める
    files: ["scripts/**/*.{ts,tsx}"],
    rules: {
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/too-many-break-or-continue-in-loop": "off",
      "sonarjs/variable-name": "off",
    },
  },
  {
    // E2E（Maestro / Playwright）のヘルパー。React のフックではないが
    // use* 命名のユーティリティを持つため rules-of-hooks が誤検出する
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "eslint-plugin-react-hooks/rules-of-hooks": "off",
      "sonarjs/too-many-break-or-continue-in-loop": "off",
    },
  },
];

/**
 * 共通設定にアプリ固有分をマージした config オブジェクトを返す。
 * 通常は defineConfig を使う（こちらは組み立て結果だけが欲しい場合の逃げ道）。
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

/**
 * 共通設定にアプリ固有分をマージして oxlint の設定として返す。
 * 各アプリの oxlint.config.ts はこれを default export するだけでよい。
 * @param {{ ignorePatterns?: string[], overrides?: object[], rules?: object }} app
 */
export function defineConfig(app = {}) {
  return defineOxlintConfig(buildConfig(app));
}
