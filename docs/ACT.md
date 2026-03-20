# Local GitHub Actions with act

This document is the implementation plan for local GitHub Actions execution with `act` and the exact project changes made for it.

## Goal
- Run the same CI jobs locally before pushing.
- Shorten feedback loops for lint, unit tests, backend tests, and selected release checks.
- Keep local checks aligned with `.github/workflows/ci-cd.yml`.

## Step-by-step implementation plan

### Step 1. Define local workflow execution model
What was done:
- Reused existing workflow `.github/workflows/ci-cd.yml` instead of creating duplicate local workflows.
- Selected Linux-compatible jobs for local execution:
  - `quality`
  - `rust-backend-tests`
  - `release-builds` with matrix filter `target:appimage`

Why:
- Single source of truth for CI logic.
- No drift between local and GitHub-hosted pipeline behavior.

### Step 2. Add act runtime configuration to the repository
What was done:
- Added `.actrc` with:
  - default workflow path
  - runner mapping `ubuntu-latest -> ghcr.io/catthehacker/ubuntu:act-latest`

Why:
- Removes repeated CLI flags.
- Makes local execution deterministic across contributors.

### Step 3. Add npm entry points for standard local CI scenarios
What was done:
- Added scripts in `package.json`:
  - `act:list`
  - `act:quality`
  - `act:backend`
  - `act:release:appimage`
  - `act:ci:local`

Why:
- Lowers onboarding friction.
- Gives predictable team-level commands for pre-push validation.

### Step 4. Document operational workflow for developers
What was done:
- Added this document with exact command set and scope.
- Linked this document from docs index and installation guide.

Why:
- Keeps setup discoverable and repeatable.

### Step 5. Validate and define rollout behavior
What was done:
- Kept Windows release job execution in GitHub-hosted runners.
- Scoped local release checks to AppImage matrix case.

Why:
- `act` local environment is Linux-based in this repository context.
- Preserves realistic, fast local validation while avoiding unsupported Windows emulation.

## Usage

Install `act` (once):
```bash
act --version
```

If command is missing, install from https://github.com/nektos/act according to your OS.

List available jobs:
```bash
npm run act:list
```

Run local CI subset (quality + Rust backend):
```bash
npm run act:ci:local
```

Run AppImage release build job locally:
```bash
npm run act:release:appimage
```

## Scope and limitations
- Local `act` runs focus on Linux jobs.
- Windows release artifacts remain validated in GitHub Actions hosted CI.
- Artifact upload steps may behave differently locally; functional job logic is the main local validation target.
