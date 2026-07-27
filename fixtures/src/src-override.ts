// src/** の override（no-use-before-define を関数・変数について緩和）を固定する。
// RN では StyleSheet.create やコンポーネントをファイル末尾に置く慣例があるため。

// 関数の前方参照は許容される（指摘が出たら override が壊れている）
export const callsLater = (): number => later();

const later = (): number => 42;

// 変数の前方参照も許容される
export const readsLater = (): number => LATER_VALUE;

const LATER_VALUE = 7;
