# Scope: Playwright E2E Testing for AntiQuotar

## Architecture
- **Target Application**: AntiQuotar Control frontend running at `http://127.0.0.1:5173/`.
- **E2E Testing Environment**: Playwright test runner executing tests in headless/headed browsers against the frontend.
- **LS Gateway Mocking**: Playwright API routing (`page.route()`) to mock gateway endpoints at `http://127.0.0.1:5188/v1/provision/status` or custom endpoints.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup & Configure | Create `playwright.config.ts` and set up package dependencies. | None | PLANNED |
| 2 | Write Test Cases | Implement 49+ E2E test cases covering Tiers 1-4. | M1 | PLANNED |
| 3 | Verification | Run tests, verify results, and generate coverage logs. | M2 | PLANNED |
| 4 | Publish Artifacts | Create `TEST_INFRA.md` and `TEST_READY.md`. | M3 | PLANNED |

## Interface Contracts
- Tests interact purely via UI DOM selectors as analyzed in `explorer_e2e_1/handoff.md`.
- External HTTP requests to `**/v1/provision/status` are intercepted and mocked.
