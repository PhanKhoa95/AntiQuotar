import assert from "assert";

// Mock core functions exactly as implemented in src/App.tsx

const minutesUntil = (iso, nowTime = Date.now()) => {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - nowTime) / 60000));
};

const usagePercent = (session) => {
  if (session.quotaLimit <= 0) return 0;
  return Math.min(100, Math.round((session.quotaUsed / session.quotaLimit) * 100));
};

const calculateStatus = (session, threshold, nowTime = Date.now()) => {
  if (minutesUntil(session.cooldownUntil, nowTime) > 0) return "cooldown";
  const pct = usagePercent(session);
  if (pct >= 90) return "critical";
  if (pct >= threshold) return "high";
  if (pct >= Math.max(60, threshold - 20)) return "watch";
  return "healthy";
};

const normalizeSession = (session, settings, nowTime = Date.now()) => ({
  ...session,
  status: calculateStatus(session, settings.rotateThreshold, nowTime)
});

const chooseBestCandidate = (sessions, activeId) =>
  sessions
    .filter((session) => session.id !== activeId)
    .filter((session) => session.status === "healthy" || session.status === "watch")
    .sort((a, b) => usagePercent(a) - usagePercent(b))[0] ?? null;

const shouldLeaveActiveSession = (session) =>
  Boolean(session && (session.status === "high" || session.status === "critical" || session.status === "cooldown"));

// ----------------------------------------------------
// TEST SUITE
// ----------------------------------------------------

console.log("Starting Empirical Verification tests...");

// Test Case 1: usagePercent calculation
console.log("Running Test Case 1: usagePercent");
assert.strictEqual(usagePercent({ quotaUsed: 50, quotaLimit: 100 }), 50);
assert.strictEqual(usagePercent({ quotaUsed: 0, quotaLimit: 100 }), 0);
assert.strictEqual(usagePercent({ quotaUsed: 120, quotaLimit: 100 }), 100);
assert.strictEqual(usagePercent({ quotaUsed: 50, quotaLimit: 0 }), 0);
assert.strictEqual(usagePercent({ quotaUsed: 50, quotaLimit: -10 }), 0);

// Test Case 2: minutesUntil calculation
console.log("Running Test Case 2: minutesUntil");
const now = Date.now();
const future5Min = new Date(now + 5 * 60000).toISOString();
const past5Min = new Date(now - 5 * 60000).toISOString();
assert.strictEqual(minutesUntil(null, now), 0);
assert.strictEqual(minutesUntil(future5Min, now), 5);
assert.strictEqual(minutesUntil(past5Min, now), 0);

// Test Case 3: calculateStatus under different thresholds
console.log("Running Test Case 3: calculateStatus");
const mockSettings = { rotateThreshold: 80, cooldownMinutes: 8 };

// Cooldown status override
const sessionCooldown = { quotaUsed: 10, quotaLimit: 100, cooldownUntil: future5Min };
assert.strictEqual(calculateStatus(sessionCooldown, 80, now), "cooldown");

// Critical status (>= 90%)
const sessionCritical = { quotaUsed: 92, quotaLimit: 100, cooldownUntil: null };
assert.strictEqual(calculateStatus(sessionCritical, 80, now), "critical");

// High status (>= threshold, threshold = 80)
const sessionHigh = { quotaUsed: 80, quotaLimit: 100, cooldownUntil: null };
assert.strictEqual(calculateStatus(sessionHigh, 80, now), "high");

// Watch status (>= Math.max(60, threshold - 20) => 60)
const sessionWatch = { quotaUsed: 65, quotaLimit: 100, cooldownUntil: null };
assert.strictEqual(calculateStatus(sessionWatch, 80, now), "watch");

// Healthy status (< 60)
const sessionHealthy = { quotaUsed: 59, quotaLimit: 100, cooldownUntil: null };
assert.strictEqual(calculateStatus(sessionHealthy, 80, now), "healthy");

// Test Case 4: shouldLeaveActiveSession
console.log("Running Test Case 4: shouldLeaveActiveSession");
assert.strictEqual(shouldLeaveActiveSession(null), false);
assert.strictEqual(shouldLeaveActiveSession(normalizeSession({ quotaUsed: 50, quotaLimit: 100, cooldownUntil: null }, mockSettings, now)), false); // healthy
assert.strictEqual(shouldLeaveActiveSession(normalizeSession({ quotaUsed: 65, quotaLimit: 100, cooldownUntil: null }, mockSettings, now)), false); // watch
assert.strictEqual(shouldLeaveActiveSession(normalizeSession({ quotaUsed: 85, quotaLimit: 100, cooldownUntil: null }, mockSettings, now)), true);  // high
assert.strictEqual(shouldLeaveActiveSession(normalizeSession({ quotaUsed: 95, quotaLimit: 100, cooldownUntil: null }, mockSettings, now)), true);  // critical
assert.strictEqual(shouldLeaveActiveSession(normalizeSession({ quotaUsed: 10, quotaLimit: 100, cooldownUntil: future5Min }, mockSettings, now)), true); // cooldown

// Test Case 5: chooseBestCandidate selection logic
console.log("Running Test Case 5: chooseBestCandidate");
const sessions = [
  normalizeSession({ id: "1", label: "S1", quotaUsed: 95, quotaLimit: 100, cooldownUntil: null }, mockSettings, now), // critical
  normalizeSession({ id: "2", label: "S2", quotaUsed: 85, quotaLimit: 100, cooldownUntil: null }, mockSettings, now), // high
  normalizeSession({ id: "3", label: "S3", quotaUsed: 65, quotaLimit: 100, cooldownUntil: null }, mockSettings, now), // watch (65%)
  normalizeSession({ id: "4", label: "S4", quotaUsed: 40, quotaLimit: 100, cooldownUntil: null }, mockSettings, now), // healthy (40%)
  normalizeSession({ id: "5", label: "S5", quotaUsed: 10, quotaLimit: 100, cooldownUntil: future5Min }, mockSettings, now) // cooldown
];

// Active is "1", best candidate should be S4 (lowest healthy/watch usage)
let best = chooseBestCandidate(sessions, "1");
assert.strictEqual(best.id, "4");

// Active is "4", best candidate should be S3 (lowest healthy/watch remaining)
best = chooseBestCandidate(sessions, "4");
assert.strictEqual(best.id, "3");

// If all remaining candidates are high/critical/cooldown, should return null
const badSessions = [
  normalizeSession({ id: "1", label: "S1", quotaUsed: 40, quotaLimit: 100, cooldownUntil: null }, mockSettings, now), // healthy
  normalizeSession({ id: "2", label: "S2", quotaUsed: 95, quotaLimit: 100, cooldownUntil: null }, mockSettings, now), // critical
  normalizeSession({ id: "3", label: "S3", quotaUsed: 10, quotaLimit: 100, cooldownUntil: future5Min }, mockSettings, now) // cooldown
];
best = chooseBestCandidate(badSessions, "1");
assert.strictEqual(best, null);

// Test Case 6: LS Gateway Integration Response parsing simulation
console.log("Running Test Case 6: LS Gateway integration parse simulation");

function simulateLSGatewaySync(json, localSessions, activeId, settings) {
  const checkedAt = new Date().toISOString();
  const items = (json.sessions || json.accounts);
  if (Array.isArray(items)) {
    return localSessions.map((session) => {
      const match = items.find((item) => {
        if (!item || typeof item !== 'object') return false;
        if (item.id !== undefined && String(item.id) === session.id) return true;
        if (item.label !== undefined && typeof item.label === 'string' && item.label.toLowerCase() === session.label.toLowerCase()) return true;
        if (item.domain !== undefined && typeof item.domain === 'string' && item.domain.toLowerCase() === session.domain.toLowerCase()) return true;
        return false;
      });

      if (match) {
        const quotaUsed = match.quotaUsed !== undefined ? Number(match.quotaUsed)
                          : match.used !== undefined ? Number(match.used)
                          : match.quota_used !== undefined ? Number(match.quota_used)
                          : session.quotaUsed;

        const quotaLimit = match.quotaLimit !== undefined ? Number(match.quotaLimit)
                           : match.limit !== undefined ? Number(match.limit)
                           : match.quota_limit !== undefined ? Number(match.quota_limit)
                           : match.quota !== undefined ? Number(match.quota)
                           : session.quotaLimit;

        return normalizeSession({
          ...session,
          quotaUsed,
          quotaLimit,
          lastChecked: checkedAt
        }, settings);
      }
      return session;
    });
  } else if (json && typeof json === 'object') {
    const active = localSessions.find((session) => session.id === activeId) ?? localSessions[0] ?? null;
    if (active) {
      let isMatch = true;
      if (json.id !== undefined && String(json.id) !== active.id) isMatch = false;
      if (json.label !== undefined && typeof json.label === 'string' && json.label.toLowerCase() !== active.label.toLowerCase()) isMatch = false;
      if (json.domain !== undefined && typeof json.domain === 'string' && json.domain.toLowerCase() !== active.domain.toLowerCase()) isMatch = false;

      if (isMatch) {
        const quotaUsed = json.quotaUsed !== undefined ? Number(json.quotaUsed)
                          : json.used !== undefined ? Number(json.used)
                          : json.quota_used !== undefined ? Number(json.quota_used)
                          : active.quotaUsed;

        const quotaLimit = json.quotaLimit !== undefined ? Number(json.quotaLimit)
                           : json.limit !== undefined ? Number(json.limit)
                           : json.quota_limit !== undefined ? Number(json.quota_limit)
                           : json.quota !== undefined ? Number(json.quota)
                           : active.quotaLimit;

        return localSessions.map((session) => {
          if (session.id === active.id) {
            return normalizeSession({
              ...session,
              quotaUsed,
              quotaLimit,
              lastChecked: checkedAt
            }, settings);
          }
          return session;
        });
      }
    }
  }
  return localSessions;
}

const localSessions = [
  { id: "1", label: "Session 1", domain: "google.com", quotaUsed: 100, quotaLimit: 1000, cooldownUntil: null },
  { id: "2", label: "Session 2", domain: "yahoo.com", quotaUsed: 200, quotaLimit: 1000, cooldownUntil: null }
];

// Test Array format with `sessions` field
const gatewayResponseArray = {
  sessions: [
    { id: "1", quotaUsed: 500, quotaLimit: 1000 },
    { label: "Session 2", used: 300, limit: 1000 }
  ]
};
let synced = simulateLSGatewaySync(gatewayResponseArray, localSessions, "1", mockSettings);
assert.strictEqual(synced[0].quotaUsed, 500);
assert.strictEqual(synced[1].quotaUsed, 300);

// Test Object format matching active session by ID
const gatewayResponseActiveObj = {
  id: "1",
  quota_used: 750,
  quota_limit: 1000
};
synced = simulateLSGatewaySync(gatewayResponseActiveObj, localSessions, "1", mockSettings);
assert.strictEqual(synced[0].quotaUsed, 750);
assert.strictEqual(synced[1].quotaUsed, 200); // unchanged

// Test Object format mismatching active session by ID
const gatewayResponseMismatchObj = {
  id: "3",
  quotaUsed: 900
};
synced = simulateLSGatewaySync(gatewayResponseMismatchObj, localSessions, "1", mockSettings);
assert.strictEqual(synced[0].quotaUsed, 100); // unchanged

console.log("All verification assertions PASSED successfully!");
