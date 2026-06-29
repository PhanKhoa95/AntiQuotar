# Handoff Report — reviewer_swapping_1

## 1. Observation

- **Test 51 Implementation**: Located in `y:\AntiQuotar\tests\antiquotar.spec.ts` (lines 1184–1326). It simulates the active account swapping flow using a dedicated folder resolved via:
  ```typescript
  const simulatedCredsDir = path.resolve(__dirname, 'simulated-creds');
  ```
  It intercept API calls to `**/v1/accounts` and `**/v1/accounts/active` using Playwright's `page.route` mocks.
- **Test Execution**: The command `npx playwright test` completed successfully with the output:
  ```text
  55 passed (43.9s)
  ```
- **Shell Command Interpolation**: In `y:\AntiQuotar\tools\local-bridge.cjs` (lines 604–605):
  ```javascript
  const cmd = `node "${cliPath}" accounts switch "${email}"`;
  exec(cmd, { env: { ...process.env, PATH: envPath } }, (cliErr) => {
  ```
- **Active Swapping State Logic**: In `y:\AntiQuotar\src\App.tsx` (lines 348–383), `useEffect` invokes the active synchronization call:
  ```typescript
  fetch(switchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: activeId })
  })
  ```
  and handles non-ok status or network failure by logging to console:
  ```typescript
  if (!res.ok) {
    console.error("LS Gateway switch returned error status:", res.status);
    isSwitchingActiveRef.current = false;
  }
  ```
  but without rolling back the optimistic React state updates.
- **Credential Format Mapping**: Defined in `tools/local-bridge.cjs` (lines 59–67), mapping 2.0 properties to the Windows Credential Manager format:
  ```javascript
  const credData = {
    token: {
      access_token: accessToken,
      token_type: "Bearer",
      refresh_token: refreshToken || "",
      expiry: new Date(expiresAt).toISOString()
    },
    auth_method: "consumer"
  };
  ```

---

## 2. Logic Chain

- The E2E test (Test 51) uses proper local path resolution under `tests/simulated-creds` and isolates file access. Teardown handles cleanup via a `finally` block (Observation 1).
- The E2E mock routes correctly replicate the expected filesystem, CLI config, and Credential Manager token mapping side-effects on disk, allowing proper assertion validation (Observation 1 & 5).
- In `tools/local-bridge.cjs`, the `email` variable received from the POST payload is directly interpolated into a command string passed to `exec`, which runs within a system shell interpreter (Observation 3).
- Because `exec` parses commands using a shell, any shell command control character sequence in the `email` value (e.g. `foo@bar.com" & calc.exe & "`) results in arbitrary command execution (Logic Step 1).
- Because `src/App.tsx` performs optimistic UI state updates for active account swapping but has no error recovery or rollback logic upon HTTP POST `/v1/accounts/active` failure, any switch failure results in silent UI/backend desynchronization until the next successful refresh (Observation 4).
- Based on these logical steps, the implementation code is robust on the happy path (as demonstrated by passing E2E tests in Observation 2) but suffers from a critical security vulnerability and a major state-sync flaw (Logic Step 2).

---

## 3. Caveats

- We only analyzed the new Test 51 and the associated code paths in `local-bridge.cjs` and `App.tsx`. We did not audit other endpoints for shell execution vulnerabilities.
- Mapped credential format verification is simulated in non-Windows test environments as `cmdkey` is Windows-only (guarded in implementation).

---

## 4. Conclusion

The E2E test (Test 51) is correct, complete, and robust. It correctly tests the integration contracts. However, the verdict is **REQUEST_CHANGES** due to:
1. A **Critical** Shell Command Injection vulnerability in `tools/local-bridge.cjs` via raw interpolation of the `email` parameter in the `exec` command.
2. A **Major** active account desynchronization risk in `src/App.tsx` where failed switch API requests do not trigger UI state rollback.

---

## 5. Verification Method

- Run Playwright E2E tests: `npx playwright test` inside `y:\AntiQuotar`.
- File inspection:
  - `tests/antiquotar.spec.ts` (Test 51 lines 1184–1326)
  - `tools/local-bridge.cjs` (lines 604–605 for shell injection point)
  - `src/App.tsx` (lines 354–379 for API fetch error handling)
