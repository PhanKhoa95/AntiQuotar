# Handoff Report - explorer_m2_1

## 1. Observation

### Fallback Logic in `local-bridge.cjs`
We observed that the 5-hour limit fallback logic in `y:\AntiQuotar\tools\local-bridge.cjs` is located at lines 289-313:
```javascript
289:             // Fallback for missing limits within the same model category
290:             if (geminiWeekly.percentage === 100 && geminiFiveHour.percentage < 100) {
291:               geminiWeekly = {
292:                 percentage: geminiFiveHour.percentage,
293:                 resetText: 'You have used some of your weekly limit, it will fully refresh in weekly cycle.'
294:               };
295:             }
296:             if (geminiFiveHour.percentage === 100 && geminiWeekly.percentage < 100) {
297:               geminiFiveHour = {
298:                 percentage: geminiWeekly.percentage,
299:                 resetText: 'You have used some of your 5-hour limit, it will fully refresh in 5 hours.'
300:               };
301:             }
302:             if (claudeWeekly.percentage === 100 && claudeFiveHour.percentage < 100) {
303:               claudeWeekly = {
304:                 percentage: claudeFiveHour.percentage,
305:                 resetText: 'You have used some of your weekly limit, it will fully refresh in weekly cycle.'
306:               };
307:             }
308:             if (claudeFiveHour.percentage === 100 && claudeWeekly.percentage < 100) {
309:               claudeFiveHour = {
310:                 percentage: claudeWeekly.percentage,
311:                 resetText: 'You have used some of your 5-hour limit, it will fully refresh in 5 hours.'
312:               };
313:             }
```

### CLI Quota command execution in `local-bridge.cjs`
The CLI command `quota --all --json --refresh` is run at lines 51-58 of `y:\AntiQuotar\tools\local-bridge.cjs`:
```javascript
51:     const cmdAll = `node "${cliPath}" quota --all --json --refresh`;
52:     exec(cmdAll, { env: { ...process.env, PATH: envPath } }, (error, stdoutAll, stderrAll) => {
53:       if (error) {
54:         console.error('Error running quota CLI:', error);
55:         res.writeHead(500, { 'Content-Type': 'application/json' });
56:         res.end(JSON.stringify({ error: 'Failed to run quota command', details: stderrAll }));
57:         return;
58:       }
```
Currently, any non-zero exit code of the CLI (signalled by Node's `exec` as `error`) causes a `500` error response, even if some accounts refreshed successfully and were written to `stdoutAll`.
Individual account updates are run inside a sequential loop in `fetchAllAccountsQuota` in `y:\AntiQuotar\tools\antigravity-usage\src\commands\quota.ts` (lines 119-175). When a single account's quota fetch throws an error, it is caught at line 153:
```javascript
153:     } catch (err) {
154:       debug('quota', `Error fetching quota for ${email}:`, err)
155: 
156:       // Try to use cached data on error
157:       const cached = loadCache(email)
158:       if (cached) {
159:         results.push({
...
165:         })
166:       } else {
167:         results.push({
168:           email,
169:           isActive,
170:           status: 'error',
171:           error: err instanceof Error ? err.message : 'Unknown error'
172:         })
173:       }
174:     }
```
The CLI command itself does not throw or exit with non-zero when a loop item fails; it prints the JSON array with `'status': 'error'` elements and exits with code 0. However, if the CLI process itself fails (e.g. no accounts exist, or other unexpected process-level issues occur), `exec` returns `error` and we currently crash/500 the request.

### React State Session Matching in `App.tsx`
In `y:\AntiQuotar\src\App.tsx` (lines 653-900), the response from the local bridge is processed.
If the response is an array (lines 653-819), the code maps over all sessions in `current` and checks for a match.
If the response is a single object (lines 820-900), the code only matches against the active session:
```javascript
821:         const active = sessions.find((session) => session.id === activeId) ?? sessions[0] ?? null;
822:         if (active) {
823:           let isMatch = true;
824:           if (json.id !== undefined && String(json.id) !== active.id) isMatch = false;
825:           if (json.label !== undefined && typeof json.label === 'string' && json.label.toLowerCase() !== active.label.toLowerCase()) isMatch = false;
826:           if (json.email !== undefined && typeof json.email === 'string' && json.email.toLowerCase() === active.label.toLowerCase()) isMatch = true; // email match takes priority
827:           if (json.domain !== undefined && typeof json.domain === 'string' && json.domain.toLowerCase() !== active.domain.toLowerCase()) isMatch = false;
828: 
829:           if (isMatch) {
...
885:             setSessions((current) =>
886:               current.map((session) => {
887:                 if (session.id === active.id) {
...
```
This updates ONLY the single active session, ignoring any other matching sessions in the list (e.g. duplicate accounts or manually added matching sessions).

---

## 2. Logic Chain

1. **Rule 1 Verification (Fallback logic)**: When `hasExactGroups` is `true`, we have exact quota values retrieved directly. Overwriting these exact values using the category fallback logic would erase correct 100% metrics. Therefore, wrapping the fallback logic inside `if (!hasExactGroups)` prevents destructive overrides.
2. **Rule 2 Verification (Graceful CLI failures)**: If the CLI returns a non-zero exit code, `exec` populates `error`. However, `stdoutAll` may still contain partial or complete JSON data. Rather than immediately returning a `500` error, we can attempt to parse the JSON array from `stdoutAll`. If the JSON is valid, we can log the CLI error as a warning and proceed gracefully.
3. **Rule 3 Verification (Session matching)**: When `runCheck` receives a single session object from the LS Gateway, it should update every local session that matches that item. Refactoring the matching condition into a reusable `sessionMatchesItem` function and mapping it over the entire `current` array ensures all duplicate or matching entries are updated simultaneously.

---

## 3. Caveats

* We assume that when the CLI returns an error, any stdout output that contains a `[` is a valid JSON array. We handle parsing errors safely via `try/catch`.
* We assume that if `activeQuota` is present, it is mapped to matching emails.

---

## 4. Conclusion & Proposed Changes

### Proposal 1: Wrap fallback logic with `!hasExactGroups` in `local-bridge.cjs`

Wrap the fallback conditions in `if (!hasExactGroups) { ... }`.

**Before**:
```javascript
            // Fallback for missing limits within the same model category
            if (geminiWeekly.percentage === 100 && geminiFiveHour.percentage < 100) {
              ...
            }
```

**After**:
```javascript
            // Fallback for missing limits within the same model category
            if (!hasExactGroups) {
              if (geminiWeekly.percentage === 100 && geminiFiveHour.percentage < 100) {
                geminiWeekly = {
                  percentage: geminiFiveHour.percentage,
                  resetText: 'You have used some of your weekly limit, it will fully refresh in weekly cycle.'
                };
              }
              if (geminiFiveHour.percentage === 100 && geminiWeekly.percentage < 100) {
                geminiFiveHour = {
                  percentage: geminiWeekly.percentage,
                  resetText: 'You have used some of your 5-hour limit, it will fully refresh in 5 hours.'
                };
              }
              if (claudeWeekly.percentage === 100 && claudeFiveHour.percentage < 100) {
                claudeWeekly = {
                  percentage: claudeFiveHour.percentage,
                  resetText: 'You have used some of your weekly limit, it will fully refresh in weekly cycle.'
                };
              }
              if (claudeFiveHour.percentage === 100 && claudeWeekly.percentage < 100) {
                claudeFiveHour = {
                  percentage: claudeWeekly.percentage,
                  resetText: 'You have used some of your 5-hour limit, it will fully refresh in 5 hours.'
                };
              }
            }
```

---

### Proposal 2: Graceful CLI Failures in `local-bridge.cjs`

Modify the `exec(cmdAll, ...)` callback in `local-bridge.cjs` (lines 52-58) to check if we can successfully parse the output before responding with a 500 error.

**Before**:
```javascript
    exec(cmdAll, { env: { ...process.env, PATH: envPath } }, (error, stdoutAll, stderrAll) => {
      if (error) {
        console.error('Error running quota CLI:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to run quota command', details: stderrAll }));
        return;
      }
```

**After**:
```javascript
    exec(cmdAll, { env: { ...process.env, PATH: envPath } }, (error, stdoutAll, stderrAll) => {
      let parsed = null;
      let parseError = null;
      if (stdoutAll) {
        try {
          const jsonStart = stdoutAll.indexOf('[');
          if (jsonStart !== -1) {
            parsed = JSON.parse(stdoutAll.slice(jsonStart));
          }
        } catch (e) {
          parseError = e;
        }
      }

      if (error && !parsed) {
        console.error('Error running quota CLI:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to run quota command', details: stderrAll || (parseError && parseError.message) }));
        return;
      }
      
      if (error) {
        console.warn('Quota CLI encountered an error, but proceeding with parsed output:', error);
      }
```

---

### Proposal 3: Update all matching sessions in `App.tsx`

Extract a helper `sessionMatchesItem` and rewrite the single object handling path to update all sessions matching the object.

**Helper function (can be placed inside/outside `runCheck`):**
```javascript
const sessionMatchesItem = (session, item) => {
  if (!item || typeof item !== 'object') return false;
  if (item.id !== undefined && String(item.id) === session.id) return true;
  if (item.label !== undefined && typeof item.label === 'string' && item.label.toLowerCase() === session.label.toLowerCase()) return true;
  if (item.email !== undefined && typeof item.email === 'string' && item.email.toLowerCase() === session.label.toLowerCase()) return true;
  
  const isPersonal = session.label.includes('@') || session.label.toLowerCase().includes('google') || session.label.toLowerCase().includes('claude');
  if (!isPersonal && item.domain !== undefined && typeof item.domain === 'string' && item.domain.toLowerCase() === session.domain.toLowerCase()) return true;
  return false;
};
```

**Array update (lines 658-668):**
```javascript
          // 1. Cập nhật các session đã tồn tại
          const updated = current.map((session) => {
            const match = items.find((item) => sessionMatchesItem(session, item));
```

**Single object update (lines 820-901) - BEFORE:**
```javascript
      } else if (json && typeof json === 'object') {
        const active = sessions.find((session) => session.id === activeId) ?? sessions[0] ?? null;
        if (active) {
          let isMatch = true;
          if (json.id !== undefined && String(json.id) !== active.id) isMatch = false;
          if (json.label !== undefined && typeof json.label === 'string' && json.label.toLowerCase() !== active.label.toLowerCase()) isMatch = false;
          if (json.email !== undefined && typeof json.email === 'string' && json.email.toLowerCase() === active.label.toLowerCase()) isMatch = true; // email match takes priority
          if (json.domain !== undefined && typeof json.domain === 'string' && json.domain.toLowerCase() !== active.domain.toLowerCase()) isMatch = false;

          if (isMatch) {
            let quotaUsed = active.quotaUsed;
            ...
            setSessions((current) =>
              current.map((session) => {
                if (session.id === active.id) {
                  return normalizeSession({
                    ...session,
                    quotaUsed,
                    quotaLimit,
                    cooldownUntil,
                    quotaGroups,
                    lastChecked: checkedAt
                  }, settings);
                }
                return session;
              })
            );
            addLog(`Synchronized active session ${active.label} quota from LS Gateway.`, "success");
          }
        }
      }
```

**Single object update (lines 820-901) - AFTER:**
```javascript
      } else if (json && typeof json === 'object') {
        let updatedCount = 0;
        
        let quotaUsed = 0;
        let quotaLimit = 100;

        if (json.quotaUsed !== undefined) {
          quotaUsed = Number(json.quotaUsed);
        } else if (json.used !== undefined) {
          quotaUsed = Number(json.used);
        } else if (json.quota_used !== undefined) {
          quotaUsed = Number(json.quota_used);
        }

        if (json.quotaLimit !== undefined) {
          quotaLimit = Number(json.quotaLimit);
        } else if (json.limit !== undefined) {
          quotaLimit = Number(json.limit);
        } else if (json.quota_limit !== undefined) {
          quotaLimit = Number(json.quota_limit);
        } else if (json.quota !== undefined && typeof json.quota !== 'object') {
          quotaLimit = Number(json.quota);
        }

        if (json.quota && typeof json.quota === 'object') {
          const q = json.quota;
          if (q.used !== undefined) {
            quotaUsed = Number(q.used);
          }
          if (q.limit !== undefined) {
            quotaLimit = Number(q.limit);
          }
          if (Array.isArray(q.models) && q.models.length > 0) {
            const minRemainingPct = q.models.reduce((min, m) => {
              const pct = m.percentage !== undefined ? Number(m.percentage) : 100;
              return pct < min ? pct : min;
            }, 100);
            quotaLimit = 100;
            quotaUsed = Math.max(0, 100 - minRemainingPct);
          }
        } else if (json.quota_percentage !== undefined) {
          const remainingPct = Number(json.quota_percentage);
          quotaLimit = 100;
          quotaUsed = Math.max(0, 100 - remainingPct);
        }

        let cooldownUntil = json.cooldownUntil || json.cooldown_until || null;
        let quotaGroups = json.quotaGroups || null;

        setSessions((current) => {
          const updated = current.map((session) => {
            if (sessionMatchesItem(session, json)) {
              updatedCount++;
              return normalizeSession({
                ...session,
                quotaUsed,
                quotaLimit,
                cooldownUntil,
                quotaGroups,
                lastChecked: checkedAt
              }, settings);
            }
            return session;
          });
          
          if (updatedCount > 0) {
            setTimeout(() => {
              addLog(`Synchronized ${updatedCount} matching session(s) from LS Gateway.`, "success");
            }, 0);
          } else {
            setTimeout(() => {
              addLog("Quota state refreshed from LS Gateway (0 sessions matched).", "success");
            }, 0);
          }
          
          return updated;
        });
      }
```

---

## 5. Verification Method

To verify these changes:
1. Run the local-bridge server: `node tools/local-bridge.cjs`
2. Test CLI fallback logic: Verify that if Google API returns custom quota groups, they are not mutated or overridden by the 5-hour limit fallback calculations.
3. Test Graceful CLI Failures: Temporarily simulate a CLI failure (e.g. throw an error or exit with `1` inside `quota.ts`), but ensure `local-bridge.cjs` still serves the accounts data successfully to the frontend if `stdoutAll` contains valid JSON.
4. Run playwritght/e2e tests to verify that no integrations are broken:
   * Run: `npx playwright test`
