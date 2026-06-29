const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://127.0.0.1:5173/...');
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(1000);
  
  // Enable auto-rotate
  console.log('Enabling auto-rotate...');
  await page.check('#settings-auto-rotate-input');
  
  // Set threshold to 0%
  console.log('Setting threshold to 0%...');
  const slider = page.locator('#settings-rotate-threshold-input');
  await slider.evaluate(el => el.value = 0);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
  await page.waitForTimeout(500);

  // Add S1
  console.log('Adding S1...');
  await page.fill('#cookie-inbox-input', 's=1');
  await page.fill('#cookie-domain-input', 'a.com');
  await page.fill('#cookie-name-input', 'S1');
  await page.fill('#cookie-used-input', '0');
  await page.click('button:has-text("Add Cookie")');
  await page.waitForTimeout(500);

  // Add S2
  console.log('Adding S2...');
  await page.fill('#cookie-inbox-input', 's=2');
  await page.fill('#cookie-domain-input', 'b.com');
  await page.fill('#cookie-name-input', 'S2');
  await page.fill('#cookie-used-input', '0');
  await page.click('button:has-text("Add Cookie")');
  await page.waitForTimeout(500);

  // Print initial state
  console.log('\n--- INITIAL ACTIVE PANEL ---');
  console.log(await page.locator('.active-panel').innerText());

  // Click S1
  console.log('\nClicking S1 row in table...');
  await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'S1' }).click();
  await page.waitForTimeout(500);

  // Update used to 1
  console.log('Updating used to 1...');
  await page.fill('#control-used-input', '1');
  await page.waitForTimeout(2000);

  // Print final state
  console.log('\n--- FINAL ACTIVE PANEL ---');
  console.log(await page.locator('.active-panel').innerText());

  await browser.close();
}

run().catch(console.error);
