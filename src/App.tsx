import {
  Activity,
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardPaste,
  Clock3,
  Cookie,
  Copy,

  Download,
  Gauge,
  Globe2,
  History,
  Info,
  KeyRound,
  LayoutDashboard,
  ListRestart,
  Lock,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ImportFormat = "header" | "netscape" | "json";
type SessionStatus = "healthy" | "watch" | "high" | "critical" | "cooldown";
type LogTone = "info" | "success" | "warning" | "danger";

interface CookiePair {
  name: string;
  value: string;
}

interface CookieSession {
  id: string;
  label: string;
  domain: string;
  cookieName: string;
  cookieValue: string;
  cookieCount: number;
  quotaUsed: number;
  quotaLimit: number;
  cooldownUntil: string | null;
  createdAt: string;
  lastChecked: string;
  status: SessionStatus;
  notes: string;
  quota?: any;
  quotaGroups?: any;
}

interface AppSettings {
  autoRotate: boolean;
  rotateThreshold: number;
  cooldownMinutes: number;
  lsEndpoint: string;
  storeRawCookie: boolean;
  syncIntervalMinutes: number;
}

interface ActivityLog {
  id: string;
  time: string;
  tone: LogTone;
  message: string;
}

interface PersistedState {
  sessions: CookieSession[];
  activeId: string | null;
  settings: AppSettings;
  logs: ActivityLog[];
}

const STORAGE_KEY = "antiquotar-control-state-v1";

const defaultSettings: AppSettings = {
  autoRotate: true,
  rotateThreshold: 80,
  cooldownMinutes: 300, // 5 hours default cooldown
  lsEndpoint: "http://127.0.0.1:5188/v1/accounts",
  storeRawCookie: true,
  syncIntervalMinutes: 1 // 1 minute default sync interval
};

const nowIso = () => new Date().toISOString();

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialLogs = (): ActivityLog[] => [
  {
    id: uid(),
    time: nowIso(),
    tone: "info",
    message: "Control panel ready. Cookie data stays in this browser profile."
  }
];

const readPersistedState = (): PersistedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        sessions: [],
        activeId: null,
        settings: defaultSettings,
        logs: initialLogs()
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    const settings = { ...defaultSettings, ...(parsed.settings ?? {}) };
    if (parsed.settings && parsed.settings.syncIntervalMinutes === 300) {
      settings.syncIntervalMinutes = 1;
    }
    return {
      sessions,
      activeId: parsed.activeId ?? sessions[0]?.id ?? null,
      settings,
      logs: Array.isArray(parsed.logs) && parsed.logs.length > 0 ? parsed.logs : initialLogs()
    };
  } catch {
    return {
      sessions: [],
      activeId: null,
      settings: defaultSettings,
      logs: initialLogs()
    };
  }
};

const statusRank: Record<SessionStatus, number> = {
  healthy: 0,
  watch: 1,
  high: 2,
  critical: 3,
  cooldown: 4
};

const statusLabel: Record<SessionStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  high: "High",
  critical: "Critical",
  cooldown: "Cooldown"
};

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));

const minutesUntil = (iso: string | null) => {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
};

const usagePercent = (session: CookieSession) => {
  if (session.quotaLimit <= 0) return 0;
  return Math.min(100, Math.round((session.quotaUsed / session.quotaLimit) * 100));
};

const calculateStatus = (session: CookieSession, threshold: number): SessionStatus => {
  if (minutesUntil(session.cooldownUntil) > 0) return "cooldown";
  const pct = usagePercent(session);
  if (pct >= 90) return "critical";
  if (pct > 0 && pct >= threshold) return "high";
  if (pct >= Math.max(60, threshold - 20)) return "watch";
  return "healthy";
};

const maskCookie = (value: string) => {
  if (!value) return "not stored";
  if (value.length <= 12) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
};

const normalizeSession = (session: CookieSession, settings: AppSettings): CookieSession => ({
  ...session,
  status: calculateStatus(session, settings.rotateThreshold)
});

const parseHeaderCookie = (input: string): CookiePair[] => {
  const parts = input.replace(/^cookie:\s*/i, "").split(";").map((part) => part.trim()).filter(Boolean);
  return parts.map((part) => {
    const equalAt = part.indexOf("=");
    if (equalAt === -1) throw new Error("Invalid header format");
    return {
      name: part.slice(0, equalAt).trim(),
      value: part.slice(equalAt + 1).trim()
    };
  }).filter((pair) => pair.name.length > 0);
};

const parseNetscapeCookie = (input: string): CookiePair[] => {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  return lines.map((line) => {
    const parts = line.split(/\t+/);
    if (parts.length < 7) throw new Error("Invalid Netscape format");
    return { name: parts[5].trim(), value: parts.slice(6).join("\t").trim() };
  }).filter((pair): pair is CookiePair => Boolean(pair?.name));
};

const parseJsonCookie = (input: string): CookiePair[] => {
  const parsed = JSON.parse(input);
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => ({
        name: String(entry.name ?? ""),
        value: String(entry.value ?? "")
      }))
      .filter((pair) => pair.name);
  }
  return Object.entries(parsed).map(([name, value]) => ({
    name,
    value: typeof value === "string" ? value : JSON.stringify(value)
  }));
};

const parseCookieInput = (input: string, format: ImportFormat): CookiePair[] => {
  if (!input.trim()) return [];
  if (format === "netscape") return parseNetscapeCookie(input);
  if (format === "json") return parseJsonCookie(input);
  return parseHeaderCookie(input);
};

const chooseBestCandidate = (sessions: CookieSession[], activeId: string | null) =>
  sessions
    .filter((session) => session.id !== activeId)
    .filter((session) => session.status === "healthy" || session.status === "watch")
    .sort((a, b) => usagePercent(a) - usagePercent(b))[0] ?? null;

const shouldLeaveActiveSession = (session: CookieSession | null) =>
  Boolean(session && (session.status === "high" || session.status === "critical" || session.status === "cooldown"));

function StatusBadge({ status }: { status: SessionStatus }) {
  return <span className={`status status-${status}`}>{statusLabel[status]}</span>;
}

function ProgressBar({ value, status }: { value: number; status: SessionStatus }) {
  return (
    <div className="progress" aria-label={`${value}% quota used`}>
      <span className={`progress-fill progress-${status}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone: "teal" | "amber" | "red" | "blue";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export default function App() {
  const persisted = useRef(readPersistedState());
  const [sessions, setSessions] = useState<CookieSession[]>(persisted.current.sessions);
  const [activeId, setActiveId] = useState<string | null>(persisted.current.activeId);
  const [settings, setSettings] = useState<AppSettings>(persisted.current.settings);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>(persisted.current.logs);
  const [cookieInput, setCookieInput] = useState("");
  const [domain, setDomain] = useState("");
  const [label, setLabel] = useState("");
  const [format, setFormat] = useState<ImportFormat>("header");
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(10000);
  const [query, setQuery] = useState("");
  const [importText, setImportText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);



  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessions,
        activeId,
        settings,
        logs
      })
    );
  }, [sessions, activeId, settings, logs]);

  useEffect(() => {
    setSessions((current) => current.map((session) => normalizeSession(session, settings)));
  }, [settings.rotateThreshold]);

  useEffect(() => {
    setSelectedId(null);
  }, [activeId]);

  useEffect(() => {
    if (activeId && settings.lsEndpoint.trim()) {
      try {
        const url = new URL(settings.lsEndpoint);
        const switchUrl = `${url.protocol}//${url.host}/v1/accounts/active`;
        fetch(switchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: activeId })
        })
          .then((res) => {
            if (!res.ok) {
              console.error("LS Gateway switch returned error status:", res.status);
            } else {
              console.log("LS Gateway switch success. Triggering active quota refresh.");
              runCheckRef.current('active');
            }
          })
          .catch((err) => {
            console.error("Failed to sync active session to LS Gateway:", err);
          });
      } catch (e) {
        console.error("Invalid lsEndpoint:", e);
      }
    }
  }, [activeId, settings.lsEndpoint]);

  const addLog = (message: string, tone: LogTone = "info") => {
    setLogs((current) => [{ id: uid(), time: nowIso(), tone, message }, ...current].slice(0, 80));
  };

  const normalizedSessions = useMemo(
    () => sessions.map((session) => normalizeSession(session, settings)),
    [sessions, settings, tick]
  );

  const activeSession = useMemo(
    () => normalizedSessions.find((session) => session.id === activeId) ?? normalizedSessions[0] ?? null,
    [activeId, normalizedSessions]
  );



  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return normalizedSessions;
    return normalizedSessions.filter(
      (session) =>
        session.label.toLowerCase().includes(needle) ||
        session.domain.toLowerCase().includes(needle) ||
        session.cookieName.toLowerCase().includes(needle)
    );
  }, [normalizedSessions, query]);

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
    [normalizedSessions, tick]
  );

  // Cooldown Management
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((current) => {
        let changed = false;
        const nextSessions = current.map((session) => {
          if (session.cooldownUntil && new Date(session.cooldownUntil).getTime() <= Date.now()) {
            changed = true;
            setLogs((logsCurrent) => [
              {
                id: uid(),
                time: nowIso(),
                tone: "info" as LogTone,
                message: `Cooldown finished for session ${session.label}.`
              },
              ...logsCurrent
            ].slice(0, 80));
            return normalizeSession({
              ...session,
              cooldownUntil: null
            }, settings);
          }
          return session;
        });
        return changed ? nextSessions : current;
      });
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  // React Auto-rotation Reactivity
  useEffect(() => {
    if (!settings.autoRotate || !activeSession) return;

    const pct = usagePercent(activeSession);
    const isCooldown = activeSession.status === "cooldown";
    const triggersRotation = isCooldown || (
      settings.rotateThreshold < 100 &&
      (settings.rotateThreshold === 0 ? pct > 0 : pct >= settings.rotateThreshold)
    );

    if (triggersRotation) {
      const next = chooseBestCandidate(normalizedSessions, activeSession.id);
      if (next) {
        const cooldownUntil = new Date(Date.now() + settings.cooldownMinutes * 60000).toISOString();
        setSessions((current) =>
          current.map((session) => {
            if (session.id === activeSession.id) {
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
        setLogs((logsCurrent) => [
          {
            id: uid(),
            time: nowIso(),
            tone: "success" as LogTone,
            message: `Auto-rotated active session from ${activeSession.label} to ${next.label} (quota: ${pct}%).`
          },
          ...logsCurrent
        ].slice(0, 80));
      }
    }
  }, [settings.autoRotate, activeSession, settings.rotateThreshold, settings.cooldownMinutes, normalizedSessions]);

  const totalUsage = useMemo(() => {
    const used = normalizedSessions.reduce((sum, session) => sum + session.quotaUsed, 0);
    const limit = normalizedSessions.reduce((sum, session) => sum + session.quotaLimit, 0);
    return {
      used,
      limit,
      pct: limit > 0 ? Math.round((used / limit) * 100) : 0
    };
  }, [normalizedSessions]);

  const counts = useMemo(
    () => ({
      healthy: normalizedSessions.filter((session) => session.status === "healthy").length,
      high: normalizedSessions.filter((session) => session.status === "high").length,
      critical: normalizedSessions.filter((session) => session.status === "critical").length,
      cooldown: normalizedSessions.filter((session) => session.status === "cooldown").length
    }),
    [normalizedSessions]
  );

  const parsedPreview = useMemo(() => {
    try {
      return parseCookieInput(cookieInput, format);
    } catch {
      return [];
    }
  }, [cookieInput, format]);

  const handleAddCookie = (event: FormEvent) => {
    event.preventDefault();
    let pairs: CookiePair[];
    try {
      pairs = parseCookieInput(cookieInput, format);
    } catch {
      addLog("Cookie import failed. Check the selected format.", "danger");
      return;
    }

    if (!domain.trim()) {
      addLog("Domain is required before adding a cookie session.", "warning");
      return;
    }

    if (pairs.length === 0) {
      addLog("No cookie pairs were detected in the inbox.", "warning");
      return;
    }

    const first = pairs[0];
    const rawCookie = settings.storeRawCookie
      ? pairs.map((pair) => `${pair.name}=${pair.value}`).join("; ")
      : "";
    const session: CookieSession = normalizeSession(
      {
        id: uid(),
        label: label.trim() || `${domain.trim()} #${sessions.length + 1}`,
        domain: domain.trim(),
        cookieName: first.name,
        cookieValue: rawCookie,
        cookieCount: pairs.length,
        quotaUsed: Math.max(0, quotaUsed),
        quotaLimit: Math.max(1, quotaLimit),
        cooldownUntil: null,
        createdAt: nowIso(),
        lastChecked: nowIso(),
        status: "healthy",
        notes: "Added from manual paste"
      },
      settings
    );

    setSessions((current) => [session, ...current]);
    if (!activeId) {
      setActiveId(session.id);
      setSelectedId(session.id);
    }
    setCookieInput("");
    setLabel("");
    setDomain("");
    setQuotaUsed(0);
    setQuotaLimit(10000);
    addLog(`Added ${pairs.length} cookie pair(s) for ${session.domain}.`, "success");
  };

  const connectAntigravity = async () => {
    try {
      let baseUrl = "http://127.0.0.1:5188";
      try {
        const u = new URL(settings.lsEndpoint);
        baseUrl = u.protocol + "//" + u.host;
      } catch (e) {}

      addLog("Initiating Google Login flow via Antigravity LS Gateway...", "info");
      const res = await fetch(`${baseUrl}/v1/auth/login`, { method: "GET" });
      if (res.ok) {
        addLog("Authentication browser window requested. Please log in on the opened tab.", "success");
      } else {
        addLog("Failed to initiate login flow from LS Gateway.", "danger");
      }
    } catch (err: any) {
      addLog(`Failed to connect to LS Gateway: ${err.message}`, "danger");
    }
  };

  const runCheck = async (forceRefresh: boolean | 'active' = false) => {
    const checkedAt = nowIso();
    let rotatedTo: CookieSession | null = null;

    setSessions((current) => {
      const normalized = current.map((session) =>
        normalizeSession(
          {
            ...session,
            lastChecked: checkedAt
          },
          settings
        )
      );
      const active = normalized.find((session) => session.id === activeId) ?? null;
      const pct = active ? usagePercent(active) : 0;
      const isCooldown = active ? active.status === "cooldown" : false;
      const triggersRotation = isCooldown || (
        settings.rotateThreshold < 100 &&
        (settings.rotateThreshold === 0 ? pct > 0 : pct >= settings.rotateThreshold)
      );
      const next =
        settings.autoRotate && triggersRotation
          ? chooseBestCandidate(normalized, activeId)
          : null;

      if (!active || !next) return normalized;

      rotatedTo = next;
      const cooldownUntil = new Date(Date.now() + settings.cooldownMinutes * 60000).toISOString();
      return normalized.map((session) => {
        if (session.id === active.id) {
          return normalizeSession({ ...session, cooldownUntil }, settings);
        }
        if (session.id === next.id) {
          return normalizeSession({ ...session, cooldownUntil: null, lastChecked: checkedAt }, settings);
        }
        return session;
      });
    });

    const targetRotated = rotatedTo as CookieSession | null;
    if (targetRotated) {
      setActiveId(targetRotated.id);
      setSelectedId(targetRotated.id);
      addLog(`Auto-rotated to ${targetRotated.label} after quota check.`, "success");
    }

    if (!settings.lsEndpoint.trim()) {
      if (!targetRotated) addLog("Quota state refreshed from local session values.", "success");
      return;
    }

    try {
      const headers: HeadersInit = {};
      if (forceRefresh === true) {
        headers['x-refresh'] = 'true';
      } else if (forceRefresh === 'active') {
        headers['x-refresh'] = 'active';
      }
      const response = await fetch(settings.lsEndpoint, { method: "GET", headers });
      if (!response.ok) {
        setGatewayOnline(false);
        addLog(`LS endpoint returned error status: ${response.status}`, "warning");
        return;
      }
      setGatewayOnline(true);
      const json = await response.json();
      
      const items = (Array.isArray(json) ? json : (json.sessions || json.accounts)) as any[];
      if (Array.isArray(items)) {
        setSessions((current) => {
          let updatedCount = 0;
          let newCount = 0;

          // 1. Cập nhật các session đã tồn tại
          const updated = current.map((session) => {
            const match = items.find((item) => {
              if (!item || typeof item !== 'object') return false;
              if (item.id !== undefined && String(item.id) === session.id) return true;
              if (item.label !== undefined && typeof item.label === 'string' && item.label.toLowerCase() === session.label.toLowerCase()) return true;
              if (item.email !== undefined && typeof item.email === 'string' && item.email.toLowerCase() === session.label.toLowerCase()) return true;
              
              const isPersonal = session.label.includes('@') || session.label.toLowerCase().includes('google') || session.label.toLowerCase().includes('claude');
              if (!isPersonal && item.domain !== undefined && typeof item.domain === 'string' && item.domain.toLowerCase() === session.domain.toLowerCase()) return true;
              return false;
            });

            if (match) {
              let quotaUsed = session.quotaUsed;
              let quotaLimit = session.quotaLimit;

              if (match.quotaUsed !== undefined) {
                quotaUsed = Number(match.quotaUsed);
              } else if (match.used !== undefined) {
                quotaUsed = Number(match.used);
              } else if (match.quota_used !== undefined) {
                quotaUsed = Number(match.quota_used);
              }

              if (match.quotaLimit !== undefined) {
                quotaLimit = Number(match.quotaLimit);
              } else if (match.limit !== undefined) {
                quotaLimit = Number(match.limit);
              } else if (match.quota_limit !== undefined) {
                quotaLimit = Number(match.quota_limit);
              } else if (match.quota !== undefined && typeof match.quota !== 'object') {
                quotaLimit = Number(match.quota);
              }

              if (match.quota && typeof match.quota === 'object') {
                const q = match.quota;
                if (q.used !== undefined) {
                  quotaUsed = Number(q.used);
                }
                if (q.limit !== undefined) {
                  quotaLimit = Number(q.limit);
                }
                if (Array.isArray(q.models) && q.models.length > 0) {
                  const minRemainingPct = q.models.reduce((min: number, m: any) => {
                    const pct = m.percentage !== undefined ? Number(m.percentage) : 100;
                    return pct < min ? pct : min;
                  }, 100);
                  quotaLimit = 100;
                  quotaUsed = Math.max(0, 100 - minRemainingPct);
                }
              } else if (match.quota_percentage !== undefined) {
                const remainingPct = Number(match.quota_percentage);
                quotaLimit = 100;
                quotaUsed = Math.max(0, 100 - remainingPct);
              }

              let cooldownUntil = session.cooldownUntil;
              if (match.cooldownUntil !== undefined) {
                cooldownUntil = match.cooldownUntil;
              } else if (match.cooldown_until !== undefined) {
                cooldownUntil = match.cooldown_until;
              }

              let quotaGroups = session.quotaGroups;
              if (match.quotaGroups !== undefined) {
                quotaGroups = match.quotaGroups;
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

          // 2. Tự động thêm các session mới chưa tồn tại trong CMS
          const unmatched = items.filter((item) => {
            if (!item || typeof item !== 'object') return false;
            return !current.some((session) =>
              (item.id !== undefined && String(item.id) === session.id) ||
              (item.label !== undefined && typeof item.label === 'string' && item.label.toLowerCase() === session.label.toLowerCase()) ||
              (item.email !== undefined && typeof item.email === 'string' && item.email.toLowerCase() === session.label.toLowerCase())
            );
          });

          const imported = unmatched.map((item) => {
            newCount++;
            const identifier = item.email || item.label || (item.id !== undefined ? String(item.id) : "imported-session");
            
            let quotaUsed = 0;
            let quotaLimit = 100;

            if (item.quotaUsed !== undefined) {
              quotaUsed = Number(item.quotaUsed);
            } else if (item.used !== undefined) {
              quotaUsed = Number(item.used);
            } else if (item.quota && typeof item.quota === 'object' && item.quota.used !== undefined) {
              quotaUsed = Number(item.quota.used);
            }

            if (item.quotaLimit !== undefined) {
              quotaLimit = Number(item.quotaLimit);
            } else if (item.limit !== undefined) {
              quotaLimit = Number(item.limit);
            } else if (item.quota && typeof item.quota === 'object' && item.quota.limit !== undefined) {
              quotaLimit = Number(item.quota.limit);
            }

            if (item.quota && typeof item.quota === 'object') {
              const q = item.quota;
              if (Array.isArray(q.models) && q.models.length > 0) {
                const minRemainingPct = q.models.reduce((min: number, m: any) => {
                  const pct = m.percentage !== undefined ? Number(m.percentage) : 100;
                  return pct < min ? pct : min;
                }, 100);
                quotaLimit = 100;
                quotaUsed = Math.max(0, 100 - minRemainingPct);
              }
            } else if (item.quota_percentage !== undefined) {
              const remainingPct = Number(item.quota_percentage);
              quotaLimit = 100;
              quotaUsed = Math.max(0, 100 - remainingPct);
            }

            return normalizeSession({
              id: item.id ? String(item.id) : identifier,
              label: item.label || identifier,
              domain: item.domain || "google.com",
              cookieName: "imported_cookie",
              cookieValue: "imported_from_local_gateway",
              cookieCount: 1,
              quotaUsed,
              quotaLimit,
              cooldownUntil: item.cooldownUntil || item.cooldown_until || null,
              quotaGroups: item.quotaGroups || null,
              createdAt: checkedAt,
              lastChecked: checkedAt,
              status: "healthy",
              notes: "Auto-imported from LS Gateway."
            }, settings);
          });

          if (updatedCount > 0 || newCount > 0) {
            setTimeout(() => {
              let msg = "";
              if (updatedCount > 0) msg += `Synchronized ${updatedCount} session(s) from LS Gateway. `;
              if (newCount > 0) msg += `Automatically imported ${newCount} new session(s) from LS Gateway.`;
              addLog(msg.trim(), "success");
            }, 0);
          } else {
            setTimeout(() => {
              addLog("Quota state refreshed from LS Gateway (0 sessions matched).", "success");
            }, 0);
          }
          return [...updated, ...imported];
        });
      } else if (json && typeof json === 'object') {
        setSessions((current) => {
          let updatedCount = 0;
          const nextSessions = current.map((session) => {
            let isMatch = false;
            if (json.id !== undefined && String(json.id) === session.id) isMatch = true;
            else if (json.label !== undefined && typeof json.label === 'string' && json.label.toLowerCase() === session.label.toLowerCase()) isMatch = true;
            else if (json.email !== undefined && typeof json.email === 'string' && json.email.toLowerCase() === session.label.toLowerCase()) isMatch = true;
            else {
              const isPersonal = session.label.includes('@') || session.label.toLowerCase().includes('google') || session.label.toLowerCase().includes('claude');
              if (!isPersonal && json.domain !== undefined && typeof json.domain === 'string' && json.domain.toLowerCase() === session.domain.toLowerCase()) isMatch = true;
            }

            if (isMatch) {
              updatedCount++;
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
                  const minRemainingPct = q.models.reduce((min: number, m: any) => {
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
              addLog(`Synchronized matching session(s) quota from LS Gateway.`, "success");
            }, 0);
          } else {
            setTimeout(() => {
              addLog("LS Gateway response did not match any session.", "warning");
            }, 0);
          }
          return nextSessions;
        });
      } else {
        addLog("LS Gateway returned invalid status format.", "warning");
      }
    } catch (error: any) {
      setGatewayOnline(false);
      addLog(`LS Gateway connection failed: ${error.message || error}`, "warning");
    }
  };

  const runCheckRef = useRef(runCheck);
  runCheckRef.current = runCheck;

  // Auto-Sync Periodically & Startup Check
  useEffect(() => {
    runCheckRef.current();

    if (settings.syncIntervalMinutes <= 0) return;

    const interval = setInterval(() => {
      runCheckRef.current();
    }, settings.syncIntervalMinutes * 60000);

    return () => clearInterval(interval);
  }, [settings.syncIntervalMinutes, settings.lsEndpoint]);

  // Auto-poll LS Gateway while Add Account modal is open
  useEffect(() => {
    if (!showAddAccountModal) return;
    const poll = () => runCheckRef.current?.();
    const id = setInterval(poll, 5000);
    poll();
    return () => clearInterval(id);
  }, [showAddAccountModal]);

  const rotateNow = () => {
    const normalized = sessions.map((session) => normalizeSession(session, settings));
    const next = chooseBestCandidate(normalized, activeId);
    if (!next) {
      addLog("No healthy rotation candidate is available.", "warning");
      return;
    }

    const cooldownUntil = new Date(Date.now() + settings.cooldownMinutes * 60000).toISOString();
    setSessions((current) =>
      current.map((session) => {
        if (session.id === activeId) {
          return normalizeSession({ ...session, cooldownUntil }, settings);
        }
        if (session.id === next.id) {
          return normalizeSession({ ...session, cooldownUntil: null, lastChecked: nowIso() }, settings);
        }
        return normalizeSession(session, settings);
      })
    );
    setActiveId(next.id);
    setSelectedId(next.id);
    addLog(`Rotated active session to ${next.label}.`, "success");
  };

  const promoteSession = (id: string) => {
    const target = sessions.find((session) => session.id === id);
    if (!target) return;
    setSessions((current) =>
      current.map((session) =>
        session.id === id ? { ...session, cooldownUntil: null } : session
      )
    );
    setActiveId(id);
    setSelectedId(id);
    addLog(`Promoted ${target.label} as active session.`, "success");
  };

  const removeSession = (id: string) => {
    const target = sessions.find((session) => session.id === id);
    setSessions((current) => current.filter((session) => session.id !== id));
    setActiveId((current) => {
      if (current !== id) return current;
      return sessions.find((session) => session.id !== id)?.id ?? null;
    });
    setSelectedId((current) => (current === id ? null : current));
    addLog(`Removed ${target?.label ?? "session"}.`, "warning");
  };

  const updateQuota = (id: string, field: "quotaUsed" | "quotaLimit", value: number) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === id
          ? normalizeSession({ ...session, [field]: Math.max(field === "quotaLimit" ? 1 : 0, value) }, settings)
          : session
      )
    );
  };

  const applyCooldown = (id: string, minutes: number) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === id
          ? normalizeSession(
              {
                ...session,
                cooldownUntil: minutes > 0 ? new Date(Date.now() + minutes * 60000).toISOString() : null
              },
              settings
            )
          : session
      )
    );
  };

  const exportState = () => {
    const payload = JSON.stringify({ sessions, activeId, settings, exportedAt: nowIso() }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `antiquotar-control-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addLog("Exported local control state.", "success");
  };

  const importState = () => {
    try {
      const parsed = JSON.parse(importText) as Partial<PersistedState>;
      if (!Array.isArray(parsed.sessions)) throw new Error("Missing sessions");
      const importedSessions = parsed.sessions.map((session) =>
        normalizeSession(
          {
            ...session,
            id: session.id || uid(),
            createdAt: session.createdAt || nowIso(),
            lastChecked: session.lastChecked || nowIso(),
            cooldownUntil: session.cooldownUntil ?? null,
            notes: session.notes || "Imported session"
          },
          settings
        )
      );
      setSessions(importedSessions);
      setActiveId(parsed.activeId ?? importedSessions[0]?.id ?? null);
      if (parsed.settings) setSettings((current) => ({ ...current, ...parsed.settings }));
      setImportText("");
      addLog(`Imported ${importedSessions.length} session(s).`, "success");
    } catch {
      addLog("Import failed. Paste an AntiQuotar JSON export.", "danger");
    }
  };

  const selectedSession =
    normalizedSessions.find((session) => session.id === selectedId) ?? activeSession;



  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={28} />
          <span>AntiQuotar Control</span>
        </div>
        <nav className="nav-list" aria-label="Main">
          <a className="nav-item active" href="#dashboard">
            <LayoutDashboard size={20} />
            Dashboard
          </a>
          <a className="nav-item" href="#cookies">
            <Cookie size={20} />
            Cookies
          </a>
          <a className="nav-item" href="#sessions">
            <KeyRound size={20} />
            Sessions
          </a>
          <a className="nav-item" href="#rotation">
            <ListRestart size={20} />
            Rotation Queue
          </a>
          <a className="nav-item" href="#quota">
            <Gauge size={20} />
            Quota Monitor
          </a>
          <a className="nav-item" href="#rules">
            <SlidersHorizontal size={20} />
            Rules
          </a>
          <a className="nav-item" href="#logs">
            <History size={20} />
            Logs
          </a>
        </nav>
        <div style={{ padding: '12px 0 6px 0', width: '100%' }}>
          <button className="button primary wide" onClick={() => { connectAntigravity(); setShowAddAccountModal(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
            <Plus size={16} />
            Add Antigravity
          </button>
        </div>
        <div className="local-card">
          <span className="dot" />
          <strong>Local Mode</strong>
          <p>Data path</p>
          <code>browser localStorage</code>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="muted">CMS control for manual cookies and quota rotation</p>
            <h1>AntiQuotar Control</h1>
          </div>
          <div className="toolbar">
            <span className={`service ${gatewayOnline === null ? "unknown" : gatewayOnline ? "online" : "offline"}`}>
              <span className="dot" />
              Service: Local {gatewayOnline === null ? "" : gatewayOnline ? "(Bridge Online)" : "(Bridge Offline)"}
            </span>
            <button className="button ghost" onClick={() => runCheck(true)}>
              <Play size={18} />
              Run Check
            </button>
            <button className="button primary" onClick={rotateNow}>
              <RotateCw size={18} />
              Rotate Now
            </button>
            <button className="icon-button" aria-label="Settings" onClick={() => setShowSettingsModal(true)}>
              <Settings size={19} />
            </button>
          </div>
        </header>

        <section className="notice" role="note">
          <AlertTriangle size={20} />
          <div>
            <strong>No Chrome profile scraping.</strong>
            <span>Paste cookies you control from Chrome DevTools or an export file. AntiQuotar does not read Chrome profiles.</span>
          </div>
          <button className="button subtle" onClick={() => navigator.clipboard?.writeText("Chrome DevTools > Network > request > Headers > Cookie")}>
            <Copy size={16} />
            Copy Path
          </button>
        </section>

        <section className="dashboard-grid" id="dashboard">
          <form className="panel cookie-panel" id="cookies" onSubmit={handleAddCookie}>
            <div className="panel-heading">
              <div>
                <h2>
                  <ClipboardPaste size={24} />
                  Cookie Inbox
                </h2>
                <p>Paste from Chrome DevTools</p>
              </div>
              <span className="counter">{parsedPreview.length} parsed</span>
            </div>

            <div className="cookie-form">
              <textarea
                id="cookie-inbox-input"
                name="cookieInput"
                aria-label="Cookie Inbox"
                className="cookie-textarea"
                value={cookieInput}
                onChange={(event) => setCookieInput(event.target.value)}
                placeholder="Cookie: sessionid=...; account=...; device=..."
              />
              <div className="form-stack">
                <Field label="Domain" htmlFor="cookie-domain-input">
                  <input
                    id="cookie-domain-input"
                    name="domain"
                    value={domain}
                    onChange={(event) => setDomain(event.target.value)}
                    placeholder="e.g. chat.openai.com"
                  />
                </Field>
                <Field label="Name" htmlFor="cookie-name-input">
                  <input
                    id="cookie-name-input"
                    name="label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="coding-main"
                  />
                </Field>
                <Field label="Import Format" htmlFor="cookie-format-input">
                  <select
                    id="cookie-format-input"
                    name="format"
                    value={format}
                    onChange={(event) => setFormat(event.target.value as ImportFormat)}
                  >
                    <option value="header">Header string</option>
                    <option value="netscape">Netscape</option>
                    <option value="json">JSON</option>
                  </select>
                </Field>
                <div className="inline-fields">
                  <Field label="Used" htmlFor="cookie-used-input">
                    <input
                      id="cookie-used-input"
                      name="quotaUsed"
                      type="number"
                      value={quotaUsed}
                      min={0}
                      onChange={(event) => setQuotaUsed(Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Limit" htmlFor="cookie-limit-input">
                    <input
                      id="cookie-limit-input"
                      name="quotaLimit"
                      type="number"
                      value={quotaLimit}
                      min={1}
                      onChange={(event) => setQuotaLimit(Number(event.target.value))}
                    />
                  </Field>
                </div>
                <label className="check-row">
                  <input
                    id="store-raw-cookie-input"
                    name="storeRawCookie"
                    type="checkbox"
                    checked={settings.storeRawCookie}
                    onChange={(event) => setSettings((current) => ({ ...current, storeRawCookie: event.target.checked }))}
                  />
                  Store raw cookie locally
                </label>
                <button className="button primary wide" type="submit">
                  <Plus size={18} />
                  Add Cookie
                </button>
              </div>
            </div>
          </form>

          <section className="panel quota-panel" id="quota">
            <div className="panel-heading">
              <div>
                <h2>
                  <Activity size={24} />
                  Quota Monitor
                </h2>
                <p>Overall quota usage</p>
              </div>
              <strong className="big-number">{totalUsage.pct}%</strong>
            </div>
            <ProgressBar value={totalUsage.pct} status={totalUsage.pct >= 90 ? "critical" : totalUsage.pct >= 75 ? "high" : "healthy"} />
            <div className="usage-line">
              <span>{totalUsage.used.toLocaleString()} used</span>
              <span>{totalUsage.limit.toLocaleString()} limit</span>
            </div>
            <div className="metric-grid">
              <MetricTile label="Healthy" value={counts.healthy} tone="teal" />
              <MetricTile label="High" value={counts.high} tone="amber" />
              <MetricTile label="Critical" value={counts.critical} tone="red" />
              <MetricTile label="Cooldown" value={counts.cooldown} tone="blue" />
            </div>
            <div className="settings-strip" id="rules">
              <label>
                <span>Auto-rotate</span>
                <input
                  id="settings-auto-rotate-input"
                  name="autoRotate"
                  type="checkbox"
                  checked={settings.autoRotate}
                  onChange={(event) => setSettings((current) => ({ ...current, autoRotate: event.target.checked }))}
                />
              </label>
              <label>
                <span>Threshold {settings.rotateThreshold}%</span>
                <input
                  id="settings-rotate-threshold-input"
                  name="rotateThreshold"
                  type="range"
                  min={0}
                  max={100}
                  value={settings.rotateThreshold}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, rotateThreshold: Number(event.target.value) }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="panel active-panel" id="sessions">
            <div className="panel-heading">
              <div>
                <h2>
                  <KeyRound size={24} />
                  {selectedSession && selectedSession.id === activeId ? "Active Session" : "Selected Session"}
                </h2>
                <p>{selectedSession ? selectedSession.label : "No session selected"}</p>
              </div>
              {selectedSession ? <StatusBadge status={selectedSession.status} /> : null}
            </div>

            {selectedSession ? (
              <>
                <div className="detail-grid">
                  <div>
                    <span>Domain</span>
                    <strong>{selectedSession.domain}</strong>
                  </div>
                  <div>
                    <span>Cookie</span>
                    <strong>{selectedSession.cookieName}</strong>
                  </div>
                  <div>
                    <span>Stored value</span>
                    <strong>{maskCookie(selectedSession.cookieValue)}</strong>
                  </div>
                  <div>
                    <span>Last checked</span>
                    <strong>{formatDateTime(selectedSession.lastChecked)}</strong>
                  </div>
                </div>
                <div className="active-meter">
                  <ProgressBar value={usagePercent(selectedSession)} status={selectedSession.status} />
                  <strong>
                    {usagePercent(selectedSession)}% ({selectedSession.quotaUsed.toLocaleString()} /{" "}
                    {selectedSession.quotaLimit.toLocaleString()})
                  </strong>
                </div>

                {selectedSession.cooldownUntil && (
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="dot" style={{ background: '#3b82f6' }} />
                    <span>Resets at: <strong>{formatDateTime(selectedSession.cooldownUntil)}</strong> ({minutesUntil(selectedSession.cooldownUntil)}m left)</span>
                  </div>
                )}

                {selectedSession.quotaGroups && Array.isArray(selectedSession.quotaGroups) && selectedSession.quotaGroups.length > 0 && (
                  <div className="quota-groups-list" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: '0', fontSize: '15px', fontWeight: '600', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} style={{ color: '#10b981' }} />
                      Model Quota Details
                    </h3>
                    {selectedSession.quotaGroups.map((group: any, idx: number) => (
                      <div key={idx} style={{ padding: '16px', background: '#1c1c1e', borderRadius: '12px', border: '1px solid #2c2c2e' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {group.name}
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {/* Weekly Limit Row */}
                          {group.weekly && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '500', color: '#ffffff' }}>Weekly Limit</span>
                                <span style={{ fontSize: '11px', color: '#8e8e93' }}>
                                  {group.weekly.resetText}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{group.weekly.percentage}%</span>
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" fill="none" />
                                  <circle cx="12" cy="12" r="9" stroke={group.weekly.percentage >= 80 ? '#10b981' : group.weekly.percentage >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="2.5" fill="none" strokeDasharray="56.5" strokeDashoffset={56.5 * (1 - group.weekly.percentage/100)} transform="rotate(-90 12 12)" strokeLinecap="round" />
                                </svg>
                              </div>
                            </div>
                          )}

                          {/* Five Hour Limit Row */}
                          {group.fiveHour && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '500', color: '#ffffff' }}>Five Hour Limit</span>
                                <span style={{ fontSize: '11px', color: '#8e8e93' }}>
                                  {group.fiveHour.resetText}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{group.fiveHour.percentage}%</span>
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" fill="none" />
                                  <circle cx="12" cy="12" r="9" stroke={group.fiveHour.percentage >= 80 ? '#10b981' : group.fiveHour.percentage >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="2.5" fill="none" strokeDasharray="56.5" strokeDashoffset={56.5 * (1 - group.fiveHour.percentage/100)} transform="rotate(-90 12 12)" strokeLinecap="round" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <CircleHelp size={28} />
                <p>Add a cookie session to begin rotation.</p>
              </div>
            )}

            <div className="table-tools">
              <label className="search">
                <Search size={17} />
                <input
                  id="session-filter-input"
                  name="query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter sessions"
                />
              </label>
              <button className="button ghost" onClick={exportState}>
                <Download size={17} />
                Export
              </button>
            </div>

            <div className="session-table" role="table" aria-label="Cookie sessions">
              <div className="table-row table-head" role="row">
                <span>Domain</span>
                <span>Quota</span>
                <span>Status</span>
                <span>Cooldown</span>
                <span>Action</span>
              </div>
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={`table-row ${session.id === activeId ? "selected" : ""}`}
                  role="row"
                  onClick={() => setSelectedId(session.id)}
                >
                  <span>
                    <Globe2 size={15} />
                    <strong>{session.domain}</strong>
                    <small>{session.label}</small>
                  </span>
                  <span className="quota-cell">
                    <ProgressBar value={usagePercent(session)} status={session.status} />
                    {usagePercent(session)}%
                  </span>
                  <span>
                    <StatusBadge status={session.status} />
                  </span>
                  <span>{minutesUntil(session.cooldownUntil) > 0 ? `${minutesUntil(session.cooldownUntil)}m` : "-"}</span>
                  <span className="row-actions">
                    <button className="icon-button" aria-label="Set active" onClick={(event) => {
                      event.stopPropagation();
                      promoteSession(session.id);
                    }}>
                      <ArrowUp size={16} />
                    </button>
                    <button className="icon-button danger" aria-label="Remove" onClick={(event) => {
                      event.stopPropagation();
                      removeSession(session.id);
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel queue-panel" id="rotation">
            <div className="panel-heading">
              <div>
                <h2>
                  <RefreshCw size={24} />
                  Rotation Queue
                </h2>
                <p>{settings.autoRotate ? "Auto-rotate enabled" : "Manual rotation"}</p>
              </div>
              <button className="button ghost" onClick={rotateNow}>
                <RotateCw size={17} />
                Rotate
              </button>
            </div>

            <ol className="queue-list">
              {rotationQueue.map((session, index) => (
                <li key={session.id} className={`queue-item queue-${session.status}`}>
                  <span className="queue-rank">{index + 1}</span>
                  <div>
                    <strong>{session.label}</strong>
                    <span>
                      {session.domain} · {usagePercent(session)}% used
                    </span>
                  </div>
                  <em>
                    {session.status === "cooldown"
                      ? `${minutesUntil(session.cooldownUntil)}m left`
                      : session.status === "healthy"
                        ? "ready"
                        : statusLabel[session.status]}
                  </em>
                  <button className="button subtle" onClick={() => promoteSession(session.id)}>
                    Promote
                    <ChevronRight size={15} />
                  </button>
                </li>
              ))}
            </ol>

            <div className="quick-actions">
              <button className="button ghost" onClick={() => selectedSession && applyCooldown(selectedSession.id, settings.cooldownMinutes)}>
                <Clock3 size={17} />
                Cooldown
              </button>
              <button className="button ghost" onClick={() => selectedSession && applyCooldown(selectedSession.id, 0)}>
                <CheckCircle2 size={17} />
                Clear
              </button>

            </div>
          </section>

          <section className="panel editor-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <SlidersHorizontal size={24} />
                  Session Control
                </h2>
                <p>{selectedSession ? selectedSession.label : "Select a session"}</p>
              </div>
              <Lock size={20} />
            </div>

            {selectedSession ? (
              <div className="control-grid">
                <Field label="Quota Used" htmlFor="control-used-input">
                  <input
                    id="control-used-input"
                    name="sessionQuotaUsed"
                    type="number"
                    min={0}
                    value={selectedSession.quotaUsed}
                    onChange={(event) => updateQuota(selectedSession.id, "quotaUsed", Number(event.target.value))}
                  />
                </Field>
                <Field label="Quota Limit" htmlFor="control-limit-input">
                  <input
                    id="control-limit-input"
                    name="sessionQuotaLimit"
                    type="number"
                    min={1}
                    value={selectedSession.quotaLimit}
                    onChange={(event) => updateQuota(selectedSession.id, "quotaLimit", Number(event.target.value))}
                  />
                </Field>
                <Field label="Cooldown Minutes" htmlFor="control-cooldown-input">
                  <input
                    id="control-cooldown-input"
                    name="sessionCooldown"
                    type="number"
                    min={0}
                    value={minutesUntil(selectedSession.cooldownUntil)}
                    onChange={(event) => applyCooldown(selectedSession.id, Number(event.target.value))}
                  />
                </Field>
                <Field label="LS Endpoint" htmlFor="control-ls-endpoint-input">
                  <input
                    id="control-ls-endpoint-input"
                    name="lsEndpoint"
                    value={settings.lsEndpoint}
                    onChange={(event) => setSettings((current) => ({ ...current, lsEndpoint: event.target.value }))}
                  />
                </Field>
              </div>
            ) : (
              <div className="empty-state">
                <Info size={28} />
                <p>No selected session.</p>
              </div>
            )}

            <div className="import-box">
              <textarea
                id="session-import-input"
                name="importText"
                aria-label="Paste AntiQuotar JSON export"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste AntiQuotar JSON export"
              />
              <button className="button ghost" onClick={importState}>
                <Upload size={17} />
                Import
              </button>
            </div>
          </section>

          <section className="panel logs-panel" id="logs">
            <div className="panel-heading">
              <div>
                <h2>
                  <History size={24} />
                  Logs
                </h2>
                <p>Recent local activity</p>
              </div>
              <button className="icon-button" aria-label="Clear logs" onClick={() => setLogs(initialLogs())}>
                <X size={18} />
              </button>
            </div>
            <div className="log-list">
              {logs.map((log) => (
                <div className={`log-item log-${log.tone}`} key={log.id}>
                  <span>{formatTime(log.time)}</span>
                  <p>{log.message}</p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <footer className="bottom-bar">
          <span>
            <ShieldCheck size={18} />
            Safe local storage
          </span>
          <span>
            <Cookie size={18} />
            {normalizedSessions.length} sessions
          </span>
          <span>
            <Save size={18} />
            Auto-saved
          </span>
        </footer>
      </main>

      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Settings size={22} />
                Global Settings
              </h2>
              <button className="icon-button" onClick={() => setShowSettingsModal(false)} aria-label="Close settings">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <Field label="LS Gateway Endpoint" htmlFor="settings-ls-endpoint">
                <input
                  id="settings-ls-endpoint"
                  name="lsEndpoint"
                  value={settings.lsEndpoint}
                  onChange={(event) => setSettings((current) => ({ ...current, lsEndpoint: event.target.value }))}
                  placeholder="e.g. http://127.0.0.1:5188/v1/accounts"
                />
              </Field>
              <Field label="Default Cooldown (minutes)" htmlFor="settings-cooldown-minutes">
                <input
                  id="settings-cooldown-minutes"
                  name="cooldownMinutes"
                  type="number"
                  min={1}
                  value={settings.cooldownMinutes}
                  onChange={(event) => setSettings((current) => ({ ...current, cooldownMinutes: Number(event.target.value) }))}
                />
              </Field>
              <Field label="Auto-Sync Interval (minutes, 0 to disable)" htmlFor="settings-sync-interval">
                <input
                  id="settings-sync-interval"
                  name="syncIntervalMinutes"
                  type="number"
                  min={0}
                  value={settings.syncIntervalMinutes}
                  onChange={(event) => setSettings((current) => ({ ...current, syncIntervalMinutes: Number(event.target.value) }))}
                />
              </Field>
              <div className="settings-checkboxes">
                <label className="check-row">
                  <input
                    id="settings-modal-auto-rotate"
                    type="checkbox"
                    checked={settings.autoRotate}
                    onChange={(event) => setSettings((current) => ({ ...current, autoRotate: event.target.checked }))}
                  />
                  Enable Auto-rotation when quota limit reached
                </label>
                <label className="check-row">
                  <input
                    id="settings-modal-store-raw"
                    type="checkbox"
                    checked={settings.storeRawCookie}
                    onChange={(event) => setSettings((current) => ({ ...current, storeRawCookie: event.target.checked }))}
                  />
                  Store raw cookie strings in localStorage
                </label>
              </div>
              <Field label={`Rotate Threshold: ${settings.rotateThreshold}%`} htmlFor="settings-modal-threshold">
                <input
                  id="settings-modal-threshold"
                  type="range"
                  min={0}
                  max={100}
                  value={settings.rotateThreshold}
                  onChange={(event) => setSettings((current) => ({ ...current, rotateThreshold: Number(event.target.value) }))}
                />
              </Field>
            </div>
            <div className="modal-footer">
              <button className="button primary" onClick={() => setShowSettingsModal(false)}>
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAddAccountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Plus size={22} />
                Add Google Account
              </h2>
              <button className="icon-button" onClick={() => setShowAddAccountModal(false)} aria-label="Close add account modal">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--muted)' }}>
                Since the local server runs as a background service, it cannot directly open terminal windows on your desktop.
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 600 }}>
                Please run this command in your VS Code terminal or PowerShell to log in:
              </p>
              <div className="import-box" style={{ padding: '12px', background: 'var(--surface-soft)', borderRadius: '6px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--teal)' }}>
                  npx -y antigravity-usage@latest login
                </code>
                <button
                  className="button subtle"
                  onClick={() => {
                    navigator.clipboard?.writeText("npx -y antigravity-usage@latest login");
                    addLog("Command copied to clipboard!", "success");
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--muted)' }}>
                Once logged in on your browser, click <strong>Done</strong> below. The new account will be imported automatically.
              </p>
            </div>
            <div className="modal-footer">
              <button className="button primary" onClick={() => { setShowAddAccountModal(false); runCheck(true); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
