# Frontend (React)

## Purpose
The frontend provides a user interface for network testing, profile selection, and result visualization. Built with React and TypeScript.

### Main Files
- `App.tsx`: Main app component, manages profiles, state, UI.
- `components/WindowControls.tsx`: Custom window controls for Electron.
- `hooks/`: Custom React hooks for IPC and state management.

## Key Functions
### App.tsx
- Profile management: List of game/service profiles, multi-language labels.
- State: Network test progress, results, UI mode.
- UI: Displays test results, recommendations, controls.

## Workflow
1. User selects profile or server.
2. Starts network test from UI.
3. Receives progress and results via IPC.
4. Results shown with recommendations.

---

See source files for detailed code and comments.