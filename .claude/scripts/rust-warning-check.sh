#!/usr/bin/env bash
# PostToolUse hook: run cargo build on Rust file edits and surface any warnings.
# Reads tool input JSON on stdin. Exits 0 silently when no warnings; exits 2
# with the warning list on stderr so Claude can fix them in the same turn.

set -u

file_path=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)

case "$file_path" in
  *.rs) ;;
  *) exit 0 ;;
esac

case "$file_path" in
  */app/src-tauri/*) ;;
  *) exit 0 ;;
esac

project_dir=${CLAUDE_PROJECT_DIR:-$(pwd)}
manifest="$project_dir/app/src-tauri/Cargo.toml"

if [ ! -f "$manifest" ]; then
  exit 0
fi

output=$(cargo build --manifest-path "$manifest" --message-format=human 2>&1)
status=$?

warnings=$(printf '%s\n' "$output" | grep -E "^warning")

if [ "$status" -ne 0 ]; then
  printf 'cargo build failed:\n%s\n' "$output" >&2
  exit 2
fi

if [ -n "$warnings" ]; then
  printf 'Rust build emitted warnings — please fix them:\n\n%s\n' "$output" >&2
  exit 2
fi

exit 0
