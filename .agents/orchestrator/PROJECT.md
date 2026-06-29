# Project: AntiQuotar Active Account Switch & Synchronization

## Architecture
- **Control CMS**: React/Vite-based frontend interface running locally. It tracks session configurations, rotation queue, logs, and syncs status. Uses browser `localStorage` for data persistence.
- **Local Bridge CLI / API**: Node.js HTTP bridge server (`tools/local-bridge.cjs`) handling credential sync, Windows Credential Manager updates, active account switching (`/v1/accounts/active`), and daemon restarts.
- **Credential Storage**: Real-time updates to `~/.antigravity/credentials/session.json`, 1.x CLI configuration, and Windows Credential Manager `gemini:antigravity`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Previous Quota Fixes | Completed previous quota mismatch & sync fixes. | None | DONE |
| 2 | Swapping Exploration | Explore current active account switch logic, cmdkey implementation, CLI/credential layouts. | None | PLANNED |
| 3 | Swapping Core Fixes | Implement swap to session.json, 1.x CLI config, cmdkey `gemini:antigravity` immediately. | M2 | PLANNED |
| 4 | Interactive E2E Test | Add and implement interactive E2E browser test scenario in antiquotar.spec.ts. | M3 | PLANNED |
| 5 | Verification & Audit | Run Playwright test suite (all tests passing), smoke tests, run Forensic Audit. | M4 | PLANNED |

## Interface Contracts
### Active Account Switch API
- **Endpoint**: POST `/v1/accounts/active` or `/accounts/active`
- **Payload**: `{ "email": "..." }` or `{ "id": "..." }`
- **Action**:
  1. Writes token profile to `~/.antigravity/credentials/session.json`.
  2. Updates 1.x CLI active account configuration.
  3. Updates Windows Credential Manager target `gemini:antigravity`.
  4. Touches `session.json` mtime.
  5. Restarts `ag-daemon`.

## Code Layout
- `tools/local-bridge.cjs`: Local bridge server containing swap/credential logic.
- `src/App.tsx`: Frontend dashboard for promoting session and POSTing active status.
- `tests/antiquotar.spec.ts`: Playwright test suite.

