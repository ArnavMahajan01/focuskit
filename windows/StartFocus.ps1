# ---------------------------------------------
# FocusKit - StartFocus (Windows)
# Blocks distracting websites and starts a
# focus timer. Run as Administrator.
# ---------------------------------------------
param(
    [int]$Duration = 0
)

Import-Module (Join-Path $PSScriptRoot "Helpers.psm1") -Force

# --- Preflight ---------------------------
$config = Load-Config
Verify-License -Config $config
Require-Admin
Ensure-CacheDir

# --- Check if already active -----------------
if (Test-Path $global:FocusState) {
    Write-Warn "Focus mode is already active."
    Write-Host "    Run 'EndFocus.ps1' to stop it first."
    exit 1
}

# --- Resolve duration ------------------------
if ($Duration -eq 0) {
    $Duration = [int]$config["FOCUS_DURATION"]
}
if ($Duration -lt 1 -or $Duration -gt 480) {
    Write-Err "Duration must be between 1 and 480 minutes."
    exit 1
}

# --- Backup hosts file -----------------------
if (-not (Test-Path $global:HostsBackup)) {
    Copy-Item $global:HostsFile $global:HostsBackup
}

# --- Block websites --------------------------
Write-Heading "Starting focus mode..."

$blockedSites = $config["BLOCKED_SITES"] -split "\s+"
$blockEntries = @("`r`n# -- FocusKit Block List (do not edit manually) --")
foreach ($site in $blockedSites) {
    if ($site.Trim()) {
        $blockEntries += "127.0.0.1  $site"
    }
}
$blockEntries += "# -- End FocusKit Block List --"

Add-Content -Path $global:HostsFile -Value ($blockEntries -join "`r`n")

# Flush DNS
ipconfig /flushdns | Out-Null

# --- Save state ------------------------------
$endTime = (Get-Date).AddMinutes($Duration)
$endEpoch = [long](Get-Date $endTime -UFormat %s)
Set-Content -Path $global:FocusState -Value $endEpoch

$endDisplay = $endTime.ToString("HH:mm")
$siteCount = ($blockedSites | Where-Object { $_.Trim() }).Count

# --- Output ----------------------------------
Write-Host ""
Write-Host "  +------------------------------------+" -ForegroundColor White
Write-Host "  |  " -ForegroundColor White -NoNewline
Write-Host "Focus mode ON" -ForegroundColor Green -NoNewline
Write-Host "                   |" -ForegroundColor White
Write-Host "  |  Duration: " -ForegroundColor White -NoNewline
Write-Host "$Duration minutes" -ForegroundColor Cyan -NoNewline
Write-Host "            |" -ForegroundColor White
Write-Host "  |  Ends at:  " -ForegroundColor White -NoNewline
Write-Host "$endDisplay" -ForegroundColor Cyan -NoNewline
Write-Host "                |" -ForegroundColor White
Write-Host "  |  Blocked:  " -ForegroundColor White -NoNewline
Write-Host "$siteCount sites" -ForegroundColor Yellow -NoNewline
Write-Host "              |" -ForegroundColor White
Write-Host "  +------------------------------------+" -ForegroundColor White
Write-Host ""
Write-Info "Run 'EndFocus.ps1' when you're done."
Write-Host ""

# --- Timer -----------------------------------
Write-Info "Timer running... press Ctrl+C to keep focus mode active in background."
Write-Host ""

$remaining = $Duration
while ($remaining -gt 0) {
    Write-Host "`r  [T]  $remaining min remaining   " -ForegroundColor Cyan -NoNewline
    try {
        Start-Sleep -Seconds 60
    } catch {
        break
    }
    $remaining--
}

# Auto-restore if timer completed
if ($remaining -le 0) {
    Write-Host ""
    Write-Host ""
    Write-Heading "Time's up!"
    & (Join-Path $PSScriptRoot "EndFocus.ps1")
}
