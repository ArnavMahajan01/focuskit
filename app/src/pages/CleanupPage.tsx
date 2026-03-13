import { useState } from "react";
import { Trash2, ScanLine, Zap, HardDrive, Download, Globe } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "../context/AppContext";
import UpgradeModal from "../components/UpgradeModal";
import type { CleanupScan, CleanupResult } from "../types";

function humanSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function CleanupPage() {
  const { tier, showToast } = useApp();
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [scan, setScan] = useState<CleanupScan | null>(null);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [selected, setSelected] = useState({ temp: true, downloads: false, cache: false });
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    setScan(null);
    setResult(null);
    try {
      const s = await invoke<CleanupScan>("scan_cleanup");
      setScan(s);
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setScanning(false);
    }
  };

  const handleClean = async () => {
    if (!scan) return;
    const opts = {
      temp: selected.temp,
      downloads: tier === "pro" ? selected.downloads : false,
      cache: tier === "pro" ? selected.cache : false,
    };
    setCleaning(true);
    try {
      const r = await invoke<CleanupResult>("run_cleanup", { options: opts });
      setResult(r);
      showToast(
        `Cleaned up ${humanSize(r.space_freed)} (${r.files_removed} items removed).`,
        "success"
      );
      setScan(null);
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setCleaning(false);
    }
  };

  const toggleOption = (key: keyof typeof selected) => {
    if (key !== "temp" && tier === "free") {
      setShowUpgrade(true);
      return;
    }
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnything =
    scan &&
    (scan.temp_count > 0 || scan.download_files.length > 0 || scan.cache_size > 0);

  return (
    <div className="page">
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      <div className="page-header">
        <h1>Cleanup</h1>
        <p className="page-subtitle">
          Free up disk space by removing junk files from your system.
        </p>
      </div>

      {/* Options */}
      <div className="card">
        <div className="card-heading">
          <h3>What to clean</h3>
        </div>
        <div className="cleanup-options">
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={selected.temp}
              onChange={() => toggleOption("temp")}
            />
            <HardDrive size={16} />
            <div className="option-info">
              <span className="option-label">Temp files</span>
              <span className="option-desc">System temp files older than 1 day</span>
            </div>
          </label>

          <label className={`option-toggle${tier === "free" ? " option-toggle--locked" : ""}`}>
            <input
              type="checkbox"
              checked={selected.downloads && tier === "pro"}
              onChange={() => toggleOption("downloads")}
            />
            <Download size={16} />
            <div className="option-info">
              <span className="option-label">
                Old downloads
                {tier === "free" && <span className="pro-lock"><Zap size={11} /> Pro</span>}
              </span>
              <span className="option-desc">Downloads older than configured threshold</span>
            </div>
          </label>

          <label className={`option-toggle${tier === "free" ? " option-toggle--locked" : ""}`}>
            <input
              type="checkbox"
              checked={selected.cache && tier === "pro"}
              onChange={() => toggleOption("cache")}
            />
            <Globe size={16} />
            <div className="option-info">
              <span className="option-label">
                Browser caches
                {tier === "free" && <span className="pro-lock"><Zap size={11} /> Pro</span>}
              </span>
              <span className="option-desc">Chrome, Firefox, and Chromium caches</span>
            </div>
          </label>
        </div>
      </div>

      {/* Scan results */}
      {scan && (
        <div className="card">
          <div className="card-heading">
            <h3>Scan Results</h3>
          </div>
          <div className="scan-results">
            {scan.temp_count > 0 ? (
              <div className="scan-row">
                <HardDrive size={16} className="scan-icon" />
                <span>Temp files</span>
                <span className="scan-size">
                  {scan.temp_count} files · {humanSize(scan.temp_size)}
                </span>
              </div>
            ) : (
              <div className="scan-row scan-row--clean">
                <HardDrive size={16} className="scan-icon-clean" />
                <span>Temp files — nothing to clean</span>
              </div>
            )}

            {tier === "pro" && (
              <>
                {scan.download_files.length > 0 ? (
                  <div className="scan-row">
                    <Download size={16} className="scan-icon" />
                    <span>Old downloads</span>
                    <span className="scan-size">
                      {scan.download_files.length} files · {humanSize(scan.download_size)}
                    </span>
                  </div>
                ) : (
                  <div className="scan-row scan-row--clean">
                    <Download size={16} className="scan-icon-clean" />
                    <span>Downloads — nothing to clean</span>
                  </div>
                )}

                {scan.cache_size > 0 ? (
                  <div className="scan-row">
                    <Globe size={16} className="scan-icon" />
                    <span>Browser caches</span>
                    <span className="scan-size">{humanSize(scan.cache_size)}</span>
                  </div>
                ) : (
                  <div className="scan-row scan-row--clean">
                    <Globe size={16} className="scan-icon-clean" />
                    <span>Browser caches — nothing to clean</span>
                  </div>
                )}
              </>
            )}
          </div>

          {hasAnything && (
            <div className="scan-total">
              Estimated space freed:{" "}
              <strong>
                {humanSize(
                  scan.temp_size +
                    (tier === "pro" ? scan.download_size + scan.cache_size : 0)
                )}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Last result */}
      {result && (
        <div className="card card-success">
          <div className="result-row">
            <Trash2 size={20} className="result-icon" />
            <div>
              <div className="result-title">Cleanup Complete</div>
              <div className="result-details">
                {result.files_removed} items removed · {humanSize(result.space_freed)} freed
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="action-row">
        <button
          className="btn btn-secondary"
          onClick={handleScan}
          disabled={scanning || cleaning}
        >
          <ScanLine size={16} />
          {scanning ? "Scanning…" : "Scan System"}
        </button>

        {scan && hasAnything && (
          <button
            className="btn btn-primary"
            onClick={handleClean}
            disabled={cleaning || (!selected.temp && !selected.downloads && !selected.cache)}
          >
            <Trash2 size={16} />
            {cleaning ? "Cleaning…" : "Clean Selected"}
          </button>
        )}
      </div>
    </div>
  );
}
