# Code Readability Guide

This guide explains how to keep the codebase easy to read, review, and maintain.

## Primary Rules
- Prefer explicit names over short names (`sampleCount` over `n`).
- Keep one responsibility per function.
- Validate external input close to the entry point.
- Keep comments short and technical.
- Explain *why* something exists when intent is not obvious from code.

## Comment Conventions
Use comments only where they add real context.

Good examples:
- Describe trust boundaries (IPC/API input sanitization).
- Explain non-trivial algorithms (multi-pass host verification).
- Document intentional trade-offs (performance vs. precision).

Avoid comments that only repeat the code:
- Bad: "Set x to 5"
- Good: "Clamp to 5 to prevent runaway retries in unstable networks"

## Module Reading Map
- `rust-backend/src/main.rs`: request validation, candidate selection, probing, and scoring.
- `electron/main.ts`: Electron lifecycle, IPC handlers, and security guards.
- `electron/network.ts`: local TCP measurement flow and metrics calculations.
- `src/App.tsx`: frontend orchestration for progress, results, and runtime mode switching.

## Practical Checklist for PRs
- Is each public function understandable without jumping across many files?
- Are external inputs sanitized and bounded?
- Are status/error messages actionable for users and operators?
- Are comments concise and focused on intent or constraints?
- Are tests covering the happy path and obvious invalid inputs?

## Recommended Review Flow
1. Read `docs/workflow.md` for system-level flow.
2. Read `docs/functions.md` for module responsibilities.
3. Review changed files with this guide as a readability checklist.
