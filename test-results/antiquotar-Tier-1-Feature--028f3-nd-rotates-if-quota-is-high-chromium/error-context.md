# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: antiquotar.spec.ts >> Tier 1: Feature Coverage >> 20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high
- Location: tests\antiquotar.spec.ts:464:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false

Call Log:
- Test timeout of 30000ms exceeded
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e6]
      - generic [ref=e9]: AntiQuotar Control
    - navigation "Main" [ref=e10]:
      - link "Dashboard" [ref=e11] [cursor=pointer]:
        - /url: "#dashboard"
        - img [ref=e12]
        - text: Dashboard
      - link "Cookies" [ref=e17] [cursor=pointer]:
        - /url: "#cookies"
        - img [ref=e18]
        - text: Cookies
      - link "Sessions" [ref=e20] [cursor=pointer]:
        - /url: "#sessions"
        - img [ref=e21]
        - text: Sessions
      - link "Rotation Queue" [ref=e24] [cursor=pointer]:
        - /url: "#rotation"
        - img [ref=e25]
        - text: Rotation Queue
      - link "Quota Monitor" [ref=e28] [cursor=pointer]:
        - /url: "#quota"
        - img [ref=e29]
        - text: Quota Monitor
      - link "Rules" [ref=e32] [cursor=pointer]:
        - /url: "#rules"
        - img [ref=e33]
        - text: Rules
      - link "Logs" [ref=e34] [cursor=pointer]:
        - /url: "#logs"
        - img [ref=e35]
        - text: Logs
    - button "Add Antigravity" [ref=e40] [cursor=pointer]:
      - img [ref=e41]
      - text: Add Antigravity
    - generic [ref=e42]:
      - strong [ref=e44]: Local Mode
      - paragraph [ref=e45]: Data path
      - code [ref=e46]: browser localStorage
  - main [ref=e47]:
    - generic [ref=e48]:
      - generic [ref=e49]:
        - paragraph [ref=e50]: CMS control for manual cookies and quota rotation
        - heading "AntiQuotar Control" [level=1] [ref=e51]
      - generic [ref=e52]:
        - generic [ref=e53]: "Service: Local (Bridge Online)"
        - button "Run Check" [ref=e55] [cursor=pointer]:
          - img [ref=e56]
          - text: Run Check
        - button "Rotate Now" [ref=e58] [cursor=pointer]:
          - img [ref=e59]
          - text: Rotate Now
        - button "Settings" [ref=e62] [cursor=pointer]:
          - img [ref=e63]
    - note [ref=e66]:
      - img [ref=e67]
      - generic [ref=e69]:
        - strong [ref=e70]: No Chrome profile scraping.
        - generic [ref=e71]: Paste cookies you control from Chrome DevTools or an export file. AntiQuotar does not read Chrome profiles.
      - button "Copy Path" [ref=e72] [cursor=pointer]:
        - img [ref=e73]
        - text: Copy Path
    - generic [ref=e76]:
      - generic [ref=e77]:
        - generic [ref=e78]:
          - generic [ref=e79]:
            - heading "Cookie Inbox" [level=2] [ref=e80]:
              - img [ref=e81]
              - text: Cookie Inbox
            - paragraph [ref=e85]: Paste from Chrome DevTools
          - generic [ref=e86]: 0 parsed
        - generic [ref=e87]:
          - textbox "Cookie Inbox" [ref=e88]:
            - /placeholder: "Cookie: sessionid=...; account=...; device=..."
          - generic [ref=e89]:
            - generic [ref=e90]:
              - generic [ref=e91]: Domain
              - textbox "Domain" [ref=e92]:
                - /placeholder: e.g. chat.openai.com
            - generic [ref=e93]:
              - generic [ref=e94]: Name
              - textbox "Name" [ref=e95]:
                - /placeholder: coding-main
            - generic [ref=e96]:
              - generic [ref=e97]: Import Format
              - combobox "Import Format" [ref=e98]:
                - option "Header string" [selected]
                - option "Netscape"
                - option "JSON"
            - generic [ref=e99]:
              - generic [ref=e100]:
                - generic [ref=e101]: Used
                - spinbutton "Used" [ref=e102]: "0"
              - generic [ref=e103]:
                - generic [ref=e104]: Limit
                - spinbutton "Limit" [ref=e105]: "10000"
            - generic [ref=e106]:
              - checkbox "Store raw cookie locally" [checked] [ref=e107]
              - text: Store raw cookie locally
            - button "Add Cookie" [ref=e108] [cursor=pointer]:
              - img [ref=e109]
              - text: Add Cookie
      - generic [ref=e110]:
        - generic [ref=e111]:
          - generic [ref=e112]:
            - heading "Quota Monitor" [level=2] [ref=e113]:
              - img [ref=e114]
              - text: Quota Monitor
            - paragraph [ref=e116]: Overall quota usage
          - strong [ref=e117]: 85%
        - generic "85% quota used" [ref=e118]
        - generic [ref=e120]:
          - generic [ref=e121]: 170 used
          - generic [ref=e122]: 200 limit
        - generic [ref=e123]:
          - generic [ref=e124]:
            - generic [ref=e125]: Healthy
            - strong [ref=e126]: "0"
          - generic [ref=e127]:
            - generic [ref=e128]: High
            - strong [ref=e129]: "1"
          - generic [ref=e130]:
            - generic [ref=e131]: Critical
            - strong [ref=e132]: "0"
          - generic [ref=e133]:
            - generic [ref=e134]: Cooldown
            - strong [ref=e135]: "1"
        - generic [ref=e136]:
          - generic [ref=e137]:
            - generic [ref=e138]: Auto-rotate
            - checkbox "Auto-rotate" [checked] [ref=e139]
          - generic [ref=e140]:
            - generic [ref=e141]: Threshold 80%
            - slider "Threshold 80%" [ref=e142]: "80"
      - generic [ref=e143]:
        - generic [ref=e144]:
          - generic [ref=e145]:
            - heading "Active Session" [level=2] [ref=e146]:
              - img [ref=e147]
              - text: Active Session
            - paragraph [ref=e150]: S2
          - generic [ref=e151]: High
        - generic [ref=e152]:
          - generic [ref=e153]:
            - generic [ref=e154]: Domain
            - strong [ref=e155]: google.com
          - generic [ref=e156]:
            - generic [ref=e157]: Cookie
            - strong [ref=e158]: imported_cookie
          - generic [ref=e159]:
            - generic [ref=e160]: Stored value
            - strong [ref=e161]: import...ateway
          - generic [ref=e162]:
            - generic [ref=e163]: Last checked
            - strong [ref=e164]: Jun 29, 11:05 AM
        - generic [ref=e165]:
          - generic "85% quota used" [ref=e166]
          - strong [ref=e168]: 85% (85 / 100)
        - generic [ref=e169]:
          - generic [ref=e170]:
            - img [ref=e171]
            - textbox [ref=e174]:
              - /placeholder: Filter sessions
          - button "Export" [ref=e175] [cursor=pointer]:
            - img [ref=e176]
            - text: Export
        - table "Cookie sessions" [ref=e179]:
          - row "Domain Quota Status Cooldown Action" [ref=e180]:
            - generic [ref=e181]: Domain
            - generic [ref=e182]: Quota
            - generic [ref=e183]: Status
            - generic [ref=e184]: Cooldown
            - generic [ref=e185]: Action
          - row "google.com S1 85% quota used 85% Cooldown 300m Set active Remove" [ref=e186]:
            - generic [ref=e187]:
              - img [ref=e188]
              - strong [ref=e193]: google.com
              - generic [ref=e194]: S1
            - generic [ref=e195]:
              - generic "85% quota used" [ref=e196]
              - text: 85%
            - generic [ref=e199]: Cooldown
            - generic [ref=e200]: 300m
            - generic [ref=e201]:
              - button "Set active" [ref=e202] [cursor=pointer]:
                - img [ref=e203]
              - button "Remove" [ref=e205] [cursor=pointer]:
                - img [ref=e206]
          - row "google.com S2 85% quota used 85% High - Set active Remove" [ref=e209]:
            - generic [ref=e210]:
              - img [ref=e211]
              - strong [ref=e216]: google.com
              - generic [ref=e217]: S2
            - generic [ref=e218]:
              - generic "85% quota used" [ref=e219]
              - text: 85%
            - generic [ref=e222]: High
            - generic [ref=e223]: "-"
            - generic [ref=e224]:
              - button "Set active" [ref=e225] [cursor=pointer]:
                - img [ref=e226]
              - button "Remove" [ref=e228] [cursor=pointer]:
                - img [ref=e229]
      - generic [ref=e232]:
        - generic [ref=e233]:
          - generic [ref=e234]:
            - heading "Rotation Queue" [level=2] [ref=e235]:
              - img [ref=e236]
              - text: Rotation Queue
            - paragraph [ref=e241]: Auto-rotate enabled
          - button "Rotate" [ref=e242] [cursor=pointer]:
            - img [ref=e243]
            - text: Rotate
        - list [ref=e246]:
          - listitem [ref=e247]:
            - generic [ref=e248]: "1"
            - generic [ref=e249]:
              - strong [ref=e250]: S2
              - generic [ref=e251]: google.com · 85% used
            - emphasis [ref=e252]: High
            - button "Promote" [ref=e253] [cursor=pointer]:
              - text: Promote
              - img [ref=e254]
          - listitem [ref=e256]:
            - generic [ref=e257]: "2"
            - generic [ref=e258]:
              - strong [ref=e259]: S1
              - generic [ref=e260]: google.com · 85% used
            - emphasis [ref=e261]: 300m left
            - button "Promote" [ref=e262] [cursor=pointer]:
              - text: Promote
              - img [ref=e263]
        - generic [ref=e265]:
          - button "Cooldown" [ref=e266] [cursor=pointer]:
            - img [ref=e267]
            - text: Cooldown
          - button "Clear" [ref=e270] [cursor=pointer]:
            - img [ref=e271]
            - text: Clear
      - generic [ref=e274]:
        - generic [ref=e275]:
          - generic [ref=e276]:
            - heading "Session Control" [level=2] [ref=e277]:
              - img [ref=e278]
              - text: Session Control
            - paragraph [ref=e279]: S2
          - img [ref=e280]
        - generic [ref=e283]:
          - generic [ref=e284]:
            - generic [ref=e285]: Quota Used
            - spinbutton "Quota Used" [ref=e286]: "85"
          - generic [ref=e287]:
            - generic [ref=e288]: Quota Limit
            - spinbutton "Quota Limit" [ref=e289]: "100"
          - generic [ref=e290]:
            - generic [ref=e291]: Cooldown Minutes
            - spinbutton "Cooldown Minutes" [ref=e292]: "0"
          - generic [ref=e293]:
            - generic [ref=e294]: LS Endpoint
            - textbox "LS Endpoint" [ref=e295]: http://127.0.0.1:5188/v1/accounts
        - generic [ref=e296]:
          - textbox "Paste AntiQuotar JSON export" [ref=e297]
          - button "Import" [ref=e298] [cursor=pointer]:
            - img [ref=e299]
            - text: Import
      - generic [ref=e302]:
        - generic [ref=e303]:
          - generic [ref=e304]:
            - heading "Logs" [level=2] [ref=e305]:
              - img [ref=e306]
              - text: Logs
            - paragraph [ref=e310]: Recent local activity
          - button "Clear logs" [ref=e311] [cursor=pointer]:
            - img [ref=e312]
        - generic [ref=e315]:
          - generic [ref=e316]:
            - generic [ref=e317]: 11:05 AM
            - paragraph [ref=e318]: Synchronized 2 session(s) from LS Gateway.
          - generic [ref=e319]:
            - generic [ref=e320]: 11:05 AM
            - paragraph [ref=e321]: "Auto-rotated active session from S1 to S2 (quota: 85%)."
          - generic [ref=e322]:
            - generic [ref=e323]: 11:05 AM
            - paragraph [ref=e324]: Authentication browser window requested. Please log in on the opened tab.
          - generic [ref=e325]:
            - generic [ref=e326]: 11:05 AM
            - paragraph [ref=e327]: Initiating Google Login flow via Antigravity LS Gateway...
          - generic [ref=e328]:
            - generic [ref=e329]: 11:05 AM
            - paragraph [ref=e330]: Added 1 cookie pair(s) for google.com.
          - generic [ref=e331]:
            - generic [ref=e332]: 11:05 AM
            - paragraph [ref=e333]: Control panel ready. Cookie data stays in this browser profile.
    - generic [ref=e334]:
      - generic [ref=e335]:
        - img [ref=e336]
        - text: Safe local storage
      - generic [ref=e339]:
        - img [ref=e340]
        - text: 2 sessions
      - generic [ref=e342]:
        - img [ref=e343]
        - text: Auto-saved
```

# Test source

```ts
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
  477 |     await page.route('**/v1/accounts', async (route) => {
  478 |       await route.fulfill({
  479 |         status: 200,
  480 |         contentType: 'application/json',
  481 |         body: JSON.stringify({
  482 |           sessions: [
  483 |             { id: 's1', label: 'S1', domain: 'google.com', quotaUsed: 85, quotaLimit: 100 },
  484 |             { id: 's2', label: 'S2', domain: 'google.com', quotaUsed: 10, quotaLimit: 100 }
  485 |           ]
  486 |         })
  487 |       });
  488 |     });
  489 | 
  490 |     await page.click('button:has-text("Add Antigravity")');
  491 |     await page.click('.modal-footer button:has-text("Done")');
  492 | 
  493 |     const s2Row = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' });
  494 |     await expect(s2Row).toContainText('google.com');
  495 | 
  496 |     await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  497 | 
  498 |     const s1Status = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.status');
  499 |     await expect(s1Status).toHaveText('Cooldown');
  500 | 
  501 |     await expect(async () => {
  502 |       const logs = await page.locator('.log-list .log-item p').allTextContents();
  503 |       expect(logs.some(l => l.includes('Synchronized 1 session(s) from LS Gateway.'))).toBeTruthy();
  504 |       expect(logs.some(l => l.includes('Automatically imported 1 new session(s) from LS Gateway.'))).toBeTruthy();
  505 |       expect(logs.some(l => l.includes('Auto-rotated active session from S1 to S2'))).toBeTruthy();
> 506 |     }).toPass();
      |        ^ Error: expect(received).toBeTruthy()
  507 |   });
  508 | 
  509 |   test('20d. Quota model-specific groups sync with local gateway and active account switch is POSTed', async ({ page }) => {
  510 |     await page.evaluate(() => localStorage.clear());
  511 |     await page.reload();
  512 | 
  513 |     let switchPayloads: any[] = [];
  514 |     await page.unroute('**/v1/**');
  515 |     await page.route('**/v1/accounts/active', async (route) => {
  516 |       switchPayloads.push(route.request().postDataJSON());
  517 |       await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
  518 |     });
  519 | 
  520 |     await page.route('**/v1/accounts', async (route) => {
  521 |       await route.fulfill({
  522 |         status: 200,
  523 |         contentType: 'application/json',
  524 |         body: JSON.stringify({
  525 |           sessions: [
  526 |             {
  527 |               id: 's1@gmail.com',
  528 |               label: 's1@gmail.com',
  529 |               domain: 'google.com',
  530 |               quotaUsed: 10,
  531 |               quotaLimit: 100,
  532 |               quotaGroups: [
  533 |                 {
  534 |                   name: 'Gemini Models',
  535 |                   weekly: { percentage: 86, resetText: 'Weekly Limit 86%' },
  536 |                   fiveHour: { percentage: 19, resetText: 'Five Hour Limit 19%' }
  537 |                 },
  538 |                 {
  539 |                   name: 'Claude and GPT models',
  540 |                   weekly: { percentage: 29, resetText: 'Weekly Limit 29%' },
  541 |                   fiveHour: { percentage: 100, resetText: '' }
  542 |                 }
  543 |               ]
  544 |             },
  545 |             {
  546 |               id: 's2@gmail.com',
  547 |               label: 's2@gmail.com',
  548 |               domain: 'google.com',
  549 |               quotaUsed: 20,
  550 |               quotaLimit: 100,
  551 |               quotaGroups: null
  552 |             }
  553 |           ]
  554 |         })
  555 |       });
  556 |     });
  557 | 
  558 |     // Sync S1 and S2
  559 |     await page.click('button:has-text("Add Antigravity")');
  560 |     await page.click('.modal-footer button:has-text("Done")');
  561 | 
  562 |     // Click S1 row in session table to select it and show its details
  563 |     await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 's1@gmail.com' }).click();
  564 | 
  565 |     // Verify detailed progress rings are rendered correctly
  566 |     await expect(page.locator('.quota-groups-list')).toBeVisible();
  567 |     await expect(page.locator('.quota-groups-list')).toContainText('Gemini Models');
  568 |     await expect(page.locator('.quota-groups-list')).toContainText('86%');
  569 |     await expect(page.locator('.quota-groups-list')).toContainText('19%');
  570 |     await expect(page.locator('.quota-groups-list')).toContainText('Claude and GPT models');
  571 |     await expect(page.locator('.quota-groups-list')).toContainText('29%');
  572 |     await expect(page.locator('.quota-groups-list')).toContainText('100%');
  573 | 
  574 |     // Trigger active session switch by clicking "Rotate Now"
  575 |     await page.click('button:has-text("Rotate Now")');
  576 |     await page.click('button:has-text("Rotate Now")');
  577 | 
  578 |     // Wait and assert that the POST switch payload was sent for s2@gmail.com
  579 |     await expect(async () => {
  580 |       expect(switchPayloads.some(p => p && p.email === 's2@gmail.com')).toBeTruthy();
  581 |     }).toPass();
  582 |   });
  583 | 
  584 | });
  585 | 
  586 | test.describe('Tier 2: Boundary & Corner Cases', () => {
  587 | 
  588 |   test('21. Import with empty textarea logs validation error', async ({ page }) => {
  589 |     await page.fill('#cookie-inbox-input', '');
  590 |     await page.fill('#cookie-domain-input', 'google.com');
  591 |     await page.click('button:has-text("Add Cookie")');
  592 | 
  593 |     const log = page.locator('.log-list .log-item p').first();
  594 |     await expect(log).toHaveText('No cookie pairs were detected in the inbox.');
  595 |   });
  596 | 
  597 |   test('22. Import with empty domain input logs validation error', async ({ page }) => {
  598 |     await page.fill('#cookie-inbox-input', 'sessionid=123');
  599 |     await page.fill('#cookie-domain-input', '');
  600 |     await page.click('button:has-text("Add Cookie")');
  601 | 
  602 |     const log = page.locator('.log-list .log-item p').first();
  603 |     await expect(log).toHaveText('Domain is required before adding a cookie session.');
  604 |   });
  605 | 
  606 |   test('23. Import with invalid JSON format logs parsing error', async ({ page }) => {
```