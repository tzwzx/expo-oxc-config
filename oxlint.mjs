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
// オプトインの js-plugins プリセットへ分離されたため、明示的に継承する（フリート標準）。
//
// 7.10.0 では js-plugins から react-doctor の Next.js / TanStack 専用ルール 44 件が
// next/js-plugins・tanstack/js-plugins へさらに分離された。Expo アプリでは使わない
// ため、これらのプリセットは継承しない（分離前に置いていた nextjs 系の無効化は
// 不要になったので削除済み）
export const presets = [core, react, jsPlugins];

// extends では ignorePatterns がマージされない（2026-07 に実測確認済み）ため、
// トップレベルで必ず再宣言する。https://docs.ultracite.ai/provider/oxlint
// rulesync の生成物も併せて除外する（生成物を git 追跡するようにした 2026-08 以降、
// gitignore による暗黙の除外が効かなくなったため）。
export const ignorePatterns = [
  ...(core.ignorePatterns ?? []),
  ".claude/rules/**",
  ".cursor/rules/**",
  ".agents/memories/**",
  "AGENTS.md",
  "CLAUDE.md",
];

// React Native / Hermes ランタイムのグローバル。ultracite core は env: { browser: true }
// をハードコードしており（RN プリセットを持たないため）、RN 固有のグローバルを知らない。
// リストは Expo 公式の oxlint-config-universe@0.0.3 の native プリセットと同一
// （2026-08 に確認。独自判断を避けるため公式の参照実装をそのまま使う）。
// 効果は実測済み: 未宣言だと `__DEV__ = ...` が no-implicit-globals（グローバル変数
// リーク）と誤検出され、readonly 宣言後は no-global-assign（読み取り専用グローバル
// への代入）として正しく検出される
export const globals = {
  Atomics: "readonly",
  ErrorUtils: "readonly",
  FormData: "readonly",
  SharedArrayBuffer: "readonly",
  XMLHttpRequest: "readonly",
  __DEV__: "readonly",
  alert: "readonly",
  cancelAnimationFrame: "readonly",
  cancelIdleCallback: "readonly",
  clearImmediate: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  fetch: "readonly",
  navigator: "readonly",
  process: "readonly",
  requestAnimationFrame: "readonly",
  requestIdleCallback: "readonly",
  setImmediate: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  window: "readonly",
};

export const rules = {
  // Expo Router の特殊ファイル名（_layout, [id], (group), +not-found 等）と
  // kebab-case 強制ルールが衝突するため無効化
  "github/filenames-match-regex": "off",
  // React Native の TextInput ではキーボードを閉じる標準手段が .blur()。
  // 「直前の要素へフォーカスを戻せ」という指摘は DOM のフォーカス管理を
  // 前提としており、RN には当てはまらない（github プラグインは Web 向け）
  "github/no-blur": "off",
  // 中身が空の JSDoc ブロック（`/** */`）を禁止する。oxlint 1.78 の新ルールで、
  // ultracite は jsdoc の品質ルールを 22 件（empty-tags 含む）採用しているが
  // 新規追加ゆえ未追従なだけのため、方針に沿って先取りする
  // （2026-08 実測: フリート7アプリと自リポジトリのいずれも新規指摘 0 件）
  "jsdoc/no-blank-blocks": "error",
  // RN / Expo では `require` が必要な場面が4つある。いずれも import では書けない:
  //   1. 画像アセット（`require("./x.png")`）— Expo は *.png の型を宣言しておらず、
  //      import にすると型解決できない（実測確認）。公式ドキュメントも require を使う
  //   2. ネイティブモジュールの遅延読み込み — 未リンク環境で落ちないよう
  //      関数内の try/catch で読む必要があり、巻き上げられる import では代替できない
  //   3. jest.mock のファクトリ — ファクトリごと巻き上げられるため ESM import を使えず、
  //      各パッケージ公式モックの読み込みに require が必須（jest.setup.ts）
  //   4. app.config.ts — Node のコンテキストで評価されるため CommonJS 由来の API を使う
  "node/global-require": "off",
  // `const a = 1, b = 2;` のまとめ書きを禁止し、1宣言1文にそろえる。oxlint 1.78 の
  // 新ルール。**既定値は逆向きの "always"（まとめろ）**で、そのまま有効化すると
  // フリート合計 6,254 件の指摘になる（2026-08 実測）ため "never" の明示が必須。
  // ultracite は未採用だが no-var は採用済みで、宣言スタイルの方針としては整合する
  // （"never" での実測はフリート7アプリと自リポジトリのいずれも 0 件）
  "one-var": ["error", "never"],
  // setTimeout や旧来のコールバック API を await するには new Promise で
  // 包むしかない。RN / Expo の API にはコールバック形式が残っている
  "promise/avoid-new": "off",
  // Hermes（Expo SDK 57 / RN 0.86）が toSorted() / toReversed() 未対応のため、
  // 不変メソッドへの書き換えを促す指摘・自動変換を無効化する
  "react-doctor/js-tosorted-immutable": "off",
  // ultracite 7.10.0 が有効化したコンポーネント定義形式の統一。既定では無名
  // コンポーネントに function 式を要求するが、React Native では forwardRef へ
  // arrow を渡すのが標準（実測: フリート7アプリの該当2箇所とも arrow）。
  // 名前付き・無名とも arrow にそろえる
  "react/function-component-definition": [
    "error",
    {
      namedComponents: "arrow-function",
      unnamedComponents: "arrow-function",
    },
  ],
  // マウント時に一度だけ計算して以降更新しない値は `const [x] = useState(() => ...)`
  // と書くのが正しいが、このルールは [thing, setThing] の対を必須とする。
  // setter を受け取ると今度は未使用変数（sonarjs/no-unused-vars・no-dead-store）に
  // なるため両立しない（複数アプリで実測確認）。同じ形が広く現れるため、
  // 命名規約より凍結値の正しい表現を優先する
  "react/hook-use-state": "off",
  // React Compiler が Context value の安定参照を自動メモ化するため、手動メモ化を
  // 促すこのルールは react-compiler-no-manual-memoization と矛盾する
  "react/jsx-no-constructed-context-values": "off",
  // react-navigation の headerLeft/headerRight は「要素を返す関数」を受け取る API のため、
  // props 経由のコンポーネント生成を許可する
  "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
  // oxlint の react-compiler は reanimated の共有値参照や Gesture.Pan() を
  // コンポーネントと誤検出し、意図的な exhaustive-deps 抑制まで error にする。
  // React Native の慣用パターンと相性が悪いためフリート全体で無効化する
  "react/react-compiler": "off",
  // expo-status-bar の StatusBar は style prop に文字列 enum（"auto" | "light" | "dark"）を
  // 取るため、オブジェクト限定チェックから除外する
  "react/style-prop-object": ["error", { allow: ["StatusBar"] }],
  // React コンポーネントの function 宣言（PascalCase）を許容する
  // （既定の '^[_a-z][a-zA-Z0-9]*$' はコンポーネントを誤検知する）
  "sonarjs/function-name": ["error", { format: "^_?[a-zA-Z][a-zA-Z0-9]*$" }],
  // 「null を使え」という助言は TypeScript では成り立たない。optional な
  // プロパティ・引数の型は `T | undefined` であり、null へ置換すると型が合わない。
  // 永続化する JSON でも undefined は JSON.stringify で消えるが null は残る
  "sonarjs/no-undefined-assignment": "off",
  // Expo/RN 慣習の名前空間 import（例: `import * as Haptics`）と衝突するため無効化
  "sonarjs/no-wildcard-import": "off",
  "sort-imports": ["error", { ignoreDeclarationSort: true }],
  // Hermes が toSorted() / toReversed() 未対応のため（react-doctor/js-tosorted-immutable のコメントを参照）
  "unicorn/no-array-reverse": "off",
  "unicorn/no-array-sort": "off",
  // TypeScript では `T | undefined` を要求する引数へ明示的に undefined を渡す
  // 必要がある（省略と「明示的に未設定」は別物）。このルールはそれを
  // 「無駄な undefined」と誤検出する
  "unicorn/no-useless-undefined": "off",
  // require が必要な理由は node/global-require のコメントを参照
  "unicorn/prefer-module": "off",
};

/** テストコードとみなすパス（jest の慣習に合わせる） */
const TEST_FILES = ["**/*.{test,spec}.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"];

export const overrides = [
  {
    // React Native では StyleSheet.create() やコンポーネントをファイル末尾に定義する
    // 慣例のため、変数・関数の前方参照を許可し、クラス等の前方参照は検出する。
    // ルール ID は接頭辞なしの bare 形式（typescript/ 等の誤 ID だと無効果 — 実測済み）
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
  {
    // Expo の設定ファイル。Expo の慣例として無名の default export で書く
    files: ["app.config.ts"],
    rules: {
      "unicorn/no-anonymous-default-export": "off",
    },
  },
  {
    // テストコード。プロダクトコードとは求めるものが違うため、可読性より
    // 網羅性・素直さを優先する箇所のルールを緩める
    files: TEST_FILES,
    rules: {
      // 手順を追って逐次実行する、モック用の空実装、簡易な正規表現など
      "eslint/no-await-in-loop": "off",
      "eslint/no-empty-function": "off",
      "eslint/no-inline-comments": "off",
      "eslint/no-plusplus": "off",
      "eslint/prefer-named-capture-group": "off",
      "eslint/require-await": "off",
      "eslint/require-unicode-regexp": "off",
      // ループ内の early return/break はテスト基盤の読みやすさに寄与する
      "sonarjs/too-many-break-or-continue-in-loop": "off",
      // `jest.mock<typeof import("...")>(...)` はモックファクトリに型を付ける
      // 定石で、jest/no-untyped-mock-factory の自動修正もこの形を生成する。
      // インラインの import() 型注釈を禁じるこのルールと直接衝突するため、
      // テストコードでは無効にする（モジュールごとに import type * as を
      // 足す形にすると、モック対象1つにつき1行の重複が増えるだけになる）
      "typescript/consistent-type-imports": "off",
      // テストでは `(await fn()).prop` の直書きが読みやすい
      "unicorn/no-await-expression-member": "off",
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
      "jest/consistent-test-it": [
        "error",
        { fn: "test", withinDescribe: "test" },
      ],
      // `expectPressedStyle(...)` のように expect 接頭辞で自作した
      // アサーションヘルパーも「検証している」とみなす
      "jest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect", "expect*"] },
      ],
      "jest/no-alias-methods": "error",
      // テストの無効化は削除ではなくコメントアウトする、という規約があるため
      "jest/no-commented-out-tests": "off",
      // TypeScript の判別可能ユニオンを絞り込む `if` を「条件付きアサーション」と
      // 誤検出する。`expect(r.found).toBe(true); if (r.found) { expect(r.data)... }` の
      // ように、直前で表明した内容を型として絞るための if が対象になってしまう
      // （フリート7アプリの全29件を確認したところ、すべてこの絞り込みだった）。
      // 本来の対象である try/catch でのアサーション握り潰しも一緒に見逃す点は
      // 承知のうえで無効化する
      "jest/no-conditional-expect": "off",
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
      // 自動修正が `jest.mock<typeof import("m")>(...)` を生成するが、これは
      // ファクトリがモジュール全体の型を満たすことを要求する。RN / Expo の
      // テストでは必要な export だけを返す部分モックが常道で、型エラーになる
      // （実測: 7アプリの37箇所すべてが部分モックで tsc が通らなくなった）
      "jest/no-untyped-mock-factory": "off",
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
    },
  },
  {
    // expo-router のルートファイル。画面・レイアウトは `export default function
    // Screen()` の形で書くのが Expo 公式ドキュメントの定石（2026-08 に確認）。
    // 通常のコンポーネントは arrow で統一しているため、この緩和は src/app 配下に
    // 限る（実測: フリート7アプリの該当 80 件はすべて src/app 配下だった）
    files: ["src/app/**/*.tsx"],
    rules: {
      "react/function-component-definition": "off",
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
      // 画面操作は順に進めるため逐次 await が自然
      "eslint/no-await-in-loop": "off",
      "sonarjs/too-many-break-or-continue-in-loop": "off",
    },
  },
];

// oxlint 1.76 で options 配下として実装済みであることを 2026-07 に実測確認。
// トップレベルに置くと `unknown field` でパースに失敗する。
// CLI の `--report-unused-disable-directives-severity` と同等で、共有側に置くと
// 各アプリの lint スクリプトから CLI フラグを外せる
export const options = {
  reportUnusedDisableDirectives: "error",
};

/**
 * 共通設定にアプリ固有分をマージした config オブジェクトを返す。
 * 通常は defineConfig を使う（こちらは組み立て結果だけが欲しい場合の逃げ道）。
 * @param {{ globals?: object, ignorePatterns?: string[], options?: object, overrides?: object[], rules?: object }} app アプリ固有の追加設定
 */
export const buildConfig = (app = {}) => ({
  extends: presets,
  globals: { ...globals, ...app.globals },
  ignorePatterns: [...ignorePatterns, ...(app.ignorePatterns ?? [])],
  options: { ...options, ...app.options },
  overrides: [...overrides, ...(app.overrides ?? [])],
  rules: { ...rules, ...app.rules },
});

/**
 * 共通設定にアプリ固有分をマージして oxlint の設定として返す。
 * 各アプリの oxlint.config.ts はこれを default export するだけでよい。
 * @param {{ globals?: object, ignorePatterns?: string[], options?: object, overrides?: object[], rules?: object }} app アプリ固有の追加設定
 */
export const defineConfig = (app = {}) => defineOxlintConfig(buildConfig(app));
