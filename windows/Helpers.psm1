# ---------------------------------------------
# FocusKit - Shared Helpers (Windows)
# ---------------------------------------------

$ErrorActionPreference = "Stop"

# --- Paths -----------------------------------
$global:FocusKitDir   = $PSScriptRoot
$global:ConfigFile    = Join-Path $global:FocusKitDir "focuskit.conf"
$global:CacheDir      = Join-Path $env:USERPROFILE ".focuskit"
$global:LicenseCache  = Join-Path $global:CacheDir "license.cache"
$global:FocusState    = Join-Path $global:CacheDir "focus.state"
$global:HostsBackup   = Join-Path $global:CacheDir "hosts.backup"
$global:HostsFile     = "C:\Windows\System32\drivers\etc\hosts"

# --- Output Helpers --------------------------
function Write-Info    { param($msg) Write-Host "  > " -ForegroundColor Cyan -NoNewline; Write-Host $msg }
function Write-Ok      { param($msg) Write-Host "  * " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Write-Warn    { param($msg) Write-Host "  ! " -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Write-Err     { param($msg) Write-Host "  X " -ForegroundColor Red -NoNewline; Write-Host $msg }
function Write-Heading { param($msg) Write-Host "`n  $msg" -ForegroundColor White }

# --- Ensure cache directory -------------------
function Ensure-CacheDir {
    if (-not (Test-Path $global:CacheDir)) {
        New-Item -ItemType Directory -Path $global:CacheDir -Force | Out-Null
    }
}

# --- Load config -----------------------------
function Load-Config {
    if (-not (Test-Path $global:ConfigFile)) {
        Write-Err "Config file not found: $($global:ConfigFile)"
        Write-Host "    Copy focuskit.conf to $($global:FocusKitDir) and add your license key."
        exit 1
    }

    $config = @{}
    Get-Content $global:ConfigFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            if ($line -match '^(\w+)=["'']?(.+?)["'']?$') {
                $config[$Matches[1]] = $Matches[2]
            }
        }
    }
    return $config
}

# --- Gumroad License Check -------------------
function Verify-License {
    param([hashtable]$Config)

    Ensure-CacheDir

    $key = $Config["GUMROAD_LICENSE_KEY"]
    $productId = $Config["GUMROAD_PRODUCT_ID"]

    if (-not $key -or $key -eq "") {
        Write-Err "No license key found."
        Write-Host "    Open $($global:ConfigFile) and paste your Gumroad license key."
        exit 1
    }

    # Check cache (valid for 7 days)
    if (Test-Path $global:LicenseCache) {
        $cachedTime = [long](Get-Content $global:LicenseCache)
        $now = [long](Get-Date -UFormat %s)
        $age = $now - $cachedTime
        $maxAge = 7 * 24 * 60 * 60

        if ($age -lt $maxAge) {
            return $true
        }
    }

    # Verify with Gumroad API
    Write-Info "Verifying license..."

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $body = @{
            product_id  = $productId
            license_key = $key
        }
        $response = Invoke-RestMethod -Uri "https://api.gumroad.com/v2/licenses/verify" `
            -Method Post -Body $body -ErrorAction Stop

        if ($response.success -eq $true) {
            $now = [long](Get-Date -UFormat %s)
            Set-Content -Path $global:LicenseCache -Value $now
            Write-Ok "License verified."
            return $true
        } else {
            Remove-Item -Path $global:LicenseCache -ErrorAction SilentlyContinue
            Write-Err "Invalid license key."
            Write-Host "    Check your key in $($global:ConfigFile)."
            exit 1
        }
    } catch [System.Net.WebException] {
        # Try to read the response body from HTTP error responses
        $webResponse = $_.Exception.Response
        if ($webResponse) {
            try {
                $stream = $webResponse.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
                $reader.Close()
                $jsonBody = $responseBody | ConvertFrom-Json
                if ($jsonBody.success -eq $true) {
                    $now = [long](Get-Date -UFormat %s)
                    Set-Content -Path $global:LicenseCache -Value $now
                    Write-Ok "License verified."
                    return $true
                } else {
                    Remove-Item -Path $global:LicenseCache -ErrorAction SilentlyContinue
                    Write-Err "Invalid license key."
                    Write-Host "    Check your key in $($global:ConfigFile)."
                    exit 1
                }
            } catch {
                # Could not parse response, fall through to offline check
            }
        }
        # If offline and cache exists, allow
        if (Test-Path $global:LicenseCache) {
            Write-Warn "Offline - using cached license."
            return $true
        }
        Write-Err "Could not reach Gumroad. Check your internet connection."
        exit 1
    } catch {
        # If offline and cache exists, allow
        if (Test-Path $global:LicenseCache) {
            Write-Warn "Offline - using cached license."
            return $true
        }
        Write-Err "Could not reach Gumroad. Check your internet connection."
        exit 1
    }
}

# --- Admin Check -----------------------------
function Require-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Err "This command needs Administrator access."
        Write-Host "    Right-click PowerShell -> 'Run as Administrator', then try again."
        exit 1
    }
}
