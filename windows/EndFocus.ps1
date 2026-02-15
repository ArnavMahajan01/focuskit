# ---------------------------------------------
# FocusKit - EndFocus (Windows)
# Restores hosts file and ends focus mode.
# Run as Administrator.
# ---------------------------------------------

Import-Module (Join-Path $PSScriptRoot "Helpers.psm1") -Force

# --- Preflight ---------------------------
$config = Load-Config
Require-Admin
Ensure-CacheDir

# --- Check if active -------------------------
if (-not (Test-Path $global:FocusState)) {
    Write-Warn "Focus mode is not active. Nothing to do."
    exit 0
}

# --- Restore hosts ---------------------------
Write-Heading "Ending focus mode..."

if (Test-Path $global:HostsBackup) {
    Copy-Item $global:HostsBackup $global:HostsFile -Force
    Remove-Item $global:HostsBackup
    Write-Ok "Hosts file restored."
} else {
    # Fallback: strip FocusKit lines
    $content = Get-Content $global:HostsFile
    $inBlock = $false
    $cleaned = @()
    foreach ($line in $content) {
        if ($line -match "# -- FocusKit Block List") { $inBlock = $true; continue }
        if ($line -match "# -- End FocusKit Block List") { $inBlock = $false; continue }
        if (-not $inBlock) { $cleaned += $line }
    }
    Set-Content -Path $global:HostsFile -Value ($cleaned -join "`r`n")
    Write-Ok "Blocked sites removed from hosts file."
}

# Flush DNS
ipconfig /flushdns | Out-Null

# --- Session summary -------------------------
$focusDuration = [int]$config["FOCUS_DURATION"]
$endEpoch = [long](Get-Content $global:FocusState -ErrorAction SilentlyContinue)
$now = [long](Get-Date -UFormat %s)

if ($endEpoch -gt 0) {
    $startEpoch = $endEpoch - ($focusDuration * 60)
    $elapsedMins = [math]::Floor(($now - $startEpoch) / 60)

    if ($elapsedMins -ge $focusDuration) {
        $sessionMsg = "Full session ($focusDuration min)"
    } else {
        $sessionMsg = "Early end ($elapsedMins of $focusDuration min)"
    }
} else {
    $sessionMsg = "Session ended"
}

# --- Clean up state --------------------------
Remove-Item $global:FocusState -ErrorAction SilentlyContinue

# --- Output ----------------------------------
Write-Host ""
Write-Host "  +------------------------------------+" -ForegroundColor White
Write-Host "  |  " -ForegroundColor White -NoNewline
Write-Host "Focus mode OFF" -ForegroundColor Green -NoNewline
Write-Host "                  |" -ForegroundColor White
Write-Host "  |  $sessionMsg" -ForegroundColor White
Write-Host "  |  Welcome back!                   |" -ForegroundColor White
Write-Host "  +------------------------------------+" -ForegroundColor White
Write-Host ""
