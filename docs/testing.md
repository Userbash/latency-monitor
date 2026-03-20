# Testing and Diagnostics Guide

## Testing Libraries
- `vitest`: unit and integration tests for frontend and shared logic.
- `@testing-library/react`: component behavior testing.
- `@playwright/test`: end-to-end browser automation.
- `execa`: robust command execution for report pipelines.
- `yaml`: workflow YAML validation for CI safety checks.

## Quality Gates
Run before build:
```bash
npm run test:prebuild
```

Run after build:
```bash
npm run test:postbuild
```

Run full QA pipeline:
```bash
npm run qa:pipeline
```

## E2E
Install browser:
```bash
npm run test:e2e:install
```

Run local E2E:
```bash
npm run test:e2e
```

Run CI E2E with machine-readable output:
```bash
npm run test:e2e:ci
```

## Report Artifacts
- Build reports: `reports/build/<timestamp>/summary.{json,md}`
- Debug reports: `reports/debug/<timestamp>/summary.{json,md}`
- Postbuild reports: `reports/postbuild/<timestamp>/summary.{json,md}`
- Playwright reports: `reports/playwright-html/`, `reports/playwright-results.json`

## CI/Workflow Safety
Validate GitHub Actions files:
```bash
npm run workflow:check
```

The CI pipeline uploads debug and postbuild reports as artifacts to simplify root-cause analysis.
