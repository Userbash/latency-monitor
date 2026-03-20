# Application Workflow

## Overview
The Esports Network Monitor application consists of three main modules: Electron (desktop), Rust backend API, and React (frontend). The workflow describes how these modules interact to provide network diagnostics.

## Steps
1. **Startup**
   - Electron app launches, creates main window.
   - Rust backend starts and serves `/api` endpoints.

2. **User Action**
   - User selects a game/service profile or custom server.
   - Initiates network test from UI.

3. **IPC & API Communication**
   - Frontend sends test request via IPC to Electron main process.
   - Electron main process runs test logic (network.ts) or calls the Rust backend API.
   - Progress and results are sent back to frontend via IPC.

4. **Rust API Flow (when HTTP path is used)**
   - Request payload is validated and sanitized.
   - Candidate targets are normalized and filtered.
   - Three verification passes are executed.
   - Aggregated metrics and recommendation are returned.

5. **Result Display**
   - Frontend displays test progress, metrics (ping, jitter, packet loss, p95), and recommendations.
   - User can capture screenshots, open external links, or view detailed reports.

## Integration
- Electron manages window, IPC, and security.
- Rust backend provides REST API for advanced tests.
- React frontend handles UI, state, and visualization.

---

See module and function docs for technical details.