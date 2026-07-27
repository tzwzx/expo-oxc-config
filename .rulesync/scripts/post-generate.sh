#!/usr/bin/env bash
# rulesync generate 後の追加処理
set -euo pipefail

# CLAUDE.md を AGENTS.md への import ブリッジにする（Claude Code 公式推奨）
printf '@AGENTS.md\n' > CLAUDE.md

# Cursor のコミットメッセージ生成（✨）に効くのは .cursorrules だけのため、
# 共有ソースの commit-message 正本から frontmatter を剥がして生成する
COMMIT_RULE=".rulesync/rules/.curated/ja-commit-message.md"
if [ -f "$COMMIT_RULE" ]; then
  awk 'BEGIN{n=0} /^---$/{ if (n<2) { n++; next } } n>=2{print}' "$COMMIT_RULE" \
    | sed '/./,$!d' > .cursorrules
fi
