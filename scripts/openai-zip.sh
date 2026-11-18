#!/usr/bin/env bash
# Build the ZIP the ChatGPT and Codex plugin directory takes (platform.openai.com/plugins): plugins/openai as is.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-$PWD/automo-build-openai-plugin.zip}"
for f in plugin.json mcp.json assets/logo.png skills; do [ -e "plugins/openai/$f" ] || { echo "plugins/openai/$f is missing" >&2; exit 1; }; done
rm -f "$OUT"
(cd plugins/openai && zip -q -r "$OUT" plugin.json mcp.json assets skills)
echo "$OUT"
unzip -l "$OUT" | tail -n +4 | awk '{print "  " $4}' | grep -v '^  $'
