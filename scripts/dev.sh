#!/bin/sh
# dev.sh — unified dev launcher: full | go | next | static.
# Usage: sh scripts/dev.sh [mode] [--go-port N] [--next-port N]
set -u

MODE=full
GO_PORT=3000
NEXT_PORT=8000

# TX_URL defaults to http://localhost:3300 in every mode (env wins if set).
TX_URL="${TX_URL:-http://localhost:3300}"
export TX_URL

print_help() {
  cat <<'EOF'
Usage: sh scripts/dev.sh [mode] [--go-port N] [--next-port N]

Modes: full|go|next|static

  full     Next.js dev server + Go BFF proxy (default)
  go       Go BFF only (expects Next.js at NEXTJS_URL)
  next     Next.js dev server only
  static   Build Next.js static export, then serve via Go BFF

Options:
  --go-port N      Go BFF port (default: 3000)
  --next-port N    Next.js dev server port (default: 8000)
  --help           show this help and exit

Environment:
  TX_URL           defaults to http://localhost:3300 in every mode
EOF
}

is_port() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
    *) return 0 ;;
  esac
}

mode_set=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --help)
      print_help
      exit 0
      ;;
    --go-port)
      [ "$#" -ge 2 ] || { echo "dev.sh: --go-port requires a value" >&2; exit 2; }
      GO_PORT=$2
      shift
      ;;
    --go-port=*)
      GO_PORT=${1#--go-port=}
      ;;
    --next-port)
      [ "$#" -ge 2 ] || { echo "dev.sh: --next-port requires a value" >&2; exit 2; }
      NEXT_PORT=$2
      shift
      ;;
    --next-port=*)
      NEXT_PORT=${1#--next-port=}
      ;;
    -*)
      echo "dev.sh: unknown option: $1 (see --help)" >&2
      exit 2
      ;;
    *)
      if [ "$mode_set" -eq 1 ]; then
        echo "dev.sh: unexpected argument: $1" >&2
        exit 2
      fi
      MODE=$1
      mode_set=1
      ;;
  esac
  shift
done

case "$MODE" in
  full|go|next|static) ;;
  *)
    echo "dev.sh: unknown mode: $MODE (expected full|go|next|static)" >&2
    exit 2
    ;;
esac

is_port "$GO_PORT" || { echo "dev.sh: --go-port must be a number: $GO_PORT" >&2; exit 2; }
is_port "$NEXT_PORT" || { echo "dev.sh: --next-port must be a number: $NEXT_PORT" >&2; exit 2; }

# Shared Go BFF environment; TX_URL default already exported above.
go_env() {
  PORT=$GO_PORT
  APP_URL="http://localhost:$GO_PORT"
  API_URL="${API_URL:-http://localhost:3200}"
  NEXTJS_URL="${NEXTJS_URL:-http://localhost:$NEXT_PORT}"
  SESSION_COOKIE_SECRET="${SESSION_COOKIE_SECRET:-CHANGE_ME_generate_a_random_64_char_secret}"
  CSRF_AUTH_KEY="${CSRF_AUTH_KEY:-dev-csrf-auth-key-32-bytes-long!}"
  export PORT APP_URL API_URL NEXTJS_URL SESSION_COOKIE_SECRET CSRF_AUTH_KEY
}

clean_dirs() {
  rm -rf .next out
}

case "$MODE" in
  full)
    clean_dirs
    echo "Go BFF on :$GO_PORT  |  Next.js on :$NEXT_PORT"
    go_env
    trap 'kill 0' EXIT
    go run ./cmd/konsulin-app &
    npm run dev -- -p "$NEXT_PORT" &
    wait
    ;;
  go)
    go_env
    echo "Go BFF on :$GO_PORT (proxying to $NEXTJS_URL)"
    go run ./cmd/konsulin-app
    ;;
  next)
    echo "Next.js on :$NEXT_PORT"
    npm run dev -- -p "$NEXT_PORT"
    ;;
  static)
    clean_dirs
    echo "Go BFF on :$GO_PORT serving static out/"
    go_env
    npm run build
    go run ./cmd/konsulin-app
    ;;
esac
