#!/usr/bin/env bash
# --------------------------------------------
# FocusKit — Installer (macOS & Linux)
# One command: bash install.sh
# --------------------------------------------
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

INSTALL_DIR="${HOME}/.focuskit-scripts"

echo ""
echo -e "${BOLD}FocusKit Installer${NC}"
echo -e "--------------------------------"
echo ""

# -------- Check dependencies --------
if ! command -v curl &>/dev/null; then
    echo -e "${RED}✖${NC} curl is required. Please install it first."
    exit 1
fi

if ! command -v bash &>/dev/null; then
    echo -e "${RED}✖${NC} bash is required."
    exit 1
fi

# ------------ Copy files ------------
echo -e "${CYAN}▸${NC} Installing to ${INSTALL_DIR}…"

mkdir -p "${INSTALL_DIR}"

# Copy scripts
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cp "${SCRIPT_DIR}/macos-linux/helpers.sh"  "${INSTALL_DIR}/helpers.sh"
cp "${SCRIPT_DIR}/macos-linux/startfocus"  "${INSTALL_DIR}/startfocus"
cp "${SCRIPT_DIR}/macos-linux/endfocus"    "${INSTALL_DIR}/endfocus"
cp "${SCRIPT_DIR}/macos-linux/cleanup"     "${INSTALL_DIR}/cleanup"

# Copy config only if it doesn't already exist (preserve user settings)
if [[ ! -f "${INSTALL_DIR}/focuskit.conf" ]]; then
    cp "${SCRIPT_DIR}/focuskit.conf" "${INSTALL_DIR}/focuskit.conf"
    echo -e "${GREEN}✔${NC} Config file created."
else
    echo -e "${CYAN}▸${NC} Existing config preserved."
fi

# Make executable
chmod +x "${INSTALL_DIR}/startfocus"
chmod +x "${INSTALL_DIR}/endfocus"
chmod +x "${INSTALL_DIR}/cleanup"
chmod +x "${INSTALL_DIR}/helpers.sh"

echo -e "${GREEN}✔${NC} Scripts installed."

# ------------ Add to PATH ------------
SHELL_NAME="$(basename "${SHELL}")"
RC_FILE=""

case "${SHELL_NAME}" in
    bash)
        if [[ -f "${HOME}/.bash_profile" ]]; then
            RC_FILE="${HOME}/.bash_profile"
        else
            RC_FILE="${HOME}/.bashrc"
        fi
        ;;
    zsh)  RC_FILE="${HOME}/.zshrc" ;;
    fish) RC_FILE="${HOME}/.config/fish/config.fish" ;;
    *)    RC_FILE="${HOME}/.profile" ;;
esac

PATH_LINE="export PATH=\"${INSTALL_DIR}:\$PATH\""

if [[ -n "${RC_FILE}" ]]; then
    if ! grep -qF "${INSTALL_DIR}" "${RC_FILE}" 2>/dev/null; then
        echo "" >> "${RC_FILE}"
        echo "# FocusKit" >> "${RC_FILE}"
        echo "${PATH_LINE}" >> "${RC_FILE}"
        echo -e "${GREEN}✔${NC} Added to PATH in ${RC_FILE}"
    else
        echo -e "${CYAN}▸${NC} PATH already configured."
    fi
fi

# ------------ Done ----------------
echo ""
echo -e "${BOLD}Installation complete!${NC}"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo ""
echo -e "  1. Open the config file and add your license key:"
echo -e "     ${CYAN}nano ${INSTALL_DIR}/focuskit.conf${NC}"
echo ""
echo -e "  2. Reload your shell:"
echo -e "     ${CYAN}source ${RC_FILE}${NC}"
echo ""
echo -e "  3. Run your first focus session:"
echo -e "     ${CYAN}sudo startfocus${NC}"
echo ""
echo -e "  For help, see the README or run a command with --help."
echo ""
