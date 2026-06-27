# Handoff Report — Explorer 2

This report provides the analysis, design, and detailed implementation plan to refine the core features of AntiQuotar: React Auto-rotation Reactivity, LS Gateway Integration, and Cooldown Management.

---

## 1. Observation

Direct observations made on the codebase (`src/App.tsx` and related configuration files):

### Active Session memoization
Currently, `activeSession` is derived directly from raw `sessions` state (lines 342-345):
```typescript
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? sessions[0] ?? null,
    [activeId, sessions]
  );
```
This means its status calculation doesn't benefit from dynamic normalization updates or real-time cooldown changes.

### Run Check LS Gateway interaction
Currently, the `runCheck` function does not synchronize session or quota values from the response payload, and it checks auto-rotation before performing the fetch (lines 458-516):
```typescript
  const runCheck = async () => {
    const checkedAt = nowIso();
    let rotatedTo: CookieSession | null = null;
    
    // Auto-rotates using local values before the LS fetch!
    setSessions((current) => { ... });
    
    ...
    try {
      const response = await fetch(settings.lsEndpoint, { method: "GET" });
      addLog(
        response.ok
          ? `LS endpoint responded with ${response.status}.`
          : `LS endpoint returned ${response.status}.`,
        response.ok ? "success" : "warning"
      );
    } catch {
      addLog("Local LS endpoint did not respond. Session quota state was still refreshed.", "warning");
    }
  };
```

### Cooldown calculations are impure and non-reactive
Currently, `minutesUntil` (lines 168-171) relies directly on the side-effectful `Date.now()` without React state awareness:
```typescript
const minutesUntil = (iso: string | null) => {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
};
```
Because no reactive state forces periodic re-evaluation or decrementing of remaining minutes, the cooldown displays and state order in the UI remain stale.

---

## 2. Logic Chain

### 2.1 React Auto-rotation Reactivity
* **Premise**: Auto-rotation must be reactive to quota updates (such as updates received from the LS Gateway or manual updates in the Session Control panel).
* **Reasoning**: Instead of hardcoding rotation logic only inside user action handlers like `runCheck`, a `useEffect` hook should monitor the active session's quota usage. Whenever `activeSession` usage exceeds `settings.rotateThreshold` (or status enters `cooldown`), the effect automatically selects the best candidate session, sets a cooldown on the active one, and promotes the candidate.
* **Impact**: Separates the data fetching/input logic from the rotation side effects, preventing race conditions and ensuring that all update channels (LS sync, manual edits) trigger auto-rotation correctly.

### 2.2 LS Gateway Integration
* **Premise**: `runCheck` must fetch the gateway status and synchronize quota values with local sessions.
* **Reasoning**: When the endpoint `http://127.0.0.1:5188/v1/provision/status` is successfully fetched, the JSON payload needs to be parsed. We should implement matching logic that checks:
  1. A `sessions` array in the JSON to match with local sessions by ID, domain, or label.
  2. An `accounts` array (e.g. from the underlying account manager structure) to match by label/email.
  3. Direct `quotaUsed` and `quotaLimit` fields at the root of the response as a fallback for the active session.
  If the fetch fails, it logs a warning via `addLog(..., "warning")`.

### 2.3 Cooldown Management
* **Premise**: Remaining minutes and cooldown expirations must update reactively.
* **Reasoning**:
  1. Introduce a `currentTime` state that updates every 10 seconds via `setInterval`.
  2. Modify `minutesUntil`, `calculateStatus`, and `normalizeSession` to accept a `now` timestamp argument (defaulting to `Date.now()`).
  3. Include `currentTime` in the dependency arrays of `normalizedSessions` and `rotationQueue` so they automatically recalculate remaining cooldown minutes and re-sort sessions.
  4. In the interval effect, check if any session's `cooldownUntil` has elapsed. If so, update the `sessions` state (clearing `cooldownUntil` and recalculating status) so that the session transitions out of cooldown and automatically auto-saves to `localStorage`.

---

## 3. Caveats

* **CORS / Network Permissions**: The local LS Gateway must support CORS headers if AntiQuotar is loaded via `http://127.0.0.1:5173/` or a custom origin.
* **Interval Resolution**: An interval of 10 seconds is used for countdown updates. This is a good balance between UI responsiveness and rendering efficiency.
* **Gateway Schema Variance**: The parser handles `sessions`, `accounts`, and root-level fields to remain robust against different versions of the LS Gateway payload structure.

---

## 4. Conclusion & Proposed Implementation Plan

The proposed changes below refine the core features without modifying source code directly, keeping the codebase buildable and clean.

### Proposed Code Diff for `src/App.tsx`

#### 4.1 Update Cooldown Helper Signatures (Lines 168-196)

```typescript
// Before
const minutesUntil = (iso: string | null) => {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
};

const calculateStatus = (session: CookieSession, threshold: number): SessionStatus => {
  if (minutesUntil(session.cooldownUntil) > 0) return "cooldown";
  const pct = usagePercent(session);
  if (pct >= 90) return "critical";
  if (pct >= threshold) return "high";
  if (pct >= Math.max(60, threshold - 20)) return "watch";
  return "healthy";
};

const normalizeSession = (session: CookieSession, settings: AppSettings): CookieSession => ({
  ...session,
  status: calculateStatus(session, settings.rotateThreshold)
});

// After
const minutesUntil = (iso: string | null, now: number = Date.now()) => {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60000));
};

const calculateStatus = (session: CookieSession, threshold: number, now: number = Date.now()): SessionStatus => {
  if (minutesUntil(session.cooldownUntil, now) > 0) return "cooldown";
  const pct = usagePercent(session);
  if (pct >= 90) return "critical";
  if (pct >= threshold) return "high";
  if (pct >= Math.max(60, threshold - 20)) return "watch";
  return "healthy";
};

const normalizeSession = (session: CookieSession, settings: AppSettings, now: number = Date.now()): CookieSession => ({
  ...session,
  status: calculateStatus(session, settings.rotateThreshold, now)
});
```

#### 4.2 Initialize `currentTime` State & Add Cooldown Interval Effect

Add this state and effect right inside `App()` component:

```typescript
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Cooldown decrement & expiration manager
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      // Auto-expire cooldowns when their time has passed
      setSessions((current) => {
        let changed = false;
        const updated = current.map((session) => {
          if (session.cooldownUntil && new Date(session.cooldownUntil).getTime() <= now) {
            changed = true;
            return normalizeSession({ ...session, cooldownUntil: null }, settings, now);
          }
          return session;
        });
        return changed ? updated : current;
      });
    }, 10000); // 10-second tick resolution
    return () => clearInterval(timer);
  }, [settings]);
```

#### 4.3 Update Selector Memos to depend on `currentTime` (Lines 342-374)

```typescript
  // Before
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? sessions[0] ?? null,
    [activeId, sessions]
  );

  const normalizedSessions = useMemo(
    () => sessions.map((session) => normalizeSession(session, settings)),
    [sessions, settings]
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
    [normalizedSessions]
  );

  // After
  const normalizedSessions = useMemo(
    () => sessions.map((session) => normalizeSession(session, settings, currentTime)),
    [sessions, settings, currentTime]
  );

  const activeSession = useMemo(
    () => normalizedSessions.find((session) => session.id === activeId) ?? normalizedSessions[0] ?? null,
    [activeId, normalizedSessions]
  );

  const rotationQueue = useMemo(
    () =>
      [...normalizedSessions].sort((a, b) => {
        const rank = statusRank[a.status] - statusRank[b.status];
        if (rank !== 0) return rank;
        if (a.status === "cooldown") {
          return minutesUntil(a.cooldownUntil, currentTime) - minutesUntil(b.cooldownUntil, currentTime);
        }
        return usagePercent(a) - usagePercent(b);
      }),
    [normalizedSessions, currentTime]
  );
```

#### 4.4 Add React Auto-rotation Reactivity Effect

```typescript
  // React Reactive Auto-rotation effect
  useEffect(() => {
    if (!settings.autoRotate || !activeSession) return;

    const activePct = usagePercent(activeSession);
    const activeStatus = calculateStatus(activeSession, settings.rotateThreshold, currentTime);

    if (activePct >= settings.rotateThreshold || activeStatus === "cooldown") {
      const next = chooseBestCandidate(normalizedSessions, activeId);
      if (next) {
        const checkedAt = nowIso();
        const cooldownUntil = new Date(Date.now() + settings.cooldownMinutes * 60000).toISOString();

        setSessions((current) =>
          current.map((session) => {
            if (session.id === activeSession.id) {
              return normalizeSession({ ...session, cooldownUntil }, settings, checkedAt);
            }
            if (session.id === next.id) {
              return normalizeSession({ ...session, cooldownUntil: null, lastChecked: checkedAt }, settings, checkedAt);
            }
            return session;
          })
        );
        setActiveId(next.id);
        setSelectedId(next.id);
        addLog(
          `Auto-rotated from ${activeSession.label} to ${next.label} (quota usage: ${activePct}% >= threshold: ${settings.rotateThreshold}%).`,
          "success"
        );
      } else {
        addLog(
          `Auto-rotation needed for ${activeSession.label} but no healthy/watch session is available.`,
          "warning"
        );
      }
    }
  }, [sessions, activeId, settings.autoRotate, settings.rotateThreshold, settings.cooldownMinutes, normalizedSessions, activeSession, currentTime]);
```

#### 4.5 Update LS Gateway Synchronization in `runCheck` (Lines 458-516)

```typescript
  // Before
  const runCheck = async () => {
    ...
  };

  // After
  const runCheck = async () => {
    const checkedAt = nowIso();

    if (!settings.lsEndpoint.trim()) {
      addLog("Quota state refreshed from local session values.", "success");
      return;
    }

    try {
      const response = await fetch(settings.lsEndpoint, { method: "GET" });
      if (!response.ok) {
        addLog(`LS Gateway status check failed with status: ${response.status}`, "warning");
        return;
      }

      const data = await response.json();

      setSessions((current) => {
        return current.map((session) => {
          let updatedSession = { ...session, lastChecked: checkedAt };
          let matched = false;

          // 1. Sync from sessions list if available
          if (Array.isArray(data.sessions)) {
            const match = data.sessions.find(
              (s: any) => s.id === session.id || s.domain === session.domain || s.label === session.label
            );
            if (match) {
              if (typeof match.quotaUsed === "number") updatedSession.quotaUsed = match.quotaUsed;
              if (typeof match.quotaLimit === "number") updatedSession.quotaLimit = match.quotaLimit;
              matched = true;
            }
          }

          // 2. Sync from accounts list if available
          if (!matched && Array.isArray(data.accounts)) {
            const match = data.accounts.find(
              (acc: any) => acc.id === session.id || acc.email === session.label || acc.label === session.label
            );
            if (match) {
              if (match.quota) {
                if (typeof match.quota.used === "number") updatedSession.quotaUsed = match.quota.used;
                if (typeof match.quota.limit === "number") updatedSession.quotaLimit = match.quota.limit;
              } else if (typeof match.quota_percentage === "number") {
                updatedSession.quotaUsed = Math.round((match.quota_percentage / 100) * session.quotaLimit);
              }
              matched = true;
            }
          }

          // 3. Sync direct properties to the active session as fallback
          if (!matched && session.id === activeId) {
            if (typeof data.quotaUsed === "number") {
              updatedSession.quotaUsed = data.quotaUsed;
              matched = true;
            }
            if (typeof data.quotaLimit === "number") {
              updatedSession.quotaLimit = data.quotaLimit;
              matched = true;
            }
          }

          return normalizeSession(updatedSession, settings, checkedAt);
        });
      });

      addLog(`LS Gateway status check completed successfully. Quotas synchronized.`, "success");
    } catch (err) {
      addLog(`Failed to connect to LS Gateway at ${settings.lsEndpoint}. Warning: Gateway offline.`, "warning");
    }
  };
```

#### 4.6 Update Render Calls for `minutesUntil` to pass `currentTime`

Update occurrences in JSX to use `minutesUntil(session.cooldownUntil, currentTime)` to ensure the displays are fully reactive:
* Line 947:
  `<span>{minutesUntil(session.cooldownUntil, currentTime) > 0 ? `${minutesUntil(session.cooldownUntil, currentTime)}m` : "-"}</span>`
* Line 994:
  `? `${minutesUntil(session.cooldownUntil, currentTime)}m left``
* Line 1060:
  `value={minutesUntil(selectedSession.cooldownUntil, currentTime)}`

---

## 5. Verification Method

To verify these changes after implementation:

### 1. Verification Commands
Run build to verify compiling works:
```bash
npm run build
```

### 2. Manual and Test Inspections
1. **Auto-rotation**: Manually edit the active session's "Quota Used" value in the UI to exceed the "Threshold %". Verify that the session is immediately marked as "Cooldown" and a healthy session with the lowest quota usage becomes active.
2. **LS Gateway Integration**:
   - Stop LS Gateway, click "Run Check", verify that the warning logs appear in the "Logs" panel.
   - Run LS Gateway, click "Run Check", verify that "LS Gateway status check completed successfully" logs appear and quotas synchronize correctly.
3. **Cooldown display decrement**: Add a session to cooldown, verify the countdown (e.g. `8m left`) decreases in the table and rotation queue every minute, and transitions out of cooldown when time expires.
