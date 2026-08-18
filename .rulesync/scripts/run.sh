#!/usr/bin/env bash
# rulesync の generate / check / postinstall を一箇所にまとめる
set -euo pipefail

# package.json 以外から呼ばれてもリポジトリルートで動くようにする
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

POST_GENERATE=".rulesync/scripts/post-generate.sh"

cmd="${1:-}"
case "$cmd" in
  generate)
    bunx rulesync install
    bunx rulesync generate
    bash "$POST_GENERATE"
    ;;
  check)
    bunx rulesync doctor --strict
    bunx rulesync install --frozen
    bunx rulesync generate --check
    bash "$POST_GENERATE"
    git diff --exit-code -- rulesync.lock .cursorrules
    ;;
  postinstall)
    if [ "${EAS_BUILD:-}" = true ]; then
      echo 'skip postinstall on EAS (rulesync needs private git)'
      exit 0
    fi
    lefthook install
    bunx rulesync install --frozen
    bun rulesync
    ;;
  *)
    echo "usage: $0 {generate|check|postinstall}" >&2
    exit 1
    ;;
esac
