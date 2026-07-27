// jest.setup.ts の override（コンポーネントモック向けの緩和）を固定する。
// ここで指摘が出たら override が効いていない。
export const ThemeProvider = ({ children }: { children: unknown }): unknown =>
  children;

export function PostHogProvider({ children }: { children: unknown }): unknown {
  return children;
}
