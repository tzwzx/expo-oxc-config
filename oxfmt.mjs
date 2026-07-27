// フリート共通の oxfmt 設定。oxfmt は extends を解釈しない（メンテナ方針）ため、
// スプレッド用のオブジェクト + マージヘルパーとして提供する。
import ultracite from "ultracite/oxfmt";

/**
 * ultracite プリセットにアプリ固有の ignorePatterns をマージした config を返す。
 * @param {{ ignorePatterns?: string[] }} app
 */
export function buildConfig(app = {}) {
  return {
    ...ultracite,
    ignorePatterns: [
      ...(ultracite.ignorePatterns ?? []),
      ...(app.ignorePatterns ?? []),
    ],
  };
}

export default buildConfig();
