const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to http://127.0.0.1:5173/...');
  await page.goto('http://127.0.0.1:5173/');
  
  console.log('Clicking Run Check...');
  await page.click('button:has-text("Run Check")');
  
  // Wait 3 seconds for gateway sync to finish and state to update
  console.log('Waiting for sync...');
  await page.waitForTimeout(3000);
  
  console.log('Clicking aa01090033816@gmail.com row...');
  await page.locator('.session-table .table-row:not(.table-head)').filter({ hasText: 'aa01090033816@gmail.com' }).click();
  
  console.log('Waiting for Model Quota Details section...');
  await page.waitForSelector('.quota-groups-list', { timeout: 5000 });
  
  const text = await page.locator('.quota-groups-list').textContent();
  console.log('\n--- EXTRACTED TEXT ---');
  console.log(text.trim());
  console.log('----------------------\n');
  
  const screenshotPath = path.join('C:\\Users\\MY CHU\\.gemini\\antigravity\\brain\\d7732fcd-afeb-416a-8826-fc88a0cdbef8', 'gemini_actual.png');
  await page.locator('.quota-groups-list').screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);
  
  await browser.close();
})();
