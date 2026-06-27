# Project: AntiQuotar Core & Playwright Testing

## Architecture
- **Control CMS**: React/Vite-based frontend interface running locally at `http://127.0.0.1:5173/` or a custom port. It tracks session configurations, rotation queue, logs, and syncs status. Uses browser `localStorage` for data persistence.
- **LS Gateway**: Local daemon running at `http://127.0.0.1:5188/`. The endpoint `/v1/provision/status` is queried to fetch and synchronize live session and quota information.
- **Auto-Rotation Engine**: The frontend periodically or reactively checks active session's quota usage percentage against `rotateThreshold`. If it exceeds, it auto-rotates to a healthy/watch session with the lowest quota.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Core Features | Refine auto-rotation, local LS sync, and cooldown management in `src/App.tsx`. | None | PLANNED |
| 2 | Playwright Tests | Set up Playwright and write E2E test scenarios in `tests/`. | M1 | PLANNED |
| 3 | Verification & Build | Verify build and run E2E test suite. | M2 | PLANNED |

## Interface Contracts
### React CMS ↔ LS Gateway
- **Endpoint**: `GET http://127.0.0.1:5188/v1/provision/status`
- **Synchronized Data**: Quota usage, limits, and status values if present in the response, otherwise logs appropriate connection status.

## Code Layout
- `src/App.tsx`: Main React component containing UI, storage persistence, and rotation logic.
- `src/main.tsx`: App entry point.
- `playwright.config.ts`: Config for E2E tests.
- `tests/`: Automated E2E test scripts.
