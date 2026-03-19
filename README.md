# Esports Network Monitor

Esports Network Monitor is a production-oriented hybrid desktop platform for game-network diagnostics.
It combines a modern web dashboard with native desktop runtime and deterministic backend measurement logic.

This repository is prepared for publication with:
- a cleaned project structure
- a single canonical documentation source (`README.md`)
- reproducible build/test pipelines
- Docker and Docker Compose runtime support
- release scripts for Linux AppImage and Windows artifacts

## Open-Source and Portfolio Positioning
This project is designed as an open-source portfolio application that demonstrates:
- production-style architecture decisions
- measurable network diagnostics logic
- cross-stack integration (React + Python API + desktop runtime)
- reproducible testing and release workflows

License: MIT (free and permissive for personal and commercial use).

## Detailed Change Summary (Portfolio Scope)
This open-source portfolio release consolidates major work streams into one production-focused codebase.

### Architecture and Runtime
- Introduced a converged backend model around FastAPI + deterministic network probing.
- Implemented modern Qt loop convergence path in `python/main.py` using `qasync` with safe fallback behavior.
- Kept desktop packaging flow compatible with current Electron release pipeline for artifact generation.

### Network Quality Engine
- Added realistic multi-target validation and probing (`ipaddress`, `dnspython`, `icmplib`).
- Implemented three-pass rotating host verification for stable metric aggregation.
- Added score/status/recommendation outputs suitable for user-facing diagnostics.

### Frontend and API Contract
- Aligned frontend API payloads to include `host`, `targets`, and `samples`.
- Consolidated UX behavior around profile-driven target pools and server rotation logic.
- Preserved responsive dashboard rendering of metrics and recommendation states.

### Engineering Quality and Reporting
- Added build/debug report pipelines with structured artifacts.
- Added release scripts for AppImage and Windows packaging flow.
- Added Docker/Docker Compose runtime path for API deployment and integration testing.

### Open-Source Publication Readiness
- Cleaned repository from generated artifacts before release.
- Added MIT `LICENSE` and package metadata for public repository publication.
- Standardized documentation into one canonical `README.md`.

## Executive Summary (Investor/Stakeholder View)
Esports Network Monitor addresses a core reliability gap in competitive gaming: unstable network behavior (latency spikes, packet loss, jitter) that negatively impacts player performance and tournament consistency.

The product provides:
- profile-aware network validation for popular esports ecosystems
- transparent quality scoring and recommendation engine
- reproducible diagnostics and report generation for QA/support teams
- desktop-native deployment options for operations and player use

Business value:
- reduced support resolution time through structured diagnostics
- improved confidence in network quality before and during play
- repeatable release process with build/test evidence

## Product Capabilities
- Network test execution with multi-host target pools.
- Three-pass realistic backend verification model.
- Metrics visualization:
  - Ping
  - Jitter
  - Packet loss
  - P95 latency
  - Spike rate
  - Bufferbloat
  - Composite quality score
- Status classification (`Excellent`, `Good`, `Fair`, `Poor`).
- Human-readable recommendation output.
- Game profile selection and server rotation logic.
- Social/game mode UX controls.
- Screenshot capture and external-link handling in desktop mode.

## Architecture
### 1. Frontend (WebApp)
- Framework: React 19 + TypeScript
- Bundler: Vite 8
- Styling: Tailwind CSS 4 + custom CSS
- Purpose:
  - user interaction
  - progress and metrics rendering
  - profile/mode/server controls
  - API request orchestration

Key file:
- `src/App.tsx`

### 2. Backend (Python API)
- Framework: FastAPI + Uvicorn
- Validation: Pydantic
- Network probing: `icmplib`
- DNS validation: `dnspython`
- Purpose:
  - deterministic test execution
  - candidate target validation
  - three-pass probing strategy
  - score/status/recommendation generation

Key file:
- `python/server.py`

### 3. Desktop Runtime
Two supported runtime paths exist in codebase:
- Qt path (PySide6 6.10) via `python/main.py` for native Qt container flow.
- Electron path for packaging/release flow via `electron/` and `electron-builder`.

## Core Runtime Logic
### Backend test execution model
`POST /api/start-test` accepts:
- `host`: primary target
- `targets`: optional candidate list
- `samples`: sample count

Pipeline:
1. Merge and de-duplicate candidate targets.
2. Validate host strings as IP or resolvable DNS names.
3. Execute 3 rotating passes over target subsets.
4. Select pass winners by minimum reachable latency.
5. Aggregate winners into final metrics.
6. Compute score, quality status, and recommendation.

### Frontend orchestration
Frontend composes rotated targets from selected profile and current server mode, then sends full payload to backend:
- `host`
- `targets`
- `samples`

This guarantees backend has full context for realistic verification instead of single-host fallback behavior.

## API Contract
### `GET /api/status`
Health/status endpoint.

Example response:
```json
{
  "status": "Online",
  "service": "Esports Monitor Backend"
}
```

### `POST /api/start-test`
Example request:
```json
{
  "host": "1.1.1.1",
  "targets": ["api.steampowered.com", "status.riotgames.com"],
  "samples": 12
}
```

Example response:
```json
{
  "status": "Finished",
  "results": {
    "ping": 24.1,
    "jitter": 3.8,
    "packetLoss": 0,
    "p95": 32.5,
    "spikeRate": 0,
    "bufferbloat": 8.4,
    "score": 89,
    "status": "Excellent",
    "recommendation": "Connection quality is stable for competitive play. Keep this setup for best results.",
    "testedHost": "status.riotgames.com",
    "verification": {
      "passes": []
    }
  }
}
```

## Libraries and What They Do
### JavaScript / Web / Desktop
- `react`, `react-dom`: UI rendering and component model.
- `vite`: fast dev/build tooling.
- `typescript`: static typing and safer refactoring.
- `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`: styling pipeline.
- `framer-motion`: UI animation support.
- `lucide-react`: icon set.
- `electron`, `electron-builder`, `electron-squirrel-startup`: desktop packaging/runtime path.

### Python Backend / Qt
- `fastapi`: API framework.
- `uvicorn`: ASGI runtime.
- `pydantic`: request model validation.
- `icmplib`: low-level ICMP measurements.
- `dnspython`: DNS resolution checks.
- `PySide6==6.10.0`: Qt runtime.
- `qasync` (recommended): Qt/asyncio event-loop integration.
- `pyinstaller`: Qt packaging path.

### Testing and Quality
- `vitest`: frontend unit tests.
- `@testing-library/react`: component behavior tests.
- `playwright`: e2e coverage.
- `pytest`: backend test suite.
- `eslint`: static code checks.

## Test, Build, and Data Collection Pipelines
### Unit and backend tests
```bash
npm run test:unit
npm run test:backend
```

### E2E tests
```bash
npm run test:e2e
```

### Build report pipeline
```bash
npm run build:report
npm run build:report:appimage
```
Outputs detailed logs and JSON/Markdown summaries under `reports/build/<timestamp>/`.

### Extended debug reporting
```bash
npm run debug:report
npm run debug:report:quick
```
Outputs per-step logs and environment/dependency inventory under `reports/debug/<timestamp>/`.

## Production Setup
## Prerequisites
- Node.js 20+
- npm
- Python 3.12+
- Linux desktop dependencies for Qt WebEngine (when running Qt path)

### Install dependencies
```bash
npm install
python -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/pip install PySide6==6.10.0 qasync pyinstaller pytest
```

### Build frontend
```bash
npm run build:web
```

### Run backend API directly
```bash
./.venv/bin/python python/server.py
```

### Run Qt desktop wrapper
```bash
./.venv/bin/python python/main.py
```

## Docker
### Build image
```bash
npm run docker:build
```

### Start API container
```bash
npm run docker:up
```

API endpoint:
- `http://localhost:8000/api/status`

### Stop containers
```bash
npm run docker:down
```

### Compose dev profile (optional web dev container)
```bash
docker compose --profile dev up web-dev
```

## Release Scripts
### Linux AppImage (validated pipeline)
```bash
npm run release:appimage
```
Runs tests, builds AppImage, and prints SHA256/checks.

### Windows artifacts (NSIS + portable)
```bash
npm run release:win
```
Also available as native PowerShell script:
```powershell
./scripts/release-windows.ps1
```

## Important Notes for Windows Build
Cross-compiling Windows artifacts from Linux may require additional compatibility tooling. Native Windows build agents are recommended for deterministic release outputs.

## Repository Structure
```text
.
|-- Dockerfile
|-- docker-compose.yml
|-- requirements.txt
|-- electron/
|-- python/
|   |-- main.py
|   |-- server.py
|   `-- build_linux_qt.sh
|-- scripts/
|   |-- build-report.mjs
|   |-- debug-report.mjs
|   |-- release-appimage.sh
|   |-- release-windows.sh
|   `-- release-windows.ps1
|-- src/
|-- tests/
`-- README.md
```

## What the Code Is For
- Operational diagnostics of gaming connectivity in desktop contexts.
- Pre-match quality checks for players and operators.
- Reproducible QA and release evidence generation.
- Structured observability for support and incident analysis.

## Production Readiness Checklist
1. `npm run test:unit`
2. `npm run test:backend`
3. `npm run debug:report:quick`
4. `npm run release:appimage` (Linux)
5. `npm run release:win` (Windows build environment)

## GitHub Publication Guide
1. Create a new GitHub repository (for example: `esports-network-monitor`).
2. Update package metadata placeholders in `package.json`:
  - `homepage`
  - `repository.url`
  - `bugs.url`
3. Initialize git and push:
```bash
git init
git add .
git commit -m "Initial open-source release"
git branch -M main
git remote add origin https://github.com/<your-username>/esports-network-monitor.git
git push -u origin main
```
4. In GitHub settings, enable Issues and Discussions (optional).
5. Create a first release and attach built artifacts/checksums.

## License
This project is licensed under the MIT License. See `LICENSE`.
