FROM node:20-alpine AS web-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:web

FROM rust:1.86-slim AS rust-builder
WORKDIR /app
COPY rust-backend/Cargo.toml ./rust-backend/Cargo.toml
RUN mkdir -p rust-backend/src && echo "fn main() {}" > rust-backend/src/main.rs
RUN cargo build --release --manifest-path rust-backend/Cargo.toml
COPY rust-backend ./rust-backend
RUN cargo build --release --manifest-path rust-backend/Cargo.toml

FROM debian:bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=web-builder /app/dist ./dist
COPY --from=rust-builder /app/target/release/latency-monitor-backend ./latency-monitor-backend
EXPOSE 8000
CMD ["./latency-monitor-backend"]
