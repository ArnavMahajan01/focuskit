use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::hosts;

// ─── Utility helpers ─────────────────────────────────────────────────────────

fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/tmp"))
}

fn config_dir() -> PathBuf {
    home_dir().join(".focuskit-scripts")
}

fn cache_dir() -> PathBuf {
    home_dir().join(".focuskit")
}

fn config_file() -> PathBuf {
    config_dir().join("focuskit.conf")
}

fn focus_state_file() -> PathBuf {
    cache_dir().join("focus.state")
}

fn hosts_backup_file() -> PathBuf {
    cache_dir().join("hosts.backup")
}

fn license_cache_file() -> PathBuf {
    cache_dir().join("license.cache")
}

fn history_file() -> PathBuf {
    cache_dir().join("history.json")
}

fn ensure_dirs() -> Result<(), String> {
    fs::create_dir_all(config_dir()).map_err(|e| e.to_string())?;
    fs::create_dir_all(cache_dir()).map_err(|e| e.to_string())?;
    Ok(())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

// ─── Config ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub license_key: String,
    pub focus_duration: u32,
    pub blocked_sites: Vec<String>,
    pub cleanup_days: u32,
    pub cleanup_confirm: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            license_key: String::new(),
            focus_duration: 50,
            blocked_sites: vec![
                "youtube.com".to_string(),
                "www.youtube.com".to_string(),
                "reddit.com".to_string(),
                "www.reddit.com".to_string(),
                "x.com".to_string(),
            ],
            cleanup_days: 30,
            cleanup_confirm: true,
        }
    }
}

fn parse_conf(content: &str) -> AppConfig {
    let mut config = AppConfig::default();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim().trim_matches('"').trim_matches('\'');
            match key {
                "GUMROAD_LICENSE_KEY" => config.license_key = value.to_string(),
                "FOCUS_DURATION" => config.focus_duration = value.parse().unwrap_or(50),
                "BLOCKED_SITES" => {
                    config.blocked_sites = value
                        .split_whitespace()
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .collect();
                }
                "CLEANUP_DAYS" => config.cleanup_days = value.parse().unwrap_or(30),
                "CLEANUP_CONFIRM" => config.cleanup_confirm = value == "yes",
                _ => {}
            }
        }
    }
    config
}

fn serialize_conf(config: &AppConfig) -> String {
    let sites = config.blocked_sites.join(" ");
    let confirm = if config.cleanup_confirm { "yes" } else { "no" };
    format!(
        "# ------------------------------------------------\n\
         # FocusKit Configuration\n\
         # ------------------------------------------------\n\
         \n\
         # Your Gumroad license key (paste it here after purchase)\n\
         GUMROAD_LICENSE_KEY=\"{}\"\n\
         \n\
         # Gumroad product ID (do not change)\n\
         GUMROAD_PRODUCT_ID=\"iRg5M3csnodL8E3u0FA0Gw==\"\n\
         \n\
         # Duration in minutes (default: 50)\n\
         FOCUS_DURATION={}\n\
         \n\
         # Websites to block during focus mode (space-separated)\n\
         BLOCKED_SITES=\"{}\"\n\
         \n\
         # Delete downloads older than this many days\n\
         CLEANUP_DAYS={}\n\
         \n\
         # Set to \"yes\" to require confirmation before deleting\n\
         CLEANUP_CONFIRM=\"{}\"\n",
        config.license_key,
        config.focus_duration,
        sites,
        config.cleanup_days,
        confirm,
    )
}

#[tauri::command]
pub async fn get_config() -> Result<AppConfig, String> {
    ensure_dirs()?;
    let path = config_file();
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(parse_conf(&content))
}

#[tauri::command]
pub async fn save_config(config: AppConfig) -> Result<(), String> {
    ensure_dirs()?;
    let content = serialize_conf(&config);
    fs::write(config_file(), content).map_err(|e| e.to_string())
}

// ─── License / Tier ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseResult {
    pub valid: bool,
    pub message: String,
    pub cached: bool,
}

const GUMROAD_PRODUCT_ID: &str = "iRg5M3csnodL8E3u0FA0Gw==";
const LICENSE_CACHE_TTL: u64 = 7 * 24 * 60 * 60; // 7 days

fn is_license_cached() -> bool {
    if let Ok(content) = fs::read_to_string(license_cache_file()) {
        if let Ok(cached_ts) = content.trim().parse::<u64>() {
            return now_secs().saturating_sub(cached_ts) < LICENSE_CACHE_TTL;
        }
    }
    false
}

fn write_license_cache() {
    let _ = ensure_dirs();
    let _ = fs::write(license_cache_file(), now_secs().to_string());
}

#[tauri::command]
pub async fn verify_license(key: String) -> Result<LicenseResult, String> {
    if key.trim().is_empty() {
        return Ok(LicenseResult {
            valid: false,
            message: "Please enter a license key.".to_string(),
            cached: false,
        });
    }

    if is_license_cached() {
        return Ok(LicenseResult {
            valid: true,
            message: "License verified (cached).".to_string(),
            cached: true,
        });
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let params = [
        ("product_id", GUMROAD_PRODUCT_ID),
        ("license_key", key.trim()),
    ];

    match client
        .post("https://api.gumroad.com/v2/licenses/verify")
        .form(&params)
        .send()
        .await
    {
        Ok(resp) => {
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            let success = body["success"].as_bool().unwrap_or(false);
            if success {
                write_license_cache();
                Ok(LicenseResult {
                    valid: true,
                    message: "License verified successfully.".to_string(),
                    cached: false,
                })
            } else {
                let msg = body["message"]
                    .as_str()
                    .unwrap_or("Invalid license key.")
                    .to_string();
                Ok(LicenseResult {
                    valid: false,
                    message: msg,
                    cached: false,
                })
            }
        }
        Err(_) => {
            if license_cache_file().exists() {
                Ok(LicenseResult {
                    valid: true,
                    message: "Offline — using cached license.".to_string(),
                    cached: true,
                })
            } else {
                Ok(LicenseResult {
                    valid: false,
                    message: "Could not reach license server. Check your internet connection."
                        .to_string(),
                    cached: false,
                })
            }
        }
    }
}

#[tauri::command]
pub async fn get_tier() -> Result<String, String> {
    let config = get_config().await?;
    if config.license_key.trim().is_empty() {
        return Ok("free".to_string());
    }
    if is_license_cached() {
        return Ok("pro".to_string());
    }
    let result = verify_license(config.license_key).await?;
    if result.valid {
        Ok("pro".to_string())
    } else {
        Ok("free".to_string())
    }
}

// ─── Focus session ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct FocusStatus {
    pub active: bool,
    pub end_time: Option<u64>,
    pub blocked_sites: Vec<String>,
    pub total_duration: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FocusSession {
    pub id: String,
    pub start_time: u64,
    pub duration: u32,
    pub completed: bool,
    pub sites_blocked: usize,
}

#[tauri::command]
pub async fn get_focus_status() -> Result<FocusStatus, String> {
    let state_path = focus_state_file();
    if !state_path.exists() {
        return Ok(FocusStatus {
            active: false,
            end_time: None,
            blocked_sites: vec![],
            total_duration: None,
        });
    }
    let content = fs::read_to_string(&state_path).map_err(|e| e.to_string())?;
    let mut lines = content.lines();
    let end_time: u64 = lines.next().unwrap_or("0").trim().parse().unwrap_or(0);
    let duration: u32 = lines.next().unwrap_or("50").trim().parse().unwrap_or(50);
    let sites_line = lines.next().unwrap_or("");
    let blocked_sites: Vec<String> = if sites_line.is_empty() {
        vec![]
    } else {
        sites_line
            .split_whitespace()
            .map(|s| s.to_string())
            .collect()
    };

    Ok(FocusStatus {
        active: true,
        end_time: Some(end_time),
        blocked_sites,
        total_duration: Some(duration),
    })
}

#[tauri::command]
pub async fn start_focus(duration: u32) -> Result<(), String> {
    ensure_dirs()?;

    if focus_state_file().exists() {
        return Err("Focus mode is already active. End the current session first.".to_string());
    }

    if duration < 1 || duration > 480 {
        return Err("Duration must be between 1 and 480 minutes.".to_string());
    }

    let config = get_config().await?;
    let sites = config.blocked_sites.clone();

    if sites.is_empty() {
        return Err(
            "No websites configured to block. Add sites in the Block List tab first.".to_string(),
        );
    }

    let current_hosts =
        hosts::read_hosts().map_err(|e| format!("Could not read hosts file: {}", e))?;

    // Backup hosts (only if no backup exists yet)
    let backup_path = hosts_backup_file();
    if !backup_path.exists() {
        fs::write(&backup_path, &current_hosts).map_err(|e| e.to_string())?;
    }

    let new_hosts = hosts::add_block_entries(&current_hosts, &sites);

    // Write to /etc/hosts — triggers OS privilege dialog
    let new_hosts_clone = new_hosts.clone();
    tauri::async_runtime::spawn_blocking(move || hosts::write_hosts_privileged(&new_hosts_clone))
        .await
        .map_err(|e| e.to_string())??;

    tauri::async_runtime::spawn_blocking(hosts::flush_dns)
        .await
        .ok();

    // Save state: end_time, duration, sites
    let end_time = now_secs() + (duration as u64 * 60);
    let sites_str = sites.join(" ");
    let state = format!("{}\n{}\n{}", end_time, duration, sites_str);
    fs::write(focus_state_file(), state).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn end_focus(completed: bool) -> Result<FocusSession, String> {
    ensure_dirs()?;

    let state_path = focus_state_file();
    if !state_path.exists() {
        return Err("No active focus session.".to_string());
    }

    let state = fs::read_to_string(&state_path).map_err(|e| e.to_string())?;
    let mut lines = state.lines();
    let end_time: u64 = lines.next().unwrap_or("0").trim().parse().unwrap_or(0);
    let duration: u32 = lines.next().unwrap_or("50").trim().parse().unwrap_or(50);
    let sites_line = lines.next().unwrap_or("");
    let sites_count = sites_line.split_whitespace().count();

    // Restore hosts
    let backup_path = hosts_backup_file();
    if backup_path.exists() {
        let backup = fs::read_to_string(&backup_path).map_err(|e| e.to_string())?;
        let backup_clone = backup.clone();
        tauri::async_runtime::spawn_blocking(move || hosts::write_hosts_privileged(&backup_clone))
            .await
            .map_err(|e| e.to_string())??;
        fs::remove_file(&backup_path).ok();
    } else {
        let current = hosts::read_hosts().map_err(|e| e.to_string())?;
        let clean = hosts::remove_block_entries(&current);
        tauri::async_runtime::spawn_blocking(move || hosts::write_hosts_privileged(&clean))
            .await
            .map_err(|e| e.to_string())??;
    }

    tauri::async_runtime::spawn_blocking(hosts::flush_dns)
        .await
        .ok();

    fs::remove_file(&state_path).ok();

    let start_time = end_time.saturating_sub(duration as u64 * 60);
    let session = FocusSession {
        id: now_secs().to_string(),
        start_time,
        duration,
        completed,
        sites_blocked: sites_count,
    };

    save_session_to_history(&session)?;

    Ok(session)
}

fn save_session_to_history(session: &FocusSession) -> Result<(), String> {
    let history_path = history_file();
    let mut sessions: Vec<FocusSession> = if history_path.exists() {
        let content = fs::read_to_string(&history_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };

    sessions.push(session.clone());

    // Keep last 100 sessions
    if sessions.len() > 100 {
        sessions.drain(0..sessions.len() - 100);
    }

    let content = serde_json::to_string_pretty(&sessions).map_err(|e| e.to_string())?;
    fs::write(history_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_session_history() -> Result<Vec<FocusSession>, String> {
    let history_path = history_file();
    if !history_path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&history_path).map_err(|e| e.to_string())?;
    let mut sessions: Vec<FocusSession> = serde_json::from_str(&content).unwrap_or_default();
    sessions.reverse(); // Most recent first
    Ok(sessions)
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupScan {
    pub temp_count: u64,
    pub temp_size: u64,
    pub download_files: Vec<String>,
    pub download_size: u64,
    pub cache_dirs: Vec<String>,
    pub cache_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupOptions {
    pub temp: bool,
    pub downloads: bool,
    pub cache: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupResult {
    pub files_removed: u64,
    pub space_freed: u64,
}

fn dir_size(path: &PathBuf) -> u64 {
    let mut size = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                size += fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
            } else if p.is_dir() {
                size += dir_size(&p);
            }
        }
    }
    size
}

#[tauri::command]
pub async fn scan_cleanup() -> Result<CleanupScan, String> {
    let home = home_dir();
    let config = get_config().await.unwrap_or_default();

    let mut scan = CleanupScan {
        temp_count: 0,
        temp_size: 0,
        download_files: vec![],
        download_size: 0,
        cache_dirs: vec![],
        cache_size: 0,
    };

    // Temp files
    let temp_dirs: Vec<PathBuf> = if cfg!(target_os = "macos") {
        vec![PathBuf::from("/tmp"), home.join("Library/Caches")]
    } else {
        vec![PathBuf::from("/tmp"), PathBuf::from("/var/tmp")]
    };

    for dir in &temp_dirs {
        if dir.exists() {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Ok(meta) = fs::metadata(&path) {
                            if let Ok(modified) = meta.modified() {
                                let age = SystemTime::now()
                                    .duration_since(modified)
                                    .map(|d| d.as_secs())
                                    .unwrap_or(0);
                                if age > 86400 {
                                    scan.temp_count += 1;
                                    scan.temp_size += meta.len();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Old downloads
    let downloads_dir = home.join("Downloads");
    if downloads_dir.exists() {
        let cutoff = config.cleanup_days as u64 * 86400;
        if let Ok(entries) = fs::read_dir(&downloads_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Ok(meta) = fs::metadata(&path) {
                        if let Ok(modified) = meta.modified() {
                            let age = SystemTime::now()
                                .duration_since(modified)
                                .map(|d| d.as_secs())
                                .unwrap_or(0);
                            if age > cutoff {
                                scan.download_files.push(
                                    path.file_name()
                                        .and_then(|n| n.to_str())
                                        .unwrap_or("unknown")
                                        .to_string(),
                                );
                                scan.download_size += meta.len();
                            }
                        }
                    }
                }
            }
        }
    }

    // Browser caches
    let cache_paths: Vec<PathBuf> = if cfg!(target_os = "macos") {
        vec![
            home.join("Library/Caches/Google/Chrome/Default/Cache"),
            home.join("Library/Caches/Firefox/Profiles"),
        ]
    } else {
        vec![
            home.join(".cache/google-chrome/Default/Cache"),
            home.join(".cache/mozilla/firefox"),
            home.join(".cache/chromium/Default/Cache"),
        ]
    };

    for dir in &cache_paths {
        if dir.exists() {
            let size = dir_size(dir);
            if size > 0 {
                scan.cache_dirs
                    .push(dir.to_string_lossy().to_string());
                scan.cache_size += size;
            }
        }
    }

    Ok(scan)
}

#[tauri::command]
pub async fn run_cleanup(options: CleanupOptions) -> Result<CleanupResult, String> {
    let home = home_dir();
    let config = get_config().await.unwrap_or_default();

    let mut result = CleanupResult {
        files_removed: 0,
        space_freed: 0,
    };

    if options.temp {
        let temp_dirs: Vec<PathBuf> = if cfg!(target_os = "macos") {
            vec![PathBuf::from("/tmp"), home.join("Library/Caches")]
        } else {
            vec![PathBuf::from("/tmp"), PathBuf::from("/var/tmp")]
        };
        for dir in &temp_dirs {
            if dir.exists() {
                if let Ok(entries) = fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if let Ok(meta) = fs::metadata(&path) {
                                if let Ok(modified) = meta.modified() {
                                    let age = SystemTime::now()
                                        .duration_since(modified)
                                        .map(|d| d.as_secs())
                                        .unwrap_or(0);
                                    if age > 86400 {
                                        let size = meta.len();
                                        if fs::remove_file(&path).is_ok() {
                                            result.files_removed += 1;
                                            result.space_freed += size;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if options.downloads {
        let downloads_dir = home.join("Downloads");
        if downloads_dir.exists() {
            let cutoff = config.cleanup_days as u64 * 86400;
            if let Ok(entries) = fs::read_dir(&downloads_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Ok(meta) = fs::metadata(&path) {
                            if let Ok(modified) = meta.modified() {
                                let age = SystemTime::now()
                                    .duration_since(modified)
                                    .map(|d| d.as_secs())
                                    .unwrap_or(0);
                                if age > cutoff {
                                    let size = meta.len();
                                    if fs::remove_file(&path).is_ok() {
                                        result.files_removed += 1;
                                        result.space_freed += size;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if options.cache {
        let cache_paths: Vec<PathBuf> = if cfg!(target_os = "macos") {
            vec![
                home.join("Library/Caches/Google/Chrome/Default/Cache"),
                home.join("Library/Caches/Firefox/Profiles"),
            ]
        } else {
            vec![
                home.join(".cache/google-chrome/Default/Cache"),
                home.join(".cache/mozilla/firefox"),
                home.join(".cache/chromium/Default/Cache"),
            ]
        };
        for dir in &cache_paths {
            if dir.exists() {
                let size = dir_size(dir);
                if fs::remove_dir_all(dir).is_ok() {
                    result.space_freed += size;
                    result.files_removed += 1;
                }
            }
        }
    }

    Ok(result)
}

// ─── URL opener ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
