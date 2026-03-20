#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

source "$(dirname "$0")/release-common.sh"

echo "[1/3] Running validation"
validate_release_inputs

echo "[2/3] Building Windows artifacts (NSIS + portable)"
if [[ "$(uname -s)" == "Linux" ]] && ! command -v wine >/dev/null 2>&1; then
	echo "Windows packaging on Linux requires wine (not found)."
	echo "Install wine or run this script on a Windows CI runner."
	exit 1
fi

echo "Note: Cross-compiling Windows on Linux may require additional toolchain compatibility."
npm run build
npx electron-builder --publish never --win nsis portable

echo "[3/3] Artifact summary"
ls -lh dist/*Setup*.exe dist/*portable*.exe 2>/dev/null || true
sha256sum dist/*.exe 2>/dev/null || true
