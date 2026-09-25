# Android build environment for Android Stream Desk, layered on the Rust image
# (docker/rust-dev). Adds JDK 17, the Android SDK (platform + build-tools
# matching gen/android/app/build.gradle.kts), an NDK, and the Rust Android
# targets so `pnpm tauri android build` runs fully inside the container.
#
# Build via scripts/rust-env.sh (it builds the base image first).
FROM android-stream-desk-rust-dev

USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      openjdk-17-jdk-headless unzip \
    && rm -rf /var/lib/apt/lists/*

ARG ANDROID_PLATFORM=36
ARG ANDROID_BUILD_TOOLS=36.0.0
ARG ANDROID_NDK=27.2.12479018
ARG CMDLINE_TOOLS_ZIP=commandlinetools-linux-11076708_latest.zip

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    NDK_HOME=/opt/android-sdk/ndk/${ANDROID_NDK} \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools \
    && curl -fsSL "https://dl.google.com/android/repository/${CMDLINE_TOOLS_ZIP}" -o /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools \
    && mv /tmp/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm -rf /tmp/cmdline-tools /tmp/cmdline-tools.zip \
    && yes | sdkmanager --licenses >/dev/null \
    && sdkmanager --install \
         "platform-tools" \
         "platforms;android-${ANDROID_PLATFORM}" \
         "build-tools;${ANDROID_BUILD_TOOLS}" \
         "ndk;${ANDROID_NDK}" >/dev/null \
    && chown -R dev ${ANDROID_HOME}

# Gradle's cache is mounted as a named volume here; pre-create it owned by
# dev so the volume initialises with the right ownership.
# Same for ~/.android: it holds the auto-generated debug signing keystore.
# Persisting it keeps every debug APK signed with the same key, so
# `adb install -r` upgrades work instead of failing with
# INSTALL_FAILED_UPDATE_INCOMPATIBLE.
RUN mkdir -p /home/dev/.gradle /home/dev/.android && chown dev /home/dev/.gradle /home/dev/.android

USER dev
# Rust cross-compilation targets Tauri's Android build uses.
RUN rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

WORKDIR /work
CMD ["bash"]
