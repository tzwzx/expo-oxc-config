/**
 * 共有 oxfmt のスモークテスト。
 *
 * oxfmt / ultracite を更新したあと、設定が読めても中身が効いていないまま
 * 各アプリへ配ってしまうことを防ぐ。
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import oxfmtPreset from "ultracite/oxfmt";

import { buildConfig as buildOxfmtConfig } from "../oxfmt.mjs";

/** 自リポジトリ用の oxfmt 入口（消費側アプリと同じ defineConfig を通している） */
const OXFMT_CONFIG = new URL("../oxfmt.config.ts", import.meta.url).pathname;

const checks: { name: string; ok: boolean; detail: string }[] = [];

const record = (name: string, ok: boolean, detail: string): void => {
  checks.push({ detail, name, ok });
};

const oxfmtSettings = Object.keys(oxfmtPreset).filter(
  (key) => key !== "ignorePatterns"
);
record(
  "ultracite の oxfmt が整形設定を持っている",
  oxfmtSettings.length > 0,
  oxfmtSettings.length > 0
    ? `${oxfmtSettings.length} 項目（${oxfmtSettings.slice(0, 3).join(", ")} ほか）`
    : "空 — export の構造が変わった可能性"
);

// buildConfig を通した結果にも整形設定が残っているか。
// oxfmt は extends を解釈しないためスプレッドで合成している。ultracite が
// オブジェクト以外（関数など）を返すようになるとここで静かに空になる
const merged = buildOxfmtConfig();
const mergedSettings = Object.keys(merged).filter(
  (key) => key !== "ignorePatterns"
);
record(
  "oxfmt の合成結果に整形設定が残っている",
  mergedSettings.length > 0,
  `${mergedSettings.length} 項目`
);

// oxfmt が ultracite の設定で実際に整形しているか。
// 設定が読めても中身が効いていないと、エラーも出ないまま整形が素通りする。
// import を逆順にしたファイルを置き、sortImports が働いて「要整形」と
// 判定されることで、プリセットが実際に適用されていることを確かめる。
//
// プローブはリポジトリ外の一時ディレクトリへ置く。oxfmt 0.62.0 から
// .gitignore に載ったファイルは整形対象から外れるようになり、
// リポジトリ内に置くと「対象ファイルなし」の exit 2 で検査が空振りする。
const PROBE_DIR = mkdtempSync(path.join(tmpdir(), "expo-oxc-config-verify-"));
const PROBE_FILE = path.join(PROBE_DIR, "probe.ts");
writeFileSync(
  PROBE_FILE,
  `import { basename } from "node:path";
import { readFile } from "node:fs/promises";

export const probe = async (path: string): Promise<string> => {
  const content = await readFile(path, "utf8");
  return \`\${basename(path)}: \${content.length}\`;
};
`
);
const fmt = spawnSync(
  "oxfmt",
  ["--check", `--config=${OXFMT_CONFIG}`, PROBE_FILE],
  { encoding: "utf-8" }
);
rmSync(PROBE_DIR, { force: true, recursive: true });

const describeFmtResult = (): string => {
  if (fmt.error) {
    return `実行できなかった: ${fmt.error.message}`;
  }
  if (fmt.status === 1) {
    return "import 順の乱れを検知（sortImports が有効）";
  }
  const stderr = (fmt.stderr ?? "").trim();
  const suffix = stderr === "" ? "" : `\n     ${stderr}`;
  return `exit ${fmt.status} — 乱れた import が素通りした。プリセットが効いていない可能性${suffix}`;
};

record(
  "oxfmt に ultracite の整形設定が効いている",
  fmt.error === undefined && fmt.status === 1,
  describeFmtResult()
);

for (const check of checks) {
  console.log(`${check.ok ? "✅" : "❌"} ${check.name} — ${check.detail}`);
}

const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  console.error(
    `\n${failed.length} 件失敗。oxfmt と ultracite の組み合わせが噛み合っていない可能性が高い。`
  );
  process.exit(1);
}
console.log("\n共有ツールチェーンは正常に動作している。");
