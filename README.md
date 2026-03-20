# Esports Network Monitor

Esports Network Monitor is a desktop network diagnostics application built around a Rust backend API, Electron runtime, and React frontend.

## Architecture
- `rust-backend/`: backend service (`axum` + `tokio`) with validation, host probing, and scoring logic.
- `electron/`: desktop process, IPC bridge, and local network test flow.
- `src/`: React UI for profile selection, progress, and metrics rendering.

The project supports two runtime modes:
- Electron-first mode: renderer communicates with Electron IPC (`start-network-test`, `test-progress`, `test-complete`).
- API mode: frontend can call Rust HTTP endpoints (`/api/status`, `/api/start-test`).

## Rust Backend
- Language/runtime: Rust 2021 + Tokio.
- Web framework: Axum.
- API contract:
1. `GET /api/status`
2. `POST /api/start-test`
- Input validation:
1. payload field validation (`serde` with strict shape)
2. host normalization and deduplication
3. sample clamping and candidate-target bounds
- Measurement model:
1. multi-target candidate pool
2. three-pass verification
3. aggregated metrics (`ping`, `jitter`, `packetLoss`, `p95`, `spikeRate`, `bufferbloat`)
4. score/status/recommendation output

## Local Development
Install dependencies:
```bash
npm install
```

Run checks:
```bash
npm run lint
npm run test:unit
npm run test:backend
```

Run frontend:
```bash
npm run dev:web
```

Run Rust backend:
```bash
npm run dev:backend
```

Run Electron desktop:
```bash
npm run dev:electron
```

## Build and Release
Build app assets:
```bash
npm run build
```

Linux AppImage:
```bash
npm run release:appimage
```

Windows artifacts:
```bash
npm run release:win
```

CI-oriented direct release commands:
```bash
npm run release:ci:appimage
npm run release:ci:win
```

## Docker
```bash
npm run docker:build
npm run docker:up
npm run docker:down
```

## Repository Layout
```text
.
|-- rust-backend/
|   |-- Cargo.toml
|   `-- src/main.rs
|-- electron/
|-- src/
|-- docs/
|-- scripts/
|-- Dockerfile
|-- docker-compose.yml
`-- package.json
```

## Documentation
- `docs/README.md`: documentation index and reading order.
- `docs/workflow.md`: end-to-end module interaction flow.
- `docs/functions.md`: function-level map by module.
- `docs/testing.md`: test execution and report artifacts.
- `docs/CODE_READABILITY.md`: readability and commenting conventions.

## License
MIT
