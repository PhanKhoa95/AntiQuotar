# Handoff Report: E2E Playwright Selectors & Feature Analysis for AntiQuotar Control

This report details the frontend source code structure in `src/App.tsx` for AntiQuotar Control and provides recommended Playwright selectors and step-by-step instructions for E2E testing of the four core features.

---

## 1. Observation

### File & Lines Inspected
- **Target File:** `src/App.tsx` (Lines 1 to 1298)

### Key UI Element Definitions from Source
- **Cookie Inbox Panel (`#cookies`):**
  - **Textarea input:**
    ```tsx
    textarea id="cookie-inbox-input" name="cookieInput" className="cookie-textarea"
    ```
  - **Domain input:**
    ```tsx
    input id="cookie-domain-input" name="domain"
    ```
  - **Name/Label input:**
    ```tsx
    input id="cookie-name-input" name="label"
    ```
  - **Import format select:**
    ```tsx
    select id="cookie-format-input" name="format"
    ```
    Options: `header` (Header string), `netscape` (Netscape), `json` (JSON).
  - **Add Cookie button:**
    ```tsx
    button className="button primary wide" type="submit"
    ```
  - **Counter indicator:**
    ```tsx
    span className="counter"
    ```
    Displays number of successfully parsed cookie pairs in the inbox before adding.

- **Rotation Controls & Active Session Display (`#sessions` and `#rules`):**
  - **Manual Rotate buttons:**
    1. Toolbar header: `button.button.primary` ("Rotate Now")
    2. Rotation Queue heading: `button.button.ghost` ("Rotate")
  - **Auto-rotate checkbox:**
    ```tsx
    input id="settings-auto-rotate-input" name="autoRotate" type="checkbox"
    ```
  - **Rotate Threshold range slider:**
    ```tsx
    input id="settings-rotate-threshold-input" name="rotateThreshold" type="range"
    ```
  - **Active Session header label:**
    Located in `#sessions .panel-heading p`. If active: session label is displayed. If not: `"No active session"`.
  - **Active Session status badge:**
    ```tsx
    span className={`status status-${status}`}
    ```
    Where status is `healthy` | `watch` | `high` | `critical` | `cooldown`.

- **Queue List & Cooldown Actions (`#rotation`):**
  - **Queue List:**
    ```tsx
    ol className="queue-list"
    ```
    Each item is `li className={`queue-item queue-${session.status}`}` with a rank `<span className="queue-rank">`, label inside `strong`, status label or time remaining inside `em`, and a promote button:
    ```tsx
    button className="button subtle" onClick={() => promoteSession(session.id)}
    ```
  - **Quick Cooldown Button:**
    ```tsx
    button className="button ghost" (triggers applyCooldown(selectedSession.id, settings.cooldownMinutes))
    ```
  - **Quick Clear Button:**
    ```tsx
    button className="button ghost" (triggers applyCooldown(selectedSession.id, 0))
    ```
  - **Manual Cooldown input (in Session Control):**
    ```tsx
    input id="control-cooldown-input" name="sessionCooldown" type="number"
    ```

- **LS Gateway & Persistence (`#logs` & localStorage):**
  - **Run Check Button:**
    `header .toolbar button.button.ghost` ("Run Check")
  - **Gateway URL input:**
    ```tsx
    input id="control-ls-endpoint-input" name="lsEndpoint"
    ```
  - **LS connection status display:**
    There is no real-time live connection status display to the LS Gateway. Instead, the UI renders the local mode data indicators:
    - Sidebar data path card: `.sidebar .local-card` containing text `"Local Mode"` and `"browser localStorage"`.
    - Toolbar service indicator: `header .toolbar .service` containing text `"Service: Local"`.
    - All sync successes, warnings, and failures are logged dynamically to the logs list `#logs .log-list`.
  - **Logs List Panel (`#logs`):**
    ```tsx
    div className="log-list"
    ```
    Logs are items of `div className={`log-item log-${log.tone}`}` where tone is `info` | `success` | `warning` | `danger`.
  - **State Persistence:**
    State is saved under localStorage key:
    ```typescript
    const STORAGE_KEY = "antiquotar-control-state-v1";
    ```

---

## 2. Logic Chain

### A. Cookie Inbox Import Flow
1. Parsing is handled by format-specific functions: `parseHeaderCookie`, `parseNetscapeCookie`, and `parseJsonCookie`.
2. When text is pasted into `#cookie-inbox-input` and `#cookie-format-input` is selected, `parsedPreview` is updated reactively, updating the text of the `.counter` element (e.g. `2 parsed`).
3. If parsing fails, `parsedPreview` returns an empty array.
4. On form submission, `handleAddCookie` checks the following:
   - Validates formats: if invalid, logs warning/danger message `"Cookie import failed. Check the selected format."` to logs.
   - Validates domain: if empty, logs warning `"Domain is required before adding a cookie session."` to logs.
   - Validates pairs count: if empty, logs warning `"No cookie pairs were detected in the inbox."` to logs.
   - On success: prepends new session to the list, sets active ID if null, sets selected ID, resets input fields, and logs `"Added [count] cookie pair(s) for [domain]."` (tone: `"success"`).
5. **E2E verification:** Target `#logs .log-item.log-success` or `#logs .log-item.log-danger` / `.log-warning` to assert correct validation messages.

### B. Rotation Mechanism Flow
1. **Manual Rotation:** Clicking `.toolbar button:has-text("Rotate Now")` or `#rotation button:has-text("Rotate")` calls `rotateNow()`.
   - `rotateNow()` selects the best candidate via `chooseBestCandidate()` (filters out active session, looks for status `healthy` or `watch`, sorts by lowest quota usage percentage).
   - If found, it places the current active session in cooldown for `settings.cooldownMinutes` and sets `activeId` to the next session ID. Logs `"Rotated active session to [next.label]."` (tone: `success`).
   - If not found, logs `"No healthy rotation candidate is available."` (tone: `warning`).
2. **Auto-Rotation:** Triggered reactively via a `useEffect` watching the active session's usage percentage.
   - If `settings.autoRotate` is true and usage percent exceeds `settings.rotateThreshold` (or active status is `cooldown`), the mechanism automatically calls `chooseBestCandidate()`, places the old session in cooldown, switches active session, and logs `"Auto-rotated active session from [active.label] to [next.label] (quota: [pct]%)."`.
3. **E2E verification:** Select manual rotate button, change threshold slider `#settings-rotate-threshold-input`, toggle checkbox `#settings-auto-rotate-input`, and verify Active Session display change in the header of `#sessions` panel.

### C. Queue Ordering & Cooldown Management Flow
1. **Sorting Order:** The `rotationQueue` sort is based on:
   - First: status rank (`healthy` (0) > `watch` (1) > `high` (2) > `critical` (3) > `cooldown` (4)).
   - Second (for non-cooldown): lower quota usage percentage first (`usagePercent(a) - usagePercent(b)`).
   - Second (for cooldown): shortest remaining cooldown time first (`minutesUntil(a.cooldownUntil) - minutesUntil(b.cooldownUntil)`).
2. **Cooldown Trigger & Action:**
   - Cooldown is manually applied by selecting a session in the session table `#sessions .session-table .table-row` (which updates `selectedId`), then clicking the "Cooldown" quick action button in the rotation panel. This triggers `applyCooldown(selectedSession.id, settings.cooldownMinutes)`.
   - Alternatively, it is set directly in the numeric input `#control-cooldown-input` under the Session Control panel.
3. **Auto-expiry:** A `setInterval` runs every 1 second, checking all session `cooldownUntil` timestamps. When a cooldown expires, it sets `cooldownUntil: null` and logs `"Cooldown finished for session [label]."` (tone: `info`).
4. **E2E verification:** Locate `#rotation .queue-list li` tags and assert the sorting order matching status and percentage. Mock Date/Time or wait to verify auto-expiry logs in `#logs .log-list`.

### D. LS Gateway Sync & State Persistence Flow
1. **Run Check API Sync:** Clicking `Run Check` invokes `runCheck()`.
   - If `settings.lsEndpoint` is empty: refreshes quota from local values and logs `"Quota state refreshed from local session values."`.
   - If `settings.lsEndpoint` is populated: sends a GET fetch request to the endpoint.
     - If response status is not OK: logs `"LS endpoint returned error status: [status]"`.
     - If fetch fails: logs `"LS Gateway connection failed: [error.message]"`.
     - If response is an array (`.sessions` or `.accounts`): updates matched sessions' `quotaUsed` and `quotaLimit` and logs `"Synchronized [count] session(s) from LS Gateway."`.
     - If response is a single object matching the active session: updates its quota and logs `"Synchronized active session [label] quota from LS Gateway."`.
2. **State Persistence:**
   - Saved reactively inside `useEffect` hook on every state change (`sessions`, `activeId`, `settings`, `logs`).
   - Reloading the page initializes state from localStorage.
3. **E2E verification:** Check console errors or mock the LS gateway API endpoints, verify log messages in `#logs .log-list`, inspect `localStorage` directly in browser context, reload page and verify persistence.

---

## 3. Caveats

1. **Local Time Zone Dependence:** Time logs render using local locale format (`formatTime` and `formatDateTime`). Asserting exact log timestamps in E2E tests should use relative matching or regex.
2. **No Real-Time LS WebSocket:** Since LS Gateway Sync relies on manual GET requests (polling or clicked manually), E2E tests must trigger the `Run Check` button to simulate synchronization events.
3. **API Mocking:** In E2E tests, the LS Gateway Endpoint (`http://127.0.0.1:5188/...` or custom) must be mocked using Playwright's `page.route()` to avoid real network requests.

---

## 4. Conclusion

The AntiQuotar Control UI contains robust hooks and distinct element IDs making it highly suitable for E2E tests. By targeting IDs (e.g. `#cookie-inbox-input`, `#cookie-domain-input`, `#cookie-format-input`, `#settings-auto-rotate-input`, `#control-ls-endpoint-input`) and class names (`.log-item`, `.queue-item`, `.status-*`), E2E scripts can fully simulate and verify import parsing, automated rotation, queue sorting, and LS Gateway integration.

---

## 5. Verification Method

### Playwright Test Blueprint Example
To independently verify the implementation details, the following Playwright test scripts can be executed against the running AntiQuotar frontend:

```typescript
import { test, expect } from '@playwright/test';

test.describe('AntiQuotar E2E Flow Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start with clean state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. Cookie Inbox Import & Format Validation', async ({ page }) => {
    // Navigate and check elements exist
    await expect(page.locator('#cookie-inbox-input')).toBeVisible();
    await expect(page.locator('#cookie-domain-input')).toBeVisible();
    await expect(page.locator('#cookie-format-input')).toBeVisible();

    // Fill valid Header string cookie
    await page.locator('#cookie-inbox-input').fill('Cookie: sessionid=xyz123; user=foo');
    await page.locator('#cookie-domain-input').fill('example.com');
    await page.locator('#cookie-name-input').fill('Test Header');
    await page.locator('#cookie-format-input').selectOption('header');
    
    // Assert preview count
    await expect(page.locator('#cookies .counter')).toHaveText('2 parsed');

    // Submit form
    await page.click('form#cookies button[type="submit"]');

    // Verify Success Log
    await expect(page.locator('#logs .log-list .log-item.log-success')).toContainText('Added 2 cookie pair(s) for example.com.');
  });

  test('2. Manual and Auto Rotation Verification', async ({ page }) => {
    // Setup two mock sessions via localStorage to bypass UI input speed
    await page.evaluate(() => {
      localStorage.setItem('antiquotar-control-state-v1', JSON.stringify({
        sessions: [
          {
            id: 'sess-1',
            label: 'Session 1',
            domain: 'example.com',
            cookieName: 'sessionid',
            cookieValue: 'sessionid=val1',
            cookieCount: 1,
            quotaUsed: 50,
            quotaLimit: 100, // 50% usage -> healthy
            cooldownUntil: null,
            createdAt: new Date().toISOString(),
            lastChecked: new Date().toISOString(),
            status: 'healthy',
            notes: 'Test Session 1'
          },
          {
            id: 'sess-2',
            label: 'Session 2',
            domain: 'example.com',
            cookieName: 'sessionid',
            cookieValue: 'sessionid=val2',
            cookieCount: 1,
            quotaUsed: 10,
            quotaLimit: 100, // 10% usage -> healthy (best candidate)
            cooldownUntil: null,
            createdAt: new Date().toISOString(),
            lastChecked: new Date().toISOString(),
            status: 'healthy',
            notes: 'Test Session 2'
          }
        ],
        activeId: 'sess-1',
        settings: {
          autoRotate: true,
          rotateThreshold: 80,
          cooldownMinutes: 8,
          lsEndpoint: '',
          storeRawCookie: true
        },
        logs: []
      }));
    });
    await page.reload();

    // Verify current Active Session
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session 1');

    // Trigger Manual Rotate Now
    await page.click('header .toolbar button.button.primary:has-text("Rotate Now")');

    // Verify Active Session rotated to Session 2 (lowest quota)
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session 2');
    await expect(page.locator('#logs .log-list .log-item.log-success')).toContainText('Rotated active session to Session 2.');
  });

  test('3. Queue Ordering and Cooldown Trigger', async ({ page }) => {
    // Set up sessions with diverse statuses
    await page.evaluate(() => {
      localStorage.setItem('antiquotar-control-state-v1', JSON.stringify({
        sessions: [
          { id: 's-cooldown', label: 'Cooldown Sess', domain: 'example.com', quotaUsed: 10, quotaLimit: 100, cooldownUntil: new Date(Date.now() + 300000).toISOString(), status: 'cooldown' },
          { id: 's-healthy-low', label: 'Healthy Low', domain: 'example.com', quotaUsed: 10, quotaLimit: 100, cooldownUntil: null, status: 'healthy' },
          { id: 's-healthy-high', label: 'Healthy High', domain: 'example.com', quotaUsed: 50, quotaLimit: 100, cooldownUntil: null, status: 'healthy' }
        ],
        activeId: 's-healthy-low',
        settings: { autoRotate: false, rotateThreshold: 80, cooldownMinutes: 5, lsEndpoint: '' },
        logs: []
      }));
    });
    await page.reload();

    // Verify Queue List sorting (Healthy Low (10%) -> Healthy High (50%) -> Cooldown)
    const queueItems = page.locator('#rotation .queue-list li');
    await expect(queueItems.nth(0)).toContainText('Healthy Low');
    await expect(queueItems.nth(1)).toContainText('Healthy High');
    await expect(queueItems.nth(2)).toContainText('Cooldown Sess');

    // Trigger manual cooldown using control input
    await page.click('#sessions .session-table .table-row:has-text("Healthy High")');
    await page.locator('#control-cooldown-input').fill('15');
    
    // Check if it got demoted to cooldown status in the table and queue
    await expect(page.locator('#sessions .session-table .table-row:has-text("Healthy High") .status')).toHaveText('Cooldown');
  });

  test('4. LS Gateway Sync Mocking & LocalStorage Persistence', async ({ page }) => {
    // Mock the Gateway API Endpoint
    const mockEndpoint = '**/v1/provision/status';
    await page.route(mockEndpoint, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            { id: 's-target', quotaUsed: 95, quotaLimit: 100 }
          ]
        })
      });
    });

    await page.evaluate(() => {
      localStorage.setItem('antiquotar-control-state-v1', JSON.stringify({
        sessions: [
          { id: 's-target', label: 'Target Session', domain: 'example.com', cookieName: 'c', cookieValue: 'v', quotaUsed: 20, quotaLimit: 100, cooldownUntil: null, status: 'healthy' }
        ],
        activeId: 's-target',
        settings: { autoRotate: false, rotateThreshold: 80, cooldownMinutes: 5, lsEndpoint: 'http://127.0.0.1:5188/v1/provision/status' },
        logs: []
      }));
    });
    await page.reload();

    // Execute Run Check
    await page.click('button:has-text("Run Check")');

    // Verify API Sync Success Log
    await expect(page.locator('#logs .log-list .log-item.log-success')).toContainText('Synchronized 1 session(s) from LS Gateway.');

    // Verify localStorage updated value
    const storedState = await page.evaluate(() => JSON.parse(localStorage.getItem('antiquotar-control-state-v1') || '{}'));
    expect(storedState.sessions[0].quotaUsed).toBe(95);
  });
});
```
