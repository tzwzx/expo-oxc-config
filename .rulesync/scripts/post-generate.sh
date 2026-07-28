#!/usr/bin/env bash
# rulesync generate 後の追加処理
set -euo pipefail

# CLAUDE.md は rulesync が claudecode target で直接生成する（root ルールのみ）。
# 以前ここで '@AGENTS.md' へのインポートブリッジに上書きしていたが、それをすると
# 全文 fold された AGENTS.md がロードされ、.claude/rules/ の path スコープが
# 効かなくなる（かつ二重ロードになる）ため廃止した。

# Cursor のコミットメッセージ生成（✨）に効くのは .cursorrules だけのため、
# 共有ソースの commit-message 正本から frontmatter を剥がして生成する
COMMIT_RULE=".rulesync/rules/.curated/ja-commit-message.md"
if [ -f "$COMMIT_RULE" ]; then
  awk 'BEGIN{n=0} /^---$/{ if (n<2) { n++; next } } n>=2{print}' "$COMMIT_RULE" \
    | sed '/./,$!d' > .cursorrules
fi
