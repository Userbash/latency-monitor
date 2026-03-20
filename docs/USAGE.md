# Usage Guide

## Runtime Modes

### 1. Electron Runtime
```bash
npm run dev:electron
```
Renderer communicates with Electron IPC for test execution and progress streaming.

### 2. Web + Rust API Runtime
```bash
npm run dev:web
npm run dev:backend
```

## Rust API Endpoints

### Health
```http
GET /api/status
```

### Start Test
```http
POST /api/start-test
Content-Type: application/json
```

Example payload:
```json
{
	"host": "8.8.8.8",
	"targets": ["api.steampowered.com", "1.1.1.1"],
	"samples": 12
}
```

The response includes aggregated metrics and verification pass details.
