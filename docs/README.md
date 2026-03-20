# Documentation Overview

This documentation set is fully aligned with the Rust backend architecture.

## Core Modules
- `rust-backend/`: Rust API service (`axum`, `tokio`) and metric computation engine.
- `electron/`: desktop shell, IPC handlers, and local runtime orchestration.
- `src/`: React UI and interaction flow.

## Reading Order
1. `docs/INSTALL.md` - environment setup and local verification.
2. `docs/USAGE.md` - runtime flows and API usage.
3. `docs/functions.md` - function-level reference by module.
4. `docs/workflow.md` - end-to-end architecture flow.
5. `docs/RELEASE.md` - artifact and CI release pipeline.
6. `docs/testing.md` - tests, reports, and debugging pipeline.
7. `docs/CODE_READABILITY.md` - code reading guide and comment conventions.

## Quick Start
```bash
npm install
npm run dev:web
npm run dev:backend
npm run dev:electron
```
