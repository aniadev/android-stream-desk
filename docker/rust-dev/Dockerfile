# Rust + Tauri v2 build/test environment for Android Stream Desk.
#
# Purpose: compile and unit-test the Rust side (and optionally produce the
# Linux .deb / .AppImage) without installing a Rust toolchain or the
# webkit2gtk/GTK dev headers on the host. The host only needs Docker.
#
# Debian bookworm's glibc (2.36) is older than Ubuntu 24.04's, so binaries
# built here run on the host and on most current distros.
#
# Build via scripts/rust-env.sh (it passes your UID/GID so files written into
# the bind-mounted repo are owned by you, not root).
FROM rust:1-bookworm

ARG UID=1000
ARG GID=1000
ENV DEBIAN_FRONTEND=noninteractive

# Tauri v2 Linux prerequisites + tooling used by the bundler.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl wget file git pkg-config patchelf xz-utils \
      libssl-dev libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
      librsvg2-dev libxdo-dev \
    && rm -rf /var/lib/apt/lists/*

# Node 22 + pnpm so `pnpm tauri build` can run its beforeBuildCommand inside
# the container too. pnpm is installed directly (corepack's shim fails to
# fetch current pnpm releases under Node 22).
ARG NODE_VERSION=22.20.0
ARG PNPM_VERSION=12.3.4
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
      | tar -xJ -C /usr/local --strip-components=1 \
    && npm install -g "pnpm@${PNPM_VERSION}" \
    && npm cache clean --force

# Non-root user matching the host user so bind-mounted files stay ours.
RUN (getent group "${GID}" >/dev/null || groupadd -g "${GID}" dev) \
    && useradd -m -u "${UID}" -g "${GID}" -s /bin/bash dev

# Cargo registry/git cache lives in the user's home so a named volume can
# persist it across runs. Toolchain stays in the image (/usr/local/rustup).
ENV CARGO_HOME=/home/dev/.cargo \
    CARGO_TERM_COLOR=always \
    # AppImage tooling needs FUSE unless told to self-extract.
    APPIMAGE_EXTRACT_AND_RUN=1
RUN mkdir -p /home/dev/.cargo && chown -R dev:"${GID}" /home/dev

USER dev
WORKDIR /work
CMD ["bash"]
