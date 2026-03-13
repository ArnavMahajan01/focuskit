import { X, Zap, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface UpgradeModalProps {
  onClose: () => void;
}

const PRO_FEATURES = [
  "Unlimited websites to block",
  "Custom timer duration (1–480 min)",
  "Full cleanup: downloads + browser caches",
  "Complete session history & stats",
  "Block list presets (Social, News, Gaming)",
  "One-time payment — lifetime access",
];

const FREE_LIMITS = [
  "Up to 5 blocked websites",
  "Fixed durations: 25 min or 50 min",
  "Temp-file cleanup only",
  "Last 3 sessions in history",
];

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const handleUpgrade = async () => {
    try {
      await invoke("open_url", { url: "https://arnav01m.gumroad.com/l/focuskit-onecoomand-zer0distractions" });
    } catch {
      // fallback
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Upgrade to Pro"
      >
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-icon">
            <Zap size={22} />
          </div>
          <h2>Unlock Pro</h2>
          <p className="modal-subtitle">
            One purchase. Full access. Forever.
          </p>
        </div>

        {/* Comparison */}
        <div className="modal-compare">
          <div className="compare-col compare-col--free">
            <div className="compare-heading">Free</div>
            {FREE_LIMITS.map((f) => (
              <div key={f} className="compare-row compare-row--limited">
                <span className="compare-dot compare-dot--muted" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="compare-divider" />

          <div className="compare-col compare-col--pro">
            <div className="compare-heading compare-heading--pro">
              <Zap size={13} /> Pro
            </div>
            {PRO_FEATURES.map((f) => (
              <div key={f} className="compare-row">
                <Check size={13} className="compare-check" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button className="btn btn-primary btn-lg modal-cta" onClick={handleUpgrade}>
          <Zap size={16} />
          Get Pro — One-Time Purchase
        </button>
        <p className="modal-fine">
          After purchase, paste your license key in Settings to activate.
        </p>
      </div>
    </div>
  );
}
