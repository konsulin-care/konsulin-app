#!/bin/sh
# docker.sh — build the Docker image with toolchain versions from mise.
# Usage: sh scripts/docker.sh [--build-arg K=V ...] [--tag <tag>]
set -u

IMAGE_TAG=konsulin-app
passthrough=""

print_help() {
  cat <<'EOF'
Usage: sh scripts/docker.sh [--build-arg K=V ...] [--tag <tag>]

Build the Docker image (Dockerfile) and tag it.

Options:
  --build-arg K=V   forwarded to docker build (e.g. GO_VERSION, NODE_VERSION)
  --tag <tag>       image tag (default: konsulin-app)
  --help            show this help and exit

Exit status:
  0  image built
  1  docker not available
  2  invalid usage
EOF
}

# append_build_arg <value> — validate then append a --build-arg pair.
# Values must be word-split safe (no whitespace or shell metacharacters).
append_build_arg() {
  case "$1" in
    ''|*[!A-Za-z0-9_.=:@/-]*)
      echo "docker.sh: invalid --build-arg value: $1" >&2
      exit 2
      ;;
  esac
  passthrough="$passthrough --build-arg $1"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help)
      print_help
      exit 0
      ;;
    --build-arg)
      [ "$#" -ge 2 ] || { echo "docker.sh: --build-arg requires a value" >&2; exit 2; }
      append_build_arg "$2"
      shift
      ;;
    --build-arg=*)
      append_build_arg "${1#--build-arg=}"
      ;;
    --tag)
      [ "$#" -ge 2 ] || { echo "docker.sh: --tag requires a value" >&2; exit 2; }
      IMAGE_TAG=$2
      shift
      ;;
    --tag=*)
      IMAGE_TAG=${1#--tag=}
      ;;
    -*)
      echo "docker.sh: unknown option: $1 (see --help)" >&2
      exit 2
      ;;
    *)
      echo "docker.sh: unexpected argument: $1 (see --help)" >&2
      exit 2
      ;;
  esac
  shift
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker.sh: docker not found on PATH" >&2
  exit 1
fi

# passthrough is word-split on purpose: values are validated above.
# shellcheck disable=SC2086
docker build --progress=plain $passthrough -t "$IMAGE_TAG" .
