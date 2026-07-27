// 3つの JS プラグインが実際に読み込まれ、ルールを供給していることを確かめる。
// ここでの指摘が消えたら「プラグインが静かに効かなくなった」= 最も危険な壊れ方。
// どのルールが発火するかは問わない（プラグインごとに最低1件出れば合格）。

// sonarjs 向け: 同一リテラルの重複と入れ子テンプレートリテラル
export const duplicated = {
  a: "この文字列は重複している",
  b: "この文字列は重複している",
  c: "この文字列は重複している",
};

export const nested = (name: string): string => `outer ${`inner ${name}`}`;

// github 向け: Promise の .then() 連鎖
export const chained = (input: Promise<number>): Promise<string> =>
  input.then((value) => String(value));

// react-doctor 向け: ループ内での直列 await
export const sequential = async (items: number[]): Promise<number> => {
  let total = 0;
  for (const item of items) {
    total += await Promise.resolve(item);
  }
  return total;
};
