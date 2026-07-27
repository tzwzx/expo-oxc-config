import type { Oxfmtrc } from "oxfmt";

/** ultracite プリセットにアプリ固有の ignorePatterns をマージした config を返す。 */
export declare function buildConfig(app?: { ignorePatterns?: string[] }): Oxfmtrc;

declare const config: Oxfmtrc;
export default config;
