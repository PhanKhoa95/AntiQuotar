# Release Checklist

Project: AntiQuotar
Release type: local tool handoff

## Required Gates

| Gate | Command or Check | Status |
| --- | --- | --- |
| Project structure | MATRIX `validate-project` | done |
| Quality gate | MATRIX `quality-gate` | done |
| Dependency check | `AntiQuotar.bat check` | done |
| Frontend build | `npm run build` | done |
| Smoke tests | local test command | not run by request |
| Docs | README, handoff, architecture, module map, roadmap | done |
| Git hygiene | `git status --short` only shows intended files | pending |
| Secrets | no tokens, API keys, OAuth data, or account files | pending |

## Release Rules

- Do not commit `tools/`, `reports/`, or `.matrix/reference-code/repos/`.
- Do not call the project production-ready; it is a local tool until a future ADR expands scope.
- Do not tag, publish, or package without user confirmation.
- Record any failed or skipped validation in `MATRIX_HANDOFF.md`.

## Next Release Work

- Add smoke tests.
- Add a single validation command once tests exist.
- Re-run this checklist before any commit or package handoff.
