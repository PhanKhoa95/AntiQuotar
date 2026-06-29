# Active Account Switching & Synchronization Analysis

This report outlines the findings from our exploration of the AntiQuotar codebase regarding active account promotion, credentials synchronization, and integration testing.

---

## 1. React Frontend Promotion Trigger (`src/App.tsx`)

*   **Location**: `src/App.tsx`
*   **Trigger Actions**:
    *   **Accounts Table (Lines 1479-1484)**: The "Set active" ArrowUp icon button:
        ```tsx
        <button className="icon-button" aria-label="Set active" onClick={(event) => {
          event.stopPropagation();
          promoteSession(session.id);
        }}>
          <ArrowUp size={16} />
        </button>
        ```
    *   **Rotation Queue (Lines 1529-1532)**: The "Promote" subtle button:
        ```tsx
        <button className="button subtle" onClick={() => promoteSession(session.id)}>
          Promote
          <ChevronRight size={15} />
        </button>
        ```
*   **State Updates**:
    *   Both buttons invoke `promoteSession(id)` (Lines 997-1008), which:
        1. Resets the target session's `cooldownUntil` to `null`.
        2. Sets `activeId` state to the selected `id` (the session's email).
        3. Sets `selectedId` state to the selected `id`.
        4. Logs the promotion event.
*   **API Dispatch**:
    *   A `useEffect` (Lines 348-383) watches `activeId` and `settings.lsEndpoint`. When `activeId` changes, it dispatches a POST request to `${settings.lsEndpoint}/v1/accounts/active` with body `{ email: activeId }`.

---

## 2. API Handler for POST `/v1/accounts/active` (`tools/local-bridge.cjs`)

*   **Location**: `tools/local-bridge.cjs` (Lines 563-639)
*   **Process Flow**:
    1. Extracts `email` from `data.email || data.id`.
    2. Builds filesystem paths:
        *   `credDir`: `~/.antigravity/credentials`
        *   `profilesDir`: `~/.antigravity/credentials/profiles`
        *   `activeSession`: `~/.antigravity/credentials/session.json`
        *   `targetProfile`: `~/.antigravity/credentials/profiles/${email}.json`
    3. Copies target profile JSON content to `activeSession` and touches the file's modification time (`fs.utimesSync`) to trigger file watchers.
    4. Calls `updateCredentialManager()` to update the Windows Credential Manager.
    5. Syncs the CLI 1.x configuration by running `node tools/antigravity-usage/dist/index.js accounts switch ${email}`.
    6. Restarts `ag-daemon` to ensure it starts using the updated credentials immediately.

---

## 3. Credentials Sync Mechanism Details

### A. Writing to `session.json`
*   The bridge reads the JSON token content from `~/.antigravity/credentials/profiles/${email}.json` and writes it directly to `~/.antigravity/credentials/session.json`.
*   It then touches the modification time (mtime) of `session.json` using `fs.utimesSync` to force watchers to reload.

### B. Updating CLI 1.x Config
*   The bridge spawns a CLI child process running:
    `node "tools/antigravity-usage/dist/index.js" accounts switch "${email}"`
*   This command invokes `switchAccountCommand(email)` in `tools/antigravity-usage/src/commands/accounts.ts`, which:
    1. Calls `manager.setActiveAccount(email)` in `tools/antigravity-usage/src/accounts/manager.ts`.
    2. Updates `activeAccount` property in `%APPDATA%/antigravity-usage/config.json`.
    3. Touches the last used timestamp for the account.

### C. Windows Credential Manager Update (`cmdkey`)
*   **Format Mapping**: The function `updateCredentialManager` maps properties from the 2.0 profile JSON format to the format required by the Credential Manager.
    *   If the token JSON already contains `token.access_token`, it writes the JSON content directly.
    *   Otherwise, it maps properties as follows:
        ```javascript
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
        ```
    *   It then executes:
        `cmdkey /generic:gemini:antigravity /user:antigravity /pass:<JSON_STRING>`
        where `<JSON_STRING>` is the serialized `credData`.

---

## 4. Desktop Client Synchronization & Simulation

### A. VSCode Extension (`tools/AntigravityQuotaWatcher`)
*   The extension contains a `TokenSyncChecker` class (`src/auth/tokenSyncChecker.ts`) that runs on a timer.
*   **When logged in (source === 'imported')**: It polls every 30 seconds, comparing the stored refresh token against the local token retrieved via `extractRefreshTokenFromAntigravity()`.
*   **When logged out**: It polls every 20 seconds for the existence of a local token.
*   **Local Token Extraction**: `antigravityTokenExtractor.ts` queries the Antigravity SQLite database `state.vscdb` located at `%APPDATA%/Antigravity/User/globalStorage/state.vscdb`. It reads the key `jetskiStateSync.agentManagerInitState` and extracts the protobuf-encoded `refresh_token`.
*   **Verification / Sync Handling**: If a token mismatch (`TOKEN_CHANGED`) or new token (`LOCAL_TOKEN_AVAILABLE`) is detected, the extension triggers a modal prompt. If approved, it logs in with the new token (`loginWithRefreshToken`) **without** opening an interactive login page, ensuring a seamless account reflection.

### B. IDE `Antigravity.exe`
*   `Antigravity.exe` uses the Windows Credential Manager `gemini:antigravity` target as its credential backend.
*   Because the Local Quota Bridge updates `gemini:antigravity` immediately using the mapped JSON token format, the IDE automatically reads the updated credentials upon the next API query without triggering re-login prompts.

---

## 5. E2E Test Strategy & Proposed Interactive Test Scenario

### Existing Tests Context (`tests/antiquotar.spec.ts`)
*   Playwright tests run in a sequential, headless environment.
*   Network requests to local-bridge endpoints (`**/v1/**`) are fully intercepted/mocked using Playwright's `page.route` feature.
*   State changes are asserted primarily by checking DOM text/elements or tracking network request bodies.

### Proposed Test Scenario Design
We propose adding `test('51. Scenario 7 (Interactive promotion, filesystem/credentials sync, and no login prompt)')` at the end of `tests/antiquotar.spec.ts`.

#### Test Walkthrough Steps:
1.  **Environment Setup**:
    *   Create a simulated temp credentials directory (e.g. `tests/simulated-creds`).
    *   Write two mock profile files: `alice@google.com.json` and `bob@google.com.json` into `tests/simulated-creds/profiles/`.
    *   Set the initial active session file `session.json` to match `alice@google.com.json`.
    *   Set the simulated CLI configuration `config.json` to have `activeAccount: "alice@google.com"`.
2.  **API Mocking & Interception**:
    *   Mock `GET **/v1/accounts` to return both `alice@google.com` (active) and `bob@google.com`.
    *   Mock `POST **/v1/accounts/active` to intercept the promotion payload.
    *   **Simulate Backend Side-Effects Inside the Route Handler**:
        When a request is made to activate `bob@google.com`, the Playwright interceptor code runs Node filesystem commands:
        *   Copies `tests/simulated-creds/profiles/bob@google.com.json` to `tests/simulated-creds/session.json`.
        *   Updates `activeAccount` to `bob@google.com` in `tests/simulated-creds/config.json`.
        *   Simulates the credential cache by writing the mapped JSON token to a mock credential manager log file/registry.
        *   Fulfills the HTTP response with `200 OK`.
3.  **UI Interactions**:
    *   Navigate to the CMS dashboard page.
    *   Verify `alice@google.com` is active.
    *   Click the **"Set active" ArrowUp** button next to `bob@google.com` in the session list.
4.  **Verification & Assertions**:
    *   **UI Sync**: Verify `bob@google.com` immediately becomes active on the dashboard.
    *   **Filesystem Sync**: Read `tests/simulated-creds/session.json` and assert it now matches `bob@google.com.json`'s content.
    *   **CLI Config Sync**: Read `tests/simulated-creds/config.json` and assert `activeAccount` is now `"bob@google.com"`.
    *   **Credential Cache Sync**: Read the mock credential manager registry and assert that the credential `gemini:antigravity` stores the mapped token format of Bob.
    *   **No Login Prompts**: Verify that no oauth/login dialogs or login redirect triggers are rendered in the DOM.
