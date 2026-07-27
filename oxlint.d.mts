import type { OxlintConfig, OxlintOverride } from "oxlint";

export declare const presets: OxlintConfig[];
export declare const ignorePatterns: string[];
export declare const rules: NonNullable<OxlintConfig["rules"]>;
export declare const overrides: OxlintOverride[];

interface AppOxlintConfig {
  ignorePatterns?: string[];
  overrides?: OxlintOverride[];
  rules?: OxlintConfig["rules"];
}

/** 共通設定にアプリ固有分をマージした config オブジェクトを返す。 */
export declare function buildConfig(app?: AppOxlintConfig): OxlintConfig;

/** 共通設定にアプリ固有分をマージして oxlint の設定として返す。 */
export declare function defineConfig(app?: AppOxlintConfig): OxlintConfig;
