#!/bin/sh
# check-file-length.sh — fail when any given file exceeds the maximum line count.
# Usage: sh check-file-length.sh [--max N] FILE...
set -u

DEFAULT_MAX=300
max=$DEFAULT_MAX
status=0

print_help() {
  cat <<'EOF'
Usage: check-file-length.sh [--max N] FILE...

Check that each FILE stays within the maximum line count (default: 300).

Options:
  --max N    maximum allowed line count
  --help     show this help and exit

Exit status:
  0  every file is within the limit
  1  at least one file exceeds the limit or is missing
  2  usage error
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help)
      print_help
      exit 0
      ;;
    --max)
      shift
      if [ "$#" -eq 0 ]; then
        echo "check-file-length.sh: --max requires a value" >&2
        exit 2
      fi
      max=$1
      ;;
    --max=*)
      max=${1#--max=}
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "check-file-length.sh: unknown option: $1" >&2
      exit 2
      ;;
    *)
      break
      ;;
  esac
  shift
done

case "$max" in
  ''|*[!0-9]*)
    echo "check-file-length.sh: --max must be a non-negative integer: $max" >&2
    exit 2
    ;;
esac

if [ "$#" -eq 0 ]; then
  echo "check-file-length.sh: no files given (see --help)" >&2
  exit 2
fi

for file in "$@"; do
  if [ ! -f "$file" ]; then
    echo "FAIL: $file does not exist"
    status=1
    continue
  fi
  # wc output may be space-padded; strip whitespace before the numeric test.
  lines=$(wc -l < "$file" | tr -d '[:space:]')
  if [ "$lines" -gt "$max" ]; then
    echo "FAIL: $file has $lines lines (max $max)"
    status=1
  fi
done

if [ "$status" -eq 0 ]; then
  echo "OK: $# file(s) within $max lines"
fi
exit "$status"
