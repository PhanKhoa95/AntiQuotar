# Original User Request

## 2026-06-28T06:27:40Z

A verification suite to test Google Account authentication storage in the AntiQuotar CMS and verify automatic rotation of Antigravity accounts based on quota thresholds.

Working directory: E:\AntiQuotar
Integrity mode: development

## Requirements

### R1. Google Account Authentication
Verify that clicking the "Add Antigravity" button initiates the login flow, and clicking the "Done" button fetches authenticated account details from the local gateway at `/v1/accounts`.

### R2. Session Auto-Import
Verify that new accounts returned by the gateway `/v1/accounts` API that are not present in the CMS session list are automatically imported and saved to the local storage.

### R3. Automatic Account Rotation
Verify that if the active session's quota usage exceeds the rotation threshold (e.g. 80%), the CMS immediately rotates to the newly imported healthy account (lowest quota usage percentage).

## Acceptance Criteria

### E2E Test Verification
- [ ] Implement an automated Playwright test case named `20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high` inside `tests/antiquotar.spec.ts`.
- [ ] The test must mock `/v1/accounts` to return an updated active session S1 (used: 85) and a new session S2 (used: 10).
- [ ] The test must verify S2 is imported, S1 goes to cooldown, and S2 becomes the active session.
- [ ] Running the Playwright test suite for this case must pass successfully.

## Follow-up — 2026-06-28T16:39:10+07:00

Develop synchronization mechanism and verification tests to ensure that the model-specific quotas (Gemini, Claude, GPT) on the AntiQuotar frontend match the backend API `/v1/accounts` and active session state.

Working directory: E:\AntiQuotar
Integrity mode: development

## Requirements

### R1. Quota Details Model Synchronization
The frontend details panel must display model-specific quota percentages and reset descriptions (Gemini Models, Claude and GPT models) accurately mapped from the `/v1/accounts` gateway API response. If a model is marked as exhausted (`isExhausted` is true), its remaining percentage should display as 0% used.

### R2. Active Account CLI Synchronization
CMS active session transitions (manual rotation, auto-rotation, or row activation) must send a POST request to `/v1/accounts/active` (or `/accounts/active`) with the active session email to synchronize the CLI active account state.

### R3. Default Interval & Migration
The default sync interval must be set to 1 minute to support real-time updates. Existing configurations using the old default of 300 minutes must be automatically migrated to 1 minute.

### R4. Automated Testing
Create an E2E Playwright test case named `20d. Quota model-specific groups sync with local gateway and active account switch is POSTed` in `tests/antiquotar.spec.ts` that mocks `/v1/accounts` and verifies:
1. Detailed quota percentages (Gemini & Claude/GPT groups) are parsed and rendered correctly.
2. Changing active session POSTs to `/v1/accounts/active` with the correct email.

## Acceptance Criteria

### E2E Test Verification
- [ ] Implement the test case `20d. Quota model-specific groups sync with local gateway and active account switch is POSTed` in `tests/antiquotar.spec.ts`.
- [ ] The test must verify that model groups are rendered with the correct parsed values.
- [ ] The test must intercept and verify the POST request sent to `/v1/accounts/active` upon active session changes.
- [ ] All 53 tests in the Playwright suite must pass successfully.
