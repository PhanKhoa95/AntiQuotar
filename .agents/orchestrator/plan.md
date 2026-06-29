# Plan - AntiQuotar Active Account Switch & Synchronization

## Milestone 1: Previous Quota Fixes [Done]
- Completed and verified the quota limit mismatch and stable account update fixes.

## Milestone 2: Swapping Exploration
- Spawn Explorer agent to:
  - Locate where active session promote and switch actions are triggered in the React frontend (`src/App.tsx`).
  - Examine the POST `/v1/accounts/active` API handler in the local bridge server (`tools/local-bridge.cjs`).
  - Identify how the profile token is written to `~/.antigravity/credentials/session.json`.
  - Check how CLI 1.x configuration is updated and verify that Windows Credential Manager target `gemini:antigravity` is updated immediately with mapped JSON.
  - Review desktop app sync verification (VSCode extension, Antigravity.exe) mechanism.
- Refine implementation strategy.

## Milestone 3: Swapping Core Fixes
- Spawn Worker agent to:
  - Modify active account switch handler in `local-bridge.cjs` to write the JSON credentials to `session.json`, update CLI 1.x config, and update Windows Credential Manager `gemini:antigravity`.
  - Verify that file watchers detect modification times (`mtime`) and trigger daemon restart correctly.
  - Ensure the JSON format matches what is expected (checking the mapped format in `updateCredentialManager`).

## Milestone 4: Interactive E2E Test
- Spawn Worker agent to:
  - Add a new interactive E2E browser test scenario in `tests/antiquotar.spec.ts` that walks through promoting an account, modifying it, verifying sync on the simulated filesystem and credential cache, and checking that no login prompts are displayed.
  - Mock API endpoints appropriately for the test scenario.

## Milestone 5: Verification & Audit
- Spawn Reviewer agents to review all code changes.
- Spawn Challenger agent to run the smoke tests (`npm run test:smoke`), Playwright suite (`npx playwright test`), and verify that all 54 pre-existing + 1 new interactive E2E browser tests pass.
- Spawn Forensic Auditor agent to verify integrity of code changes (ensure no cheating or hardcoded bypasses).
- Present final handoff report and notify the sentinel.

