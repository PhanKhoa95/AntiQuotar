# Plan - AntiQuotar Quota Mismatch and Account Sync Fixes

## Milestone 1: Decomposition and Planning [Done]
- Create `plan.md`, `context.md`, and initialize/update `progress.md` and `BRIEFING.md`.
- Ensure alignment with user requirements and acceptance criteria.

## Milestone 2: Codebase Exploration and Strategy
- Spawn Explorer agents to:
  - Locate fallback logic for 5-hour limit in `tools/local-bridge.cjs`.
  - Examine the local bridge CLI call (`quota --all --json --refresh`) execution and error handling.
  - Inspect `src/App.tsx` state updates for account syncing (Run Check).
  - Review existing Playwright tests.
  - Investigate if `antigravity agents quota --format json` is available on the system PATH.
- Produce a strategy to fix both issues without breaking existing functionality.

## Milestone 3: Core Fixes Implementation
- Spawn Worker to implement the planned changes:
  - Wrap fallback logic in `local-bridge.cjs` so it only executes when `!hasExactGroups`.
  - Update `local-bridge.cjs` CLI integration to handle individual account refresh failures gracefully without 500 errors.
  - Integrate `antigravity agents quota --format json` command if available on the system PATH to ensure accurate quota values.
  - Modify `src/App.tsx` React state handling to ensure all matched sessions update their quota details correctly on receipt of the accounts list.
- Run local lint, build, and tests to verify.

## Milestone 4: Verification and Integrity Audit
- Spawn Reviewers to inspect code correctness.
- Spawn Challenger to run verification:
  - Verify that the 5-hour limit shows correctly (100% when not exhausted).
  - Verify previously logged-in accounts sync and update last checked timestamp/quota values on Run Check.
  - Run smoke tests `npm run test:smoke` and Playwright tests `npx playwright test`.
- Spawn Forensic Auditor to run integrity checks.

## Milestone 5: Handoff and Completion
- Synthesize all findings into `synthesis.md` and `handoff.md`.
- Report completion to the parent agent.
