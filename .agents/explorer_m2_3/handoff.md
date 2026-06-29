# Handoff Report — explorer_m2_3

## 1. Observation

### 1.1 5-Hour Limit Fallback Logic Location
In `y:\AntiQuotar\tools\local-bridge.cjs`, the 5-hour limit fallback logic resides at lines 289–313:
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

### 1.2 CLI Command Execution
In `y:\AntiQuotar\tools\local-bridge.cjs`, the command `node "${cliPath}" quota --all --json --refresh` is run at lines 51-52 inside the handler for `/v1/accounts` or `/accounts`:
```javascript
51:     const cmdAll = `node "${cliPath}" quota --all --json --refresh`;
52:     exec(cmdAll, { env: { ...process.env, PATH: envPath } }, (error, stdoutAll, stderrAll) => {
```

### 1.3 CLI Command Failure Handling
- **Inside CLI**: In `y:\AntiQuotar\tools\antigravity-usage\src\commands\quota.ts` (lines 122–175), individual account updates are executed sequentially in a `try...catch` block. If an individual fetch fails, it is caught, logged, and either falls back to cached data or adds a result item with `status: 'error'` and the error details. The CLI does not exit with a non-zero code due to individual account failures during the loop.
- **Inside local-bridge.cjs**:
  - If the CLI process exits with a non-zero exit code (e.g., if there are no accounts logged in, triggering `process.exit(1)`), `local-bridge.cjs` immediately returns `500 Internal Server Error` (lines 53-58):
    ```javascript
    53:       if (error) {
    54:         console.error('Error running quota CLI:', error);
    55:         res.writeHead(500, { 'Content-Type': 'application/json' });
    56:         res.end(JSON.stringify({ error: 'Failed to run quota command', details: stderrAll }));
    57:         return;
    58:       }
    ```
  - If JSON parsing of the output fails, it throws and returns a `500` error (lines 346–350):
    ```javascript
    346:         } catch (e) {
    347:           console.error('Failed to parse CLI output:', e);
    348:           res.writeHead(500, { 'Content-Type': 'application/json' });
    349:           res.end(JSON.stringify({ error: 'Failed to parse JSON output', stdout: stdoutAll }));
    350:         }
    ```

### 1.4 Session Matching React State Update Logic
In `y:\AntiQuotar\src\App.tsx` (lines 820-903), when the LS Gateway returns a single session object (`json` is an object, not an array), the state update logic only compares it against the `active` session (lines 821-827):
```javascript
820:       } else if (json && typeof json === 'object') {
821:         const active = sessions.find((session) => session.id === activeId) ?? sessions[0] ?? null;
822:         if (active) {
823:           let isMatch = true;
824:           if (json.id !== undefined && String(json.id) !== active.id) isMatch = false;
825:           if (json.label !== undefined && typeof json.label === 'string' && json.label.toLowerCase() !== active.label.toLowerCase()) isMatch = false;
826:           if (json.email !== undefined && typeof json.email === 'string' && json.email.toLowerCase() === active.label.toLowerCase()) isMatch = true; // email match takes priority
827:           if (json.domain !== undefined && typeof json.domain === 'string' && json.domain.toLowerCase() !== active.domain.toLowerCase()) isMatch = false;
```
If matched, it maps over the `sessions` state, but only modifies the session if its ID matches the active session's ID (lines 885-899):
```javascript
885:             setSessions((current) =>
886:               current.map((session) => {
887:                 if (session.id === active.id) {
888:                   return normalizeSession({
889:                     ...session,
890:                     quotaUsed,
891:                     quotaLimit,
892:                     cooldownUntil,
893:                     quotaGroups,
894:                     lastChecked: checkedAt
895:                   }, settings);
896:                 }
897:                 return session;
898:               })
899:             );
```

---

## 2. Logic Chain

### 2.1 Wrapping 5-Hour Limit Fallback
- `hasExactGroups` indicates if structured, precise quota groups are returned by the Google API or local connection (lines 148-184, 186-220).
- If `hasExactGroups` is `true`, executing the fallback logic (which copies percentages between weekly and 5-hour limit buckets when one is 100%) will override the precise bucket percentages with incorrect data.
- Wrapping lines 290–313 with `if (!hasExactGroups) { ... }` ensures this fallback copies values only when precise groups are missing.

### 2.2 Graceful CLI Error Handling
- The CLI command `quota --all` handles individual account update failures gracefully internally (Obs 1.3).
- Critical CLI failures (e.g. exit code 1 due to no accounts) or parsing failures currently trigger 500 HTTP status responses (Obs 1.3).
- To make these graceful, `local-bridge.cjs` should:
  1. Only reject the execution response if the CLI command fails AND no JSON array is present in `stdoutAll` (e.g., `stdoutAll.indexOf('[') === -1`). If a JSON array is present, it should be processed.
  2. For both CLI execution failures (without stdout JSON) and parsing failures, it should return a `200 OK` status with `{ sessions: [], error: '...' }` instead of a `500` status, ensuring the frontend app doesn't crash.

### 2.3 Fixing Session Matching React State Update
- The current logic (Obs 1.4) compares the incoming single session object ONLY against the `active` session and updates ONLY `session.id === active.id`.
- This is buggy:
  1. If the gateway updates an inactive session, the update is completely ignored and a warning is logged.
  2. If the user has duplicate sessions for the same account, only the active one is updated.
- To fix this, the update logic must map over all sessions in the state array (`current.map`), perform the matching checks for each session against the incoming single `json` object, and update all matching sessions.

---

## 3. Caveats
- **Assumption on CLI exit codes**: We assume that `process.exit(1)` when no accounts are logged in is the primary source of non-zero exit codes.
- **Graceful HTTP status**: We assume returning a 200 OK status code with `{ sessions: [], error: '...' }` is the preferred graceful format for bridge errors.
- No other caveats.

---

## 4. Conclusion

### 4.1 Fallback Wrapping Proposal
Wrap lines 290–313 in `y:\AntiQuotar\tools\local-bridge.cjs` with `if (!hasExactGroups)`:
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

### 4.2 Graceful CLI Execution & Parsing Proposal
Modify lines 52-58 in `y:\AntiQuotar\tools\local-bridge.cjs`:
```javascript
    const cmdAll = `node "${cliPath}" quota --all --json --refresh`;
    exec(cmdAll, { env: { ...process.env, PATH: envPath } }, (error, stdoutAll, stderrAll) => {
      const hasJsonArray = stdoutAll && stdoutAll.indexOf('[') !== -1;
      if (error && !hasJsonArray) {
        console.error('Error running quota CLI:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessions: [], error: 'Failed to run quota command', details: stderrAll }));
        return;
      }
```
And modify lines 346-350 to return 200 OK:
```javascript
        } catch (e) {
          console.error('Failed to parse CLI output:', e);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sessions: [], error: 'Failed to parse JSON output', details: e.message }));
        }
```

### 4.3 Session Matching React Update Proposal
Modify lines 821–903 in `y:\AntiQuotar\src\App.tsx` to map and update all matching sessions:
```javascript
      } else if (json && typeof json === 'object') {
        setSessions((current) => {
          let updatedCount = 0;
          const updated = current.map((session) => {
            let isMatch = false;
            if (json.id !== undefined && String(json.id) === session.id) {
              isMatch = true;
            } else if (json.email !== undefined && typeof json.email === 'string' && json.email.toLowerCase() === session.label.toLowerCase()) {
              isMatch = true;
            } else if (json.label !== undefined && typeof json.label === 'string' && json.label.toLowerCase() === session.label.toLowerCase()) {
              isMatch = true;
            } else {
              const isPersonal = session.label.includes('@') || session.label.toLowerCase().includes('google') || session.label.toLowerCase().includes('claude');
              if (!isPersonal && json.domain !== undefined && typeof json.domain === 'string' && json.domain.toLowerCase() === session.domain.toLowerCase()) {
                isMatch = true;
              }
            }

            if (isMatch) {
              let quotaUsed = session.quotaUsed;
              let quotaLimit = session.quotaLimit;

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

              let cooldownUntil = session.cooldownUntil;
              if (json.cooldownUntil !== undefined) {
                cooldownUntil = json.cooldownUntil;
              } else if (json.cooldown_until !== undefined) {
                cooldownUntil = json.cooldown_until;
              }

              let quotaGroups = session.quotaGroups;
              if (json.quotaGroups !== undefined) {
                quotaGroups = json.quotaGroups;
              }

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
              addLog(`Synchronized ${updatedCount} session(s) quota from LS Gateway.`, "success");
            }, 0);
          } else {
            setTimeout(() => {
              addLog("LS Gateway response did not match any session.", "warning");
            }, 0);
          }

          return updated;
        });
      }
```

---

## 5. Verification Method

- **Verify Fallback Wrapping**:
  - Run the local bridge and query the `/v1/accounts` API with structured quota groups present.
  - Verify that the returned limits match the exact values in the groups without being overriden by the fallback.
- **Verify Graceful Error Handling**:
  - Terminate or misconfigure the account managers (or clear accounts list).
  - Execute a GET request to `/v1/accounts`:
    ```powershell
    Invoke-RestMethod -Uri "http://127.0.0.1:5188/v1/accounts"
    ```
  - Verify that the HTTP status returned is `200 OK` and the body is `{ sessions: [], error: "..." }` rather than a 500 error page.
- **Verify Session matching React State**:
  - Insert two matching sessions (same account email/label) into the UI.
  - Send a single session update event from the LS Gateway for that account.
  - Verify that both matching sessions are updated in the UI list simultaneously.
