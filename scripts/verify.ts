/**
 * 共有ツールチェーンのスモークテスト。
 *
 * oxlint / oxfmt / ultracite / プラグインを更新したあと、
 * 「まともに動かない状態のまま各アプリへ配ってしまう」ことを防ぐ。
 *
 * 検出の件数や内容は固定しない。ルールの追加・改名・挙動変更は許容し
 * （アプリ側で追従すればよい）、壊れているかどうかだけを見る。
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import oxfmtPreset from "ultracite/oxfmt";
import corePreset from "ultracite/oxlint/core";
import jsPluginsPreset from "ultracite/oxlint/js-plugins";
import reactPreset from "ultracite/oxlint/react";

import { buildConfig as buildOxfmtConfig } from "../oxfmt.mjs";
import { buildConfig as buildOxlintConfig } from "../oxlint.mjs";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;
/** 自リポジトリ用の oxfmt 入口（消費側アプリと同じ defineConfig を通している） */
const OXFMT_CONFIG = new URL("../oxfmt.config.ts", import.meta.url).pathname;

interface Diagnostic {
  code: string;
  filename: string;
}

interface OxlintJson {
  diagnostics: Diagnostic[];
  number_of_files: number;
  number_of_rules: number;
}

const checks: { name: string; ok: boolean; detail: string }[] = [];

const record = (name: string, ok: boolean, detail: string): void => {
  checks.push({ detail, name, ok });
};

/** fixtures に oxlint を当てて JSON を取る。設定が壊れていれば parse に失敗する */
const runOxlint = (): OxlintJson => {
  const result = spawnSync("oxlint", ["--format=json", "."], {
    cwd: FIXTURES_DIR,
    encoding: "utf-8",
  });

  if (result.error) {
    throw new Error(`oxlint を実行できなかった: ${result.error.message}`);
  }

  const stderr = result.stderr ?? "";
  if (stderr.includes("Failed to parse") || stderr.includes("Failed to load")) {
    throw new Error(`oxlint が設定を読めなかった:\n${stderr.trim()}`);
  }

  try {
    return JSON.parse(result.stdout) as OxlintJson;
  } catch {
    throw new Error(
      `oxlint の JSON 出力を解釈できなかった:\n${result.stdout.slice(0, 500)}\n${stderr.trim()}`
    );
  }
};

const report = runOxlint();
const pluginOf = (code: string): string => code.split("(")[0];
const rulesIn = (filename: string): string[] =>
  report.diagnostics.filter((d) => d.filename === filename).map((d) => d.code);

// 1. ルールが読み込まれているか（0 なら設定・プリセットの解決に失敗している）
record(
  "ルールが読み込まれている",
  report.number_of_rules > 0,
  `${report.number_of_rules} ルール / ${report.number_of_files} ファイルを解析`
);

// 2. JS プラグインが実際にルールを供給しているか。
//    どのルールが発火するかは問わない（改名・追加に強くするため）
for (const plugin of ["github", "sonarjs", "react-doctor"]) {
  const found = report.diagnostics.filter((d) => pluginOf(d.code) === plugin);
  record(
    `プラグイン ${plugin} が動いている`,
    found.length > 0,
    found.length > 0
      ? `${found.length}件（例: ${found[0].code}）`
      : "検出ゼロ — プラグインが読み込まれていない可能性"
  );
}

// 3. ignorePatterns の再宣言が効いているか。
//    oxlint の extends は ignorePatterns をマージしないため共有設定で再宣言している
const generated = rulesIn("sample.generated.ts");
record(
  "ignorePatterns が効いている",
  generated.length === 0,
  generated.length === 0
    ? "生成物ファイルは解析対象外"
    : `生成物ファイルが解析された: ${generated.join(", ")}`
);

// 4. src/** の override（no-use-before-define の緩和）が効いているか
const beforeDefine = rulesIn("src/src-override.ts").filter((c) =>
  c.includes("no-use-before-define")
);
record(
  "src/** の override が効いている",
  beforeDefine.length === 0,
  beforeDefine.length === 0
    ? "前方参照が許容されている"
    : `前方参照が指摘された: ${beforeDefine.join(", ")}`
);

// 5. jest.setup.ts の override（コンポーネントモック向けの緩和）が効いているか
const setupSuppressed = rulesIn("jest.setup.ts").filter(
  (c) => c.includes("function-name") || c.includes("display-name")
);
record(
  "jest.setup.ts の override が効いている",
  setupSuppressed.length === 0,
  setupSuppressed.length === 0
    ? "コンポーネントモックの命名が許容されている"
    : `指摘された: ${setupSuppressed.join(", ")}`
);

// 6. 共有設定で off にしているルールが実際に発火しないか
const OFF_RULES = [
  "no-array-sort",
  "no-array-reverse",
  "no-wildcard-import",
  "function-name",
  "js-tosorted-immutable",
];
const leaked = rulesIn("src/off-rules.tsx").filter((c) =>
  OFF_RULES.some((rule) => c.includes(rule))
);
record(
  "off にしたルールが発火しない",
  leaked.length === 0,
  leaked.length === 0
    ? `${OFF_RULES.length} ルールとも無効のまま`
    : `発火した: ${leaked.join(", ")}`
);

// 7. ultracite のプリセットが「形として」取り込めているか。
//    export の構造が変わると、エラーにならないまま空オブジェクトが混ざりうる
for (const [name, preset] of [
  ["core", corePreset],
  ["react", reactPreset],
  ["js-plugins", jsPluginsPreset],
] as const) {
  const count = Object.keys(preset.rules ?? {}).length;
  record(
    `ultracite の oxlint/${name} がルールを持っている`,
    count > 0,
    count > 0 ? `${count} ルール` : "空 — export の構造が変わった可能性"
  );
}

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

// 8. buildConfig を通した結果にも整形設定が残っているか。
//    oxfmt は extends を解釈しないためスプレッドで合成している。ultracite が
//    オブジェクト以外（関数など）を返すようになるとここで静かに空になる
const merged = buildOxfmtConfig();
const mergedSettings = Object.keys(merged).filter(
  (key) => key !== "ignorePatterns"
);
record(
  "oxfmt の合成結果に整形設定が残っている",
  mergedSettings.length > 0,
  `${mergedSettings.length} 項目`
);

// 9. oxfmt が ultracite の設定で実際に整形しているか（最重要）。
//    設定が読めても中身が効いていないと、エラーも出ないまま整形が素通りする。
//    import を逆順にしたファイルを置き、sortImports が働いて「要整形」と
//    判定されることで、プリセットが実際に適用されていることを確かめる。
//
//    プローブはリポジトリ外の一時ディレクトリへ置く。oxfmt 0.62.0 から
//    .gitignore に載ったファイルは整形対象から外れるようになり（0.61.0 では
//    対象だった。--ignore-path を渡しても解除できない — 2026-08 に実測）、
//    リポジトリ内に置くと「対象ファイルなし」の exit 2 で検査が空振りする。
//    共有設定は cwd 由来の探索に頼らず --config で明示的に読ませる
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

// eslint 互換の exit: 0 = 差分なし / 1 = 要整形。ここでは 1 が正常
const describeFmtResult = (): string => {
  if (fmt.error) {
    return `実行できなかった: ${fmt.error.message}`;
  }
  if (fmt.status === 1) {
    return "import 順の乱れを検知（sortImports が有効）";
  }
  // stderr も出す。プローブが ignore されて「対象ファイルなし」になると
  // exit 2 になり、原因がメッセージ側にしか出ない（2026-08 に遭遇）
  const stderr = (fmt.stderr ?? "").trim();
  const suffix = stderr === "" ? "" : `\n     ${stderr}`;
  return `exit ${fmt.status} — 乱れた import が素通りした。プリセットが効いていない可能性${suffix}`;
};

record(
  "oxfmt に ultracite の整形設定が効いている",
  fmt.error === undefined && fmt.status === 1,
  describeFmtResult()
);

// 10. unused disable の検出が共有設定の options 経由で効いているか。
//     CLI フラグなしで root の oxlint.config.ts（defineConfig）だけを使う。
//     options が落ちると抑止コメントが素通りする
const oxlintMerged = buildOxlintConfig();
const hasReportUnused =
  oxlintMerged.options?.reportUnusedDisableDirectives === "error";
record(
  "共有設定に reportUnusedDisableDirectives がある",
  hasReportUnused,
  hasReportUnused
    ? 'options.reportUnusedDisableDirectives = "error"'
    : "欠落 — buildConfig の options 合成が壊れた可能性"
);

const UNUSED_PROBE = new URL("../.verify-unused-probe.ts", import.meta.url)
  .pathname;
writeFileSync(
  UNUSED_PROBE,
  `// oxlint-disable-next-line no-debugger
export const unusedDisableProbe = 1;
`
);
const unused = spawnSync(
  "oxlint",
  ["--disable-nested-config", ".verify-unused-probe.ts"],
  {
    cwd: new URL("..", import.meta.url).pathname,
    encoding: "utf-8",
  }
);
rmSync(UNUSED_PROBE, { force: true });
const unusedDetected =
  unused.error === undefined &&
  unused.status === 1 &&
  (unused.stdout + unused.stderr).includes("Unused oxlint-disable directive");
record(
  "options.reportUnusedDisableDirectives が効いている",
  unusedDetected,
  unusedDetected
    ? "CLI フラグなしで unused disable を検知"
    : `exit ${unused.status} — options が root config に届いていない可能性`
);

for (const check of checks) {
  console.log(`${check.ok ? "✅" : "❌"} ${check.name} — ${check.detail}`);
}

const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  console.error(
    `\n${failed.length} 件失敗。パッケージを更新した直後なら、oxlint とプラグインの組み合わせが噛み合っていない可能性が高い。`
  );
  process.exit(1);
}
console.log("\n共有ツールチェーンは正常に動作している。");
