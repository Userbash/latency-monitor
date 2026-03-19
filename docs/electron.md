# Electron Module

## Purpose
The Electron module is responsible for the main desktop application logic, window management, IPC communication, and integration with the network testing backend.

### Main Files
- `main.ts`: Entry point, window creation, IPC handlers, security.
- `network.ts`: Network test logic (ping, jitter, packet loss, p95).
- `preload.cts`: Preload script for secure communication between renderer and main process.

## Key Functions
### main.ts
- `configureStoragePaths()`: Sets up directories for user/session/cache data.
- `isAllowedExternalUrl(rawUrl)`: Validates external URLs for security.
- `createWindow()`: Creates the main application window, configures web preferences.
- IPC handlers: `window-controls`, `start-network-test`, `open-external`, `capture-screenshot`.

### network.ts
- `measureTcpPing(host, port, timeout)`: Measures TCP connection latency.
- `calculateJitter(pings)`: Calculates jitter from ping samples.
- `calculatePacketLoss(total, success)`: Computes packet loss percentage.
- `calculateP95(pings)`: Calculates 95th percentile latency.

## Workflow
1. Electron app starts, creates window.
2. User triggers network test via UI.
3. IPC sends test request to main process.
4. Main process runs test, returns results.
5. Results displayed in UI.

---

See source files for detailed code and comments.