## 2026-06-29T06:22:40Z

You are worker_swapping_1. Your working directory is y:\AntiQuotar\.agents\worker_swapping_1.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement a new interactive E2E browser test scenario in `tests/antiquotar.spec.ts` to verify the active account promotion, filesystem credentials sync, CLI config updates, Credential Manager sync, and the absence of login prompts.

Instructions:
1. Open `tests/antiquotar.spec.ts` and add Node imports for `fs` and `path` at the top of the file:
   ```typescript
   import fs from 'fs';
   import path from 'path';
   ```
2. Locate the end of the `test.describe('Tier 4: Real-World Scenarios', () => {` block (near the end of `tests/antiquotar.spec.ts`).
3. Add the following new E2E test case as test number 51:
   ```typescript
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
   ```
4. Verify the changes by running:
   - `npm run build`
   - `npx playwright test`
   - `npm run test:smoke`
5. Report the build and test results back to the main agent. Ensure that all 55 tests pass successfully. Write your progress to `y:\AntiQuotar\.agents\worker_swapping_1\progress.md` after each step. Send a final message to the main agent when completed.
