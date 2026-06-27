
const minutesUntil = (iso) => {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
};

const usagePercent = (session) => {
  if (session.quotaLimit <= 0) return 0;
  return Math.min(100, Math.round((session.quotaUsed / session.quotaLimit) * 100));
};

const calculateStatus = (session, threshold) => {
  if (minutesUntil(session.cooldownUntil) > 0) return "cooldown";
  const pct = usagePercent(session);
  if (pct >= 90) return "critical";
  if (pct >= threshold) return "high";
  if (pct >= Math.max(60, threshold - 20)) return "watch";
  return "healthy";
};

const normalizeSession = (session, settings) => ({
  ...session,
  status: calculateStatus(session, settings.rotateThreshold)
});

const chooseBestCandidate = (sessions, activeId) =>
  sessions
    .filter((session) => session.id !== activeId)
    .filter((session) => session.status === "healthy" || session.status === "watch")
    .sort((a, b) => usagePercent(a) - usagePercent(b))[0] ?? null;

const shouldLeaveActiveSession = (session) =>
  Boolean(session && (session.status === "high" || session.status === "critical" || session.status === "cooldown"));

module.exports = {
  minutesUntil,
  usagePercent,
  calculateStatus,
  normalizeSession,
  chooseBestCandidate,
  shouldLeaveActiveSession
};
