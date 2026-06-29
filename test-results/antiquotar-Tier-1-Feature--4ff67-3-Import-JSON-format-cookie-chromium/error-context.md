# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: antiquotar.spec.ts >> Tier 1: Feature Coverage >> 3. Import JSON format cookie
- Location: tests\antiquotar.spec.ts:97:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.log-list .log-item p').first()
Expected: "Added 1 cookie pair(s) for google.com."
Received: "Quota state refreshed from LS Gateway (0 sessions matched)."
Timeout:  5000ms

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('.log-list .log-item p').first()
    14 × locator resolved to <p>Quota state refreshed from LS Gateway (0 sessions…</p>
       - unexpected value "Quota state refreshed from LS Gateway (0 sessions matched)."

```

```yaml
- paragraph: Quota state refreshed from LS Gateway (0 sessions matched).
```

# Test source

```ts
  9   |   }
  10  |   if (format !== undefined) {
  11  |     await page.selectOption('#cookie-format-input', format);
  12  |   }
  13  |   if (used !== undefined) {
  14  |     await page.fill('#cookie-used-input', String(used));
  15  |   }
  16  |   if (limit !== undefined) {
  17  |     await page.fill('#cookie-limit-input', String(limit));
  18  |   }
  19  |   await page.click('button:has-text("Add Cookie")');
  20  | }
  21  | 
  22  | // Helper to programmatically set range slider values in React
  23  | async function setSliderValue(page, selector, value) {
  24  |   await page.evaluate(({ sel, val }) => {
  25  |     const el = document.querySelector(sel) as HTMLInputElement;
  26  |     if (el) {
  27  |       const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  28  |       if (nativeInputValueSetter) {
  29  |         nativeInputValueSetter.call(el, val);
  30  |       } else {
  31  |         el.value = val;
  32  |       }
  33  |       el.dispatchEvent(new Event('input', { bubbles: true }));
  34  |       el.dispatchEvent(new Event('change', { bubbles: true }));
  35  |     }
  36  |   }, { sel: selector, val: value });
  37  | }
  38  | 
  39  | // Helper to clean up localStorage and state
  40  | test.beforeEach(async ({ page }) => {
  41  |   page.on('console', msg => console.log('BROWSER:', msg.text()));
  42  |   page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  43  |   // Block auto-sync requests to local bridge so real data doesn't pollute tests
  44  |   await page.route('**/v1/**', async (route) => {
  45  |     await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  46  |   });
  47  |   await page.addInitScript(() => {
  48  |     if (!sessionStorage.getItem('beforeEach-cleared')) {
  49  |       localStorage.clear();
  50  |       sessionStorage.setItem('beforeEach-cleared', 'true');
  51  |     }
  52  |   });
  53  |   await page.goto('/');
  54  | });
  55  | 
  56  | test.describe('Tier 1: Feature Coverage', () => {
  57  | 
  58  |   test('1. Import header format cookie', async ({ page }) => {
  59  |     await page.fill('#cookie-inbox-input', 'sessionid=abc123xyz; account=john_doe');
  60  |     await page.fill('#cookie-domain-input', 'google.com');
  61  |     await page.fill('#cookie-name-input', 'HeaderCookie');
  62  |     await page.selectOption('#cookie-format-input', 'header');
  63  | 
  64  |     // Assert preview count
  65  |     await expect(page.locator('.counter')).toHaveText('2 parsed');
  66  | 
  67  |     // Click Add Cookie
  68  |     await page.click('button:has-text("Add Cookie")');
  69  | 
  70  |     // Assert success log
  71  |     const log = page.locator('.log-list .log-item p').first();
  72  |     await expect(log).toHaveText('Added 2 cookie pair(s) for google.com.');
  73  | 
  74  |     // Assert input reset
  75  |     await expect(page.locator('#cookie-inbox-input')).toHaveValue('');
  76  |     await expect(page.locator('#cookie-domain-input')).toHaveValue('');
  77  |     await expect(page.locator('#cookie-name-input')).toHaveValue('');
  78  |   });
  79  | 
  80  |   test('2. Import Netscape format cookie', async ({ page }) => {
  81  |     const netscapeCookie = 'google.com\tTRUE\t/\tFALSE\t1700000000\tcookieName\tcookieValue';
  82  |     await page.fill('#cookie-inbox-input', netscapeCookie);
  83  |     await page.fill('#cookie-domain-input', 'google.com');
  84  |     await page.fill('#cookie-name-input', 'NetscapeCookie');
  85  |     await page.selectOption('#cookie-format-input', 'netscape');
  86  | 
  87  |     await expect(page.locator('.counter')).toHaveText('1 parsed');
  88  | 
  89  |     await page.click('button:has-text("Add Cookie")');
  90  | 
  91  |     const log = page.locator('.log-list .log-item p').first();
  92  |     await expect(log).toHaveText('Added 1 cookie pair(s) for google.com.');
  93  | 
  94  |     await expect(page.locator('#cookie-inbox-input')).toHaveValue('');
  95  |   });
  96  | 
  97  |   test('3. Import JSON format cookie', async ({ page }) => {
  98  |     const jsonCookie = '[{"name": "jsonCookie", "value": "jsonVal"}]';
  99  |     await page.fill('#cookie-inbox-input', jsonCookie);
  100 |     await page.fill('#cookie-domain-input', 'google.com');
  101 |     await page.fill('#cookie-name-input', 'JsonCookie');
  102 |     await page.selectOption('#cookie-format-input', 'json');
  103 | 
  104 |     await expect(page.locator('.counter')).toHaveText('1 parsed');
  105 | 
  106 |     await page.click('button:has-text("Add Cookie")');
  107 | 
  108 |     const log = page.locator('.log-list .log-item p').first();
> 109 |     await expect(log).toHaveText('Added 1 cookie pair(s) for google.com.');
      |                       ^ Error: expect(locator).toHaveText(expected) failed
  110 | 
  111 |     await expect(page.locator('#cookie-inbox-input')).toHaveValue('');
  112 |   });
  113 | 
  114 |   test('4. Select format input dropdown reactively updates preview count text', async ({ page }) => {
  115 |     await page.fill('#cookie-inbox-input', '{"a": "b"}');
  116 |     
  117 |     // Select json format
  118 |     await page.selectOption('#cookie-format-input', 'json');
  119 |     await expect(page.locator('.counter')).toHaveText('1 parsed');
  120 | 
  121 |     // Select netscape format (should fail parsing or return 0 parsed since it does not have 7 tabs)
  122 |     await page.selectOption('#cookie-format-input', 'netscape');
  123 |     await expect(page.locator('.counter')).toHaveText('0 parsed');
  124 |   });
  125 | 
  126 |   test('5. Successful import adds session to sessions table and activeId if empty', async ({ page }) => {
  127 |     await addSession(page, {
  128 |       inbox: 'sessionid=abc123xyz',
  129 |       domain: 'google.com',
  130 |       label: 'S1',
  131 |       format: 'header'
  132 |     });
  133 | 
  134 |     // Check row added in table
  135 |     const row = page.locator('.session-table .table-row:not(.table-head)');
  136 |     await expect(row).toContainText('google.com');
  137 |     await expect(row).toContainText('S1');
  138 | 
  139 |     // Check active session panel
  140 |     const activeText = await page.locator('#sessions .panel-heading p').textContent();
  141 |     expect(activeText).toBe('S1');
  142 |   });
  143 | 
  144 |   test('6. Manual rotation switches active session to next best candidate', async ({ page }) => {
  145 |     // Add two healthy sessions
  146 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session A', format: 'header', used: 10, limit: 100 });
  147 |     await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session B', format: 'header', used: 20, limit: 100 });
  148 | 
  149 |     // Active session should be Session A initially (since it was added first when activeId was empty)
  150 |     await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session A');
  151 | 
  152 |     // Manual rotation
  153 |     await page.click('button:has-text("Rotate Now")');
  154 | 
  155 |     // Active session should switch to Session B (next best candidate)
  156 |     await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session B');
  157 |   });
  158 | 
  159 |   test('7. Auto-rotation switches session immediately when quota usage exceeds threshold', async ({ page }) => {
  160 |     // Enable auto-rotate and set threshold to 80
  161 |     await page.check('#settings-auto-rotate-input');
  162 |     await setSliderValue(page, '#settings-rotate-threshold-input', '80');
  163 | 
  164 |     // Add active session A and healthy candidate B
  165 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session A', format: 'header', used: 10, limit: 100 });
  166 |     await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session B', format: 'header', used: 20, limit: 100 });
  167 | 
  168 |     // Select Session A to update it
  169 |     await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'Session A' }).click();
  170 | 
  171 |     // Increase Session A used quota to 85 (above threshold of 80)
  172 |     await page.fill('#control-used-input', '85');
  173 |     
  174 |     // Check if auto-rotated to Session B
  175 |     await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session B');
  176 |   });
  177 | 
  178 |   test('8. Auto-rotation does not switch session if auto-rotate settings is disabled', async ({ page }) => {
  179 |     // Disable auto-rotate
  180 |     await page.uncheck('#settings-auto-rotate-input');
  181 |     await setSliderValue(page, '#settings-rotate-threshold-input', '80');
  182 | 
  183 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session A', format: 'header', used: 10, limit: 100 });
  184 |     await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session B', format: 'header', used: 20, limit: 100 });
  185 | 
  186 |     await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'Session A' }).click();
  187 |     await page.fill('#control-used-input', '85');
  188 | 
  189 |     // Session A should remain active
  190 |     await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session A');
  191 |   });
  192 | 
  193 |   test('9. Next candidate selection logic chooses healthy session status over watch status', async ({ page }) => {
  194 |     await page.check('#settings-auto-rotate-input');
  195 |     await setSliderValue(page, '#settings-rotate-threshold-input', '80');
  196 | 
  197 |     // Add Session 1 first so it is active. S3: healthy (40%), S2: watch (65%).
  198 |     await addSession(page, { inbox: 's=1', domain: 'a.com', label: 'Session 1', format: 'header', used: 10, limit: 100 });
  199 |     await addSession(page, { inbox: 's=2', domain: 'b.com', label: 'Session 2', format: 'header', used: 65, limit: 100 });
  200 |     await addSession(page, { inbox: 's=3', domain: 'c.com', label: 'Session 3', format: 'header', used: 40, limit: 100 });
  201 | 
  202 |     // Select Session 1 and exceed threshold
  203 |     await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'Session 1' }).click();
  204 |     await page.fill('#control-used-input', '85');
  205 | 
  206 |     // Session 3 (healthy) should be selected over Session 2 (watch)
  207 |     await expect(page.locator('#sessions .panel-heading p')).toHaveText('Session 3');
  208 |   });
  209 | 
```