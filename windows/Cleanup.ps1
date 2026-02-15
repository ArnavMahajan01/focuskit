# ---------------------------------------------
# FocusKit - Cleanup (Windows)
# Clears temp files and old downloads.
# ---------------------------------------------

Import-Module (Join-Path $PSScriptRoot "Helpers.psm1") -Force

# --- Preflight ---------------------------
$config = Load-Config
Verify-License -Config $config
Ensure-CacheDir

Write-Heading "FocusKit Cleanup"
Write-Host ""

$totalFreed = 0
$itemsRemoved = 0

function Get-HumanSize {
    param([long]$Bytes)
    if ($Bytes -ge 1GB) { return "$([math]::Round($Bytes / 1GB, 1)) GB" }
    elseif ($Bytes -ge 1MB) { return "$([math]::Round($Bytes / 1MB, 1)) MB" }
    elseif ($Bytes -ge 1KB) { return "$([math]::Round($Bytes / 1KB, 1)) KB" }
    else { return "$Bytes bytes" }
}

# --- 1. Clear Windows temp files -------------
Write-Info "Scanning temp files..."

$tempDirs = @($env:TEMP, "C:\Windows\Temp")
$tempFreed = 0
$tempCount = 0

foreach ($dir in $tempDirs) {
    if (Test-Path $dir) {
        $cutoff = (Get-Date).AddDays(-1)
        $files = Get-ChildItem $dir -File -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $cutoff }

        foreach ($file in $files) {
            try {
                $size = $file.Length
                Remove-Item $file.FullName -Force -ErrorAction Stop
                $tempFreed += $size
                $tempCount++
            } catch {
                # Skip locked files
            }
        }
    }
}

if ($tempCount -gt 0) {
    Write-Ok "Temp files: removed $tempCount files ($(Get-HumanSize $tempFreed))"
} else {
    Write-Info "Temp files: nothing to clean"
}

$totalFreed += $tempFreed
$itemsRemoved += $tempCount

# --- 2. Clear old Downloads ------------------
$downloadsDir = Join-Path $env:USERPROFILE "Downloads"
$cleanupDays = [int]$config["CLEANUP_DAYS"]
$cleanupConfirm = $config["CLEANUP_CONFIRM"]

if (Test-Path $downloadsDir) {
    Write-Info "Scanning Downloads older than $cleanupDays days..."

    $cutoff = (Get-Date).AddDays(-$cleanupDays)
    $oldFiles = Get-ChildItem $downloadsDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff }

    $oldSize = ($oldFiles | Measure-Object -Property Length -Sum).Sum
    if (-not $oldSize) { $oldSize = 0 }

    if ($oldFiles.Count -gt 0) {
        Write-Host ""
        Write-Info "Found $($oldFiles.Count) files ($(Get-HumanSize $oldSize)) to remove:"
        Write-Host ""

        $shown = 0
        foreach ($file in $oldFiles) {
            if ($shown -lt 10) {
                Write-Host "    $($file.Name)"
                $shown++
            }
        }
        if ($oldFiles.Count -gt 10) {
            Write-Host "    ... and $($oldFiles.Count - 10) more"
        }
        Write-Host ""

        $doDelete = $true
        if ($cleanupConfirm -eq "yes") {
            $confirm = Read-Host "  Delete these files? [y/N]"
            if ($confirm -ne "y" -and $confirm -ne "Y") {
                Write-Info "Skipped Downloads cleanup."
                $doDelete = $false
            }
        }

        if ($doDelete) {
            $dlCount = 0
            foreach ($file in $oldFiles) {
                try {
                    Remove-Item $file.FullName -Force -ErrorAction Stop
                    $dlCount++
                } catch { }
            }
            if ($dlCount -gt 0) {
                Write-Ok "Downloads: removed $dlCount files ($(Get-HumanSize $oldSize))"
                $totalFreed += $oldSize
                $itemsRemoved += $dlCount
            }
        }
    } else {
        Write-Info "Downloads: nothing older than $cleanupDays days"
    }
}

# --- 3. Clear Recycle Bin --------------------
Write-Info "Clearing Recycle Bin..."
try {
    Clear-RecycleBin -Force -ErrorAction Stop
    Write-Ok "Recycle Bin emptied."
} catch {
    Write-Info "Recycle Bin: already empty or inaccessible"
}

# --- Summary ---------------------------------
Write-Host ""
Write-Host "  +------------------------------------+" -ForegroundColor White
Write-Host "  |  " -ForegroundColor White -NoNewline
Write-Host "Cleanup complete" -ForegroundColor Green -NoNewline
Write-Host "                |" -ForegroundColor White
Write-Host "  |  Files removed: " -ForegroundColor White -NoNewline
Write-Host "$itemsRemoved" -ForegroundColor Cyan -NoNewline
Write-Host "               |" -ForegroundColor White
Write-Host "  |  Space freed:   " -ForegroundColor White -NoNewline
Write-Host "$(Get-HumanSize $totalFreed)" -ForegroundColor Cyan -NoNewline
Write-Host "          |" -ForegroundColor White
Write-Host "  +------------------------------------+" -ForegroundColor White
Write-Host ""
