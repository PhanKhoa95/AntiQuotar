# Handoff Report — Core Features Refinement Analysis

Analysis and recommendations for implementing Auto-rotation Reactivity, LS Gateway Integration, and Cooldown Management in AntiQuotar.

## 1. Observation
From our investigation of the codebase, we directly observed:
- **Auto-rotation & Quota Check logic** (`src/App.tsx:458-516`): The `runCheck` function performs the threshold checks and schedules auto-rotation, but only does so when the user clicks "Run Check". There is no reactive auto-rotation checking when thresholds, active sessions, or quota values change in state.
- **LS Gateway status endpoint fetch** (`src/App.tsx:505-515`): The frontend queries `settings.lsEndpoint` (`http://127.0.0.1:5188/v1/provision/status`) but only logs the status code (e.g. `200 OK`). It does not read, parse, or synchronize the session and quota information from the JSON payload.
- **LS Gateway endpoint schema** (`tools/Antigravity-Tools-LS/apps/cli-server/src/handlers/provision.rs:223-230`):
  ```rust
  Json(ProvisionStatusResponse {
      ls_core_exists,
      cert_pem_exists,
      bin_dir: bin_dir.display().to_string(),
      data_dir: data_dir.display().to_string(),
      current_version,
      ls_core_hash,
  })
  ```
  While the standard daemon status response does not carry individual session quotas, a mocked endpoint or updated version may return:
  - `quotaUsed` / `quotaLimit` (global/active session metrics)
  - `sessions` (an array of objects containing `id`, `domain`, `label`, `quotaUsed`, `quotaLimit`, `cooldownUntil`, etc.)
- **Cooldown status expiration** (`src/App.tsx`): The session's cooldown remaining is calculated dynamically on-the-fly (`src/App.tsx:168-171`), and the `rotationQueue` places cooldown sessions at the end (`src/App.tsx:363-374`). However, there is no background interval to decrement the cooldown timer dynamically in the UI or to expire it (setting `cooldownUntil` back to `null`) and restore the session to healthy/watch status once the cooldown is over.

---

## 2. Logic Chain
1. **Auto-rotation Reactivity**:
   - *Observation*: Standard React states (`sessions`, `activeId`, `settings`) trigger re-renders, but rotation is only executed imperatively inside `runCheck` or `rotateNow`.
   - *Reasoning*: Adding a React `useEffect` hook listening to `sessions`, `activeId`, and `settings` allows the application to automatically check if the active session's quota usage percentage `pct` has exceeded the `rotateThreshold` whenever the state changes.
   - *Design*: If `settings.autoRotate` is enabled, and the active session exceeds the threshold, use `chooseBestCandidate` to find a healthy or watch session with the lowest quota usage, mark the current active session as cooled down, and switch the active ID to the new session.

2. **LS Gateway Integration**:
   - *Observation*: The existing `runCheck` fetches `settings.lsEndpoint` but ignores the response body.
   - *Reasoning*: Parsing the response as JSON enables the application to synchronize live session and quota states.
   - *Design*: We must try to parse the JSON. If it contains `sessions` array, we match items with our local state (by matching `id`, `label`, or `domain`/`cookieName`) and update their quota metrics. If it contains top-level `quotaUsed` or `quotaLimit`, we update the current active session. If connection fails, log a warning block instead of crashing.

3. **Cooldown Management**:
   - *Observation*: The UI does not tick, so "minutes left" does not decrement automatically. The `cooldownUntil` is never cleared from the state unless manually reset.
   - *Reasoning*: A background timer (`setInterval` inside a `useEffect`) ticking every second will allow the UI to refresh.
   - *Design*: The timer will:
     - Run `setSessions` to check if any session's `cooldownUntil` is in the past, reset it to `null`, log the expiry, and compute its new status.
     - Increment a dummy `tick` state to trigger lightweight UI updates for the "minutes left" countdown.

---

## 3. Caveats
- **Local vs Daemon Sync**: The standard LS Gateway endpoint status response does not include a `sessions` array or top-level `quotaUsed` by default. E2E tests and future extensions must mock or return the correct JSON format (e.g. `{ quotaUsed: 8500, quotaLimit: 10000 }` or `{ sessions: [...] }`) to verify this capability. The design handles both standard daemon status structures and mock extensions gracefully without breaking.
- **Infinite Rotation Risk**: If all sessions exceed the quota threshold and auto-rotate is active, the `useEffect` must not enter an infinite loop. This is avoided because `chooseBestCandidate` returns `null` if no healthy/watch candidates are found, halting the state transition.

---

## 4. Conclusion
We recommend implementing the following structured changes in `src/App.tsx`:

### Proposed Snippet 1: State Initialization & Effects
Add a `tick` state and the two required reactive `useEffect` hooks in the `App` component setup:

```typescript
// Insert around line 321
const [tick, setTick] = useState(0);

// Insert around line 337
// 1. React Auto-rotation Reactivity
useEffect(() => {
  if (!settings.autoRotate || !activeSession) return;

  const pct = usagePercent(activeSession);
  if (pct >= settings.rotateThreshold) {
    const normalized = sessions.map((s) => normalizeSession(s, settings));
    const next = chooseBestCandidate(normalized, activeId);

    if (next) {
      const cooldownUntil = new Date(Date.now() + settings.cooldownMinutes * 60000).toISOString();
      setSessions((current) =>
        current.map((session) => {
          if (session.id === activeId) {
            return normalizeSession({ ...session, cooldownUntil }, settings);
          }
          if (session.id === next.id) {
            return normalizeSession({ ...session, cooldownUntil: null, lastChecked: nowIso() }, settings);
          }
          return session;
        })
      );
      setActiveId(next.id);
      setSelectedId(next.id);
      addLog(`Auto-rotated to ${next.label} (active session quota usage ${pct}% exceeded threshold ${settings.rotateThreshold}%).`, "success");
    }
  }
}, [sessions, activeId, activeSession, settings.autoRotate, settings.rotateThreshold, settings.cooldownMinutes]);

// 3. Cooldown Management background ticker and expiry
useEffect(() => {
  const interval = setInterval(() => {
    let changed = false;

    setSessions((current) => {
      const updated = current.map((session) => {
        if (session.cooldownUntil && new Date(session.cooldownUntil).getTime() <= Date.now()) {
          changed = true;
          addLog(`Session ${session.label} cooldown has expired.`, "success");
          return normalizeSession(
            {
              ...session,
              cooldownUntil: null
            },
            settings
          );
        }
        return session;
      });

      return changed ? updated : current;
    });

    // Tick to refresh minutes remaining in UI
    setTick((t) => t + 1);
  }, 1000);

  return () => clearInterval(interval);
}, [settings]);
```

### Proposed Snippet 2: Refined `runCheck` for LS Gateway Sync
Replace the existing `runCheck` implementation (lines 458-516) to synchronize quota status reactively:

```typescript
const runCheck = async () => {
  const checkedAt = nowIso();
  addLog(`Running quota check...`, "info");

  let lsConnected = false;
  let lsData: any = null;

  if (settings.lsEndpoint.trim()) {
    try {
      const response = await fetch(settings.lsEndpoint, { method: "GET" });
      if (response.ok) {
        lsData = await response.json();
        lsConnected = true;
        addLog(`LS Gateway connected: Syncing session and quota status.`, "success");
      } else {
        addLog(`LS Gateway status returned HTTP ${response.status}.`, "warning");
      }
    } catch (error) {
      addLog(`LS Gateway connection failed (endpoint: ${settings.lsEndpoint}).`, "warning");
    }
  }

  setSessions((current) => {
    // 1. Refresh lastChecked timestamp
    let updated = current.map((session) =>
      normalizeSession(
        {
          ...session,
          lastChecked: checkedAt
        },
        settings
      )
    );

    // 2. Sync parsed JSON stats
    if (lsConnected && lsData) {
      // Sync by sessions list
      if (Array.isArray(lsData.sessions)) {
        updated = updated.map((session) => {
          const match = lsData.sessions.find(
            (item: any) =>
              item.id === session.id ||
              item.label === session.label ||
              (item.domain === session.domain && item.cookieName === session.cookieName)
          );
          if (match) {
            return normalizeSession({
              ...session,
              quotaUsed: typeof match.quotaUsed === 'number' ? match.quotaUsed : session.quotaUsed,
              quotaLimit: typeof match.quotaLimit === 'number' ? match.quotaLimit : session.quotaLimit,
              cooldownUntil: match.cooldownUntil !== undefined ? match.cooldownUntil : session.cooldownUntil
            }, settings);
          }
          return session;
        });
      }
      // Sync by top-level quota fields (applies to active session)
      else if (typeof lsData.quotaUsed === "number" || typeof lsData.quotaLimit === "number") {
        updated = updated.map((session) => {
          if (session.id === activeId) {
            return normalizeSession({
              ...session,
              quotaUsed: typeof lsData.quotaUsed === 'number' ? lsData.quotaUsed : session.quotaUsed,
              quotaLimit: typeof lsData.quotaLimit === 'number' ? lsData.quotaLimit : session.quotaLimit
            }, settings);
          }
          return session;
        });
      }
    }

    return updated;
  });
};
```

---

## 5. Verification Method
1. **Static Validation**:
   - Ensure target project builds successfully using `npm run build` with the changes.
2. **Auto-rotation Test Case**:
   - Set a session's `quotaUsed` close to limit in control panel, decrease threshold so that usage percentage exceeds it. Verify that the session is rotated immediately, marked as cooldown, and the healthy/watch session with lowest usage is promoted.
3. **LS Gateway Integration Test Case**:
   - Mock endpoint `http://127.0.0.1:5188/v1/provision/status` using Playwright or local HTTP server to return `{ "quotaUsed": 9200, "quotaLimit": 10000 }`.
   - Click "Run Check" and verify that:
     - The active session's quota changes to 9200/10000.
     - Logs record success and update.
     - Auto-rotation is triggered since 92% exceeds default 80% threshold.
   - Disable or block the endpoint, click "Run Check" and verify that a warning is logged in the UI Console without crash.
4. **Cooldown timer Test Case**:
   - Add a session, select it, click "Cooldown" to put it into cooldown.
   - Verify that the countdown badge in the UI updates (ticks down) every second.
   - Set the settings cooldown to 1 minute, put a session in cooldown, and wait 1 minute. Verify that the cooldown expires automatically, the state is cleared, status goes back to healthy/watch, and a log item is written.
