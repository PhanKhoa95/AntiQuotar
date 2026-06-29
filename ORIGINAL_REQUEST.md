# Original User Request

## Initial Request — 2026-06-29T09:35:46+07:00

Fix the quota detail value mismatch in the CMS frontend (where 5-hour limit incorrectly displays weekly limit values) and fix the issue where previously logged-in accounts do not update their quota details correctly.

Working directory: Y:\AntiQuotar
Integrity mode: development

## Requirements

### R1. Fix Quota Limit Mismatch
- Locate the fallback logic in [local-bridge.cjs](file:///y:/AntiQuotar/tools/local-bridge.cjs) that automatically sets 5-hour limit percentages to weekly limit percentages.
- Wrap this fallback logic so that it only executes when exact quota groups are not present (`!hasExactGroups`).
- This ensures that if the Google API or the active connection returns exact quota groups, the 100% value of the 5-hour limit is preserved instead of being overwritten by the weekly limit percentage.

### R2. Ensure Stable Account Updates
- Investigate and resolve issues preventing previously logged-in accounts from updating their quota details in the Control CMS.
- Ensure that the local bridge CLI call (`quota --all --json --refresh`) handles individual account update failures gracefully without causing a 500 error for the entire request.
- Verify that the CMS React state updates all matched sessions correctly when receiving the list of accounts.

### R3. API Enhancements
- You are allowed to extend or add new API endpoints in [local-bridge.cjs](file:///y:/AntiQuotar/tools/local-bridge.cjs) if necessary to ensure clean and correct state synchronization between the Control CMS and the local connection.

## Acceptance Criteria

### Verification & Correctness
- [ ] The 5-hour limit displays correctly (e.g. 100%) in the Model Quota Details panel when it is not exhausted.
- [ ] Previously logged-in accounts successfully sync and update their last checked timestamp and quota values upon clicking "Run Check".
- [ ] Running the smoke tests `npm run test:smoke` succeeds.
- [ ] Running the Playwright test suite `npx playwright test` succeeds with all 54 tests passing.

## Follow-up — 2026-06-29T02:38:23Z

User has suggested using the following CLI command to fetch raw JSON quota data:
`antigravity agents quota --format json`

Please investigate if this command is available on the system PATH and consider incorporating it into the quota sync mechanism (e.g. in the CLI or local-bridge) to ensure accurate quota values.

