# Usage Guide

## Launching the Application

### Electron Desktop App
- Run the Electron app for a native desktop experience:
  ```bash
  npm run dev:electron
  ```
- For production build:
  ```bash
  npm run dist
  ```
- The app provides a custom window, profile selection, and real-time network diagnostics.

### Python Qt Wrapper
- For native Linux integration, run:
  ```bash
  python python/main.py
  ```
- The Qt wrapper embeds the web dashboard and connects to the FastAPI backend.

### FastAPI Backend
- Start the backend server:
  ```bash
  python python/server.py
  ```
- API available at `http://localhost:8000`

## Network Testing
- Select a game or service profile in the UI
- Start a network test; progress and results are shown in real time
- Metrics include ping, jitter, packet loss, p95, and recommendations

## Advanced Features
- Multi-language support (EN, RU, ZH)
- Custom server selection
- Screenshot capture
- External link opening (secure)

## API Usage
- The FastAPI backend exposes endpoints for network diagnostics
- See [python.md](python.md) for endpoint details

---

For troubleshooting and advanced configuration, see [INSTALL.md](INSTALL.md) and module docs.