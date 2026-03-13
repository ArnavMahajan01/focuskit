# FocusKit

**One command to kill distractions. A full app to stay in control.**

FocusKit blocks distracting websites, runs a focus timer, and cleans up junk files, all from a clean desktop app. No accounts to create, no subscriptions, no background services phoning home.

> **Prefer the terminal?** See [README-CLI.md](README-CLI.md) for the original script-based version.

**[⚡ Get Pro License on Gumroad →](https://arnav01m.gumroad.com/l/focuskit-onecoomand-zer0distractions)**

---

## Download

Get the latest installer for your platform from the [Releases page](https://github.com/ArnavMahajan01/focuskit/releases):

| Platform | File |
|----------|------|
| macOS (Apple Silicon M1/M2/M3) | `FocusKit_*_aarch64.dmg` |
| macOS (Intel) | `FocusKit_*_x64.dmg` |
| Windows | `FocusKit_*_x64-setup.exe` |
| Linux (Debian/Ubuntu) | `focuskit_*_amd64.deb` |
| Linux (universal) | `focuskit_*_amd64.AppImage` |

---

## Install

**macOS**
1. Open the `.dmg` and drag FocusKit to Applications
2. First launch: right-click the app and click **Open** (needed once since the app is unsigned)

**Windows**
1. Run the `.exe` installer
2. If SmartScreen warns you, click **More info** then **Run anyway**

**Linux (Debian/Ubuntu)**
```bash
sudo dpkg -i focuskit_*_amd64.deb
```

**Linux (universal)**
```bash
chmod +x focuskit_*_amd64.AppImage
./focuskit_*_amd64.AppImage
```

---

## What's Inside

| Feature | Free | Pro |
|---------|------|-----|
| Block distracting sites | ✓ | ✓ |
| Focus timer (25 min, 50 min) | ✓ | ✓ |
| Custom focus duration (1-480 min) | x | ✓ |
| Extra preset durations (15 min, 90 min) | x | ✓ |
| Full session history | x | ✓ |
| Cleanup tool | ✓ | ✓ |

---

## Get Pro

**[Buy a Pro license on Gumroad →](https://arnav01m.gumroad.com/l/focuskit-onecoomand-zer0distractions)**

After purchase you'll receive a license key. Open FocusKit, go to **Settings > License**, paste the key and click **Verify**. Pro unlocks instantly.

- No subscription, one-time purchase
- No account required, just a key
- Works offline after first verification (7-day cache)

---

## How It Works

1. **Add sites to block** - go to the Block List page and add the domains you want blocked during focus sessions (e.g. `youtube.com`, `reddit.com`)
2. **Start a focus session** - pick a duration and hit Start. FocusKit modifies your system's hosts file to block the sites and starts the timer
3. **End the session** - click End Focus or let the timer run out. Sites are unblocked, DNS is flushed, session is logged
4. **Clean up** - use the Cleanup page to remove temp files and old downloads

**Note:** Blocking sites requires modifying the system hosts file. FocusKit will prompt for your password (macOS/Linux) or admin rights (Windows) when starting or ending a session.

---

## License Key

Your key is verified once with Gumroad's API, then cached locally for 7 days:

- **No internet required** for daily use after first verification
- **No tracking or telemetry** - the only network call is to Gumroad's license API
- **No accounts** - just a key stored in your config file
- If offline and the cache has expired, the last successful verification is used

---

## Configuration

All settings are accessible from the **Settings** page inside the app. They're stored in `~/.focuskit-scripts/focuskit.conf`, the same file used by the CLI version, so both can coexist.

---

## Uninstalling

**macOS / Linux**
```bash
bash uninstall.sh
```

**Windows**
```powershell
powershell -ExecutionPolicy Bypass -File Uninstall.ps1
```

This removes all scripts, cached data, and PATH entries. If focus mode is active, the hosts file is restored first.

---

## Troubleshooting

**"Permission denied" when starting/ending focus**
FocusKit needs elevated privileges to modify the hosts file. Approve the prompt when asked.

**Sites still accessible after starting focus**
Close and reopen your browser. Some browsers cache DNS entries.

**Focus mode stuck**
Run the uninstaller - it safely restores your hosts file regardless of state.

**License key not working**
Make sure you're copying the full key from your Gumroad receipt. If the issue persists, contact support.

---

## Support

Questions or issues? Contact via [Gumroad](https://arnav01m.gumroad.com) or open a [GitHub issue](https://github.com/ArnavMahajan01/focuskit/issues).
