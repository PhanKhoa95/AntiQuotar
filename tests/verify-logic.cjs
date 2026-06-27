const fs = require('fs');
const path = require('path');

// 1. Read and extract helper functions from src/App.tsx
const appTsxPath = path.resolve(__dirname, '../src/App.tsx');
console.log(`Reading App.tsx from: ${appTsxPath}`);
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

function extractFunction(name) {
  const startKeyword = `const ${name} =`;
  const startIndex = appTsxContent.indexOf(startKeyword);
  if (startIndex === -1) {
    throw new Error(`Failed to find start of function: ${name}`);
  }
  
  // Slice starting from after the keyword
  const searchContent = appTsxContent.slice(startIndex + startKeyword.length);
  // Find the next declaration keyword (const, function, interface, type, class)
  const nextDeclMatch = searchContent.match(/(?:^|\r?\n)(?:const|function|interface|type|class)\s+/);
  
  let endIndex;
  if (nextDeclMatch) {
    endIndex = startIndex + startKeyword.length + nextDeclMatch.index;
  } else {
    endIndex = appTsxContent.length;
  }
  
  return appTsxContent.slice(startIndex, endIndex).trim();
}

function stripTypes(code) {
  return code
    .replace(/:\s*SessionStatus/g, '')
    .replace(/:\s*CookieSession\[\]/g, '')
    .replace(/:\s*CookieSession\s*\|\s*null/g, '')
    .replace(/:\s*CookieSession/g, '')
    .replace(/:\s*AppSettings/g, '')
    .replace(/:\s*string\s*\|\s*null/g, '')
    .replace(/:\s*number/g, '');
}

const extractedFunctions = [
  extractFunction('minutesUntil'),
  extractFunction('usagePercent'),
  extractFunction('calculateStatus'),
  extractFunction('normalizeSession'),
  extractFunction('chooseBestCandidate'),
  extractFunction('shouldLeaveActiveSession')
].map(stripTypes).join('\n\n');

// We will construct an executable JS module with these functions and mock objects
const testCode = `
${extractedFunctions}

module.exports = {
  minutesUntil,
  usagePercent,
  calculateStatus,
  normalizeSession,
  chooseBestCandidate,
  shouldLeaveActiveSession
};
`;

const tempFilePath = path.resolve(__dirname, 'extracted_helpers.cjs');
fs.writeFileSync(tempFilePath, testCode);
console.log(`Extracted helper functions to: ${tempFilePath}`);

// Load the extracted helpers
const helpers = require(tempFilePath);

// --- Assertions Framework ---
let failures = 0;
let passes = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passes++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failures++;
  }
}

function runTestSuite() {
  console.log('\n--- Running Unit Tests on Extracted Logic ---');

  // Test Case 1: usagePercent
  console.log('\nTesting usagePercent:');
  assert(helpers.usagePercent({ quotaUsed: 0, quotaLimit: 100 }) === 0, '0% usage');
  assert(helpers.usagePercent({ quotaUsed: 50, quotaLimit: 100 }) === 50, '50% usage');
  assert(helpers.usagePercent({ quotaUsed: 120, quotaLimit: 100 }) === 100, 'capped at 100%');
  assert(helpers.usagePercent({ quotaUsed: 50, quotaLimit: 0 }) === 0, 'limit <= 0 should return 0');
  assert(helpers.usagePercent({ quotaUsed: 50, quotaLimit: -10 }) === 0, 'negative limit should return 0');

  // Test Case 2: calculateStatus & normalizeSession
  console.log('\nTesting calculateStatus & normalizeSession:');
  const settings = { rotateThreshold: 80 };
  
  // Healthy: below max(60, threshold-20) which is max(60, 60) = 60%
  const sHealthy = { quotaUsed: 59, quotaLimit: 100, cooldownUntil: null };
  assert(helpers.calculateStatus(sHealthy, 80) === 'healthy', '59% quota is healthy');

  // Watch: >= max(60, threshold-20) which is 60% up to threshold-1 (79%)
  const sWatch = { quotaUsed: 60, quotaLimit: 100, cooldownUntil: null };
  assert(helpers.calculateStatus(sWatch, 80) === 'watch', '60% quota is watch');
  const sWatchHigh = { quotaUsed: 79, quotaLimit: 100, cooldownUntil: null };
  assert(helpers.calculateStatus(sWatchHigh, 80) === 'watch', '79% quota is watch');

  // High: >= threshold (80%) up to 89%
  const sHigh = { quotaUsed: 80, quotaLimit: 100, cooldownUntil: null };
  assert(helpers.calculateStatus(sHigh, 80) === 'high', '80% quota is high');
  const sHighMax = { quotaUsed: 89, quotaLimit: 100, cooldownUntil: null };
  assert(helpers.calculateStatus(sHighMax, 80) === 'high', '89% quota is high');

  // Critical: >= 90%
  const sCritical = { quotaUsed: 90, quotaLimit: 100, cooldownUntil: null };
  assert(helpers.calculateStatus(sCritical, 80) === 'critical', '90% quota is critical');

  // Cooldown: cooldownUntil is in the future
  const futureTime = new Date(Date.now() + 500000).toISOString();
  const sCooldown = { quotaUsed: 10, quotaLimit: 100, cooldownUntil: futureTime };
  assert(helpers.calculateStatus(sCooldown, 80) === 'cooldown', 'future cooldownTime means cooldown status');

  // Test Case 3: shouldLeaveActiveSession
  console.log('\nTesting shouldLeaveActiveSession:');
  assert(helpers.shouldLeaveActiveSession({ status: 'healthy' }) === false, 'healthy does not leave');
  assert(helpers.shouldLeaveActiveSession({ status: 'watch' }) === false, 'watch does not leave');
  assert(helpers.shouldLeaveActiveSession({ status: 'high' }) === true, 'high leaves');
  assert(helpers.shouldLeaveActiveSession({ status: 'critical' }) === true, 'critical leaves');
  assert(helpers.shouldLeaveActiveSession({ status: 'cooldown' }) === true, 'cooldown leaves');

  // Test Case 4: chooseBestCandidate
  console.log('\nTesting chooseBestCandidate:');
  const sessionList = [
    { id: '1', quotaUsed: 50, quotaLimit: 100, cooldownUntil: null, status: 'healthy' }, // 50%
    { id: '2', quotaUsed: 20, quotaLimit: 100, cooldownUntil: null, status: 'healthy' }, // 20%
    { id: '3', quotaUsed: 10, quotaLimit: 100, cooldownUntil: null, status: 'cooldown' }, // cooldown
    { id: '4', quotaUsed: 85, quotaLimit: 100, cooldownUntil: null, status: 'high' }, // high
    { id: '5', quotaUsed: 30, quotaLimit: 100, cooldownUntil: null, status: 'watch' }  // 30%
  ];
  // Active is '1'. Best candidate should be '2' (lowest usage among healthy/watch).
  let candidate = helpers.chooseBestCandidate(sessionList, '1');
  assert(candidate !== null && candidate.id === '2', 'returns lowest usage healthy session');

  // If active is '2', best should be '5' (30% watch) over '1' (50% healthy) since 30 < 50
  candidate = helpers.chooseBestCandidate(sessionList, '2');
  assert(candidate !== null && candidate.id === '5', 'returns lowest usage watch session over higher healthy');

  // If only cooldown/high are left besides active
  const limitedList = [
    { id: '1', quotaUsed: 20, quotaLimit: 100, cooldownUntil: null, status: 'healthy' },
    { id: '3', quotaUsed: 10, quotaLimit: 100, cooldownUntil: null, status: 'cooldown' },
    { id: '4', quotaUsed: 85, quotaLimit: 100, cooldownUntil: null, status: 'high' }
  ];
  candidate = helpers.chooseBestCandidate(limitedList, '1');
  assert(candidate === null, 'returns null when no other healthy/watch candidates exist');

  // --- Behavioral Simulations ---
  console.log('\n--- Running Behavioral Simulations ---');

  // Simulation 1: Cooldown Ticking Interval
  console.log('\nSimulating cooldown ticking:');
  // Suppose we have a session on cooldown
  let session = { id: 's1', label: 'Session 1', quotaUsed: 10, quotaLimit: 100, cooldownUntil: new Date(Date.now() - 1000).toISOString() }; // expired
  
  // This simulates the logic inside useEffect for interval:
  let sessionsState = [session];
  let logsState = [];
  
  // Simulation of:
  // if (session.cooldownUntil && new Date(session.cooldownUntil).getTime() <= Date.now()) { ... }
  let changed = false;
  sessionsState = sessionsState.map((s) => {
    if (s.cooldownUntil && new Date(s.cooldownUntil).getTime() <= Date.now()) {
      changed = true;
      logsState.push(`Cooldown finished for session ${s.label}.`);
      return helpers.normalizeSession({ ...s, cooldownUntil: null }, settings);
    }
    return s;
  });

  assert(changed === true, 'cooldown tick detected expired cooldown');
  assert(sessionsState[0].cooldownUntil === null, 'cooldownUntil set to null');
  assert(sessionsState[0].status === 'healthy', 'status recalculated to healthy');
  assert(logsState.length === 1, 'logged cooldown finish event');

  // Simulation 2: Auto-rotation Reaction & Stale Closure Verification
  console.log('\nSimulating auto-rotation and local runCheck:');
  // We simulate runCheck with stale closures.
  // Initial state:
  let state = {
    sessions: [
      { id: 's1', label: 'S1', quotaUsed: 85, quotaLimit: 100, cooldownUntil: null, status: 'high' }, // Active & above threshold
      { id: 's2', label: 'S2', quotaUsed: 20, quotaLimit: 100, cooldownUntil: null, status: 'healthy' }
    ],
    activeId: 's1',
    settings: { autoRotate: true, rotateThreshold: 80, cooldownMinutes: 8 }
  };

  // Run local check (part 1 of runCheck)
  const checkedAt = new Date().toISOString();
  let rotatedTo = null;

  // React setSessions callback simulation
  const updateSessionsCallback = (current) => {
    const normalized = current.map((s) => helpers.normalizeSession({ ...s, lastChecked: checkedAt }, state.settings));
    const active = normalized.find((s) => s.id === state.activeId) ?? null;
    const next = state.settings.autoRotate && helpers.shouldLeaveActiveSession(active)
      ? helpers.chooseBestCandidate(normalized, state.activeId)
      : null;

    if (!active || !next) return normalized;

    rotatedTo = next;
    const cooldownUntil = new Date(Date.now() + state.settings.cooldownMinutes * 60000).toISOString();
    return normalized.map((s) => {
      if (s.id === active.id) {
        return helpers.normalizeSession({ ...s, cooldownUntil }, state.settings);
      }
      if (s.id === next.id) {
        return helpers.normalizeSession({ ...s, cooldownUntil: null, lastChecked: checkedAt }, state.settings);
      }
      return s;
    });
  };

  // Run the state update callback
  const nextSessions = updateSessionsCallback(state.sessions);
  
  // Verify state mapping:
  assert(nextSessions[0].id === 's1' && nextSessions[0].status === 'cooldown' && nextSessions[0].cooldownUntil !== null, 'S1 put on cooldown');
  assert(nextSessions[1].id === 's2' && nextSessions[1].status === 'healthy', 'S2 remain healthy');

  // Verify stale closure bug:
  const targetRotated = rotatedTo;
  console.log('  Simulating LS Gateway fetch resolving...');
  
  // Suppose active is resolved using stale state:
  const activeStale = state.sessions.find((s) => s.id === state.activeId) ?? null;
  assert(activeStale.id === 's1', 'Stale closure resolved s1 as active even though local rotation is scheduled');

  // Mock LS Gateway response: single object matching s1 (which was the active session)
  const lsResponseSingle = { id: 's1', quotaUsed: 95, quotaLimit: 100 }; // S1 is even more full
  
  // Since activeStale is 's1', and matches lsResponseSingle:
  let isMatch = true;
  if (lsResponseSingle.id !== undefined && String(lsResponseSingle.id) !== activeStale.id) isMatch = false;
  
  assert(isMatch === true, 'LS response matches stale active session s1');
  
  // Now, the async resolution updates the sessions state based on the stale activeStale!
  const nextSessionsPostFetch = nextSessions.map((session) => {
    if (session.id === activeStale.id) {
      return helpers.normalizeSession({
        ...session,
        quotaUsed: lsResponseSingle.quotaUsed,
        quotaLimit: lsResponseSingle.quotaLimit
      }, state.settings);
    }
    return session;
  });

  assert(nextSessionsPostFetch[0].id === 's1' && nextSessionsPostFetch[0].quotaUsed === 95, 'S1 quota updated from LS Gateway');
  assert(nextSessionsPostFetch[0].status === 'cooldown', 'S1 is still on cooldown since status is calculated from cooldownUntil first');

  // Clean up
  fs.unlinkSync(tempFilePath);
  console.log(`Cleaned up temp file: ${tempFilePath}`);

  console.log(`\nTests finished: ${passes} passed, ${failures} failed.`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
