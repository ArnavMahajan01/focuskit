# FocusKit

**Three commands to take back your day.**

FocusKit is a lightweight set of terminal scripts that block distracting websites, run a focus timer, and clean up junk files — all from one command. No apps to install, no accounts to create, no background services.

LINK: https://arnav01m.gumroad.com/l/focuskit-onecoomand-zer0distractions
---

## What's Inside

| Command      | What it does                                    |
| ------------ | ----------------------------------------------- |
| `startfocus` | Blocks distracting sites + starts a focus timer |
| `endfocus`   | Unblocks sites + ends the timer                 |
| `cleanup`    | Removes temp files + old downloads              |

---

## Quick Start

### macOS & Linux

**1. Install (one command)**

Open Terminal and run:

```
cd focuskit
bash install.sh
```

**2. Add your license key**

Open the config file:

```
nano ~/.focuskit-scripts/focuskit.conf
```

Paste your Gumroad license key between the quotes:

```
GUMROAD_LICENSE_KEY="your-key-here"
```

Save and close (`Ctrl+X`, then `Y`, then `Enter`).

**3. Reload your terminal**

```
source ~/.zshrc
```

(or `source ~/.bashrc` if you use Bash)

**4. Start focusing**

```
sudo startfocus
```

That's it. Sites are blocked, timer is running.

**NOTE: Sometime running startfocus with sudo says startfocus command not found. If it happens run it without sudo and follow additional steps**

```
startfocus
```

---

### Windows (WORK IN PROGRESS - INCOMPLETE)

**1. Install (one command)**

Open PowerShell and run:

```
cd focuskit
powershell -ExecutionPolicy Bypass -File Install.ps1
```

**2. Add your license key**

```
notepad %USERPROFILE%\.focuskit-scripts\focuskit.conf
```

Paste your Gumroad license key between the quotes and save.

**3. Restart your terminal**

Close and reopen PowerShell or Command Prompt.

**4. Start focusing (run as Administrator)**

```
startfocus
```

---

## Using Each Command

### startfocus

Blocks distracting websites and starts a countdown timer.

```bash
# Default: 50 minutes
sudo startfocus

# Custom duration: 25 minutes
sudo startfocus 25
```

**What happens:**

- Your system's hosts file is modified to block the configured sites
- A timer counts down in your terminal
- When the timer ends, sites are automatically unblocked

**Note:** Requires `sudo` (macOS/Linux) or Administrator (Windows) because it modifies the system hosts file.

Press `Ctrl+C` during the timer to keep focus mode active in the background — sites stay blocked until you manually run `endfocus`.

### endfocus

Restores your network access and ends the session.

```bash
sudo endfocus
```

**What happens:**

- Your hosts file is restored to its original state
- DNS cache is flushed
- Focus state is cleared

### cleanup

Removes temp files and old downloads.

```bash
cleanup
```

**What happens:**

- System temp files older than 1 day are removed
- Downloads older than 30 days are listed (you'll be asked to confirm)
- A summary shows how much space was freed

Does **not** require sudo/Administrator.

---

## Configuration

All settings live in one file: `focuskit.conf`

| Setting               | Default                  | Description                                |
| --------------------- | ------------------------ | ------------------------------------------ |
| `GUMROAD_LICENSE_KEY` | (empty)                  | Your Gumroad license key                   |
| `FOCUS_DURATION`      | 50                       | Focus session length in minutes            |
| `BLOCKED_SITES`       | YouTube, Reddit, X, etc. | Space-separated list of domains to block   |
| `CLEANUP_DAYS`        | 30                       | Delete downloads older than this many days |
| `CLEANUP_CONFIRM`     | yes                      | Ask before deleting downloads              |

**To add or remove blocked sites**, edit the `BLOCKED_SITES` line. Include both `example.com` and `www.example.com` for each site.

---

## License Key

Your license key is verified once with Gumroad's API, then cached locally for 7 days. This means:

- **No internet required** for daily use (after first verification)
- **No tracking or telemetry** — the only network call is to Gumroad's license API
- **No accounts** — just a key in a config file
- If you're offline and the cache has expired, the scripts still work using the last verification

---

## Uninstalling

### macOS & Linux

```bash
bash uninstall.sh
```

### Windows

```
powershell -ExecutionPolicy Bypass -File Uninstall.ps1
```

This completely removes:

- All script files
- Cached data
- PATH entries
- If focus mode is active, hosts file is restored first

---

## File Locations

| What          | Where                               |
| ------------- | ----------------------------------- |
| Scripts       | `~/.focuskit-scripts/`              |
| Config        | `~/.focuskit-scripts/focuskit.conf` |
| Cache & state | `~/.focuskit/`                      |

---

## Troubleshooting

**"Permission denied"**
→ Use `sudo` (macOS/Linux) or run as Administrator (Windows) for `startfocus` and `endfocus`.

**"No license key found"**
→ Open `focuskit.conf` and paste your key from your Gumroad purchase receipt.

**"Could not reach Gumroad"**
→ Check your internet. If you've verified before, the cached license will still work offline.

**Sites still accessible after startfocus**
→ Try closing and reopening your browser. Some browsers cache DNS.

**Focus mode stuck (can't run endfocus)**
→ The uninstall script will safely restore your hosts file.

---

## Design Principles

- **Minimal > clever** — Plain scripts, plain config, no magic
- **Explicit > automatic** — You run the commands, you see what happens
- **Reversible > permanent** — Everything can be undone, hosts file is always backed up

---

## Support

Questions? Reply to your Gumroad purchase receipt email.
