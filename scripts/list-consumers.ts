// Discover sibling repos that depend on this package by reading package.json.
// Hardcoding app names in docs/skills goes stale when apps are added or removed.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SELF_DIR = path.resolve(import.meta.dirname, "..");
const PACKAGE_NAME = JSON.parse(
  readFileSync(path.join(SELF_DIR, "package.json"), "utf-8")
).name as string;
const SEARCH_ROOT = path.resolve(SELF_DIR, "..");

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
