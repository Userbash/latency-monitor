# Release and Distribution Guide

## Building Artifacts

### Electron App
- Build production artifacts:
  ```bash
  npm run dist
  ```
- Artifacts are generated for Windows (EXE), Linux (AppImage), and optionally macOS (DMG).
- See `electron-builder.yml` for configuration.

### Python Backend
- Package backend with Docker:
  ```bash
  docker build -t esports-network-monitor .
  ```
- Release scripts:
  - Linux: `scripts/release-appimage.sh`
  - Windows: `scripts/release-windows.sh`, `scripts/release-windows.ps1`

## Distribution
- Upload artifacts to GitHub Releases or other distribution platforms
- Provide installation instructions in [INSTALL.md](INSTALL.md)

## Versioning
- Follow semantic versioning (see `package.json`)
- Tag releases and update changelog

## Portfolio and Academic Use
- This project is suitable for portfolio demonstration and academic submission
- Documentation and code quality meet production standards

---

For build details and troubleshooting, see [INSTALL.md](INSTALL.md) and [USAGE.md](USAGE.md).