// 共有設定で off にしているルールが、実際に発火しないことを固定する。
// ここで指摘が出たら「off が効かなくなった」= 破壊的変更のサイン。
import * as Haptics from "expo-haptics";

// unicorn/no-array-sort と react-doctor/js-tosorted-immutable:
// Hermes が toSorted/toReversed 未対応のため off にしている
export const sortNumbers = (values: number[]): number[] =>
  [...values].sort((a, b) => a - b);

export const reverseNumbers = (values: number[]): number[] =>
  [...values].reverse();

// sonarjs/no-wildcard-import: Expo/RN の名前空間 import を許容している
export const tap = async (): Promise<void> => {
  await Haptics.selectionAsync();
};

// sonarjs/function-name: PascalCase の関数コンポーネント宣言を許容している
export function SampleComponent(): null {
  return null;
}
