#!/bin/bash

# Script to launch VS Code Insiders extension with profiling enabled
# This allows for startup profiling with the debugger attached
#
# Usage: ./launch-extension-profile.sh [workspace_path]
#   workspace_path: Optional path to a workspace/folder to open (default: current directory)

set -e  # Exit on error

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get workspace path from argument, or use current directory
WORKSPACE_PATH="${1:-${PWD}}"

# Verify workspace path exists
if [ ! -e "${WORKSPACE_PATH}" ]; then
  echo "Error: Workspace path does not exist: ${WORKSPACE_PATH}"
  exit 1
fi

echo "Building extension..."
npm run bundle

echo "Launching VS Code Insiders with extension profiling enabled..."
echo "Workspace: ${WORKSPACE_PATH}"

# Set environment variables and launch
NODE_OPTIONS="--enable-source-maps" \
APEX_LS_MODE="development" \
/Applications/Visual\ Studio\ Code\ -\ Insiders.app/Contents/MacOS/Electron \
  --extensionDevelopmentPath="${SCRIPT_DIR}/packages/apex-lsp-vscode-extension" \
  --inspect-brk-extensions=9222 \
  "${WORKSPACE_PATH}"

echo "Extension host exited"
