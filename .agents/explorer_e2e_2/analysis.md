# Analysis of Playwright Test 20c

This report presents a thorough static and dynamic analysis of the Playwright test `20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high` inside `E:\AntiQuotar\tests\antiquotar.spec.ts`.

---

## 1. Compliance with ORIGINAL_REQUEST.md Requirements

We compared the test's implementation against the requirements outlined in the parent folder's `ORIGINAL_REQUEST.md`:

| Requirement / Criterion | Status | Observations / Discrepancies |
|---|---|---|
| **R1. Google Account Authentication**: Initiate login via "Add Antigravity", and fetch account details from local gateway `/v1/accounts` on "Done" click. | **Partially Met** | Initiates login flow, but the route `/v1/auth/login` is not mocked. Clicking "Done" successfully calls `/v1/accounts`. |
| **R2. Session Auto-Import**: New accounts returned by `/v1/accounts` not present in CMS are auto-imported and saved to localStorage. | **Met** | The test successfully verifies that `S2` (returned by mock) is added to the sessions list (`.session-table`). |
| **R3. Automatic Account Rotation**: If active session exceeds threshold (80%), rotates immediately to new healthy session (lowest quota percentage). | **Met** | The test verifies that active session switches from S1 to S2. |
| **Acceptance Criteria - S2 imported & active**: Verify S2 is imported and becomes active. | **Met** | Test asserts `S2` row is present and active session panel reads `S2`. |
| **Acceptance Criteria - S1 goes to cooldown**: Verify S1 goes to cooldown. | **Not Asserted** | **Missing Detail**: The test never asserts S1 enters `Cooldown` state in the sessions table. |
| **Acceptance Criteria - Test Suite Passes**: The test suite must pass successfully. | **Failed** | The test currently fails and times out after 30 seconds due to a log assertion mismatch. |

---

## 2. Robustness and Failure Root Causes

We identified three critical issues that compromise the test's robustness and cause it to fail:

### Issue A: Incorrect Log Assertion (Test Timeout)
* **Observation**: The test asserts:
  ```typescript
  expect(logs.some(l => l.includes('Auto-rotated to S2 after quota check.'))).toBeTruthy();
  ```
* **Logic/Code Trace**:
  - The log message `"Auto-rotated to S2 after quota check."` is only logged synchronously inside the initial stage of `runCheck()` if a rotation is triggered *before* fetching the API.
  - Since S1 is initially added with `used: 10` locally, its usage is below the 80% threshold. Thus, no rotation is triggered before the fetch.
  - The API response updates S1's usage to 85% (triggering React state changes). The React `useEffect` handles the actual auto-rotation and logs:
    `"Auto-rotated active session from S1 to S2 (quota: 85%)."` (see `src/App.tsx` lines 430-438).
  - Since `"Auto-rotated to S2 after quota check."` is never logged, the `toPass()` block repeatedly checks and eventually times out.
* **Impact**: The test consistently fails with a 30-second timeout.

### Issue B: Unmocked `/v1/auth/login` Endpoint
* **Observation**: The test unroutes default mocks (`await page.unroute('**/v1/**')`) but only mocks `**/v1/accounts`.
* **Logic/Code Trace**:
  - When `button:has-text("Add Antigravity")` is clicked, the UI calls `connectAntigravity()` which performs:
    ```typescript
    const res = await fetch(`${baseUrl}/v1/auth/login`, { method: "GET" });
    ```
  - Since `/v1/auth/login` is unmocked, this fetch request attempts to connect to the real network (or localhost). If the local bridge is offline, it fails with `TypeError: Failed to fetch` and adds a warning to the logs: `"Failed to connect to LS Gateway: Failed to fetch"`.
* **Impact**: The test is unrobust, leaks network requests, and is dependent on whether a real gateway is running.

### Issue C: Missing Verification of Cooldown Status
* **Observation**: The Acceptance Criteria states: *"The test must verify S2 is imported, S1 goes to cooldown, and S2 becomes the active session."*
* **Logic/Code Trace**: The test checks S2 import and S2 activation, but completely omits checking S1's cooldown status.
* **Impact**: Incomplete compliance with the acceptance criteria.

---

## 3. Selector Analysis

The CSS selectors used in test 20c are robust:
- `button:has-text("Add Antigravity")` successfully targets the main sidebar action button.
- `.modal-footer button:has-text("Done")` correctly and uniquely targets the Done action on the Add Google Account modal.
- `.session-table .table-row:not(.table-head)` filters the correct table rows.

---

## 4. Recommendations and Proposed Fixes

To fix the failures and ensure complete robustness, the test implementation should be adjusted. Below is the proposed before-and-after diff.

### Diff Patch Proposal for `tests/antiquotar.spec.ts`

```diff
<<<<
  test('20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await addSession(page, { inbox: 's=1', domain: 'google.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            { id: 's1', label: 'S1', domain: 'google.com', quotaUsed: 85, quotaLimit: 100 },
            { id: 's2', label: 'S2', domain: 'google.com', quotaUsed: 10, quotaLimit: 100 }
          ]
        })
      });
    });

    await page.click('button:has-text("Add Antigravity")');
    await page.click('.modal-footer button:has-text("Done")');

    const s2Row = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' });
    await expect(s2Row).toContainText('google.com');

    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');

    await expect(async () => {
      const logs = await page.locator('.log-list .log-item p').allTextContents();
      expect(logs.some(l => l.includes('Synchronized 1 session(s) from LS Gateway.'))).toBeTruthy();
      expect(logs.some(l => l.includes('Automatically imported 1 new session(s) from LS Gateway.'))).toBeTruthy();
      expect(logs.some(l => l.includes('Auto-rotated to S2 after quota check.'))).toBeTruthy();
    }).toPass();
  });
====
  test('20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await addSession(page, { inbox: 's=1', domain: 'google.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    await page.unroute('**/v1/**');
    // Mock the Google Login flow trigger
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({ status: 200 });
    });
    // Mock the accounts endpoint returned from the LS Gateway
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            { id: 's1', label: 'S1', domain: 'google.com', quotaUsed: 85, quotaLimit: 100 },
            { id: 's2', label: 'S2', domain: 'google.com', quotaUsed: 10, quotaLimit: 100 }
          ]
        })
      });
    });

    await page.click('button:has-text("Add Antigravity")');
    await page.click('.modal-footer button:has-text("Done")');

    // Verify S2 is successfully imported
    const s2Row = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' });
    await expect(s2Row).toContainText('google.com');

    // Verify S2 becomes active
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');

    // Verify S1 enters cooldown (Requirements Check)
    const s1Status = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.status');
    await expect(s1Status).toHaveText('Cooldown');

    // Verify logs updated correctly (React state logs contain React's rotation messages)
    await expect(async () => {
      const logs = await page.locator('.log-list .log-item p').allTextContents();
      expect(logs.some(l => l.includes('Synchronized 1 session(s) from LS Gateway.'))).toBeTruthy();
      expect(logs.some(l => l.includes('Automatically imported 1 new session(s) from LS Gateway.'))).toBeTruthy();
      expect(logs.some(l => l.includes('Auto-rotated active session from S1 to S2'))).toBeTruthy();
    }).toPass();
  });
>>>>
```
