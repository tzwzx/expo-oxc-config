// フリート共通の oxfmt 設定。oxfmt は extends を解釈しない（メンテナ方針）ため、
// スプレッドで組み立てるヘルパーとして提供する。
//
// oxfmt 本体の import をここに閉じ込めることで、アプリ側は oxfmt を
// 直接参照しなくて済む（＝アプリの package.json に oxfmt を書かなくてよい）。
import { defineConfig as defineOxfmtConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Cursor のルール断片。整形対象外。
export const generatedRulePatterns = [".cursor/rules/**"];

/**
 * ultracite プリセットにアプリ固有の ignorePatterns をマージした config を返す。
 * 通常は defineConfig を使う（こちらは組み立て結果だけが欲しい場合の逃げ道）。
 * @param {{ ignorePatterns?: string[] }} app アプリ固有の追加設定
 */
export const buildConfig = (app = {}) => ({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    ...generatedRulePatterns,
    ...(app.ignorePatterns ?? []),
  ],
});

/**
 * 共通設定にアプリ固有分をマージして oxfmt の設定として返す。
 * 各アプリの oxfmt.config.ts はこれを default export するだけでよい。
 * @param {{ ignorePatterns?: string[] }} app アプリ固有の追加設定
 */
export const defineConfig = (app = {}) => defineOxfmtConfig(buildConfig(app));
