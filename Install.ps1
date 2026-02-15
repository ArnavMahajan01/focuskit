# --------------------------------------------
# FocusKit - Installer (Windows)
# Run: powershell -ExecutionPolicy Bypass -File Install.ps1
# --------------------------------------------

$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:USERPROFILE ".focuskit-scripts"

Write-Host ""
Write-Host "  FocusKit Installer" -ForegroundColor White
Write-Host "  -----------------------" -ForegroundColor Gray
Write-Host ""

# --- Copy files -------------------------------
Write-Host "  > Installing to $InstallDir..." -ForegroundColor Cyan

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Copy-Item (Join-Path $ScriptDir "windows\Helpers.psm1")    (Join-Path $InstallDir "Helpers.psm1") -Force
Copy-Item (Join-Path $ScriptDir "windows\StartFocus.ps1")  (Join-Path $InstallDir "StartFocus.ps1") -Force
Copy-Item (Join-Path $ScriptDir "windows\EndFocus.ps1")    (Join-Path $InstallDir "EndFocus.ps1") -Force
Copy-Item (Join-Path $ScriptDir "windows\Cleanup.ps1")     (Join-Path $InstallDir "Cleanup.ps1") -Force

# Config — preserve existing
$configDest = Join-Path $InstallDir "focuskit.conf"
if (-not (Test-Path $configDest)) {
    Copy-Item (Join-Path $ScriptDir "focuskit.conf") $configDest
    Write-Host "  Config file created." -ForegroundColor Green
} else {
    Write-Host "  > Existing config preserved." -ForegroundColor Cyan
}

Write-Host "  Scripts installed." -ForegroundColor Green

# --- Create shortcut commands ----------------
# Add batch wrappers so users can type "startfocus" from cmd too
$batchDir = Join-Path $InstallDir "bin"
if (-not (Test-Path $batchDir)) { New-Item -ItemType Directory -Path $batchDir -Force | Out-Null }

$line1 = "@echo off"
Set-Content (Join-Path $batchDir "startfocus.cmd") -Value "$line1`r`npowershell -ExecutionPolicy Bypass -File `"$InstallDir\StartFocus.ps1`" %*"
Set-Content (Join-Path $batchDir "endfocus.cmd") -Value "$line1`r`npowershell -ExecutionPolicy Bypass -File `"$InstallDir\EndFocus.ps1`" %*"
Set-Content (Join-Path $batchDir "cleanup.cmd") -Value "$line1`r`npowershell -ExecutionPolicy Bypass -File `"$InstallDir\Cleanup.ps1`" %*"

# Add to PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$batchDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$batchDir", "User")
    Write-Host "  Added to PATH (restart terminal to take effect)." -ForegroundColor Green
} else {
    Write-Host "  > PATH already configured." -ForegroundColor Cyan
}

# --- Done -----------------------------------
Write-Host ""
Write-Host "  Installation complete!" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Open the config file and add your license key:" -ForegroundColor Gray
Write-Host "     notepad $configDest" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Restart your terminal" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Run your first focus session (as Administrator):" -ForegroundColor Gray
Write-Host "     startfocus" -ForegroundColor Cyan
Write-Host ""