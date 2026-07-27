import { defineConfig } from "@tzwzx/expo-oxc-config/oxlint";

// 共有設定そのものを、アプリと同じ入口（defineConfig）から適用する。
// アプリ固有分は渡さない = フリート標準の素の状態を検証する
export default defineConfig();
