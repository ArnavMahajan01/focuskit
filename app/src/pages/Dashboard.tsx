import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Shield, Clock, CheckCircle2, Zap } from "lucide-react";
import { useApp } from "../context/AppContext";
import TimerRing from "../components/TimerRing";
import UpgradeModal from "../components/UpgradeModal";

const FREE_DURATIONS = [25, 50];
const PRO_DURATIONS = [15, 25, 50, 90];

function formatDuration(mins: number) {
  return mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}`.trim()
    : `${mins}m`;
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(ts: number) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const {
    focusStatus,
    tier,
    config,
    startFocus,
    endFocus,
    history,
    showToast,
  } = useApp();

  // Clamp initial duration to free tier options if needed
  const getInitialDuration = () => {
    const cfgDur = config?.focus_duration ?? 50;
    if (tier === "free") return FREE_DURATIONS.includes(cfgDur) ? cfgDur : 50;
    return cfgDur;
  };

  const [selectedDuration, setSelectedDuration] = useState(getInitialDuration);
  const [customDuration, setCustomDuration] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-clamp selectedDuration whenever tier or config loads
  useEffect(() => {
    if (focusStatus?.active) return; // don't interfere with active session
    if (tier === "free" && !FREE_DURATIONS.includes(selectedDuration)) {
      setSelectedDuration(50);
      setCustomMode(false);
    }
  }, [tier]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync timer state from focusStatus
  useEffect(() => {
    if (focusStatus?.active && focusStatus.end_time) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, focusStatus.end_time - now);
      const total = (focusStatus.total_duration ?? 50) * 60;
      setRemainingSecs(remaining);
      setTotalSecs(total);
    } else {
      const secs = selectedDuration * 60;
      setRemainingSecs(secs);
      setTotalSecs(secs);
    }
  }, [focusStatus, selectedDuration]);

  // Countdown tick
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (focusStatus?.active) {
      tickRef.current = setInterval(() => {
        setRemainingSecs((prev) => {
          if (prev <= 1) {
            clearInterval(tickRef.current!);
            // Auto-end
            endFocus(true)
              .then(() => showToast("Focus session complete! Great work.", "success"))
              .catch(() => {});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [focusStatus?.active, endFocus, showToast]);

  const durations = tier === "pro" ? PRO_DURATIONS : FREE_DURATIONS;

  const handleStart = useCallback(async () => {
    let dur = selectedDuration;
    if (customMode && tier === "pro") {
      dur = parseInt(customDuration, 10);
      if (isNaN(dur) || dur < 1 || dur > 480) {
        showToast("Duration must be between 1 and 480 minutes.", "error");
        return;
      }
    }

    // Hard enforcement: free tier can only use 25 or 50 min
    if (tier === "free" && !FREE_DURATIONS.includes(dur)) {
      dur = 50;
      setSelectedDuration(50);
    }

    if (!config?.blocked_sites?.length) {
      showToast("No sites to block. Add sites in Block List first.", "error");
      return;
    }

    setLoading(true);
    try {
      await startFocus(dur);
      showToast("Focus mode started. Distractions blocked.", "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDuration, customMode, customDuration, tier, config, startFocus, showToast]);

  const handleStop = useCallback(async () => {
    setLoading(true);
    try {
      await endFocus(false);
      showToast("Focus session ended. Sites unblocked.", "info");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }, [endFocus, showToast]);

  const isActive = focusStatus?.active ?? false;
  const displayHistory = tier === "pro" ? history.slice(0, 8) : history.slice(0, 3);

  const todayTs = Math.floor(Date.now() / 1000) - 86400;
  const todaySessions = history.filter((s) => s.start_time > todayTs);
  const todayMins = todaySessions.reduce((a, s) => a + s.duration, 0);

  return (
    <div className="page page-dashboard">
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">
          {isActive ? "You're in focus mode. Stay locked in." : "Ready to focus?"}
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Timer card */}
        <div className="card card-focus">
          <TimerRing
            totalSeconds={totalSecs}
            remainingSeconds={remainingSecs}
            active={isActive}
          />

          {/* Duration selector (shown when inactive) */}
          {!isActive && (
            <div className="duration-section">
              <div className="duration-pills">
                {durations.map((d) => (
                  <button
                    key={d}
                    className={`pill${selectedDuration === d && !customMode ? " pill--active" : ""}`}
                    onClick={() => {
                      setSelectedDuration(d);
                      setCustomMode(false);
                    }}
                  >
                    {formatDuration(d)}
                  </button>
                ))}
                {tier === "pro" ? (
                  <button
                    className={`pill${customMode ? " pill--active" : ""}`}
                    onClick={() => setCustomMode(true)}
                  >
                    Custom
                  </button>
                ) : (
                  <button
                    className="pill pill--locked"
                    onClick={() => setShowUpgrade(true)}
                    title="Upgrade to Pro for custom durations"
                  >
                    Custom <Zap size={11} />
                  </button>
                )}
              </div>

              {customMode && tier === "pro" && (
                <div className="custom-duration">
                  <input
                    type="number"
                    className="input"
                    placeholder="Minutes (1–480)"
                    min={1}
                    max={480}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          {isActive ? (
            <button
              className="btn btn-danger btn-lg"
              onClick={handleStop}
              disabled={loading}
            >
              <Square size={16} />
              {loading ? "Ending…" : "End Focus"}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleStart}
              disabled={loading}
            >
              <Play size={16} />
              {loading ? "Starting…" : "Start Focus"}
            </button>
          )}

          {isActive && focusStatus?.end_time && (
            <p className="timer-meta">
              Ends at {formatTime(focusStatus.end_time)} ·{" "}
              {focusStatus.blocked_sites.length} sites blocked
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="card stat-card">
            <Shield size={20} className="stat-icon stat-icon--accent" />
            <div className="stat-value">{config?.blocked_sites?.length ?? 0}</div>
            <div className="stat-label">Sites blocked</div>
          </div>

          <div className="card stat-card">
            <Clock size={20} className="stat-icon stat-icon--success" />
            <div className="stat-value">{todayMins}</div>
            <div className="stat-label">Minutes focused today</div>
          </div>

          <div className="card stat-card">
            <CheckCircle2 size={20} className="stat-icon stat-icon--warning" />
            <div className="stat-value">
              {todaySessions.filter((s) => s.completed).length}
            </div>
            <div className="stat-label">Sessions completed today</div>
          </div>
        </div>

        {/* Recent sessions */}
        <div className="card card-history">
          <div className="card-heading">
            <h3>Recent Sessions</h3>
            {tier === "free" && (
              <button
                className="btn-text-accent"
                onClick={() => setShowUpgrade(true)}
              >
                <Zap size={12} /> Unlock full history
              </button>
            )}
          </div>

          {displayHistory.length === 0 ? (
            <div className="empty-state">
              <Clock size={32} />
              <p>No sessions yet. Start your first focus session!</p>
            </div>
          ) : (
            <div className="history-list">
              {displayHistory.map((s) => (
                <div key={s.id} className="history-row">
                  <div className="history-dot" data-completed={s.completed} />
                  <div className="history-info">
                    <span className="history-dur">
                      {formatDuration(s.duration)}
                    </span>
                    <span className="history-sites">
                      · {s.sites_blocked} sites
                    </span>
                  </div>
                  <div className="history-meta">
                    <span
                      className={`badge ${s.completed ? "badge-success" : "badge-muted"}`}
                    >
                      {s.completed ? "Completed" : "Early end"}
                    </span>
                    <span className="history-time">
                      {formatRelative(s.start_time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
