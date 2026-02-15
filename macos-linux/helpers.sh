#!/usr/bin/env bash
# --------------------------------------------
# FocusKit — Shared Helpers (macOS & Linux)
# --------------------------------------------
set -euo pipefail

# -------------------------------------------- Paths --------------------------------------------
FOCUSKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${FOCUSKIT_DIR}/focuskit.conf"
CACHE_DIR="${HOME}/.focuskit"
LICENSE_CACHE="${CACHE_DIR}/license.cache"
FOCUS_STATE="${CACHE_DIR}/focus.state"
HOSTS_BACKUP="${CACHE_DIR}/hosts.backup"

# -------------------------------------------- Colors --------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# -------------------------------------------- Output Helpers --------------------------------------------
info()    { echo -e "${CYAN}▸${NC} $1"; }
success() { echo -e "${GREEN}✔${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
error()   { echo -e "${RED}✖${NC} $1"; }
heading() { echo -e "\n${BOLD}$1${NC}"; }

# -------------------------------------------- Ensure cache directory exists --------------------------------------------
ensure_cache_dir() {
    mkdir -p "${CACHE_DIR}"
}

# -------------------------------------------- Load config --------------------------------------------
load_config() {
    if [[ ! -f "${CONFIG_FILE}" ]]; then
        error "Config file not found: ${CONFIG_FILE}"
        echo "  Copy focuskit.conf to ${FOCUSKIT_DIR}/ and add your license key."
        exit 1
    fi
    # shellcheck source=/dev/null
    source "${CONFIG_FILE}"
}

# -------------------------------------------- Gumroad License Check --------------------------------------------
verify_license() {
    ensure_cache_dir

    # Check if license key is set
    if [[ -z "${GUMROAD_LICENSE_KEY:-}" ]]; then
        error "No license key found."
        echo "  Open ${CONFIG_FILE} and paste your Gumroad license key."
        exit 1
    fi

    # Check local cache (valid for 7 days)
    if [[ -f "${LICENSE_CACHE}" ]]; then
        local cached_time
        cached_time=$(cat "${LICENSE_CACHE}" 2>/dev/null || echo "0")
        local now
        now=$(date +%s)
        local age=$(( now - cached_time ))
        local max_age=$(( 7 * 24 * 60 * 60 ))  # 7 days

        if (( age < max_age )); then
            return 0  # License is cached and fresh
        fi
    fi

    # Verify with Gumroad API
    info "Verifying license…"

    local response
    local http_code

    # Use curl to check license
    if ! command -v curl &>/dev/null; then
        error "curl is required but not installed."
        exit 1
    fi

    response=$(curl -s -w "\n%{http_code}" \
        -d "product_id=${GUMROAD_PRODUCT_ID}" \
        -d "license_key=${GUMROAD_LICENSE_KEY}" \
        "https://api.gumroad.com/v2/licenses/verify" 2>/dev/null) || {
        # If offline and we have a cache (even expired), allow it
        if [[ -f "${LICENSE_CACHE}" ]]; then
            warn "Offline — using cached license (last verified previously)."
            return 0
        fi
        error "Could not reach Gumroad. Check your internet connection."
        exit 1
    }

    http_code=$(echo "${response}" | tail -1)
    local body
    body=$(echo "${response}" | sed '$d')

    # Parse success field from JSON (simple grep, no jq dependency)
    if echo "${body}" | grep -q '"success":true'; then
        # Cache the validation timestamp
        date +%s > "${LICENSE_CACHE}"
        success "License verified."
        return 0
    else
        rm -f "${LICENSE_CACHE}"
        error "Invalid license key."
        echo "  Check your key in ${CONFIG_FILE} or visit your Gumroad purchase page."
        exit 1
    fi
}

# -------------------------------------------- Root / Sudo Check --------------------------------------------
require_sudo() {
    if [[ $EUID -ne 0 ]]; then
        error "This command needs admin access to modify your hosts file."
        echo "  Re-run with: sudo $0"
        exit 1
    fi
}

# -------------------------------------------- Detect OS --------------------------------------------
detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*)  echo "linux" ;;
        *)       echo "unknown" ;;
    esac
}
