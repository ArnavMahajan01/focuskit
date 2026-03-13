use std::fs;
use std::process::Command;

const FOCUSKIT_START: &str = "# ── FocusKit Block List (do not edit manually) ──";
const FOCUSKIT_END: &str = "# ── End FocusKit Block List ──";

pub fn get_hosts_file() -> &'static str {
    if cfg!(target_os = "windows") {
        r"C:\Windows\System32\drivers\etc\hosts"
    } else {
        "/etc/hosts"
    }
}

pub fn read_hosts() -> Result<String, String> {
    fs::read_to_string(get_hosts_file()).map_err(|e| e.to_string())
}

pub fn build_block_entries(sites: &[String]) -> String {
    let mut entries = String::from("\n");
    entries.push_str(FOCUSKIT_START);
    entries.push('\n');
    for site in sites {
        let site = site.trim();
        if !site.is_empty() {
            entries.push_str(&format!("127.0.0.1  {}\n", site));
        }
    }
    entries.push_str(FOCUSKIT_END);
    entries.push('\n');
    entries
}

pub fn add_block_entries(current_hosts: &str, sites: &[String]) -> String {
    let clean = remove_block_entries(current_hosts);
    let block = build_block_entries(sites);
    format!("{}{}", clean.trim_end(), block)
}

pub fn remove_block_entries(hosts_content: &str) -> String {
    let mut result: Vec<&str> = Vec::new();
    let mut in_block = false;

    for line in hosts_content.lines() {
        if line.contains("FocusKit Block List") && line.contains("──") {
            if line.contains("End") {
                in_block = false;
            } else {
                in_block = true;
            }
            continue;
        }
        if in_block {
            continue;
        }
        result.push(line);
    }

    let mut output = result.join("\n");
    while output.ends_with("\n\n") {
        output.pop();
    }
    output.push('\n');
    output
}

pub fn write_hosts_privileged(content: &str) -> Result<(), String> {
    let temp_path = std::env::temp_dir().join("focuskit_hosts_update");
    fs::write(&temp_path, content)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    let temp_str = temp_path.to_string_lossy().to_string();
    let hosts_file = get_hosts_file();

    #[cfg(target_os = "linux")]
    {
        let cmd_str = format!(
            "cp '{}' '{}' && chmod 644 '{}'",
            temp_str, hosts_file, hosts_file
        );
        let status = Command::new("pkexec")
            .arg("/bin/bash")
            .arg("-c")
            .arg(&cmd_str)
            .status()
            .map_err(|e| {
                format!(
                    "Could not launch privilege helper (pkexec): {}.\n\
                     Make sure polkit is installed on your system.",
                    e
                )
            })?;

        let _ = fs::remove_file(&temp_path);

        if !status.success() {
            return Err(
                "Administrator permission was denied or cancelled.\n\
                 FocusKit needs admin access to modify /etc/hosts."
                    .to_string(),
            );
        }
    }

    #[cfg(target_os = "macos")]
    {
        let cmd_str = format!("cp '{}' '{}'", temp_str, hosts_file);
        let script = format!(
            "do shell script \"{}\" with administrator privileges",
            cmd_str
        );
        let status = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .status()
            .map_err(|e| format!("Failed to run osascript: {}", e))?;

        let _ = fs::remove_file(&temp_path);

        if !status.success() {
            return Err("Administrator permission was denied or cancelled.".to_string());
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        fs::copy(&temp_path, hosts_file)
            .map_err(|e| format!("Failed to write hosts file (run as Administrator): {}", e))?;
        let _ = fs::remove_file(&temp_path);
    }

    Ok(())
}

pub fn flush_dns() {
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("dscacheutil").arg("-flushcache").status();
        let _ = Command::new("killall")
            .arg("-HUP")
            .arg("mDNSResponder")
            .status();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("systemd-resolve")
            .arg("--flush-caches")
            .status();
        let _ = Command::new("resolvectl").arg("flush-caches").status();
    }
}
