import { useState } from "react";
import { Save, Key, Zap, ExternalLink, Info } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { LicenseResult } from "../types";
import { invoke } from "@tauri-apps/api/core";

export default function SettingsPage() {
  const { config, saveConfig, tier, refreshTier, showToast } = useApp();
  const [licenseKey, setLicenseKey] = useState(config?.license_key ?? "");
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusDuration, setFocusDuration] = useState(
    String(config?.focus_duration ?? 50)
  );
  const [cleanupDays, setCleanupDays] = useState(
    String(config?.cleanup_days ?? 30)
  );
  const [cleanupConfirm, setCleanupConfirm] = useState(
    config?.cleanup_confirm ?? true
  );

  const handleVerify = async () => {
    if (!licenseKey.trim()) {
      showToast("Enter your license key first.", "error");
      return;
    }
    setVerifying(true);
    try {
      const result = await invoke<LicenseResult>("verify_license", { key: licenseKey });
      if (result.valid) {
        // Save key to config
        if (config) {
          await saveConfig({ ...config, license_key: licenseKey });
        }
        await refreshTier();
        showToast(result.message, "success");
      } else {
        showToast(result.message, "error");
      }
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!config) return;
    let dur = parseInt(focusDuration, 10);
    const days = parseInt(cleanupDays, 10);

    // Free tier: enforce 25 or 50 only
    if (tier === "free") {
      dur = [25, 50].includes(dur) ? dur : 50;
      setFocusDuration(String(dur));
    }

    if (isNaN(dur) || dur < 1 || dur > 480) {
      showToast("Focus duration must be 1–480 minutes.", "error");
      return;
    }
    if (isNaN(days) || days < 1 || days > 365) {
      showToast("Cleanup days must be 1–365.", "error");
      return;
    }
    setSaving(true);
    try {
      await saveConfig({
        ...config,
        focus_duration: dur,
        cleanup_days: days,
        cleanup_confirm: cleanupConfirm,
      });
      showToast("Settings saved.", "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const openGumroad = async () => {
    try {
      await invoke("open_url", {
        url: "https://arnav01m.gumroad.com/l/focuskit-onecoomand-zer0distractions",
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">Configure FocusKit to match your workflow.</p>
      </div>

      {/* License */}
      <div className="card">
        <div className="card-heading">
          <h3>
            <Key size={16} /> License
          </h3>
          <span className={`badge ${tier === "pro" ? "badge-pro" : "badge-free"}`}>
            {tier === "pro" ? (
              <>
                <Zap size={11} /> Pro
              </>
            ) : (
              "Free"
            )}
          </span>
        </div>

        {tier === "pro" ? (
          <div className="license-active">
            <div className="license-active-icon">
              <Zap size={18} />
            </div>
            <div>
              <div className="license-active-title">Pro license active</div>
              <div className="license-active-sub">All features are unlocked.</div>
            </div>
          </div>
        ) : (
          <div className="license-input-section">
            <p className="card-desc">
              Have a license key from Gumroad? Enter it below to unlock Pro features.
            </p>
            <div className="input-row">
              <input
                type="text"
                className="input input-grow input-mono"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <button
                className="btn btn-primary"
                onClick={handleVerify}
                disabled={verifying}
              >
                <Key size={14} />
                {verifying ? "Verifying…" : "Verify"}
              </button>
            </div>

            <button className="btn btn-secondary upgrade-link" onClick={openGumroad}>
              <Zap size={14} />
              Get Pro License
              <ExternalLink size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Focus settings */}
      <div className="card">
        <div className="card-heading">
          <h3>Focus</h3>
        </div>
        <div className="settings-rows">
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Default duration</span>
              <span className="setting-desc">
                {tier === "free"
                  ? "Free plan supports 25 or 50 min sessions"
                  : "Minutes for focus sessions when no custom duration is set"}
              </span>
            </div>
            {tier === "free" ? (
              <div style={{ display: "flex", gap: 6 }}>
                {[25, 50].map((d) => (
                  <button
                    key={d}
                    className={`pill${focusDuration === String(d) ? " pill--active" : ""}`}
                    onClick={() => setFocusDuration(String(d))}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="number"
                className="input input-sm"
                min={1}
                max={480}
                value={focusDuration}
                onChange={(e) => setFocusDuration(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Cleanup settings */}
      <div className="card">
        <div className="card-heading">
          <h3>Cleanup</h3>
        </div>
        <div className="settings-rows">
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Downloads threshold</span>
              <span className="setting-desc">
                Remove downloads older than this many days
              </span>
            </div>
            <input
              type="number"
              className="input input-sm"
              min={1}
              max={365}
              value={cleanupDays}
              onChange={(e) => setCleanupDays(e.target.value)}
            />
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Confirm before deleting</span>
              <span className="setting-desc">
                Show a confirmation dialog before removing downloads
              </span>
            </div>
            <button
              className={`toggle${cleanupConfirm ? " toggle--on" : ""}`}
              onClick={() => setCleanupConfirm((v) => !v)}
              role="switch"
              aria-checked={cleanupConfirm}
            />
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSaveSettings}
        disabled={saving}
      >
        <Save size={15} />
        {saving ? "Saving…" : "Save Settings"}
      </button>

      {/* About */}
      <div className="card card-about">
        <div className="card-heading">
          <h3><Info size={15} /> About</h3>
        </div>
        <div className="about-grid">
          <div className="about-row">
            <span>Version</span>
            <span>1.0.0</span>
          </div>
          <div className="about-row">
            <span>License</span>
            <span>Proprietary</span>
          </div>
          <div className="about-row">
            <span>Support</span>
            <span>
              <button
                className="btn-text-accent"
                onClick={() =>
                  invoke("open_url", { url: "https://arnav01m.gumroad.com" })
                }
              >
                Contact via Gumroad
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
