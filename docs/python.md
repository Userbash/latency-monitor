# Python Module

## Purpose
The Python module provides a Qt-based wrapper for native Linux integration and a FastAPI backend for network diagnostics.

### Main Files
- `main.py`: Qt application, window creation, environment setup.
- `server.py`: FastAPI backend, network test logic, REST API.

## Key Functions
### main.py
- `configure_qt_for_linux()`: Sets environment variables for Wayland/xcb compatibility.
- `MainWindow`: Qt main window class, embeds web view.

### server.py
- `resolve_dist_path()`: Determines path to static files.
- `NetworkProfile`: Pydantic model for test profiles.
- FastAPI endpoints: Network test, DNS resolution, etc.

## Workflow
1. Python app starts, configures environment.
2. Qt window loads web view.
3. FastAPI backend serves network test API.
4. Electron/React frontend communicates with backend.

---

See source files for detailed code and comments.