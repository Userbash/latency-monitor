# Installation and Setup Guide

## Supported Platforms
- Windows 10/11 (x64)
- Linux (Ubuntu 22.04+, Fedora, Arch, Alpine)
- macOS (experimental, Electron only)

## Prerequisites
- Node.js (v20+ recommended)
- Python (3.12+ recommended)
- Docker (optional, for containerized builds)

## Dependencies
### JavaScript/TypeScript
- Install with `npm install` (uses package.json)
- Key libraries: Electron, React, Vite, TypeScript, TailwindCSS, concurrently, wait-on

### Python
- Install with `pip install -r requirements.txt`
- Key libraries: fastapi, uvicorn, pydantic, icmplib, dnspython, qasync

## Build Instructions
### Electron + React Frontend
1. Install Node dependencies:
   ```bash
   npm install
   ```
2. Build frontend:
   ```bash
   npm run build:web
   ```
3. Build Electron app:
   ```bash
   npm run build
   ```
4. Package for distribution:
   ```bash
   npm run dist
   ```

### Python Backend (FastAPI + Qt)
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run backend server:
   ```bash
   python python/server.py
   ```
3. (Optional) Run Qt wrapper:
   ```bash
   python python/main.py
   ```

### Docker Build
1. Build and run with Docker:
   ```bash
   docker build -t esports-network-monitor .
   docker run -p 8000:8000 esports-network-monitor
   ```

## Usage
- Launch Electron app for desktop experience
- Use Python Qt wrapper for native Linux integration
- Access FastAPI backend at `http://localhost:8000`

## Troubleshooting
- Ensure Node.js and Python versions match requirements
- For Linux Qt, verify Wayland/xcb support and install required system packages
- For Docker, use compatible base images and expose port 8000

---

For advanced configuration, see [electron.md](electron.md), [python.md](python.md), and [frontend.md](frontend.md).