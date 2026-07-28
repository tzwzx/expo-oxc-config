import { defineConfig } from "@tzwzx/expo-oxc-config/oxfmt";

// 共有設定を自分自身にも当てる。fixtures は意図的に手を入れない場所なので対象外。
// oxlint と同じく fixtures/ の自前設定（nested config）が優先されるため、
// この除外は package.json の lint/fix の --disable-nested-config と対で効く。
export default defineConfig({ ignorePatterns: ["fixtures/**"] });
