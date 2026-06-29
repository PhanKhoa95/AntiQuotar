const { chromium } = require('@playwright/test');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Log browser console output
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

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
    await page.waitForTimeout(6000); // Wait longer for fetch and DOM update
  }

  const rows = page.locator('.table-row:not(.table-head)');
  const count = await rows.count();
  console.log(`Found ${count} session row(s) in table.`);

  // Click khoap1220@gmail.com
  console.log('\n--- CLICKING khoap1220@gmail.com ---');
  let khoapRow = null;
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).innerText();
    if (text.includes('khoap1220@gmail.com')) {
      khoapRow = rows.nth(i);
      break;
    }
  }
  
  if (khoapRow) {
    await khoapRow.click();
    await page.waitForTimeout(1000);
    const activePanelText = await page.locator('.active-panel').innerText();
    console.log(activePanelText.substring(0, 1000));
    
    // Save screenshot
    await page.locator('.active-panel').screenshot({ path: path.resolve('C:\\Users\\MY CHU\\.gemini\\antigravity\\brain\\d7732fcd-afeb-416a-8826-fc88a0cdbef8\\selected_khoap1220.png') });
    console.log('Saved selected_khoap1220.png');
  }

  // Click hoangmai160501@gmail.com
  console.log('\n--- CLICKING hoangmai160501@gmail.com ---');
  let hoangmaiRow = null;
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).innerText();
    if (text.includes('hoangmai160501@gmail.com')) {
      hoangmaiRow = rows.nth(i);
      break;
    }
  }

  if (hoangmaiRow) {
    await hoangmaiRow.click();
    await page.waitForTimeout(1000);
    const activePanelText = await page.locator('.active-panel').innerText();
    console.log(activePanelText.substring(0, 1000));
    
    // Save screenshot
    await page.locator('.active-panel').screenshot({ path: path.resolve('C:\\Users\\MY CHU\\.gemini\\antigravity\\brain\\d7732fcd-afeb-416a-8826-fc88a0cdbef8\\selected_hoangmai160501.png') });
    console.log('Saved selected_hoangmai160501.png');
  }

  await browser.close();
}

run().catch(console.error);
