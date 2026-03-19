# Changelog

## v1.1.0 (Localization, Validation, and QA Hardening)

### Added
- OS-level locale detection for desktop runtime via Electron IPC:
	- Added `get-system-locale` handler in `electron/main.ts`.
	- Exposed `getSystemLocale()` in `electron/preload.cts` and renderer typings.
- Externalized frontend localization resources into dedicated files:
	- `src/locales/en.json`
	- `src/locales/ru.json`
	- `src/locales/zh.json`
	- `src/locales/cz.json`
- Introduced robust testing infrastructure and new test suites:
	- `vitest.config.ts` with `jsdom` and coverage settings.
	- `src/test/setup.ts` and `src/test/vitest.d.ts` for browser-like test runtime.
	- Unit and integration tests for metrics and app interactions:
		- `src/__tests__/network.test.ts`
		- `src/__tests__/runNetworkTest.test.ts`
		- `src/__tests__/WindowControls.test.tsx`
		- `src/__tests__/App.interactions.test.tsx`
	- Playwright smoke E2E coverage:
		- `playwright.config.ts`
		- `e2e/app.smoke.spec.ts`
- Added `@testing-library/jest-dom` for richer DOM-focused assertions.

### Changed
- Refactored `src/App.tsx` to consume external locale JSON files instead of inline translation objects.
- Expanded language support from `en|ru|zh` to `en|ru|zh|cz` with safe fallback behavior.
- Updated localization strategy to prioritize OS locale from Electron in packaged desktop builds (including AppImage), with `navigator.language` fallback.
- Removed in-app manual language switch controls from the top bar for a system-locale-driven experience.
- Added artifact/cache ignore rules in `.gitignore` to keep publication diffs clean:
	- `dist-electron/`, `reports/`, `coverage/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`.

### Fixed
- Hardened metric calculations and input validation in `electron/network.ts`:
	- Sanitized invalid numeric samples (`NaN`, negative values).
	- Clamped packet-loss inputs to valid ranges.
	- Protected percentile and spike-rate calculations from bad input data.
	- Normalized host lists by removing empty/duplicate entries.
	- Bounded sample count with minimum/maximum constraints.
- Added explicit validation warnings (`[network-validation]`) to improve runtime observability during debugging.
- Replaced flaky network-dependent unit assertions with deterministic test scenarios and mocks.

### Verification
- `npm run lint` passes.
- `npm run test:unit` passes.
- `npm run test:coverage` passes.
- `npm run test:e2e` passes (after browser installation via `npx playwright install chromium`).
- Linux AppImage build was generated successfully and artifact integrity hash was recorded.

## v1.0.0 (Initial Release)

### Added
- Full CI/CD pipeline with GitHub Actions (build, test, release, coverage, lint, debug automation)
- AppImage packaging for Linux, EXE packaging for Windows
- Jest and Pytest integration for frontend/backend testing
- Coverage and error/warning reports
- Automated artifact upload and changelog generation
- Modular documentation ([docs/])
- Portfolio-ready project structure

### Changed
- Refactored build scripts for reproducibility
- Improved error/warning search and debug automation
- Enhanced test coverage and reporting

### Fixed
- Minor bugs in network test logic
- Documentation typos and structure

---

See [RELEASE.md](RELEASE.md) for release details and [INSTALL.md](INSTALL.md) for setup instructions.