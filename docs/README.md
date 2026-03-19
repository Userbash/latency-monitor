# Esports Network Monitor

This project is a cross-platform application for monitoring network latency and quality, designed for esports and gaming environments. It includes an Electron-based desktop client, a Python Qt wrapper, and a FastAPI backend for advanced network diagnostics.

## Features
- Network latency testing (ping, jitter, packet loss, p95)
- Profiles for popular games and services
- Electron desktop UI with custom window controls
- Python Qt wrapper for native Linux integration
- FastAPI backend for RESTful network tests
- Multi-language support (EN, RU, ZH)

## Structure
- `electron/` — Electron main process, network logic, preload scripts
- `src/` — React frontend, UI components, hooks
- `python/` — Qt wrapper and FastAPI backend
- `docs/` — Project documentation (this directory)

## Quick Start
1. Install dependencies: `npm install` and `pip install -r requirements.txt`
2. Build Electron app: `npm run build`
3. Run Python backend: `python/python/main.py`

## Usage
- Launch the Electron app for desktop experience
- Use the Python Qt wrapper for native Linux integration
- Network tests can be triggered from the UI or via API

## License
MIT License

---

See subpages for detailed module and function documentation.