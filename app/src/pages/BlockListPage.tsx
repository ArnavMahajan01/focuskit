import { useState } from "react";
import { Plus, X, Zap, List, Shield } from "lucide-react";
import { useApp } from "../context/AppContext";
import UpgradeModal from "../components/UpgradeModal";

const FREE_LIMIT = 5;

const PRESETS: Record<string, string[]> = {
  "Social Media": [
    "facebook.com", "www.facebook.com",
    "instagram.com", "www.instagram.com",
    "twitter.com", "www.twitter.com",
    "x.com", "www.x.com",
    "tiktok.com", "www.tiktok.com",
    "snapchat.com", "www.snapchat.com",
  ],
  "Video & Entertainment": [
    "youtube.com", "www.youtube.com",
    "netflix.com", "www.netflix.com",
    "twitch.tv", "www.twitch.tv",
    "hulu.com", "www.hulu.com",
    "disneyplus.com", "www.disneyplus.com",
  ],
  "News & Forums": [
    "reddit.com", "www.reddit.com",
    "news.ycombinator.com",
    "hackernews.com",
    "cnn.com", "www.cnn.com",
    "bbc.com", "www.bbc.com",
  ],
};

export default function BlockListPage() {
  const { config, saveConfig, tier, showToast, focusStatus } = useApp();
  const [input, setInput] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);

  const sites = config?.blocked_sites ?? [];
  const isAtLimit = tier === "free" && sites.length >= FREE_LIMIT;
  const isFocusActive = focusStatus?.active ?? false;

  const handleAdd = async () => {
    const raw = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!raw) return;

    if (sites.includes(raw)) {
      showToast("This site is already in your list.", "info");
      return;
    }

    if (tier === "free" && sites.length >= FREE_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    if (!config) return;
    setSaving(true);
    try {
      const updated = { ...config, blocked_sites: [...sites, raw] };
      await saveConfig(updated);
      setInput("");
      showToast(`Added ${raw}`, "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (site: string) => {
    if (!config) return;
    setSaving(true);
    try {
      const updated = { ...config, blocked_sites: sites.filter((s) => s !== site) };
      await saveConfig(updated);
      showToast(`Removed ${site}`, "info");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (name: string) => {
    if (!config || tier !== "pro") {
      setShowUpgrade(true);
      return;
    }
    const preset = PRESETS[name];
    const merged = Array.from(new Set([...sites, ...preset]));
    setSaving(true);
    try {
      await saveConfig({ ...config, blocked_sites: merged });
      showToast(`Applied "${name}" preset.`, "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      <div className="page-header">
        <h1>Block List</h1>
        <p className="page-subtitle">
          Sites added here are blocked during every focus session.
        </p>
      </div>

      {isFocusActive && (
        <div className="alert alert-info">
          <Shield size={15} />
          Focus mode is active. Changes will apply to the next session.
        </div>
      )}

      {/* Add site */}
      <div className="card">
        <div className="input-row">
          <input
            className="input input-grow"
            type="text"
            placeholder="e.g. reddit.com or www.reddit.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={isAtLimit}
          />
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={saving || isAtLimit}
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {/* Free tier limit indicator */}
        {tier === "free" && (
          <div className="limit-bar">
            <div className="limit-bar-fill" style={{ width: `${(sites.length / FREE_LIMIT) * 100}%` }} />
            <span className="limit-text">
              {sites.length}/{FREE_LIMIT} sites used
              {isAtLimit && (
                <button className="btn-text-accent" onClick={() => setShowUpgrade(true)}>
                  <Zap size={11} /> Upgrade for unlimited
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Site list */}
      <div className="card">
        <div className="card-heading">
          <h3>Blocked Sites</h3>
          <span className="badge badge-muted">{sites.length}</span>
        </div>

        {sites.length === 0 ? (
          <div className="empty-state">
            <List size={32} />
            <p>No sites added yet. Add a site above to get started.</p>
          </div>
        ) : (
          <div className="site-list">
            {sites.map((site) => (
              <div key={site} className="site-row">
                <div className="site-favicon">
                  {site.charAt(0).toUpperCase()}
                </div>
                <span className="site-name">{site}</span>
                <button
                  className="btn-icon"
                  onClick={() => handleRemove(site)}
                  disabled={saving}
                  aria-label={`Remove ${site}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Presets (Pro) */}
      <div className="card">
        <div className="card-heading">
          <h3>Presets</h3>
          {tier === "free" && (
            <span className="pro-lock">
              <Zap size={12} /> Pro
            </span>
          )}
        </div>
        <p className="card-desc">Quickly add curated lists of distracting sites.</p>

        <div className="presets-grid">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              className={`preset-btn${tier !== "pro" ? " preset-btn--locked" : ""}`}
              onClick={() => applyPreset(name)}
            >
              <span>{name}</span>
              <span className="preset-count">{PRESETS[name].length} sites</span>
              {tier !== "pro" && <Zap size={12} className="preset-lock-icon" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
