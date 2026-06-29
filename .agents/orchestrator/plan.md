# Plan - AntiQuotar Google Account Auth & Rotation Verification

This plan details the verification and implementation of the Playwright E2E test suite for Google Account auto-import and rotation on quota threshold.

## Milestone 1: Assess and Verify Test '20c'
1. **Analyze existing tests**: Check `tests/antiquotar.spec.ts` for the test `20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high`.
2. **Identify issues**: Check if the test is robust (e.g. if `/v1/auth/login` needs to be mocked to prevent real network requests, or if any selectors need adjusting).
3. **Decompose implementation**: If modifications are required, specify what changes need to be made to the test or the App frontend.

## Milestone 2: Dispatch implementation and verification
1. **Spawn Worker**: Dispatch a Worker subagent to refine `tests/antiquotar.spec.ts` or make sure the test case matches the specifications, then run the tests to verify.
2. **Verify build and test results**: Ensure the worker compiles the project (`npm run build`) and runs Playwright tests (`npx playwright test`) successfully.

## Milestone 3: Integrity Audit & Review
1. **Spawn Forensic Auditor**: Dispatch the Auditor subagent to perform code integrity and anti-cheating checks.
2. **Synthesize results**: Review the outputs of Worker, Reviewer, and Auditor. If clean, proceed to completion.
