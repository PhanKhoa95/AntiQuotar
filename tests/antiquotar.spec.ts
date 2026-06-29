import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Helper to add a session
async function addSession(page, { inbox, domain, label, format, used, limit }) {
  await page.fill('#cookie-inbox-input', inbox);
  await page.fill('#cookie-domain-input', domain);
  if (label !== undefined) {
    await page.fill('#cookie-name-input', label);
  }
  if (format !== undefined) {
    await page.selectOption('#cookie-format-input', format);
  }
  if (used !== undefined) {
    await page.fill('#cookie-used-input', String(used));
  }
  if (limit !== undefined) {
    await page.fill('#cookie-limit-input', String(limit));
  }
  await page.click('button:has-text("Add Cookie")');
}

// Helper to programmatically set range slider values in React
async function setSliderValue(page, selector, value) {
  await page.evaluate(({ sel, val }) => {
    const el = document.querySelector(sel) as HTMLInputElement;
    if (el) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, val);
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { sel: selector, val: value });
}

// Helper to clean up localStorage and state
test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  // Block auto-sync requests to local bridge so real data doesn't pollute tests
  await page.route('**/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('beforeEach-cleared')) {
      localStorage.clear();
      sessionStorage.setItem('beforeEach-cleared', 'true');
    }
  });
  await page.goto('/');
});

test.describe('Tier 1: Feature Coverage', () => {

  test('1. Import header format cookie', async ({ page }) => {
    await page.fill('#cookie-inbox-input', 'sessionid=abc123xyz; account=john_doe');
    await page.fill('#cookie-domain-input', 'google.com');
    await page.fill('#cookie-name-input', 'HeaderCookie');
    await page.selectOption('#cookie-format-input', 'header');

    // Assert preview count
    await expect(page.locator('.counter')).toHaveText('2 parsed');

    // Click Add Cookie
    await page.click('button:has-text("Add Cookie")');

    // Assert success log
    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Added 2 cookie pair(s) for google.com.');

    // Assert input reset
    await expect(page.locator('#cookie-inbox-input')).toHaveValue('');
    await expect(page.locator('#cookie-domain-input')).toHaveValue('');
    await expect(page.locator('#cookie-name-input')).toHaveValue('');
  });

  test('2. Import Netscape format cookie', async ({ page }) => {
    const netscapeCookie = 'google.com\tTRUE\t/\tFALSE\t1700000000\tcookieName\tcookieValue';
    await page.fill('#cookie-inbox-input', netscapeCookie);
    await page.fill('#cookie-domain-input', 'google.com');
    await page.fill('#cookie-name-input', 'NetscapeCookie');
    await page.selectOption('#cookie-format-input', 'netscape');

    await expect(page.locator('.counter')).toHaveText('1 parsed');

    await page.click('button:has-text("Add Cookie")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Added 1 cookie pair(s) for google.com.');

    await expect(page.locator('#cookie-inbox-input')).toHaveValue('');
  });

  test('3. Import JSON format cookie', async ({ page }) => {
    const jsonCookie = '[{"name": "jsonCookie", "value": "jsonVal"}]';
    await page.fill('#cookie-inbox-input', jsonCookie);
    await page.fill('#cookie-domain-input', 'google.com');
    await page.fill('#cookie-name-input', 'JsonCookie');
    await page.selectOption('#cookie-format-input', 'json');

    await expect(page.locator('.counter')).toHaveText('1 parsed');

    await page.click('button:has-text("Add Cookie")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Added 1 cookie pair(s) for google.com.');

    await expect(page.locator('#cookie-inbox-input')).toHaveValue('');
  });

  test('4. Select format input dropdown reactively updates preview count text', async ({ page }) => {
    await page.fill('#cookie-inbox-input', '{"a": "b"}');
    
    // Select json format
    await page.selectOption('#cookie-format-input', 'json');
    await expect(page.locator('.counter')).toHaveText('1 parsed');

    // Select netscape format (should fail parsing or return 0 parsed since it does not have 7 tabs)
    await page.selectOption('#cookie-format-input', 'netscape');
    await expect(page.locator('.counter')).toHaveText('0 parsed');
  });

  test('5. Successful import adds session to sessions table and activeId if empty', async ({ page }) => {
    await addSession(page, {
      inbox: 'sessionid=abc123xyz',
      domain: 'google.com',
      label: 'S1',
      format: 'header'
    });

    // Check row added in table
    const row = page.locator('.session-table .table-row:not(.table-head)');
    await expect(row).toContainText('google.com');
    await expect(row).toContainText('S1');

    // Check active session panel
    const activeText = await page.locator('#sessions .panel-heading p').textContent();
    expect(activeText).toBe('S1');
  });

  test('6. Manual rotation switches active session to next best candidate', async ({ page }) => {
    // Add two healthy sessions
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session A', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session B', format: 'header', used: 20, limit: 100 });

    // Active session should be Session A initially (since it was added first when activeId was empty)
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session A');

    // Manual rotation
    await page.click('button:has-text("Rotate Now")');

    // Active session should switch to Session B (next best candidate)
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session B');
  });

  test('7. Auto-rotation switches session immediately when quota usage exceeds threshold', async ({ page }) => {
    // Enable auto-rotate and set threshold to 80
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    // Add active session A and healthy candidate B
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session A', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session B', format: 'header', used: 20, limit: 100 });

    // Select Session A to update it
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'Session A' }).click();

    // Increase Session A used quota to 85 (above threshold of 80)
    await page.fill('#control-used-input', '85');
    
    // Check if auto-rotated to Session B
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session B');
  });

  test('8. Auto-rotation does not switch session if auto-rotate settings is disabled', async ({ page }) => {
    // Disable auto-rotate
    await page.uncheck('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session A', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session B', format: 'header', used: 20, limit: 100 });

    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'Session A' }).click();
    await page.fill('#control-used-input', '85');

    // Session A should remain active
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session A');
  });

  test('9. Next candidate selection logic chooses healthy session status over watch status', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    // Add Session 1 first so it is active. S3: healthy (40%), S2: watch (65%).
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session 1', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session 2', format: 'header', used: 65, limit: 100 });
    await addSession(page, { inbox: 's=3', domain: 'c.com', label: 'Session 3', format: 'header', used: 40, limit: 100 });

    // Select Session 1 and exceed threshold
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'Session 1' }).click();
    await page.fill('#control-used-input', '85');

    // Session 3 (healthy) should be selected over Session 2 (watch)
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session 3');
  });

  test('10. Next candidate selection logic chooses lowest quota usage percent session', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    // Add Session 1 first so it is active. S2: healthy (40%), S3: healthy (10%).
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session 1', format: 'header', used: 20, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session 2', format: 'header', used: 40, limit: 100 });
    await addSession(page, { inbox: 's=3', domain: 'c.com', label: 'Session 3', format: 'header', used: 10, limit: 100 });

    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'Session 1' }).click();
    await page.fill('#control-used-input', '85');

    // Session 3 (lowest usage percent: 10%) should be selected
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session 3');
  });

  test('11. Queue list sorting prioritized by status rank (healthy > watch > high > critical > cooldown)', async ({ page }) => {
    await page.uncheck('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    await addSession(page, { inbox: 's=5', domain: 'e.com', label: 'S5', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=4', domain: 'd.com', label: 'S4', format: 'header', used: 95, limit: 100 }); // critical (>=90)
    await addSession(page, { inbox: 's=3', domain: 'c.com', label: 'S3', format: 'header', used: 85, limit: 100 }); // high (>=80)
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 65, limit: 100 }); // watch (>=60)
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 }); // healthy (<60)

    // Put S5 in cooldown
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S5' }).click();
    await page.click('.quick-actions button:has-text("Cooldown")');

    // Wait a brief moment for state propagation
    const queueItems = await page.locator('.queue-list .queue-item strong').allTextContents();
    // Status rank: healthy (S1) > watch (S2) > high (S3) > critical (S4) > cooldown (S5)
    expect(queueItems[0]).toBe('S1');
    expect(queueItems[1]).toBe('S2');
    expect(queueItems[2]).toBe('S3');
    expect(queueItems[3]).toBe('S4');
    expect(queueItems[4]).toBe('S5');
  });

  test('12. Queue list sorting prioritized by quota usage percent for non-cooldown sessions', async ({ page }) => {
    await addSession(page, { inbox: 's=a', domain: 'a.com', label: 'SA', format: 'header', used: 50, limit: 100 });
    await addSession(page, { inbox: 's=b', domain: 'b.com', label: 'SB', format: 'header', used: 20, limit: 100 });
    await addSession(page, { inbox: 's=c', domain: 'c.com', label: 'SC', format: 'header', used: 35, limit: 100 });

    const queueItems = await page.locator('.queue-list .queue-item strong').allTextContents();
    // Sb (20%) < Sc (35%) < Sa (50%)
    expect(queueItems[0]).toBe('SB');
    expect(queueItems[1]).toBe('SC');
    expect(queueItems[2]).toBe('SA');
  });

  test('13. Queue list sorting prioritized by shortest remaining cooldown time for cooldown sessions', async ({ page }) => {
    await page.uncheck('#settings-auto-rotate-input');
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 10, limit: 100 });

    // Select S1 and set cooldown to 10 minutes
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-cooldown-input', '10');

    // Select S2 and set cooldown to 5 minutes
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' }).click();
    await page.fill('#control-cooldown-input', '5');

    const queueItems = await page.locator('.queue-list .queue-item strong').allTextContents();
    // Shortest remaining cooldown first: S2 (5m) then S1 (10m)
    expect(queueItems[0]).toBe('S2');
    expect(queueItems[1]).toBe('S1');
  });

  test('14. Quick Cooldown button applies default cooldown minutes to selected session', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.click('.quick-actions button:has-text("Cooldown")');

    // Verify session status is cooldown
    const statusText = await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.status').textContent();
    expect(statusText).toBe('Cooldown');
  });

  test('15. Cooldown auto-expiry ticks and restores expired cooldown session to active queue', async ({ page }) => {
    // Write custom state to localStorage with a session whose cooldown expires in 4 seconds
    const expTime = new Date(Date.now() + 4000).toISOString();
    const mockState = {
      sessions: [
        {
          id: 'temp-1',
          label: 'Temp Session',
          domain: 'temp.com',
          cookieName: 's',
          cookieValue: 's=temp',
          cookieCount: 1,
          quotaUsed: 10,
          quotaLimit: 100,
          cooldownUntil: expTime,
          createdAt: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
          status: 'cooldown',
          notes: ''
        }
      ],
      activeId: 'temp-1',
      settings: {
        autoRotate: false,
        rotateThreshold: 80,
        cooldownMinutes: 8,
        lsEndpoint: '',
        storeRawCookie: true
      },
      logs: []
    };

    await page.addInitScript((state) => {
      localStorage.setItem('antiquotar-control-state-v1', JSON.stringify(state));
    }, mockState);
    await page.reload();

    // Verify S1 initially shows cooldown
    await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Cooldown');

    // Wait for 4.2 seconds for ticks to auto-expire it
    await page.waitForTimeout(4200);

    // Verify status returns to healthy
    await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Healthy');
  });

  test('16. Run Check with empty gateway URL refreshes from local state and logs success', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    
    // Clear LS Endpoint in control panel
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-ls-endpoint-input', '');

    await page.click('button:has-text("Run Check")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Quota state refreshed from local session values.');
  });

  test('17. Run Check with endpoint URL calls LS Gateway API and updates matching sessions', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    
    // Mock LS Endpoint API response
    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              domain: 'a.com',
              quotaUsed: 60,
              quotaLimit: 100
            }
          ]
        })
      });
    });

    await page.click('button:has-text("Run Check")');

    // Verify used quota updated to 60%
    const quotaCell = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.quota-cell');
    await expect(quotaCell).toContainText('60%');
  });

  test('18. Run Check logs warning when LS Gateway API returns non-200 status', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.click('button:has-text("Run Check")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('LS endpoint returned error status: 500');
  });

  test('19. State is saved reactively and reloaded on page refresh from localStorage', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'persisted.com', label: 'PersistSession', format: 'header' });
    await page.reload();

    const row = page.locator('.session-table .table-row:not(.table-head)');
    await expect(row).toContainText('persisted.com');
  });

  test('20. LS Gateway sync logs success for multiple synchronized sessions', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header' });

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            { domain: 'a.com', quotaUsed: 10 },
            { domain: 'b.com', quotaUsed: 20 }
          ]
        })
      });
    });

    await page.click('button:has-text("Run Check")');

    // Wait for the asynchronous react state updates and logs to post
    await expect(async () => {
      const logs = await page.locator('.log-list .log-item p').allTextContents();
      expect(logs.some(l => l.includes('Synchronized 2 session(s) from LS Gateway.'))).toBeTruthy();
    }).toPass();
  });

  test('20a. Add Antigravity triggers login flow successfully', async ({ page }) => {
    await page.unroute('**/v1/**');
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({ status: 200 });
    });
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.click('button:has-text("Add Antigravity")');

    const logs = await page.locator('.log-list .log-item p').allTextContents();
    expect(logs.some(l => l.includes('Initiating Google Login flow via Antigravity LS Gateway...'))).toBeTruthy();
    expect(logs.some(l => l.includes('Authentication browser window requested. Please log in on the opened tab.'))).toBeTruthy();

    await expect(page.locator('.modal-header h2')).toContainText('Add Google Account');

    await page.click('.modal-footer button:has-text("Done")');
    await expect(page.locator('.modal-header h2')).toHaveCount(0);
  });

  test('20b. Add Antigravity handles login flow failure gracefully', async ({ page }) => {
    await page.unroute('**/v1/**');
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.click('button:has-text("Add Antigravity")');

    const logs = await page.locator('.log-list .log-item p').allTextContents();
    expect(logs.some(l => l.includes('Initiating Google Login flow via Antigravity LS Gateway...'))).toBeTruthy();
    expect(logs.some(l => l.includes('Failed to initiate login flow from LS Gateway.'))).toBeTruthy();

    await expect(page.locator('.modal-header h2')).toContainText('Add Google Account');
  });

  test('20c. Add Google Account auto-imports new account from LS Gateway on Done click and rotates if quota is high', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await addSession(page, { inbox: 's=1', domain: 'google.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    await page.unroute('**/v1/**');
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({ status: 200 });
    });
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

    const s1Status = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.status');
    await expect(s1Status).toHaveText('Cooldown');

    await expect(async () => {
      const logs = await page.locator('.log-list .log-item p').allTextContents();
      expect(logs.some(l => l.includes('Synchronized 1 session(s) from LS Gateway.'))).toBeTruthy();
      expect(logs.some(l => l.includes('Automatically imported 1 new session(s) from LS Gateway.'))).toBeTruthy();
      expect(logs.some(l => l.includes('Auto-rotated active session from S1 to S2'))).toBeTruthy();
    }).toPass();
  });

  test('20d. Quota model-specific groups sync with local gateway and active account switch is POSTed', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    let switchPayloads: any[] = [];
    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts/active', async (route) => {
      switchPayloads.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
    });

    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              id: 's1@gmail.com',
              label: 's1@gmail.com',
              domain: 'google.com',
              quotaUsed: 10,
              quotaLimit: 100,
              quotaGroups: [
                {
                  name: 'Gemini Models',
                  weekly: { percentage: 86, resetText: 'Weekly Limit 86%' },
                  fiveHour: { percentage: 19, resetText: 'Five Hour Limit 19%' }
                },
                {
                  name: 'Claude and GPT models',
                  weekly: { percentage: 29, resetText: 'Weekly Limit 29%' },
                  fiveHour: { percentage: 100, resetText: '' }
                }
              ]
            },
            {
              id: 's2@gmail.com',
              label: 's2@gmail.com',
              domain: 'google.com',
              quotaUsed: 20,
              quotaLimit: 100,
              quotaGroups: null
            }
          ]
        })
      });
    });

    // Sync S1 and S2
    await page.click('button:has-text("Add Antigravity")');
    await page.click('.modal-footer button:has-text("Done")');

    // Click S1 row in session table to select it and show its details
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 's1@gmail.com' }).click();

    // Verify detailed progress rings are rendered correctly
    await expect(page.locator('.quota-groups-list')).toBeVisible();
    await expect(page.locator('.quota-groups-list')).toContainText('Gemini Models');
    await expect(page.locator('.quota-groups-list')).toContainText('86%');
    await expect(page.locator('.quota-groups-list')).toContainText('19%');
    await expect(page.locator('.quota-groups-list')).toContainText('Claude and GPT models');
    await expect(page.locator('.quota-groups-list')).toContainText('29%');
    await expect(page.locator('.quota-groups-list')).toContainText('100%');

    // Trigger active session switch by clicking "Rotate Now"
    await page.click('button:has-text("Rotate Now")');
    await page.click('button:has-text("Rotate Now")');

    // Wait and assert that the POST switch payload was sent for s2@gmail.com
    await expect(async () => {
      expect(switchPayloads.some(p => p && p.email === 's2@gmail.com')).toBeTruthy();
    }).toPass();
  });

});

test.describe('Tier 2: Boundary & Corner Cases', () => {

  test('21. Import with empty textarea logs validation error', async ({ page }) => {
    await page.fill('#cookie-inbox-input', '');
    await page.fill('#cookie-domain-input', 'google.com');
    await page.click('button:has-text("Add Cookie")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('No cookie pairs were detected in the inbox.');
  });

  test('22. Import with empty domain input logs validation error', async ({ page }) => {
    await page.fill('#cookie-inbox-input', 'sessionid=123');
    await page.fill('#cookie-domain-input', '');
    await page.click('button:has-text("Add Cookie")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Domain is required before adding a cookie session.');
  });

  test('23. Import with invalid JSON format logs parsing error', async ({ page }) => {
    await page.fill('#cookie-inbox-input', '{invalid_json}');
    await page.fill('#cookie-domain-input', 'google.com');
    await page.selectOption('#cookie-format-input', 'json');
    await page.click('button:has-text("Add Cookie")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Cookie import failed. Check the selected format.');
  });

  test('24. Import with invalid Netscape format logs parsing error', async ({ page }) => {
    await page.fill('#cookie-inbox-input', 'invalid_netscape_no_tabs');
    await page.fill('#cookie-domain-input', 'google.com');
    await page.selectOption('#cookie-format-input', 'netscape');
    await page.click('button:has-text("Add Cookie")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Cookie import failed. Check the selected format.');
  });

  test('25. Import with invalid Header format logs parsing error', async ({ page }) => {
    await page.fill('#cookie-inbox-input', 'invalidcookieheader');
    await page.fill('#cookie-domain-input', 'google.com');
    await page.selectOption('#cookie-format-input', 'header');
    await page.click('button:has-text("Add Cookie")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Cookie import failed. Check the selected format.');
  });

  test('26. Manual rotation when no healthy candidate is available logs warning and doesn\'t change active', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    await page.click('button:has-text("Rotate Now")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('No healthy rotation candidate is available.');
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S1');
  });

  test('27. Auto-rotation threshold slider at 0% rotates immediately on any usage > 0', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '0');

    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 0, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 0, limit: 100 });

    // Select S1 and update used to 1
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-used-input', '1');

    // Should auto-rotate immediately to S2
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  });

  test('28. Auto-rotation threshold slider at 100% does not rotate at 100% unless status is cooldown', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '100');

    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 0, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 0, limit: 100 });

    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-used-input', '100');

    // Should NOT auto-rotate even at 100% since threshold is 100% and not in cooldown
    await page.waitForTimeout(500);
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S1');

    // Now manually trigger cooldown on S1
    await page.click('.quick-actions button:has-text("Cooldown")');

    // Should auto-rotate to S2
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  });

  test('29. Slider rotate threshold boundary values (1% and 99%)', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');

    // Test 1% threshold
    await setSliderValue(page, '#settings-rotate-threshold-input', '1');

    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 0, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 0, limit: 100 });

    // S1 to 2% used (exceeds 1%) -> should rotate
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-used-input', '2');
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');

    // Reset and test 99% threshold
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.reload();

    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '99');

    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 95, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 0, limit: 100 });

    // At 95% (below 99%), should NOT rotate
    await page.waitForTimeout(500);
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S1');

    // Change S1 to 100 (exceeds 99%) -> should rotate to S2
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-used-input', '100');
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  });

  test('30. Rotation on a single-session queue does not rotate (active remains the same)', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    await page.fill('#control-used-input', '90');

    // Should not rotate since there are no candidates
    await page.waitForTimeout(500);
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S1');
  });

  test('31. Apply cooldown of 0 minutes clears cooldown status', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    
    // Set 5m cooldown
    await page.click('.quick-actions button:has-text("Cooldown")');
    await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Cooldown');

    // Set 0m cooldown (via Clear button)
    await page.click('.quick-actions button:has-text("Clear")');
    await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Healthy');
  });

  test('32. Input session cooldown value of negative numbers behaves as 0', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();

    // Set 5m cooldown
    await page.click('.quick-actions button:has-text("Cooldown")');
    await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Cooldown');

    // Set negative number in Session Control input
    await page.fill('#control-cooldown-input', '-5');
    await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Healthy');
  });

  test('33. Manual cooldown input in control panel updates status correctly', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();

    // Enter 15 minutes manually
    await page.fill('#control-cooldown-input', '15');
    await expect(page.locator('.session-table .table-row:not(.table-head) .status')).toHaveText('Cooldown');
  });

  test('34. Active session put into cooldown triggers immediate rotation', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header' });

    // Select S1 and put in cooldown
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.click('.quick-actions button:has-text("Cooldown")');

    // Should immediately rotate to S2
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  });

  test('35. Promoting a session shifts it to the top of the queue or makes it active', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header' });

    // Promote S2
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' }).locator('button[aria-label="Set active"]').click();

    // Verify S2 is active
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  });

  test('36. LS Gateway API returns empty sessions list logs warning', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions: [] })
      });
    });

    await page.click('button:has-text("Run Check")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('Quota state refreshed from LS Gateway (0 sessions matched).');
  });

  test('37. LS Gateway API connection failure (network error) logs connection warning', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.abort('failed');
    });

    await page.click('button:has-text("Run Check")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toContainText('LS Gateway connection failed:');
  });

  test('38. LS Gateway API returns malformed JSON payload logs parsing warning', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{invalid json'
      });
    });

    await page.click('button:has-text("Run Check")');

    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toContainText('LS Gateway connection failed:');
  });

  test('39. Corrupted localStorage state handles gracefully on reload', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('antiquotar-control-state-v1', '{invalid_json}');
    });
    await page.reload();

    // Verify app doesn't crash and renders empty state successfully
    await expect(page.locator('h1')).toHaveText('AntiQuotar Control');
    await expect(page.locator('.active-panel .empty-state')).toContainText('Add a cookie session to begin rotation.');
  });

  test('40. UI settings controls (like LS endpoint inputs) are persisted and restored on reload', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();

    await page.fill('#control-ls-endpoint-input', 'http://custom-endpoint:9999/status');
    await page.reload();

    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await expect(page.locator('#control-ls-endpoint-input')).toHaveValue('http://custom-endpoint:9999/status');
  });

});

test.describe('Tier 3: Cross-Feature Combinations', () => {

  test('41. Import new cookie session -> verifies it is automatically sorted into correct queue rank based on quota', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 40, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 10, limit: 100 });

    const queueItems = await page.locator('.queue-list .queue-item strong').allTextContents();
    expect(queueItems[0]).toBe('S2');
    expect(queueItems[1]).toBe('S1');
  });

  test('42. Manual cooldown of active session -> triggers auto-rotation to find best candidate', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 20, limit: 100 });

    // Select active S1 and manually put in cooldown
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.click('.quick-actions button:has-text("Cooldown")');

    // Active session should automatically change to S2
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  });

  test('43. Run Check sync -> updates quota of active session past threshold -> triggers auto-rotation immediately', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 20, limit: 100 });

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            { domain: 'a.com', quotaUsed: 85 } // updates S1 to 85% (>80% threshold)
          ]
        })
      });
    });

    await page.click('button:has-text("Run Check")');

    // Should trigger auto-rotation immediately and make S2 active
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');
  });

  test('44. Import new cookie session -> promote it to active -> trigger cooldown -> verify it rotates to the other session', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header' });

    // Promote S2
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' }).locator('button[aria-label="Set active"]').click();
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');

    // Put S2 in cooldown
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' }).click();
    await page.click('.quick-actions button:has-text("Cooldown")');

    // S2 is in cooldown, should rotate back to S1
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S1');
  });

});

test.describe('Tier 4: Real-World Scenarios', () => {

  test('45. Scenario 1 (Auto-rotation and Best Candidate Recovery)', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    // S1 added first (active), S2, S3
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 10, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 20, limit: 100 });
    await addSession(page, { inbox: 's=3', domain: 'c.com', label: 'S3', format: 'header', used: 30, limit: 100 });

    // S1 active. Update S1 used to 85% via API check
    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [{ domain: 'a.com', quotaUsed: 85 }]
        })
      });
    });

    await page.click('button:has-text("Run Check")');

    // S1 is rotated out. Active switches to S2 (next best candidate). S1 enters cooldown.
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');

    // Verify S1 is in cooldown
    await expect(page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.status')).toHaveText('Cooldown');

    // Simulate cooldown expiry of S1 programmatically via localStorage and reloading
    const stateStr = await page.evaluate(() => localStorage.getItem('antiquotar-control-state-v1'));
    const state = JSON.parse(stateStr || '{}');
    const s1 = state.sessions.find(s => s.label === 'S1');
    s1.cooldownUntil = null; // Clear cooldown

    await page.addInitScript((updatedState) => {
      localStorage.setItem('antiquotar-control-state-v1', JSON.stringify(updatedState));
    }, state);
    await page.reload();

    // Verify S1 is active queue rank again and sorted back into the rotation queue
    await expect(page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.status')).toHaveText('High');
    const queueItems = await page.locator('.queue-list .queue-item strong').allTextContents();
    expect(queueItems).toContain('S1');
  });

  test('46. Scenario 2 (Bulk Operations & Persistence check)', async ({ page }) => {
    // Clear state
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('test46-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('test46-cleared', 'true');
      }
    });
    await page.reload();

    // Import Header cookie
    await page.fill('#cookie-inbox-input', 'sessionid=1');
    await page.fill('#cookie-domain-input', 'a.com');
    await page.fill('#cookie-name-input', 'S1');
    await page.selectOption('#cookie-format-input', 'header');
    await page.click('button:has-text("Add Cookie")');

    // Import Netscape cookie
    const netscapeVal = 'b.com\tTRUE\t/\tFALSE\t1700000000\tsessionid\t2';
    await page.fill('#cookie-inbox-input', netscapeVal);
    await page.fill('#cookie-domain-input', 'b.com');
    await page.fill('#cookie-name-input', 'S2');
    await page.selectOption('#cookie-format-input', 'netscape');
    await page.click('button:has-text("Add Cookie")');

    // Import JSON cookie
    await page.fill('#cookie-inbox-input', '{"sessionid": "3"}');
    await page.fill('#cookie-domain-input', 'c.com');
    await page.fill('#cookie-name-input', 'S3');
    await page.selectOption('#cookie-format-input', 'json');
    await page.click('button:has-text("Add Cookie")');

    // Verify table has 3 sessions
    const rows = page.locator('.session-table .table-row:not(.table-head)');
    await expect(rows).toHaveCount(3);

    // Modify threshold and auto-rotate settings
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '75');

    // Reload page
    await page.reload();

    // Verify all 3 sessions are still present and settings are persisted
    await expect(page.locator('.session-table .table-row:not(.table-head)')).toHaveCount(3);
    await expect(page.locator('#settings-auto-rotate-input')).toBeChecked();
    await expect(page.locator('#settings-rotate-threshold-input')).toHaveValue('75');
  });

  test('47. Scenario 3 (LS Gateway Error Handling & Recovery)', async ({ page }) => {
    await addSession(page, { inbox: 's=1', domain: 'google.com', label: 'S1', format: 'header', used: 10, limit: 1000 });

    // Mock network error
    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.click('button:has-text("Run Check")');

    // Verify connection warning log
    const log = page.locator('.log-list .log-item p').first();
    await expect(log).toHaveText('LS endpoint returned error status: 500');

    // Mock healthy response
    await page.unroute('**/v1/accounts');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [{ domain: 'google.com', quotaUsed: 500, quotaLimit: 1000 }]
        })
      });
    });

    await page.click('button:has-text("Run Check")');

    // Verify success log and updated value
    await expect(async () => {
      const logs = await page.locator('.log-list .log-item p').allTextContents();
      expect(logs.some(l => l.includes('Synchronized 1 session(s) from LS Gateway.'))).toBeTruthy();
    }).toPass();

    const quotaCell = page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).locator('.quota-cell');
    await expect(quotaCell).toContainText('50%');
  });

  test('48. Scenario 4 (Multi-session Rotation Exhaustion)', async ({ page }) => {
    await page.check('#settings-auto-rotate-input');
    await setSliderValue(page, '#settings-rotate-threshold-input', '80');

    // S1 added first (active), then S2, then S3
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header', used: 70, limit: 100 });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header', used: 75, limit: 100 });
    await addSession(page, { inbox: 's=3', domain: 'c.com', label: 'S3', format: 'header', used: 78, limit: 100 });

    // S1 active. Update S1 to 85% -> rotates to S2
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-used-input', '85');
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S2');

    // Update S2 to 85% -> rotates to S3
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' }).click();
    await page.fill('#control-used-input', '85');
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S3');

    // Update S3 to 85% -> since all are high/critical/cooldown, rotation exhaustion happens
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S3' }).click();
    await page.fill('#control-used-input', '85');

    // Active session should remain S3 since no healthy candidate exists
    await page.waitForTimeout(500);
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S3');
  });

  test('49. Scenario 5 (Promote, Cooldown & Complex sorting)', async ({ page }) => {
    await page.uncheck('#settings-auto-rotate-input');
    await addSession(page, { inbox: 's=3', domain: 'c.com', label: 'S3', format: 'header' });
    await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'S2', format: 'header' });
    await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'S1', format: 'header' });

    // Set S3 to cooldown
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S3' }).click();
    await page.click('.quick-actions button:has-text("Cooldown")');
    await expect(page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S3' }).locator('.status')).toHaveText('Cooldown');

    // Promote S3 (should clear cooldown and make active)
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S3' }).locator('button[aria-label="Set active"]').click();
    await expect(page.locator('#sessions .panel-heading p')).toHaveText('S3');
    await expect(page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S3' }).locator('.status')).toHaveText('Healthy');

    // Set manually different cooldown durations: S1 = 20m, S2 = 10m
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
    await page.fill('#control-cooldown-input', '20');

    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S2' }).click();
    await page.fill('#control-cooldown-input', '10');

    // S3 is active/healthy. Rotation queue should sort cooldown sessions by remaining time: S2 (10m) then S1 (20m)
    const queueItems = await page.locator('.queue-list .queue-item strong').allTextContents();
    expect(queueItems[0]).toBe('S3');
    expect(queueItems[1]).toBe('S2');
    expect(queueItems[2]).toBe('S1');
  });

  test('50. Scenario 6 (Cross-group limit fallback propagates missing rate limit usage correctly)', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.unroute('**/v1/**');
    await page.route('**/v1/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              id: 'fallback@gmail.com',
              label: 'fallback@gmail.com',
              domain: 'google.com',
              quotaUsed: 10,
              quotaLimit: 100,
              quotaGroups: [
                {
                  name: 'Gemini Models',
                  weekly: { percentage: 100, resetText: '' },
                  fiveHour: { percentage: 89, resetText: 'Five Hour Limit 89%' }
                },
                {
                  name: 'Claude and GPT models',
                  weekly: { percentage: 8, resetText: 'Weekly Limit 8%' },
                  fiveHour: { percentage: 100, resetText: '' }
                }
              ]
            }
          ]
        })
      });
    });

    // Import session via Add Google Account
    await page.click('button:has-text("Add Antigravity")');
    await page.click('.modal-footer button:has-text("Done")');

    // Select session to show details
    await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'fallback@gmail.com' }).click();

    // Verify fallback values are calculated and rendered
    await expect(page.locator('.quota-groups-list')).toBeVisible();
    await expect(page.locator('.quota-groups-list')).toContainText('Gemini Models');
    
    // Gemini Weekly should fallback to 89% (from 5-hour) since it was 100%
    // Claude 5-hour should fallback to 8% (from Weekly) since it was 100%
    await expect(page.locator('.quota-groups-list')).toContainText('89%');
    await expect(page.locator('.quota-groups-list')).toContainText('Claude and GPT models');
    await expect(page.locator('.quota-groups-list')).toContainText('8%');
  });

  test('51. Scenario 7 (Interactive promotion, filesystem/credentials sync, and no login prompt)', async ({ page }) => {
    const simulatedCredsDir = path.resolve(__dirname, 'simulated-creds');
    const profilesDir = path.join(simulatedCredsDir, 'profiles');
    const sessionJsonPath = path.join(simulatedCredsDir, 'session.json');
    const cliConfigJsonPath = path.join(simulatedCredsDir, 'config.json');
    const credCacheLogPath = path.join(simulatedCredsDir, 'cred-cache.json');

    // Cleanup helper
    const cleanupSimulatedCreds = () => {
      if (fs.existsSync(simulatedCredsDir)) {
        fs.rmSync(simulatedCredsDir, { recursive: true, force: true });
      }
    };

    // Initial cleanup
    cleanupSimulatedCreds();

    try {
      // Env setup
      fs.mkdirSync(simulatedCredsDir, { recursive: true });
      fs.mkdirSync(profilesDir, { recursive: true });

      const aliceProfile = {
        accessToken: "alice_access_token_123",
        refreshToken: "alice_refresh_token_xyz",
        expiresAt: Date.now() + 3600000,
        email: "alice@google.com"
      };

      const bobProfile = {
        accessToken: "bob_access_token_456",
        refreshToken: "bob_refresh_token_uvw",
        expiresAt: Date.now() + 3600000,
        email: "bob@google.com"
      };

      fs.writeFileSync(path.join(profilesDir, 'alice@google.com.json'), JSON.stringify(aliceProfile, null, 2), 'utf-8');
      fs.writeFileSync(path.join(profilesDir, 'bob@google.com.json'), JSON.stringify(bobProfile, null, 2), 'utf-8');

      // Set Alice active initially in simulated files
      fs.writeFileSync(sessionJsonPath, JSON.stringify(aliceProfile, null, 2), 'utf-8');
      fs.writeFileSync(cliConfigJsonPath, JSON.stringify({ activeAccount: "alice@google.com" }, null, 2), 'utf-8');
      fs.writeFileSync(credCacheLogPath, JSON.stringify({ "gemini:antigravity": aliceProfile }, null, 2), 'utf-8');

      // Mock API routes
      await page.unroute('**/v1/**');
      await page.route('**/v1/accounts', async (route) => {
        let activeEmail = "alice@google.com";
        try {
          if (fs.existsSync(sessionJsonPath)) {
            const content = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf-8'));
            activeEmail = content.email || content.id || "alice@google.com";
          }
        } catch (e) {}

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessions: [
              { id: 'alice@google.com', label: 'alice@google.com', domain: 'google.com', quotaUsed: 10, quotaLimit: 100 },
              { id: 'bob@google.com', label: 'bob@google.com', domain: 'google.com', quotaUsed: 20, quotaLimit: 100 }
            ],
            activeId: activeEmail
          })
        });
      });

      await page.route('**/v1/accounts/active', async (route) => {
        const payload = route.request().postDataJSON();
        const email = payload.email || payload.id;
        
        if (email === 'bob@google.com') {
          const targetProfile = path.join(profilesDir, `${email}.json`);
          if (fs.existsSync(targetProfile)) {
            const content = fs.readFileSync(targetProfile, 'utf-8');
            fs.writeFileSync(sessionJsonPath, content, 'utf-8');
            fs.writeFileSync(cliConfigJsonPath, JSON.stringify({ activeAccount: email }, null, 2), 'utf-8');
            
            // Map from 2.0 profile properties to Credential Manager properties
            const parsed = JSON.parse(content);
            const credData = {
              token: {
                access_token: parsed.accessToken,
                token_type: "Bearer",
                refresh_token: parsed.refreshToken,
                expiry: new Date(parsed.expiresAt).toISOString()
              },
              auth_method: "consumer"
            };
            fs.writeFileSync(credCacheLogPath, JSON.stringify({ "gemini:antigravity": credData }, null, 2), 'utf-8');
          }
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', message: 'Simulated swap success' })
        });
      });

      await page.evaluate(() => localStorage.clear());
      await page.reload();

      // Import the sessions into CMS UI by triggering "Add Antigravity" modal done click
      await page.click('button:has-text("Add Antigravity")');
      await page.click('.modal-footer button:has-text("Done")');

      // Verify visible sessions
      await expect(page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'alice@google.com' })).toBeVisible();
      await expect(page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'bob@google.com' })).toBeVisible();

      // Verify Alice is active
      await expect(page.locator('#sessions .panel-heading p')).toHaveText('alice@google.com');

      // Switch to Bob by clicking ArrowUp "Set active" button on Bob's row
      await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'bob@google.com' }).locator('button[aria-label="Set active"]').click();

      // Verify Bob is now active in UI
      await expect(page.locator('#sessions .panel-heading p')).toHaveText('bob@google.com');

      // Verify session.json is updated on disk
      const sessionContent = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf-8'));
      expect(sessionContent.email).toBe("bob@google.com");
      expect(sessionContent.accessToken).toBe("bob_access_token_456");

      // Verify CLI config is updated on disk
      const cliConfig = JSON.parse(fs.readFileSync(cliConfigJsonPath, 'utf-8'));
      expect(cliConfig.activeAccount).toBe("bob@google.com");

      // Verify simulated credential cache is updated with the mapped token structure
      const cacheContent = JSON.parse(fs.readFileSync(credCacheLogPath, 'utf-8'));
      const bobCred = cacheContent["gemini:antigravity"];
      expect(bobCred.token.access_token).toBe("bob_access_token_456");
      expect(bobCred.token.refresh_token).toBe("bob_refresh_token_uvw");

      // Verify no login/auth prompts exist in DOM
      await expect(page.locator('.modal-header h2')).toHaveCount(0);

    } finally {
      cleanupSimulatedCreds();
    }
  });

});
