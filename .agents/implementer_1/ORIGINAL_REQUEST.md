## 2026-06-26T07:23:21Z
Please set up and configure Playwright E2E tests for AntiQuotar, and write the comprehensive test suite according to the following instructions.

1. **Install Playwright**:
   - Run `npm install -D @playwright/test`
   - Run `npx playwright install chromium` to install the Chromium browser binary.

2. **Configure playwright.config.ts**:
   - Create `playwright.config.ts` in the project root.
   - Configure it to target `http://127.0.0.1:5173/`.
   - Set up the `webServer` property to automatically start the application using `npm run dev` on port 5173. Ensure it has `reuseExistingServer: !process.env.CI`.

3. **Implement E2E Test Suite in `tests/antiquotar.spec.ts`**:
   Implement exactly (or more than) the 49 test cases described below. Use parameterized tests (e.g. `test.describe` or arrays with `test` calls) to keep the code concise and clean while ensuring each case is registered as an independent test.

   - **Tier 1: Feature Coverage (>=20 test cases)**
     1. Import header format cookie (assert preview count, success log, input reset).
     2. Import Netscape format cookie (assert preview count, success log, input reset).
     3. Import JSON format cookie (assert preview count, success log, input reset).
     4. Select format input dropdown reactively updates preview count text.
     5. Successful import adds session to sessions table and activeId if empty.
     6. Manual rotation switches active session to next best candidate.
     7. Auto-rotation switches session immediately when quota usage exceeds threshold.
     8. Auto-rotation does not switch session if auto-rotate settings is disabled.
     9. Next candidate selection logic chooses healthy session status over watch status.
     10. Next candidate selection logic chooses lowest quota usage percent session.
     11. Queue list sorting prioritized by status rank (healthy > watch > high > critical > cooldown).
     12. Queue list sorting prioritized by quota usage percent for non-cooldown sessions.
     13. Queue list sorting prioritized by shortest remaining cooldown time for cooldown sessions.
     14. Quick Cooldown button applies default cooldown minutes to selected session.
     15. Cooldown auto-expiry ticks and restores expired cooldown session to active queue.
     16. Run Check with empty gateway URL refreshes from local state and logs success.
     17. Run Check with endpoint URL calls LS Gateway API and updates matching sessions.
     18. Run Check logs warning when LS Gateway API returns non-200 status.
     19. State is saved reactively and reloaded on page refresh from localStorage.
     20. LS Gateway sync logs success for multiple synchronized sessions.

   - **Tier 2: Boundary & Corner Cases (>=20 test cases)**
     21. Import with empty textarea logs validation error.
     22. Import with empty domain input logs validation error.
     23. Import with invalid JSON format logs parsing error.
     24. Import with invalid Netscape format logs parsing error.
     25. Import with invalid Header format logs parsing error.
     26. Manual rotation when no healthy candidate is available logs warning and doesn't change active.
     27. Auto-rotation threshold slider at 0% rotates immediately on any usage > 0.
     28. Auto-rotation threshold slider at 100% does not rotate at 100% unless status is cooldown.
     29. Slider rotate threshold boundary values (1% and 99%).
     30. Rotation on a single-session queue does not rotate (active remains the same).
     31. Apply cooldown of 0 minutes clears cooldown status.
     32. Input session cooldown value of negative numbers behaves as 0.
     33. Manual cooldown input in control panel updates status correctly.
     34. Active session put into cooldown triggers immediate rotation.
     35. Promoting a session shifts it to the top of the queue or makes it active.
     36. LS Gateway API returns empty sessions list logs warning.
     37. LS Gateway API connection failure (network error) logs connection warning.
     38. LS Gateway API returns malformed JSON payload logs parsing warning.
     39. Corrupted localStorage state handles gracefully on reload.
     40. UI settings controls (like LS endpoint inputs) are persisted and restored on reload.

   - **Tier 3: Cross-Feature Combinations (>=4 test cases)**
     41. Import new cookie session -> verifies it is automatically sorted into correct queue rank based on quota (Import + Queue Ordering).
     42. Manual cooldown of active session -> triggers auto-rotation to find best candidate (Cooldown + Rotation).
     43. Run Check sync -> updates quota of active session past threshold -> triggers auto-rotation immediately (Sync + Auto-rotation).
     44. Import new cookie session -> promote it to active -> trigger cooldown -> verify it rotates to the other session (Import + Promote + Cooldown + Rotation).

   - **Tier 4: Real-World Scenarios (>=5 test cases)**
     45. Scenario 1 (Auto-rotation and Best Candidate Recovery): Queue has 3 sessions. Sync shows active session usage > threshold. Auto-rotates to best candidate. Old session enters cooldown. After simulated cooldown expiry, the old session returns to active queue.
     46. Scenario 2 (Bulk Operations & Persistence check): Clear state -> Import 3 separate cookie formats -> Verify preview and import -> Modify rotation threshold and enable auto-rotate -> Reload page -> Verify state and active session are persisted correctly.
     47. Scenario 3 (LS Gateway Error Handling & Recovery): Setup gateway with error mock -> Run Check -> Verify connection warning log -> Change mock to healthy response -> Run Check -> Verify success log and updated session values.
     48. Scenario 4 (Multi-session Rotation Exhaustion): 3 sessions. Auto-rotate threshold is 80%. System rotates from session 1 to 2 when 1 exceeds 80%. Then to 3 when 2 exceeds. When all exceed, manual/auto-rotate logs warning that no candidates are available.
     49. Scenario 5 (Promote, Cooldown & Complex sorting): Multiple sessions. Promote a cooldown session -> verify promote clears cooldown/sets active. Apply manual cooldowns of differing durations -> verify queue list sorts cooldown sessions by remaining time.

4. **Verify Execution**:
   - Run `npx playwright test` to verify everything works and all tests pass.
   - Report the command execution log and test outcomes.

## 2026-06-26T14:33:25Z
Please modify `tests/antiquotar.spec.ts` to resolve the race condition/timing issue in E2E tests where the active React application can overwrite `localStorage` before a page reload or navigation occurs.

Use Playwright's `page.addInitScript` to safely populate and manage localStorage state across page reloads and navigations.
Specifically:
1. In `beforeEach`, register an init script to clear localStorage, then navigate to `/`:
   ```typescript
   test.beforeEach(async ({ page }) => {
     await page.addInitScript(() => {
       localStorage.clear();
     });
     await page.goto('/');
   });
   ```
2. In Test 15, instead of setting localStorage via `page.evaluate` and reloading, use `page.addInitScript` to set the state and then reload:
   ```typescript
   await page.addInitScript((state) => {
     localStorage.setItem('antiquotar-control-state-v1', JSON.stringify(state));
   }, mockState);
   await page.reload();
   ```
3. In Test 45, do the same when updating localStorage programmatically:
   ```typescript
   await page.addInitScript((updatedState) => {
     localStorage.setItem('antiquotar-control-state-v1', JSON.stringify(updatedState));
   }, state);
   await page.reload();
   ```
4. Review and update other test cases that clear or write to localStorage (like Test 29, 39, 46) to use the `page.addInitScript` + reload pattern to ensure they are 100% race-condition free under heavy execution loads.

After implementing these fixes, run the build using `npm run build` and execute the full E2E test suite using `npx playwright test` to verify that all 49 tests compile and pass successfully.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

