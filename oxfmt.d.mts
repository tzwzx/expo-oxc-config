import type { Oxfmtrc } from "oxfmt";

interface AppOxfmtConfig {
  ignorePatterns?: string[];
}

/** ultracite プリセットにアプリ固有の ignorePatterns をマージした config を返す。 */
export declare function buildConfig(app?: AppOxfmtConfig): Oxfmtrc;

/** 共通設定にアプリ固有分をマージして oxfmt の設定として返す。 */
export declare function defineConfig(app?: AppOxfmtConfig): Oxfmtrc;
