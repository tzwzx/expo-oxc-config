import { defineConfig } from "@tzwzx/expo-oxc-config/oxlint";

// このリポジトリ自身にもフリート共通設定を当てる。消費側アプリと同じ入口
// （defineConfig）を通すことで、共有設定が壊れていれば自分のリポジトリで先に気づける。
//
// 自リポジトリ都合の緩和は必ずここに書く。oxlint.mjs 側の rules を触ると
// 消費側アプリすべてに一斉に効いてしまう。
export default defineConfig({
  // fixtures は「本来なら指摘されるコード」を意図的に置いている場所なので対象外。
  // ただし fixtures/ には自前の oxlint.config.ts があり、oxlint は既定で
  // サブディレクトリの設定（nested config）を優先するため、この ignorePatterns は
  // それだけでは効かない。package.json の lint/fix で --disable-nested-config を
  // 付けて初めて fixtures が除外される（実測確認済み）
  ignorePatterns: ["fixtures/**"],
  overrides: [
    {
      // verify.ts は「アプリと同じように PATH（node_modules/.bin）から
      // ツールを起動できること」自体を検証している。絶対パスに変えると
      // その検証が弱くなるため、指摘のほうを無効化する。
      // この理由が立つのは verify.ts だけなので scripts/** へは広げない
      // （PATH 経由でコマンドを叩く別スクリプトを足したときに検出を効かせる）
      files: ["scripts/verify.ts"],
      rules: { "sonarjs/no-os-command-from-path": "off" },
    },
  ],
});
