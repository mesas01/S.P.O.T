FROM rust:1.89-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev nodejs npm make wget ca-certificates libdbus-1-3 \
  && rm -rf /var/lib/apt/lists/*

# Add wasm target
RUN rustup target add wasm32v1-none

# Install cargo-binstall, then stellar-scaffold-cli
RUN wget -qO- https://github.com/cargo-bins/cargo-binstall/releases/latest/download/cargo-binstall-x86_64-unknown-linux-musl.tgz \
    | tar xz -C /usr/local/bin/ \
  && cargo binstall -y stellar-scaffold-cli

# Install stellar-cli (prebuilt binary)
RUN wget -qO- https://github.com/stellar/stellar-cli/releases/download/v25.1.0/stellar-cli-25.1.0-x86_64-unknown-linux-gnu.tar.gz \
    | tar xz -C /usr/local/bin/ stellar

WORKDIR /app
