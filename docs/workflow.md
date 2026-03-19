# Application Workflow

## Overview
The Esports Network Monitor application consists of three main modules: Electron (desktop), Python (backend/Qt), and React (frontend). The workflow describes how these modules interact to provide network diagnostics.

## Steps
1. **Startup**
   - Electron app launches, creates main window.
   - Python backend starts (optionally via Qt wrapper).

2. **User Action**
   - User selects a game/service profile or custom server.
   - Initiates network test from UI.

3. **IPC & API Communication**
   - Frontend sends test request via IPC to Electron main process.
   - Electron main process runs test logic (network.ts) or communicates with Python backend.
   - Progress and results are sent back to frontend via IPC.

4. **Result Display**
   - Frontend displays test progress, metrics (ping, jitter, packet loss, p95), and recommendations.
   - User can capture screenshots, open external links, or view detailed reports.

## Integration
- Electron manages window, IPC, and security.
- Python backend provides REST API for advanced tests.
- React frontend handles UI, state, and visualization.

---

See module and function docs for technical details.