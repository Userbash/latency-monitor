# Function Reference

## Electron
### `electron/main.ts`
- window creation and lifecycle
- IPC handlers for test start/progress/results
- secure external URL opening
- payload sanitization for hosts/samples

### `electron/network.ts`
- TCP ping sampling
- jitter / packet-loss / p95 / spike-rate calculations
- aggregated network quality result builder
- defensive input normalization and bounded scoring

## Rust backend
### `rust-backend/src/main.rs`
- `GET /api/status`
- `POST /api/start-test`
- strict request shape validation (`serde`)
- host/target normalization and sample clamping
- candidate pool construction and DNS/IP filtering
- three-pass host verification and metric aggregation
- score classification and recommendation generation

## Frontend
### `src/App.tsx`
- profile/server selection
- API/IPC test start flow
- progress rendering and metrics display
- runtime payload guards for progress/API responses
