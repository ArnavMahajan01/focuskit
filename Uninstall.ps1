# ----------------------------------------------
# FocusKit - Uninstaller (Windows)
# Run: powershell -ExecutionPolicy Bypass -File Uninstall.ps1
# ----------------------------------------------

$InstallDir = Join-Path $env:USERPROFILE ".focuskit-scripts"
$CacheDir   = Join-Path $env:USERPROFILE ".focuskit"
$BinDir     = Join-Path $InstallDir "bin"

Write-Host ""
Write-Host "  FocusKit Uninstaller" -ForegroundColor White
Write-Host "  -----------------------" -ForegroundColor Gray
Write-Host ""

# Safety: restore hosts if focus mode is active
$focusState = Join-Path $CacheDir "focus.state"
$hostsBackup = Join-Path $CacheDir "hosts.backup"
$hostsFile = "C:\Windows\System32\drivers\etc\hosts"

if (Test-Path $focusState) {
    Write-Host "  ! Focus mode is active. Restoring hosts file..." -ForegroundColor Yellow
    if (Test-Path $hostsBackup) {
        Copy-Item $hostsBackup $hostsFile -Force
        Write-Host "  ✓ Hosts file restored." -ForegroundColor Green
    }
}

# Remove scripts
if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force
    Write-Host "  ✓ Removed $InstallDir" -ForegroundColor Green
}

# Remove cache
if (Test-Path $CacheDir) {
    Remove-Item $CacheDir -Recurse -Force
    Write-Host "  ✓ Removed $CacheDir" -ForegroundColor Green
}

# Remove from PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -like "*$BinDir*") {
    $newPath = ($currentPath -split ";" | Where-Object { $_ -ne $BinDir }) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  ✓ Removed from PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "  FocusKit has been completely removed." -ForegroundColor White
Write-Host "  Restart your terminal to finish." -ForegroundColor Gray
Write-Host ""
