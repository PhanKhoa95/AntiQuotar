## 2026-06-29T06:30:18Z
You are worker_swapping_2. Your working directory is y:\AntiQuotar\.agents\worker_swapping_2.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the remediation plan addressing the findings from the code review:

1. In `tools/local-bridge.cjs`:
   - Line 604-605: Replace shell command execution (`exec`) of the switch command with `execFile` to prevent potential command injection:
     ```javascript
     const { execFile } = require('child_process');
     execFile('node', [cliPath, 'accounts', 'switch', email], { env: { ...process.env, PATH: envPath } }, (cliErr) => { ... });
     ```
   - Line 683: Bind server to loopback address `127.0.0.1` to prevent unauthorized local network exposure:
     ```javascript
     server.listen(PORT, '127.0.0.1', () => { ... });
     ```
   - In `updateCredentialManager` (near line 71), make the ISO expiry parsing robust against invalid dates:
     ```javascript
     let expiryIso = new Date(Date.now() + 3600000).toISOString();
     try {
       if (expiresAt && !isNaN(new Date(expiresAt).getTime())) {
         expiryIso = new Date(expiresAt).toISOString();
       }
     } catch (e) {
       console.warn("Invalid expiresAt date string, using default +1 hour fallback");
     }
     ```
     And insert a code comment in `local-bridge.cjs` near `updateCredentialManager` documenting the Windows Credential Manager `cmdkey` 512-character constraint on password parameters (recommending keytar for production JWT storage).

2. In `src/App.tsx`:
   - Line 383: Update the `activeId` `useEffect` hook to POST to `/v1/accounts/signout` when `activeId` is empty/null, so that clearing the session in the CMS clears `session.json` and restarts the daemon on the backend:
     ```typescript
     } else if (!activeId && settings.lsEndpoint.trim()) {
       try {
         const url = new URL(settings.lsEndpoint);
         const signoutUrl = `${url.protocol}//${url.host}/v1/accounts/signout`;
         fetch(signoutUrl, {
           method: "POST",
           headers: { "Content-Type": "application/json" }
         })
           .then((res) => {
             if (!res.ok) {
               console.error("LS Gateway signout returned error status:", res.status);
             } else {
               console.log("LS Gateway signout success.");
             }
           })
           .catch((err) => {
             console.error("Failed to sync signout to LS Gateway:", err);
           });
       } catch (e) {
         console.error("Invalid lsEndpoint:", e);
       }
     }
     ```

3. In `tests/antiquotar.spec.ts`:
   - In Test 51: Use a unique simulated directory:
     ```typescript
     const simulatedCredsDir = path.resolve(__dirname, `simulated-creds-${process.pid}`);
     ```
   - Resolve the E2E race condition by explicitly awaiting the `page.waitForResponse` before verifying files on disk:
     ```typescript
     const switchResponsePromise = page.waitForResponse(resp =>
       resp.url().includes('/v1/accounts/active') && resp.request().method() === 'POST'
     );
     // click the set active button
     await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'bob@google.com' }).locator('button[aria-label="Set active"]').click();
     await switchResponsePromise;
     await expect(page.locator('#sessions .panel-heading p')).toHaveText('bob@google.com');
     ```

Run `npm run build`, `npx playwright test`, and `npm run test:smoke` to verify all 55 tests pass and compiles cleanly.
Write your changes to `y:\AntiQuotar\.agents\worker_swapping_2\handoff.md` and send a message when complete.
