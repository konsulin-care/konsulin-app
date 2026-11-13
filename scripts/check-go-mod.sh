#!/bin/sh
# check-go-mod.sh — verify go.mod and go.sum are tidy without modifying them.
# Usage: sh check-go-mod.sh [--help]
set -u

print_help() {
  cat <<'EOF'
Usage: check-go-mod.sh

Run "go mod tidy -diff" and fail when go.mod or go.sum would change.
The working tree is never modified by this script.

Options:
  --help     show this help and exit

Exit status:
  0  module files are tidy
  1  go.mod or go.sum needs "go mod tidy"
  2  environment error (go missing or no go.mod)
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help)
      print_help
      exit 0
      ;;
    *)
      echo "check-go-mod.sh: unknown argument: $1 (see --help)" >&2
      exit 2
      ;;
  esac
done

if ! command -v go >/dev/null 2>&1; then
  echo "check-go-mod.sh: go not found on PATH" >&2
  exit 2
fi

if [ ! -f go.mod ]; then
  echo "check-go-mod.sh: no go.mod in $(pwd)" >&2
  exit 2
fi

if go mod tidy -diff; then
  echo "go.mod and go.sum are tidy"
  exit 0
fi

echo "FAIL: go.mod or go.sum is out of date; run: go mod tidy" >&2
exit 1
