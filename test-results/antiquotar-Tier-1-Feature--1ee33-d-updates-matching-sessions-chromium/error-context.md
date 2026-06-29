# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: antiquotar.spec.ts >> Tier 1: Feature Coverage >> 17. Run Check with endpoint URL calls LS Gateway API and updates matching sessions
- Location: tests\antiquotar.spec.ts:351:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.quota-cell')
Expected substring: "60%"
Received string:    "10%"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.quota-cell')
    14 × locator resolved to <span class="quota-cell">…</span>
       - unexpected value "10%"

```

```yaml
- text: 10%
```

# Test source

```ts
  276 |     // Shortest remaining cooldown first: S2 (5m) then S1 (10m)
  277 |     expect(queueItems[0]).toBe('S2');
  278 |     expect(queueItems[1]).toBe('S1');
  279 |   });
  280 | 
  281 |   test('14. Quick Cooldown button applies default cooldown minutes to selected session', async ({ page }) => {
  282 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
  283 |     await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
  284 |     await page.click('.quick-actions button:has-text("Cooldown")');
  285 | 
  286 |     // Verify session status is cooldown
  287 |     const statusText = await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.status').textContent();
  288 |     expect(statusText).toBe('Cooldown');
  289 |   });
  290 | 
  291 |   test('15. Cooldown auto-expiry ticks and restores expired cooldown session to active queue', async ({ page }) => {
  292 |     // Write custom state to localStorage with a session whose cooldown expires in 4 seconds
  293 |     const expTime = new Date(Date.now() + 4000).toISOString();
  294 |     const mockState = {
  295 |       sessions: [
  296 |         {
  297 |           id: 'temp-1',
  298 |           label: 'Temp Session',
  299 |           domain: 'temp.com',
  300 |           cookieName: 's',
  301 |           cookieValue: 's=temp',
  302 |           cookieCount: 1,
  303 |           quotaUsed: 10,
  304 |           quotaLimit: 100,
  305 |           cooldownUntil: expTime,
  306 |           createdAt: new Date().toISOString(),
  307 |           lastChecked: new Date().toISOString(),
  308 |           status: 'cooldown',
  309 |           notes: ''
  310 |         }
  311 |       ],
  312 |       activeId: 'temp-1',
  313 |       settings: {
  314 |         autoRotate: false,
  315 |         rotateThreshold: 80,
  316 |         cooldownMinutes: 8,
  317 |         lsEndpoint: '',
  318 |         storeRawCookie: true
  319 |       },
  320 |       logs: []
  321 |     };
  322 | 
  323 |     await page.addInitScript((state) => {
  324 |       localStorage.setItem('antiquotar-control-state-v1', JSON.stringify(state));
  325 |     }, mockState);
  326 |     await page.reload();
  327 | 
  328 |     // Verify S1 initially shows cooldown
  329 |     await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Cooldown');
  330 | 
  331 |     // Wait for 4.2 seconds for ticks to auto-expire it
  332 |     await page.waitForTimeout(4200);
  333 | 
  334 |     // Verify status returns to healthy
  335 |     await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Healthy');
  336 |   });
  337 | 
  338 |   test('16. Run Check with empty gateway URL refreshes from local state and logs success', async ({ page }) => {
  339 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
  340 |     
  341 |     // Clear LS Endpoint in control panel
  342 |     await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
  343 |     await page.fill('#control-ls-endpoint-input', '');
  344 | 
  345 |     await page.click('button:has-text("Run Check")');
  346 | 
  347 |     const log = page.locator('.log-list .log-item p').first();
  348 |     await expect(log).toHaveText('Quota state refreshed from local session values.');
  349 |   });
  350 | 
  351 |   test('17. Run Check with endpoint URL calls LS Gateway API and updates matching sessions', async ({ page }) => {
  352 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
  353 |     
  354 |     // Mock LS Endpoint API response
  355 |     await page.unroute('**/v1/**');
  356 |     await page.route('**/v1/accounts', async (route) => {
  357 |       await route.fulfill({
  358 |         status: 200,
  359 |         contentType: 'application/json',
  360 |         body: JSON.stringify({
  361 |           sessions: [
  362 |             {
  363 |               domain: 'a.com',
  364 |               quotaUsed: 60,
  365 |               quotaLimit: 100
  366 |             }
  367 |           ]
  368 |         })
  369 |       });
  370 |     });
  371 | 
  372 |     await page.click('button:has-text("Run Check")');
  373 | 
  374 |     // Verify used quota updated to 60%
  375 |     const quotaCell = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.quota-cell');
> 376 |     await expect(quotaCell).toContainText('60%');
      |                             ^ Error: expect(locator).toContainText(expected) failed
  377 |   });
  378 | 
  379 |   test('18. Run Check logs warning when LS Gateway API returns non-200 status', async ({ page }) => {
  380 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
  381 | 
  382 |     await page.unroute('**/v1/**');
  383 |     await page.route('**/v1/accounts', async (route) => {
  384 |       await route.fulfill({ status: 500 });
  385 |     });
  386 | 
  387 |     await page.click('button:has-text("Run Check")');
  388 | 
  389 |     const log = page.locator('.log-list .log-item p').first();
  390 |     await expect(log).toHaveText('LS endpoint returned error status: 500');
  391 |   });
  392 | 
  393 |   test('19. State is saved reactively and reloaded on page refresh from localStorage', async ({ page }) => {
  394 |     await addSession(page, { inbox: 's=1', domain: 'persisted.com', label: 'PersistSession', format: 'header' });
  395 |     await page.reload();
  396 | 
  397 |     const row = page.locator('.session-table .table-row:not(.table-head)');
  398 |     await expect(row).toContainText('persisted.com');
  399 |   });
  400 | 
  401 |   test('20. LS Gateway sync logs success for multiple synchronized sessions', async ({ page }) => {
  402 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
  403 |     await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header' });
  404 | 
  405 |     await page.unroute('**/v1/**');
  406 |     await page.route('**/v1/accounts', async (route) => {
  407 |       await route.fulfill({
  408 |         status: 200,
  409 |         contentType: 'application/json',
  410 |         body: JSON.stringify({
  411 |           sessions: [
  412 |             { domain: 'a.com', quotaUsed: 10 },
  413 |             { domain: 'b.com', quotaUsed: 20 }
  414 |           ]
  415 |         })
  416 |       });
  417 |     });
  418 | 
  419 |     await page.click('button:has-text("Run Check")');
  420 | 
  421 |     // Wait for the asynchronous react state updates and logs to post
  422 |     await expect(async () => {
  423 |       const logs = await page.locator('.log-list .log-item p').allTextContents();
  424 |       expect(logs.some(l => l.includes('Synchronized 2 session(s) from LS Gateway.'))).toBeTruthy();
  425 |     }).toPass();
  426 |   });
  427 | 
  428 |   test('20a. Add Antigravity triggers login flow successfully', async ({ page }) => {
  429 |     await page.unroute('**/v1/**');
  430 |     await page.route('**/v1/auth/login', async (route) => {
  431 |       await route.fulfill({ status: 200 });
  432 |     });
  433 |     await page.route('**/v1/accounts', async (route) => {
  434 |       await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  435 |     });
  436 | 
  437 |     await page.click('button:has-text("Add Antigravity")');
  438 | 
  439 |     const logs = await page.locator('.log-list .log-item p').allTextContents();
  440 |     expect(logs.some(l => l.includes('Initiating Google Login flow via Antigravity LS Gateway...'))).toBeTruthy();
  441 |     expect(logs.some(l => l.includes('Authentication browser window requested. Please log in on the opened tab.'))).toBeTruthy();
  442 | 
  443 |     await expect(page.locator('.modal-header h2')).toContainText('Add Google Account');
  444 | 
  445 |     await page.click('.modal-footer button:has-text("Done")');
  446 |     await expect(page.locator('.modal-header h2')).toHaveCount(0);
  447 |   });
  448 | 
  449 |   test('20b. Add Antigravity handles login flow failure gracefully', async ({ page }) => {
  450 |     await page.unroute('**/v1/**');
  451 |     await page.route('**/v1/auth/login', async (route) => {
  452 |       await route.fulfill({ status: 500 });
  453 |     });
  454 | 
  455 |     await page.click('button:has-text("Add Antigravity")');
  456 | 
  457 |     const logs = await page.locator('.log-list .log-item p').allTextContents();
  458 |     expect(logs.some(l => l.includes('Initiating Google Login flow via Antigravity LS Gateway...'))).toBeTruthy();
  459 |     expect(logs.some(l => l.includes('Failed to initiate login flow from LS Gateway.'))).toBeTruthy();
  460 | 
  461 |     await expect(page.locator('.modal-header h2')).toContainText('Add Google Account');
  462 |   });
  463 | 
  464 |   test('20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high', async ({ page }) => {
  465 |     await page.evaluate(() => localStorage.clear());
  466 |     await page.reload();
  467 | 
  468 |     await addSession(page, { inbox: 's=1', domain: 'google.com', label: 'S1', format: 'header', used: 10, limit: 100 });
  469 |     
  470 |     await page.check('#settings-auto-rotate-input');
  471 |     await setSliderValue(page, '#settings-rotate-threshold-input', '80');
  472 | 
  473 |     await page.unroute('**/v1/**');
  474 |     await page.route('**/v1/auth/login', async (route) => {
  475 |       await route.fulfill({ status: 200 });
  476 |     });
```