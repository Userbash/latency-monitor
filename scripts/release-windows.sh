#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/3] Running validation"
npm run test:unit
npm run test:backend

echo "[2/3] Building Windows artifacts (NSIS + portable)"
echo "Note: Cross-compiling Windows on Linux may require additional toolchain compatibility."
npm run build
npx electron-builder --win nsis portable

echo "[3/3] Artifact summary"
ls -lh dist/*Setup*.exe dist/*portable*.exe 2>/dev/null || true
sha256sum dist/*.exe 2>/dev/null || true
