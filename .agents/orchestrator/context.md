# Context - Quota Mismatch and Account Sync Fixes

## Overview
This task addresses two issues in the AntiQuotar application:
1. **Quota Limit Mismatch**: The 5-hour limit incorrectly displays weekly limit values in the Control CMS frontend due to a fallback logic mismatch in `tools/local-bridge.cjs`.
2. **Stable Account Updates**: Previously logged-in accounts fail to update their quota details. The local bridge CLI (`quota --all --json --refresh`) must handle individual account failures gracefully instead of throwing a 500 error, and the React frontend state must update all matched sessions correctly when receiving the list of accounts.

## Codebase Status & Entry Points
- Local Bridge backend: `tools/local-bridge.cjs`
- Control CMS Frontend: `src/App.tsx`
- Playwright Tests: `tests/antiquotar.spec.ts`

## Key Targets
- Fallback logic in `tools/local-bridge.cjs`.
- Account checking / refresh logic in the `quota` CLI command execution in the local bridge.
- State handling in `src/App.tsx` when receiving account updates from `Run Check`.
