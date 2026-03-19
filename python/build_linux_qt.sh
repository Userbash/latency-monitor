#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Python venv not found at ${PYTHON_BIN}" >&2
  exit 1
fi

cd "${ROOT_DIR}"

echo "[1/3] Building web app"
npm run build

echo "[2/3] Packaging Qt wrapper (PyInstaller)"
"${PYTHON_BIN}" -m PyInstaller \
  --noconfirm \
  --clean \
  --windowed \
  --name esports-network-monitor-qt \
  --collect-all PySide6 \
  --add-data "dist:dist" \
  --add-data "python/server.py:." \
  python/main.py

echo "[3/3] Done"
echo "Executable: ${ROOT_DIR}/dist/esports-network-monitor-qt/esports-network-monitor-qt"
