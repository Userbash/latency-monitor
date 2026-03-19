# Function Reference

## Electron
### main.ts
- `configureStoragePaths()`: Sets up storage directories for app data.
- `isAllowedExternalUrl(rawUrl)`: Checks if a URL is safe for external opening.
- `createWindow()`: Initializes main window, sets web preferences.
- IPC handlers:
  - `window-controls`: Minimize, maximize, close window.
  - `start-network-test`: Runs network test, sends progress/results.
  - `open-external`: Opens external URLs securely.
  - `capture-screenshot`: Captures window screenshot.

### network.ts
- `measureTcpPing(host, port, timeout)`: TCP ping measurement.
- `calculateJitter(pings)`: Jitter calculation.
- `calculatePacketLoss(total, success)`: Packet loss calculation.
- `calculateP95(pings)`: 95th percentile latency.

## Python
### main.py
- `configure_qt_for_linux()`: Linux Qt environment setup.
- `MainWindow`: Qt main window class.

### server.py
- `resolve_dist_path()`: Static files path resolution.
- `NetworkProfile`: Pydantic model for test profiles.
- FastAPI endpoints: Network test, DNS resolution.

## Frontend
### App.tsx
- Profile management, state, UI rendering.
- Receives test progress/results via IPC.

---

See module docs for workflow and integration details.