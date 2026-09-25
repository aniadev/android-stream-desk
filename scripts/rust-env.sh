#!/usr/bin/env bash
# Run Rust/Tauri commands for this repo inside the docker/rust-dev image, so
# the host needs no Rust toolchain or GTK/webkit dev headers.
#
# Usage:
#   scripts/rust-env.sh test            # cargo test --lib (Rust unit tests)
#   scripts/rust-env.sh check           # cargo check
#   scripts/rust-env.sh clippy          # cargo clippy --all-targets
#   scripts/rust-env.sh build           # pnpm tauri build → src-tauri/target/release/bundle/
#   scripts/rust-env.sh shell           # interactive bash in the container
#   scripts/rust-env.sh -- <cmd...>     # any command, cwd = src-tauri
#   scripts/rust-env.sh --rebuild-image # force image rebuild, then bash
#
# The repo is bind-mounted at /work, so `src-tauri/target/` and bundles land
# on the host as usual. Cargo's registry cache is a named Docker volume.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="android-stream-desk-rust-dev"
CARGO_VOLUME="android-stream-desk-cargo-home"

if [[ "${1:-}" == "--rebuild-image" ]]; then
  shift
  docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo ">> building $IMAGE (one-time, a few minutes)"
  docker build \
    --build-arg "UID=$(id -u)" \
    --build-arg "GID=$(id -g)" \
    -t "$IMAGE" \
    "$ROOT/docker/rust-dev"
fi

docker volume create "$CARGO_VOLUME" >/dev/null

# webserver.rs embeds ../dist-client at compile time; build it if absent.
if [[ ! -d "$ROOT/dist-client" ]]; then
  echo ">> dist-client missing (needed by include_dir!). Running pnpm build on host."
  (cd "$ROOT" && pnpm build)
fi

tty_args=()
if [[ -t 0 && -t 1 ]]; then
  tty_args=(-it)
fi

run() {
  local workdir="$1"; shift
  exec docker run --rm "${tty_args[@]}" \
    -v "$ROOT":/work \
    -v "$CARGO_VOLUME":/home/dev/.cargo \
    -w "$workdir" \
    "$IMAGE" "$@"
}

case "${1:-shell}" in
  test)   shift; run /work/src-tauri cargo test --lib "$@" ;;
  check)  shift; run /work/src-tauri cargo check "$@" ;;
  clippy) shift; run /work/src-tauri cargo clippy --all-targets "$@" ;;
  build)  shift; run /work pnpm tauri build "$@" ;;
  shell)  run /work/src-tauri bash ;;
  --)     shift; run /work/src-tauri "$@" ;;
  *)      echo "unknown subcommand: $1 (see header of $0)" >&2; exit 2 ;;
esac
