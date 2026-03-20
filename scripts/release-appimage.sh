#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

source "$(dirname "$0")/release-common.sh"

echo "[1/3] Running validation"
validate_release_inputs

echo "[2/3] Building AppImage with report"
npm run build:report:appimage

echo "[3/3] Artifact summary"
ls -lh dist/*.AppImage
sha256sum dist/*.AppImage
latest_report="$(ls -1dt reports/build/* | head -n 1)"
echo "Latest report: ${latest_report}"
