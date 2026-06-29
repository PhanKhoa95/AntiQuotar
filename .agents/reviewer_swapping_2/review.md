# Review Report: Swapping Scenario & Credentials Sync

## Review Summary

**Verdict**: REQUEST_CHANGES

This review evaluates the E2E browser test scenario (Test 51) in `tests/antiquotar.spec.ts`, the local bridge server logic in `tools/local-bridge.cjs`, and the frontend switching mechanism in `src/App.tsx`. While the core implementation is functional and all 55 tests pass, there are critical gaps regarding E2E test race conditions, platform constraints (Windows Credential Manager command-line limitations), and a lack of signout synchronization that need to be addressed.

---

## Findings

### [Major] Finding 1: Race Condition in Test 51 File Assertions

- **What**: E2E test makes file assertions immediately after DOM text check without awaiting the completion of the asynchronous network request.
- **Where**: `tests/antiquotar.spec.ts` (lines 1300-1318)
- **Why**: 
  - Clicking the "Set active" button synchronously triggers `setActiveId('bob@google.com')` on the frontend, which updates the DOM heading text to `"bob@google.com"`.
  - The fetch POST to `/v1/accounts/active` is triggered inside a React `useEffect` hook, which runs asynchronously *after* the DOM updates.
  - The E2E test uses `await expect(page.locator('#sessions .panel-heading p')).toHaveText('bob@google.com');` which resolves as soon as the DOM updates, but before the fetch request completes.
  - Consequently, `fs.readFileSync(sessionJsonPath)` is called immediately, creating a race condition where the file on disk might not have been written yet, leading to test flakiness.
- **Suggestion**: Await the intercepted response explicitly before checking the disk:
  ```typescript
  const switchResponse = page.waitForResponse(resp => 
    resp.url().includes('/v1/accounts/active') && resp.request().method() === 'POST'
  );
  await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'bob@google.com' }).locator('button[aria-label="Set active"]').click();
  await switchResponse;
  ```

### [Major] Finding 2: `cmdkey` Password Length Limitation for JWTs

- **What**: The local bridge uses `cmdkey` to update credentials, which has a 512-character limit on the password parameter.
- **Where**: `tools/local-bridge.cjs` (lines 71-73)
- **Why**: 
  - The bridge maps the OAuth 2.0 token to a JSON string containing the access token, refresh token, token type, and expiry.
  - While simple mock tokens pass, real OAuth JWT tokens (especially Google access tokens or ID tokens) easily exceed 1KB in size.
  - Windows `cmdkey` silently truncates or fails when passing arguments exceeding 512 characters to the password field, which will corrupt stored credentials for client apps.
- **Suggestion**: Document this limitation as a major caveat, or migrate from `cmdkey` execution to a native credential storage binding (e.g., node-keytar / keytar) that interacts directly with Windows Credential Manager APIs without command-line parameter constraints.

### [Minor] Finding 3: Missing Signout Sync in App.tsx

- **What**: The frontend React app does not invoke the local bridge's `/v1/accounts/signout` endpoint when all sessions are cleared.
- **Where**: `src/App.tsx` (lines 1010-1019)
- **Why**: 
  - `tools/local-bridge.cjs` contains a POST handler for `/v1/accounts/signout` that clears `session.json` and restarts the daemon.
  - However, when the user removes all sessions from the Control CMS dashboard, `activeId` is set to `null` and the `useEffect` hook for synchronization skips executing, leaving the sensitive token in `session.json` intact.
- **Suggestion**: Call the signout endpoint when the active session becomes `null` or when all accounts are removed.

---

## Adversarial / Challenge Review

### 1. Assumption Stress-Testing

- **Assumption challenged**: Spawning `cmdkey` with JSON content handles special shell characters correctly.
- **Attack scenario**: If the JSON payload contains characters like `&` or `%` (which can appear in OAuth refresh tokens or signatures), spawning a command-line process or passing them might trigger command injection or parsing failures depending on how the arguments are serialized.
- **Blast radius**: Daemon crash, command injection, or failed credential storage.
- **Mitigation**: Ensure strict input verification/escaping before spawning shell subprocesses, or use native credential APIs.

### 2. Edge Case: Cooldown or Expiry Time Parsing

- **Scenario**: If the profile JSON contains a missing or malformed `expiresAt` property.
- **Expected behavior**: Fallback gracefully to a future time.
- **Actual/Predicted behavior**: In `tools/local-bridge.cjs` line 57:
  ```javascript
  const expiresAt = data.expiresAt || data.expires_at || (data.expiry ? new Date(data.expiry).getTime() : Date.now() + 3600000);
  ```
  If `data.expiry` is an invalid date string, `new Date(data.expiry).getTime()` returns `NaN`, which gets serialized into the JSON as `null`, causing expiry parsing in the IDE to fail.
- **Pass/Fail**: PASS (handles missing gracefully, but vulnerable to malformed date strings).

---

## Verified Claims

- **Test 51 execution** → Verified via `npx playwright test` → **PASS**
- **Credential format mapping** → Verified via `tools/local-bridge.cjs` inspection → **PASS** (maps correctly to target format)

---

## Coverage Gaps

- **E2E verification under CI/CD (Non-Windows)** — Risk level: Medium — Recommendation: Accept risk, as the test uses simulated credential directories and `page.route` to prevent platform-specific `cmdkey` crashes.
- **Actual vs. Mocked OAuth Token Lifetime** — Risk level: Low — Recommendation: Accept risk.

---

## Unverified Items

- **Actual VSCode Extension Behavior** — Not verified directly as VSCode extension UI cannot be run in the headless Playwright browser.
