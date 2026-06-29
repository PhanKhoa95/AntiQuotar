# Handoff Report: Swapping Scenario & Credentials Sync Review

## 1. Observation

We observed and analyzed the following files:

- **E2E Test File**: `tests/antiquotar.spec.ts` (lines 1184-1326) contains `test('51. Scenario 7 (Interactive promotion, filesystem/credentials sync, and no login prompt)')`.
  - Lines 1300-1308:
    ```typescript
    // Switch to Bob by clicking ArrowUp "Set active" button on Bob's row
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'bob@google.com' }).locator('button[aria-label="Set active"]').click();

    // Verify Bob is now active in UI
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('bob@google.com');

    // Verify session.json is updated on disk
    const sessionContent = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf-8'));
    ```
- **Local Bridge Server File**: `tools/local-bridge.cjs` (lines 71-73) contains the `cmdkey` invocation:
  ```javascript
  const { spawn } = require('child_process');
  const child = spawn('cmdkey', ['/generic:gemini:antigravity', '/user:antigravity', `/pass:${credString}`]);
  ```
- **Frontend App File**: `src/App.tsx` (lines 352-358) handles active account promotion synchronization:
  ```typescript
  const switchUrl = `${url.protocol}//${url.host}/v1/accounts/active`;
  isSwitchingActiveRef.current = true;
  fetch(switchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: activeId })
  })
  ```
- **Test execution command**: Running `npx playwright test` completes successfully with:
  `55 passed (44.2s)`

---

## 2. Logic Chain

1. **Path Isolation & FS Mocks**: Test 51 resolves temporary credential folders under `tests/simulated-creds` relative to `__dirname`, which keeps host environment credentials clean. The simulated credentials directory is properly cleaned up in the `finally` block of the test.
2. **Side-effect Simulation Accuracy**: The E2E mock `/v1/accounts/active` correctly mirrors `local-bridge.cjs` side-effects by updating `session.json`, `config.json`, and mapping profile credentials to the expected format under `gemini:antigravity`.
3. **E2E Test Race Condition**: In `tests/antiquotar.spec.ts`, the test assertions on files (`session.json`) are made immediately after the DOM heading text changes to `"bob@google.com"`. Since the heading text is updated synchronously in the click handler, but the API fetch to `/v1/accounts/active` occurs inside an asynchronous React `useEffect`, the files on disk might not be written yet when `fs.readFileSync` executes. This exposes the test to flakiness.
4. **`cmdkey` 512-Byte Limit**: `cmdkey` has a hard limits constraint of 512 characters on the `/pass` argument. Mapped JSON credentials containing actual Google JWT OAuth tokens will exceed 512 bytes, causing execution failure or truncation in Windows Credential Manager.
5. **Missing Signout Synchronization**: The frontend updates the active account when changed, but does not notify the bridge when the active account is removed or becomes `null`. This leaves sensitive tokens in `session.json` on disk.

---

## 3. Caveats

- We did not verify the actual VSCode Extension UI behavior directly, as vscode extension UI cannot be run in headless Playwright.
- We assume that the 512-character limit of `cmdkey` is acceptable in development or must be addressed via an alternative credential manager API/package.

---

## 4. Conclusion

The newly added Test 51 correctly tests the integration using isolated paths and fs mocks, but contains a potential race condition. Additionally, the bridge server implementation has architectural limitations regarding `cmdkey` command-line length limits and missing signout sync. Therefore, the verdict is **REQUEST_CHANGES**.

---

## 5. Verification Method

To verify the test suite:
1. Run `npx playwright test` to ensure all tests pass.
2. Inspect `tests/antiquotar.spec.ts` line 1184 to confirm test 51 implementation.
3. Inspect `tools/local-bridge.cjs` line 37-91 to verify credential mapping and `cmdkey` invocation.
