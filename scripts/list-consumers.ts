// この共有設定を使っているリポジトリを、同じ階層のディレクトリから見つけて出力する。
//
// アプリ名をドキュメントやスキルにハードコードすると、アプリが増減したときに
// 静かに古くなる。依存関係を実際に読んで判定することで、
// 「7本すべてで確認したつもりが6本だった」という取りこぼしを防ぐ。
//
// 使い方:
//   for d in $(bun scripts/list-consumers.ts); do ... done
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SELF_DIR = path.resolve(import.meta.dirname, "..");
const PACKAGE_NAME = JSON.parse(
  readFileSync(path.join(SELF_DIR, "package.json"), "utf-8")
).name as string;
const SEARCH_ROOT = path.resolve(SELF_DIR, "..");

/** package.json が PACKAGE_NAME に依存していれば true */
const dependsOnSelf = (dir: string): boolean => {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf-8")
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return Boolean(
      pkg.dependencies?.[PACKAGE_NAME] ?? pkg.devDependencies?.[PACKAGE_NAME]
    );
  } catch {
    // package.json が無い / 壊れているディレクトリは対象外
    return false;
  }
};

const consumers = readdirSync(SEARCH_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
  .map((entry) => path.join(SEARCH_ROOT, entry.name))
  .filter((dir) => dir !== SELF_DIR && dependsOnSelf(dir))
  .sort((a, b) => a.localeCompare(b));

for (const dir of consumers) {
  process.stdout.write(`${dir}\n`);
}
