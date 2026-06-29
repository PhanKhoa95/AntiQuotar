# Project: AntiQuotar Quota Mismatch and Account Sync Fixes

## Architecture
- **Control CMS**: React/Vite-based frontend interface running locally. It tracks session configurations, rotation queue, logs, and syncs status. Uses browser `localStorage` for data persistence.
- **Local Bridge CLI / API**: CLI tool running commands (`quota --all --json --refresh`) and acting as a bridge to fetch and synchronize live session and quota information from Google API / local connections.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Decomposition & Planning | Create planning, progress, context files. | None | DONE |
| 2 | Codebase Exploration | Explore local-bridge.cjs fallback, CLI error handling, and React state update logic. | M1 | IN_PROGRESS |
| 3 | Core Fixes | Wrap fallback, handle CLI account failure, and fix React session matching logic. | M2 | PLANNED |
| 4 | Verification & Audit | Verify 5-hour limit, run smoke and Playwright tests, run Forensic Audit. | M3 | PLANNED |
| 5 | Handoff & Completion | Synthesis and reporting. | M4 | PLANNED |

## Interface Contracts
### React CMS ↔ Local Bridge CLI / API
- **Endpoint**: Local bridge runs CLI `quota --all --json --refresh` or handles API requests.
- **Error Behavior**: Individual account errors must not cause a 500 error for the entire request; instead they should be handled gracefully and return details of other accounts.

## Code Layout
- `tools/local-bridge.cjs`: Local bridge handler for API/CLI interactions.
- `src/App.tsx`: React frontend containing state and sync logic.
- `tests/antiquotar.spec.ts`: Automated test suite.
