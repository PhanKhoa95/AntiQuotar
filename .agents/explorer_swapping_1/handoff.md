# Handoff Report — Explorer Swapping 1

## 1. Observation

Direct observations from the exploration of the codebase:

1.  **Frontend Promote Trigger**: In `src/App.tsx`, lines 1479-1481:
    ```tsx
    <button className="icon-button" aria-label="Set active" onClick={(event) => {
      event.stopPropagation();
      promoteSession(session.id);
    ```
    and lines 1529-1532:
    ```tsx
    <button className="button subtle" onClick={() => promoteSession(session.id)}>
      Promote
    ```
    Both invoke `promoteSession(id)` (Lines 997-1008), setting `activeId` to the session's email address.

2.  **Frontend POST Trigger**: In `src/App.tsx`, lines 348-357:
    ```tsx
    useEffect(() => {
      if (activeId && settings.lsEndpoint.trim()) {
        try {
          const url = new URL(settings.lsEndpoint);
          const switchUrl = `${url.protocol}//${url.host}/v1/accounts/active`;
          isSwitchingActiveRef.current = true;
          fetch(switchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: activeId })
          })
    ```

3.  **Local Bridge Endpoint**: In `tools/local-bridge.cjs`, lines 563-564:
    ```javascript
    } else if (url.pathname === '/v1/accounts/active' || url.pathname === '/accounts/active') {
      if (req.method === 'POST') {
    ```
    This swaps the token in `~/.antigravity/credentials/session.json`, touches the file, updates the Windows Credential Manager (`cmdkey`), executes the 1.x CLI account switch command, and restarts `ag-daemon`.

4.  **Credential Manager Format Mapping**: In `tools/local-bridge.cjs`, lines 37-73:
    ```javascript
    function updateCredentialManager(tokenContent, callback) {
      if (process.platform !== 'win32') {
        return callback(null);
      }
      
      try {
        const data = JSON.parse(tokenContent);
        
        // Check if already in the target Credential Manager format
        if (data.token && data.token.access_token) {
          const { spawn } = require('child_process');
          const child = spawn('cmdkey', ['/generic:gemini:antigravity', '/user:antigravity', `/pass:${tokenContent}`]);
          child.on('close', () => callback(null));
          child.on('error', () => callback(null));
          return;
        }
        
        // Map from 2.0 profile properties to Credential Manager properties
        const accessToken = data.accessToken || data.access_token;
        const refreshToken = data.refreshToken || data.refresh_token;
        const expiresAt = data.expiresAt || data.expires_at || (data.expiry ? new Date(data.expiry).getTime() : Date.now() + 3600000);
        
        const credData = {
          token: {
            access_token: accessToken,
            token_type: "Bearer",
            refresh_token: refreshToken || "",
            expiry: new Date(expiresAt).toISOString()
          },
          auth_method: "consumer"
        };
        
        const credString = JSON.stringify(credData);
        
        const { spawn } = require('child_process');
        const child = spawn('cmdkey', ['/generic:gemini:antigravity', '/user:antigravity', `/pass:${credString}`]);
    ```

5.  **VSCode Extension Token Sync**: In `tools/AntigravityQuotaWatcher/src/auth/tokenSyncChecker.ts`, lines 118-122:
    ```typescript
    if (localRefreshToken !== currentRefreshToken) {
        // Token 不一致（用户在 Antigravity 切换了账号）
        logger.info('TokenSyncChecker', 'Local Antigravity token changed');
        return TokenSyncStatus.TOKEN_CHANGED;
    }
    ```
    and lines 328-338:
    ```typescript
    const newToken = await extractRefreshTokenFromAntigravity();
    if (!newToken) {
        vscode.window.showWarningMessage(
            localizationService.t('login.error.localTokenImport')
        );
        return;
    }
    const success = await googleAuthService.loginWithRefreshToken(newToken);
    if (success && onTokenChanged) {
        onTokenChanged();
    }
    ```

---

## 2. Logic Chain

1.  **Frontend Interaction**: Promoting an account via the CMS dashboard calls `promoteSession` and updates `activeId`. This triggers the `useEffect` that calls `POST /v1/accounts/active` (Observation 1 & 2).
2.  **Sync Operations**: The local bridge POST handler swaps profile data to `session.json`, touches the file, runs `cmdkey` with the mapped token structure to update Windows Credential Manager, runs `antigravity-usage accounts switch` to update CLI 1.x config, and restarts `ag-daemon` (Observation 3 & 4).
3.  **Desktop Client Integration**:
    *   **VSCode Extension**: The extension's `TokenSyncChecker` polls for database token mismatch. When a mismatch is found, it uses the new refresh token via `loginWithRefreshToken` (Observation 5), thus logging the user in seamlessly without launching a browser auth page.
    *   **Antigravity.exe**: Since the IDE queries the Windows Credential Manager `gemini:antigravity` target, updating `gemini:antigravity` with the mapped JSON token allows the IDE to instantly leverage the new active credentials without login prompts.

---

## 3. Caveats

*   **Real Windows Credential Manager Integration**: Running the test in non-Windows environments (such as a Linux CI/CD agent) will skip the `cmdkey` execution because of the guard `if (process.platform !== 'win32')`. E2E tests must simulate the credential manager cache via mock layers rather than relying on real OS credential stores.
*   **Daemon Availability**: The daemon restart logic fallback is implemented gracefully in the bridge server to prevent test failures when `ag-daemon` is not installed or running.

---

## 4. Conclusion

The codebase currently has all the core synchronization pieces fully integrated, but lacks a consolidated E2E integration test scenario verifying that frontend promote/switch actions properly synchronize all active state properties (filesystem `session.json`, CLI config, Windows Credential Manager `gemini:antigravity`) and that the client applications reflect the change without prompting for credentials.

---

## 5. Verification Method

To verify the synchronization flow and the proposed test case:
1.  Verify compilation of `tests/antiquotar.spec.ts` using TypeScript compiler.
2.  Run the playwright test suite:
    ```powershell
    npx playwright test
    ```
3.  Inspect `tests/antiquotar.spec.ts` to verify the presence and assertions of the new E2E scenario.

---

## 6. Remaining Work (Soft Handoff)

*   **Implement Playwright E2E Scenario**: Implement the designed test case `test('51. Scenario 7 (Interactive promotion, filesystem/credentials sync, and no login prompt)')` in `tests/antiquotar.spec.ts`.
*   **Verify Execution**: Run Playwright tests on the actual Windows platform to ensure the simulation behaves correctly and all assertions pass.
