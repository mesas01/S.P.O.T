FROM rust:1.89-alpine AS base

RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static nodejs npm

# Add wasm target
RUN rustup target add wasm32v1-none

# Install cargo-binstall, then stellar-scaffold-cli
RUN wget -qO- https://github.com/cargo-bins/cargo-binstall/releases/latest/download/cargo-binstall-x86_64-unknown-linux-musl.tgz \
    | tar xz -C /usr/local/bin/ \
  && cargo binstall -y stellar-scaffold-cli

WORKDIR /app
