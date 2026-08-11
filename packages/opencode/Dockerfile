FROM alpine AS base

# Disable the runtime transpiler cache by default inside Docker containers.
# On ephemeral containers, the cache is not useful
ARG BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_RUNTIME_TRANSPILER_CACHE_PATH}
RUN apk add libgcc libstdc++ ripgrep

FROM base AS build-amd64
COPY dist/swiftcoder-linux-x64-baseline-musl/bin/swiftcoder /usr/local/bin/swiftcoder

FROM base AS build-arm64
COPY dist/swiftcoder-linux-arm64-musl/bin/swiftcoder /usr/local/bin/swiftcoder

ARG TARGETARCH
FROM build-${TARGETARCH}
RUN swiftcoder --version
ENTRYPOINT ["swiftcoder"]
