#!/bin/bash
# W-23448544: Workspace load profiling script
#
# Usage:
#   ./scripts/profile-workspace-load.sh [test-project-path]
#
# Defaults to ~/git/dreamhouse-lwc if no argument provided.
#
# Steps:
# 1. Clears old span files from ~/.sf/vscode-spans/
# 2. Opens the test project in a new VSCode window with the extension
# 3. Waits for workspace load to complete
# 4. Analyzes spans with trace-debugger agent
#
# Prerequisites:
# - Extension must be built (npm run compile)
# - Test project must have .vscode/settings.json configured:
#   {
#     "apex.performance.enableWorkspaceLoadOnStartup": true,
#     "apex.trace.server": "verbose"
#   }

set -e

TEST_PROJECT="${1:-$HOME/git/dreamhouse-lwc}"
SPAN_DIR="$HOME/.sf/vscode-spans"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔬 W-23448544: Workspace Load Performance Profiling"
echo "=================================================="
echo "Test project: $TEST_PROJECT"
echo "Span directory: $SPAN_DIR"
echo ""

# Validate test project exists
if [ ! -d "$TEST_PROJECT" ]; then
  echo "❌ Test project not found: $TEST_PROJECT"
  echo "Available projects:"
  ls -d ~/git/dreamhouse-lwc ~/git/apex-recipes ~/git/apex-perf-project 2>/dev/null || echo "  (none found)"
  exit 1
fi

# Ensure extension is built
if [ ! -d "$REPO_ROOT/packages/apex-lsp-vscode-extension/out" ]; then
  echo "⚠️  Extension not built. Running npm run compile..."
  cd "$REPO_ROOT"
  npm run compile
fi

# Clear old spans
echo "🧹 Clearing old span files..."
rm -rf "$SPAN_DIR"/*.jsonl
mkdir -p "$SPAN_DIR"

# Check test project settings
SETTINGS_FILE="$TEST_PROJECT/.vscode/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "⚠️  No .vscode/settings.json found in test project"
  echo "Creating default profiling settings..."
  mkdir -p "$TEST_PROJECT/.vscode"
  cat > "$SETTINGS_FILE" <<EOF
{
  "apex.performance.enableWorkspaceLoadOnStartup": true,
  "apex.trace.server": "verbose"
}
EOF
fi

# Verify required settings
if ! grep -q "apex.performance.enableWorkspaceLoadOnStartup.*true" "$SETTINGS_FILE"; then
  echo "⚠️  WARNING: apex.performance.enableWorkspaceLoadOnStartup not enabled in $SETTINGS_FILE"
fi

if ! grep -q "apex.trace.server.*verbose" "$SETTINGS_FILE"; then
  echo "⚠️  WARNING: apex.trace.server not set to verbose in $SETTINGS_FILE"
fi

echo ""
echo "📦 Launching VSCode with extension..."
echo "Extension path: $REPO_ROOT/packages/apex-lsp-vscode-extension"
echo ""
echo "MANUAL STEPS:"
echo "1. Wait for VSCode Extension Development Host to open"
echo "2. In the new window, open: $TEST_PROJECT"
echo "3. Watch status bar for 'Apex: Loading workspace...'"
echo "4. Wait until status shows 'Apex: Ready'"
echo "5. Return to this terminal and press ENTER"
echo ""

# Launch VSCode Extension Development Host
code --extensionDevelopmentPath="$REPO_ROOT/packages/apex-lsp-vscode-extension" "$TEST_PROJECT" &
VSCODE_PID=$!

echo "VSCode launched (PID: $VSCODE_PID)"
echo ""
read -p "Press ENTER when workspace load is complete..."

# Check for span files
SPAN_COUNT=$(ls "$SPAN_DIR"/*.jsonl 2>/dev/null | wc -l | tr -d ' ')
if [ "$SPAN_COUNT" -eq 0 ]; then
  echo "❌ No span files found in $SPAN_DIR"
  echo "Possible issues:"
  echo "  - Workspace load didn't trigger (check apex.performance.enableWorkspaceLoadOnStartup)"
  echo "  - Tracing not enabled (check apex.trace.server: verbose)"
  echo "  - Extension not loaded properly"
  exit 1
fi

echo "✅ Found $SPAN_COUNT span file(s)"
echo ""

echo "📊 Span file summary:"
ls -lh "$SPAN_DIR"/*.jsonl

echo ""
echo "🔍 Quick span analysis:"
echo "Total spans:"
cat "$SPAN_DIR"/*.jsonl | wc -l

echo ""
echo "Top 10 span types by count:"
cat "$SPAN_DIR"/*.jsonl | jq -r '.name' | sort | uniq -c | sort -rn | head -10

echo ""
echo "Workspace load spans:"
cat "$SPAN_DIR"/*.jsonl | jq -r 'select(.name | test("workspace")) | .name' | sort | uniq -c

echo ""
echo "✅ Profiling data collected!"
echo ""
echo "Next steps:"
echo "1. Use trace-debugger agent to analyze: 'Can you analyze workspace load traces in ~/.sf/vscode-spans/'"
echo "2. Or manually inspect: cat ~/.sf/vscode-spans/*.jsonl | jq . | less"
echo "3. Find slow operations: cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.duration > 100000000)' | jq -r '[.name, .duration/1000000 | tostring + \"ms\"] | @tsv'"
