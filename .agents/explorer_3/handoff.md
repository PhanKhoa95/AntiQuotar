# Handoff Report - Core Features Refinement

Analysis and design to refine the three core features of AntiQuotar: React Auto-rotation Reactivity, LS Gateway Integration, and Cooldown Management.

## 1. Observation
From reading `c:\Users\KHOA MEDIA\Documents\AntiQuotar\src\App.tsx` and related LS Gateway files, we observed the following:

- **React Auto-rotation Reactivity (App.tsx: 458-516, 518-541)**:
  Auto-rotation is currently only calculated in a procedural manner inside `runCheck` and `rotateNow`. There is no reactive hook checking the active session's status automatically whenever its quota or threshold changes.
- **LS Gateway Integration (App.tsx: 505-515)**:
  `runCheck` performs a simple `fetch` to `settings.lsEndpoint` but ignores the response body. It does not parse or synchronize session and quota status from the JSON payload.
- **LS Gateway API Structure (provision.rs: 202-231)**:
  The `/v1/provision/status` endpoint returns a JSON object representing the state of binaries and configuration:
  ```json
  {
    "ls_core_exists": true,
    "cert_pem_exists": true,
    "bin_dir": "/path/to/bin",
    "data_dir": "/path/to/data",
    "current_version": "1.0.0",
    "ls_core_hash": "..."
  }
  ```
- **Cooldown Management (App.tsx: 168-171, 947)**:
  Cooldown calculations are done via a dynamic call to `minutesUntil(session.cooldownUntil)`. However, there is no recurring `setInterval` to force re-renders or to clear/expire cooldowns in the persisted state once they pass their end time.

---

## 2. Logic Chain
Based on the observations:
1. **Reactivity**: Since session status changes can happen due to manual edits in the session controller or external sync, we should set up a `useEffect` that monitors `activeSession` and `settings.autoRotate`. If `activeSession` status is `high`, `critical`, or `cooldown` (meaning quota limit percent >= `rotateThreshold` or cooldown is active), it will select the best healthy/watch candidate and swap them.
2. **LS Sync**: We must modify `runCheck` to await the JSON response. The synchronization should be flexible: if the JSON is an array of accounts/sessions, it matches each item with local sessions (by id, domain, label, or email) and updates `quotaUsed` and `quotaLimit`. If the JSON is a single object, it matches against the active session's properties. If the connection fails, it catches the error and logs a warning message.
3. **Cooldowns**: To keep the UI countdown accurate and to transition sessions back to healthy state, we need a recurring mechanism. A `useEffect` with a `setInterval` ticking every 10 seconds will update a `cooldownTick` state to force UI re-evaluation, and will check if any session's `cooldownUntil` is in the past. If so, it updates the session state to set `cooldownUntil: null` so it is saved to localStorage.

---

## 3. Caveats
- Since the LS Gateway endpoint `/v1/provision/status` only returns binary information in the default implementation, any actual session quota sync requires the gateway to return the correct session data or needs a mock in the test environment to return matched fields like `quotaUsed` / `quotaLimit`. Our synchronization logic is designed to be highly flexible and backward-compatible to handle both structured lists and flat objects.
- CODE_ONLY mode constraints prevent the explorer agent from running external HTTP requests to verify the actual endpoint behavior live.

---

## 4. Conclusion
The core features of AntiQuotar must be updated in `src/App.tsx` to ensure proper reactive rotation, real LS synchronization, and ticking cooldowns. Below are the recommended code adjustments.

### Proposed Code Snippets (Ref Replacement Strategy)

#### A. Cooldown Hook and Memo Dependencies
Place inside `App()` in `src/App.tsx`:

```typescript
  const [cooldownTick, setCooldownTick] = useState(0);

  // Recurring mechanism to update cooldown countdowns and expire finished cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldownTick((t) => t + 1);

      setSessions((current) => {
        let changed = false;
        const updated = current.map((session) => {
          if (session.cooldownUntil && new Date(session.cooldownUntil).getTime() <= Date.now()) {
            changed = true;
            addLog(`Cooldown expired for ${session.label}.`, "info");
            return {
              ...session,
              cooldownUntil: null
            };
          }
          return session;
        });
        return changed ? updated : current;
      });
    }, 10000); // Ticks every 10 seconds

    return () => clearInterval(timer);
  }, []);
```

Update `normalizedSessions` and `rotationQueue` dependency arrays to include `cooldownTick`:
```typescript
  const normalizedSessions = useMemo(
    () => sessions.map((session) => normalizeSession(session, settings)),
    [sessions, settings, cooldownTick]
  );

  const rotationQueue = useMemo(
    () =>
      [...normalizedSessions].sort((a, b) => {
        const rank = statusRank[a.status] - statusRank[b.status];
        if (rank !== 0) return rank;
        if (a.status === "cooldown") {
          return minutesUntil(a.cooldownUntil) - minutesUntil(b.cooldownUntil);
        }
        return usagePercent(a) - usagePercent(b);
      }),
    [normalizedSessions, cooldownTick]
  );
```

#### B. React Auto-rotation Reactivity
Place inside `App()` in `src/App.tsx`:

```typescript
  // Reactive Auto-rotation when active session exceeds the rotateThreshold
  useEffect(() => {
    if (!settings.autoRotate || !activeSession) return;

    const pct = usagePercent(activeSession);
    if (pct >= settings.rotateThreshold || activeSession.status === "cooldown") {
      const candidate = chooseBestCandidate(sessions, activeId);
      if (candidate) {
        const checkedAt = nowIso();
        const cooldownUntil = new Date(Date.now() + settings.cooldownMinutes * 60000).toISOString();
        
        setSessions((current) =>
          current.map((session) => {
            if (session.id === activeId) {
              return normalizeSession({ ...session, cooldownUntil }, settings);
            }
            if (session.id === candidate.id) {
              return normalizeSession({ ...session, cooldownUntil: null, lastChecked: checkedAt }, settings);
            }
            return session;
          })
        );
        setActiveId(candidate.id);
        setSelectedId(candidate.id);
        addLog(
          `Auto-rotated to ${candidate.label} because active session exceeded threshold (${pct}% >= ${settings.rotateThreshold}%).`,
          "success"
        );
      }
    }
  }, [activeId, activeSession?.quotaUsed, activeSession?.quotaLimit, activeSession?.cooldownUntil, settings.autoRotate, settings.rotateThreshold, settings.cooldownMinutes, sessions]);
```

#### C. Updated `runCheck` with LS Gateway Sync
Replace `runCheck` in `src/App.tsx`:

```typescript
  const runCheck = async () => {
    const checkedAt = nowIso();
    let fetchedData: any = null;

    if (settings.lsEndpoint.trim()) {
      try {
        const response = await fetch(settings.lsEndpoint, { method: "GET" });
        if (response.ok) {
          fetchedData = await response.json();
          addLog(`LS endpoint responded with ${response.status}.`, "success");
        } else {
          addLog(`LS endpoint returned ${response.status}.`, "warning");
        }
      } catch {
        addLog("Local LS endpoint did not respond. Connection failed.", "warning");
      }
    }

    setSessions((current) => {
      let updatedCount = 0;
      const normalized = current.map((session) => {
        let newUsed = session.quotaUsed;
        let newLimit = session.quotaLimit;

        if (fetchedData) {
          const matchAndExtract = (obj: any) => {
            const isMatch = 
              (obj.id && obj.id === session.id) ||
              (obj.label && obj.label.toLowerCase() === session.label.toLowerCase()) ||
              (obj.domain && obj.domain.toLowerCase() === session.domain.toLowerCase()) ||
              (obj.email && session.label.toLowerCase().includes(obj.email.toLowerCase()));
              
            if (isMatch) {
              if (typeof obj.quotaUsed === "number") newUsed = obj.quotaUsed;
              else if (typeof obj.quota_used === "number") newUsed = obj.quota_used;
              else if (typeof obj.used === "number") newUsed = obj.used;
              
              if (typeof obj.quotaLimit === "number") newLimit = obj.quotaLimit;
              else if (typeof obj.quota_limit === "number") newLimit = obj.quota_limit;
              else if (typeof obj.limit === "number") newLimit = obj.limit;
              
              if (obj.quota) {
                const q = obj.quota;
                if (typeof q.used === "number") newUsed = q.used;
                if (typeof q.limit === "number") newLimit = q.limit;
              }
              updatedCount++;
            }
          };

          if (Array.isArray(fetchedData)) {
            for (const item of fetchedData) {
              matchAndExtract(item);
            }
          } else if (fetchedData && typeof fetchedData === "object") {
            const list = fetchedData.sessions || fetchedData.accounts || fetchedData.items;
            if (Array.isArray(list)) {
              for (const item of list) {
                matchAndExtract(item);
              }
            } else {
              // Flat object fallback for active session
              if (session.id === activeId) {
                if (typeof fetchedData.quotaUsed === "number") { newUsed = fetchedData.quotaUsed; updatedCount++; }
                else if (typeof fetchedData.quota_used === "number") { newUsed = fetchedData.quota_used; updatedCount++; }
                else if (typeof fetchedData.used === "number") { newUsed = fetchedData.used; updatedCount++; }
                
                if (typeof fetchedData.quotaLimit === "number") { newLimit = fetchedData.quotaLimit; updatedCount++; }
                else if (typeof fetchedData.quota_limit === "number") { newLimit = fetchedData.quota_limit; updatedCount++; }
                else if (typeof fetchedData.limit === "number") { newLimit = fetchedData.limit; updatedCount++; }

                if (fetchedData.quota) {
                  const q = fetchedData.quota;
                  if (typeof q.used === "number") { newUsed = q.used; updatedCount++; }
                  if (typeof q.limit === "number") { newLimit = q.limit; updatedCount++; }
                }
              }
            }
          }
        }

        return normalizeSession(
          {
            ...session,
            quotaUsed: newUsed,
            quotaLimit: newLimit,
            lastChecked: checkedAt
          },
          settings
        );
      });

      if (fetchedData && updatedCount > 0) {
        addLog(`Synchronized ${updatedCount} session(s) with LS Gateway data.`, "success");
      }

      return normalized;
    });
  };
```

---

## 5. Verification Method
- **Static Verification**: Compile-time check using `npm run build` to verify there are no TypeScript or compilation errors.
- **Dynamic Verification**:
  1. Set active session's quota such that the usage exceeds the threshold configured in Rules. Verify that it auto-rotates.
  2. Start a mock server on `http://127.0.0.1:5188` returning structured JSON representing session status. Click "Run Check" and verify that the session's quota matches the mock server data in the UI.
  3. Close or kill the mock server, click "Run Check" again, and verify that the warning log: `"Local LS endpoint did not respond. Connection failed."` is shown in Logs.
  4. Trigger a cooldown on a session. Observe that the time left decrements every 10 seconds and upon reaching 0, the session's status transitions automatically back to `healthy`/`watch`.
