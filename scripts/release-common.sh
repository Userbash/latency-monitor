#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

validate_release_inputs() {
  echo "[validate] Lint and tests"
  npm run lint
  npm run test:unit
  npm run test:backend
}
