#!/usr/bin/env bash
# --------------------------------------------
# FocusKit — Uninstaller (macOS & Linux)
# --------------------------------------------
set -euo pipefail

INSTALL_DIR="${HOME}/.focuskit-scripts"
CACHE_DIR="${HOME}/.focuskit"

echo ""
echo "FocusKit Uninstaller"
echo "--------------------------------------------"
echo ""

# Safety: end focus mode if active
if [[ -f "${CACHE_DIR}/focus.state" ]]; then
    echo "⚠  Focus mode is active. Restoring hosts file first…"
    if [[ -f "${CACHE_DIR}/hosts.backup" ]]; then
        sudo cp "${CACHE_DIR}/hosts.backup" "/etc/hosts"
        echo "✔  Hosts file restored."
    fi
fi

# Remove scripts
if [[ -d "${INSTALL_DIR}" ]]; then
    rm -rf "${INSTALL_DIR}"
    echo "✔  Removed ${INSTALL_DIR}"
fi

# Remove cache
if [[ -d "${CACHE_DIR}" ]]; then
    rm -rf "${CACHE_DIR}"
    echo "✔  Removed ${CACHE_DIR}"
fi

# Remove PATH entry from shell configs
for rc_file in "${HOME}/.bashrc" "${HOME}/.bash_profile" "${HOME}/.zshrc" "${HOME}/.profile"; do
    if [[ -f "${rc_file}" ]]; then
        if grep -q "focuskit-scripts" "${rc_file}" 2>/dev/null; then
            # Remove FocusKit lines
            sed -i.bak '/# FocusKit/d; /focuskit-scripts/d' "${rc_file}" 2>/dev/null || \
            sed -i '' '/# FocusKit/d; /focuskit-scripts/d' "${rc_file}" 2>/dev/null
            rm -f "${rc_file}.bak"
            echo "✔  Cleaned ${rc_file}"
        fi
    fi
done

echo ""
echo "FocusKit has been completely removed."
echo "Restart your terminal to finish."
echo ""
