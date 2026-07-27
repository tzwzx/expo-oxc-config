import type { OxlintConfig, OxlintOverride } from "oxlint";

export declare const presets: OxlintConfig[];
export declare const ignorePatterns: string[];
export declare const rules: NonNullable<OxlintConfig["rules"]>;
export declare const overrides: OxlintOverride[];

/** 共通設定にアプリ固有分をマージした config オブジェクトを返す。 */
export declare function buildConfig(app?: {
  ignorePatterns?: string[];
  overrides?: OxlintOverride[];
  rules?: OxlintConfig["rules"];
}): OxlintConfig;
