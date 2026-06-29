# Review & Challenge Report — Active Account Swapping System

This report presents both the Quality Review and Adversarial Review for the newly added interactive E2E browser test scenario (Test 51) in `tests/antiquotar.spec.ts` and the associated credentials sync and active switching logic in `tools/local-bridge.cjs` and `src/App.tsx`.

---

# PART 1: QUALITY REVIEW REPORT

## Review Summary

**Verdict**: REQUEST_CHANGES

The newly added E2E test (Test 51) is functionally complete and successfully verifies the intended filesystem sync, CLI config sync, and Windows Credential Manager mapping logic. The tests compile and pass without errors. However, a critical security vulnerability (Shell Command Injection) and a major state-synchronization design flaw have been identified in the associated `local-bridge.cjs` and `App.tsx` implementation code, which must be addressed before final approval.

---

## Findings

### [Critical] Finding 1: Shell Command Injection in `tools/local-bridge.cjs`
- **What**: The HTTP POST `/v1/accounts/active` handler does not sanitize the `email` field before interpolating it into a shell command.
- **Where**: `tools/local-bridge.cjs` (Lines 604–605)
- **Why**: The code constructs the command string as follows:
  ```javascript
  const cmd = `node "${cliPath}" accounts switch "${email}"`;
  exec(cmd, { env: { ...process.env, PATH: envPath } }, (cliErr) => { ... });
  ```
  If a client submits a malicious payload like `foo@bar.com" & calc.exe & "` as the email parameter, it will bypass the `@` presence check and run the command in a shell, allowing arbitrary command execution on the host machine.
- **Suggestion**: Use `spawn` or `execFile` instead of `exec` to pass arguments as a safe array, bypassing shell expansion entirely:
  ```javascript
  const { spawn } = require('child_process');
  const child = spawn('node', [cliPath, 'accounts', 'switch', email], {
    env: { ...process.env, PATH: envPath }
  });
  ```

### [Major] Finding 2: Silent Active State Desynchronization in `src/App.tsx`
- **What**: React state updates for the active session are optimistic and do not rollback or notify the user upon API switch failure.
- **Where**: `src/App.tsx` (Lines 348–383, 997–1008)
- **Why**: When a user clicks "Set active", `promoteSession` synchronously sets the local state `activeId` to the target session. The `useEffect` then fires `POST /v1/accounts/active`. If the bridge server returns an HTTP `400` or `500` error (e.g., if the profile file does not exist or the daemon failed to restart), the React state is left unchanged showing the target session as active, while the backend remains on the previous account.
- **Suggestion**: Implement error feedback (e.g., a visual toast notification) and rollback the React state to the previous active session ID if the POST switch request returns a non-OK status.

### [Minor] Finding 3: Potential Test Collisions in Playwright due to Static Directory Resolution
- **What**: Hardcoded `tests/simulated-creds` directory for filesystem simulation.
- **Where**: `tests/antiquotar.spec.ts` (Lines 1185–1189)
- **Why**: The test resolves a static directory `tests/simulated-creds` and performs mkdir/rm operations. Although current Playwright config runs sequentially with a single worker, if the configuration is ever modified to run parallel workers, this static folder will cause race conditions and test interference.
- **Suggestion**: Use Playwright's test-scoped unique directory or include the worker index/process ID in the temp directory name (e.g., `tests/simulated-creds-${process.pid}`).

---

## Verified Claims

- **Claim**: Test 51 uses proper path resolution and filesystem mocks → **Verified** via code review of `tests/antiquotar.spec.ts` and executing `npx playwright test` → **PASS** (Paths are confined to a dedicated subdirectory and cleaned up in a `finally` block).
- **Claim**: The fs command sequences correctly simulate the swapping side-effects of `local-bridge.cjs` → **Verified** via comparing `page.route` intercepts in Test 51 with `/v1/accounts/active` in `tools/local-bridge.cjs` → **PASS** (Simulated writes to `session.json`, CLI `config.json`, and the credential cache accurately reflect the backend side-effects).
- **Claim**: There are no race conditions or syntax errors in the new test code → **Verified** via Playwright execution and syntax audit → **PASS** (All 55 E2E tests run and pass without syntax or timeout issues).
- **Claim**: Mapped credential format matches Windows Credential Manager 2.0 specs → **Verified** via checking structure mapping in both `local-bridge.cjs` and Test 51 → **PASS** (The credential value wraps the JSON object with `token` object containing `access_token`, `token_type`, `refresh_token`, `expiry`, and `auth_method: "consumer"`).

---

## Coverage Gaps

- **Error-state verification in E2E tests** — risk level: Low — recommendation: Accept risk / add test coverage. Currently, the E2E tests only verify the happy path of a successful switch. Adding a scenario where `/v1/accounts/active` returns a `500` error to ensure the UI behaves predictably would improve coverage.

---

## Unverified Items

- **Actual cmdkey execution on non-Windows environments** — reason: Muted via `process.platform !== 'win32'` checks in `local-bridge.cjs`. This is correct and accepted behavior since the OS credential manager is Windows-specific.

---
---

# PART 2: ADVERSARIAL REVIEW REPORT

## Challenge Summary

**Overall risk assessment**: CRITICAL

The credentials synchronization mechanism successfully integrates active session switching across the CMS, CLI config, and Windows Credential Manager. However, because the system interacts with the host OS filesystem, CLI command execution, and daemon lifecycle, it is exposed to command execution risks and data corruption if inputs are not validated.

---

## Challenges

### [Critical] Challenge 1: Shell Command Injection in switch handler
- **Assumption challenged**: Assumes that `email` parameter only contains a valid email address and is safe to run in `exec`.
- **Attack scenario**: A malicious script or local attacker sends a POST request with `{ "email": "alice@google.com\" & rm -rf / & \"" }` to the local-bridge.
- **Blast radius**: Arbitrary code execution with the permissions of the running local-bridge process.
- **Mitigation**: Switch to `spawn` with an array of arguments, preventing command shell parsing.

### [High] Challenge 2: Local Network Expose
- **Assumption challenged**: Assumes that the local-bridge is only accessible by the local browser.
- **Attack scenario**: The bridge binds to all local network interfaces (`0.0.0.0`) by default when calling `server.listen(PORT)`. An attacker on the same local Wi-Fi can send requests to `/v1/accounts/active` to run CLI commands or hijack the user's active session.
- **Blast radius**: Unauthorized active session promotion and exposure to the command injection vector from other devices.
- **Mitigation**: Force the server to listen only on localhost: `server.listen(PORT, '127.0.0.1', ...)`.

### [Medium] Challenge 3: Unhandled JSON Date Conversion Exception
- **Assumption challenged**: Assumes `expiresAt` or `expires_at` is always a valid number or convertible date representation.
- **Attack scenario**: If the input token profile contains an invalid string or negative/overflow bounds for expiration, calling `new Date(expiresAt).toISOString()` inside `updateCredentialManager` will throw a `RangeError: Invalid time value`.
- **Blast radius**: The exception is caught by the general catch-block, but the Credential Manager update will be silently aborted and fail, resulting in mismatching tokens.
- **Mitigation**: Add a validation helper to verify date validity before converting to ISO string.

---

## Stress Test Results

- **Invalid token profile payload** → Check exception safety → Server logs warning and calls callback gracefully → **PASS**
- **Non-email session identifiers (e.g. watch status identifiers)** → Check if bridge skips them → Skipped via `!email.includes('@')` guard → **PASS**

---

## Unchallenged Areas

- **SQLite Database state sync in VSCode extension** — reason: The VSCode extension's internal token sync queries the SQLite database directly, which is out of scope for the current local-bridge/CMS review.
