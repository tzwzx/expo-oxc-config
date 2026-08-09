// フリート共通の oxfmt 設定。oxfmt は extends を解釈しない（メンテナ方針）ため、
// スプレッドで組み立てるヘルパーとして提供する。
//
// oxfmt 本体の import をここに閉じ込めることで、アプリ側は oxfmt を
// 直接参照しなくて済む（＝アプリの package.json に oxfmt を書かなくてよい）。
import { defineConfig as defineOxfmtConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

/**
 * ultracite プリセットにアプリ固有の ignorePatterns をマージした config を返す。
 * 通常は defineConfig を使う（こちらは組み立て結果だけが欲しい場合の逃げ道）。
 * @param {{ ignorePatterns?: string[] }} app アプリ固有の追加設定
 */
export const buildConfig = (app = {}) => ({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    // store-shots の生成物（ストアスクショの HTML/PNG）は git 追跡するが整形しない。
    // oxfmt は .html も整形対象にするため（2026-08-06 実測）、生成器の出力次第で
    // oxfmt --check が落ちる（sync で実際に発生。他リポは偶然通っているだけ）。
    // store-shots を持たないリポではマッチするファイルが無く無害なので共通で除外する
    "store-shots/output/**",
    ...(app.ignorePatterns ?? []),
  ],
});

/**
 * 共通設定にアプリ固有分をマージして oxfmt の設定として返す。
 * 各アプリの oxfmt.config.ts はこれを default export するだけでよい。
 * @param {{ ignorePatterns?: string[] }} app アプリ固有の追加設定
 */
export const defineConfig = (app = {}) => defineOxfmtConfig(buildConfig(app));
