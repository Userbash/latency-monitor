# Installation Guide

## Requirements
- Node.js 20+
- Rust toolchain (stable)
- Docker (optional)

## Install Project Dependencies
```bash
npm install
```

## Verify Local Tooling
```bash
npm run lint
npm run test:unit
npm run test:backend
```

## Optional: Local GitHub Actions with act
If you want to run CI jobs locally before pushing, see `docs/ACT.md`.

## Build Frontend and Electron Targets
```bash
npm run build
```

## Run Rust Backend Locally
```bash
npm run dev:backend
```

Optional environment variables:
- `HOST` (default: `127.0.0.1`)
- `PORT` (default: `8000`)
- `DIST_PATH` (default: `dist`)

## Docker Runtime
```bash
npm run docker:build
npm run docker:up
npm run docker:down
```
