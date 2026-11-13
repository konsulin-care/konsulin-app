#!/bin/sh
# docker-publish.sh — build and push the Docker image for an environment.
# Usage: sh scripts/docker-publish.sh <env> [--build-arg K=V ...] [--tag <tag>]
set -u

IMAGE_NAME="${IMAGE_NAME:-konsulin-app}"

print_help() {
  cat <<'EOF'
Usage: sh scripts/docker-publish.sh <env> [--build-arg K=V ...] [--tag <tag>]

Build the Docker image and push it to the registry.

Environments: development | staging | production

Options:
  --build-arg K=V   forwarded to docker build (e.g. GO_VERSION, NODE_VERSION)
  --tag <tag>       image tag (default: <env>)
  --help            show this help and exit

Required environment (validated before any docker call):
  IMAGE_NAMESPACE   registry namespace (e.g. konsulin)
  DOCKER_USERNAME   registry username
  DOCKER_PASSWORD   registry password or token

Exit status:
  0  image pushed
  1  environment validation failed or docker unavailable
  2  invalid usage
EOF
}

die_usage() {
  echo "docker-publish.sh: $1" >&2
  exit 2
}

ENVIRONMENT=""
IMAGE_TAG=""
passthrough=""

# append_build_arg <value> — validate then append a --build-arg pair.
# Values must be word-split safe (no whitespace or shell metacharacters).
append_build_arg() {
  case "$1" in
    ''|*[!A-Za-z0-9_.=:@/-]*)
      echo "docker-publish.sh: invalid --build-arg value: $1" >&2
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
      [ "$#" -ge 2 ] || die_usage "--build-arg requires a value"
      append_build_arg "$2"
      shift
      ;;
    --build-arg=*)
      append_build_arg "${1#--build-arg=}"
      ;;
    --tag)
      [ "$#" -ge 2 ] || die_usage "--tag requires a value"
      IMAGE_TAG=$2
      shift
      ;;
    --tag=*)
      IMAGE_TAG=${1#--tag=}
      ;;
    -*)
      die_usage "unknown option: $1 (see --help)"
      ;;
    *)
      if [ -n "$ENVIRONMENT" ]; then
        die_usage "unexpected argument: $1 (see --help)"
      fi
      ENVIRONMENT=$1
      ;;
  esac
  shift
done

# --- Environment validation; runs before any docker call. ---

if [ -z "$ENVIRONMENT" ]; then
  echo "docker-publish.sh: missing <env> (development|staging|production)" >&2
  exit 1
fi

case "$ENVIRONMENT" in
  development|staging|production) ;;
  *)
    echo "docker-publish.sh: invalid env: $ENVIRONMENT (expected development|staging|production)" >&2
    exit 1
    ;;
esac

missing=""
[ -n "${IMAGE_NAMESPACE:-}" ] || missing="$missing IMAGE_NAMESPACE"
[ -n "${DOCKER_USERNAME:-}" ] || missing="$missing DOCKER_USERNAME"
[ -n "${DOCKER_PASSWORD:-}" ] || missing="$missing DOCKER_PASSWORD"
if [ -n "$missing" ]; then
  echo "docker-publish.sh: missing required environment:$missing" >&2
  echo "docker-publish.sh: set them before publishing (see --help)" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker-publish.sh: docker not found on PATH" >&2
  exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
  IMAGE_TAG=$ENVIRONMENT
fi
IMAGE="$IMAGE_NAMESPACE/$IMAGE_NAME:$IMAGE_TAG"

printf '%s' "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin || exit 1

# passthrough is word-split on purpose: values are validated above.
# shellcheck disable=SC2086
sh scripts/docker.sh --tag "$IMAGE" $passthrough || exit 1

docker push "$IMAGE" || exit 1

echo "docker-publish.sh: pushed $IMAGE"
