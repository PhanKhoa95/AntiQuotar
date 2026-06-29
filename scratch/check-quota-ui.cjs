const { chromium } = require('@playwright/test');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to http://127.0.0.1:5173/...');
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(1500);
  
  // Mock the login endpoint so "Add Antigravity" works
  await page.route('**/v1/auth/login', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
  });

  // Click "Add Antigravity" button
  console.log('Clicking Add Antigravity button...');
  const addBtn = page.locator('button:has-text("Add Antigravity")');
  if (await addBtn.count() > 0) {
    await addBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // Click "Done" button to trigger sync
  console.log('Clicking Done button...');
  const doneBtn = page.locator('button:has-text("Done")');
  if (await doneBtn.count() > 0) {
    await doneBtn.first().click();
    await page.waitForTimeout(4000);
  }

  // Check sessions in table
  const rows = page.locator('.table-row:not(.table-head)');
  const count = await rows.count();
  console.log(`Found ${count} session row(s) in table.`);

  // Verify hoangmai160501@gmail.com
  console.log('\n--- SELECTING hoangmai160501@gmail.com (Row 0) ---');
  await rows.nth(0).click();
  await page.waitForTimeout(1000);
  
  const hoangmaiDetails = page.locator('.quota-groups-list');
  if (await hoangmaiDetails.count() > 0) {
    const text = await hoangmaiDetails.innerText();
    console.log(text);
    await hoangmaiDetails.screenshot({ path: path.resolve('C:\\Users\\MY CHU\\.gemini\\antigravity\\brain\\d7732fcd-afeb-416a-8826-fc88a0cdbef8\\hoangmai_details.png') });
  }

  // Verify khoap1220@gmail.com
  console.log('\n--- SELECTING khoap1220@gmail.com (Row 1) ---');
  await rows.nth(1).click();
  await page.waitForTimeout(1000);
  
  const khoapDetails = page.locator('.quota-groups-list');
  if (await khoapDetails.count() > 0) {
    const text = await khoapDetails.innerText();
    console.log(text);
    await khoapDetails.screenshot({ path: path.resolve('C:\\Users\\MY CHU\\.gemini\\antigravity\\brain\\d7732fcd-afeb-416a-8826-fc88a0cdbef8\\khoap_details.png') });
  }

  await browser.close();
}

run().catch(console.error);
