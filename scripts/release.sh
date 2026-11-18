#!/usr/bin/env bash
# Release what this repository publishes. See RELEASING.md.
#
#   scripts/release.sh --check   say what is published and what a release would do; changes nothing
#   scripts/release.sh           publish whatever is behind: npm, then the MCP registry
#
# Pushing this repository is itself the release for Claude Code and Cursor: they read it directly.
set -euo pipefail
cd "$(dirname "$0")/.."

CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1
DOMAIN="automo.build"
SERVER="build.automo/automo-build"
say() { printf '%s\n' "$*"; }
fail() { printf 'release: %s\n' "$*" >&2; exit 1; }
json() { node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(process.argv[2].split('.').reduce((o,k)=>o?.[k],j)??'')" "$1" "$2"; }

# ── What this checkout holds ─────────────────────────────────────────────────────────────────────────
CLI_LOCAL="$(json npm-cli/package.json version)"
SERVER_LOCAL="$(json server.json version)"
PLUGIN_LOCAL="$(json plugins/claude-code/.claude-plugin/plugin.json version)"
for f in plugin.json plugins/cursor/.cursor-plugin/plugin.json plugins/openai/.codex-plugin/plugin.json; do
  [ "$(json "$f" version)" = "$PLUGIN_LOCAL" ] || fail "$f is not at plugin version $PLUGIN_LOCAL"
done

# ── What the world has ───────────────────────────────────────────────────────────────────────────────
CLI_LIVE="$(npm view automo-build version 2>/dev/null || echo none)"
SERVER_LIVE="$(curl -fsS "https://registry.modelcontextprotocol.io/v0/servers?search=${SERVER}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const s=(JSON.parse(d).servers||[]).map(e=>e.server||e).filter(e=>e.name==='${SERVER}');const v=s.map(e=>e.version).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).pop();console.log(v||'none')})" 2>/dev/null || echo unknown)"
git fetch -q origin
AHEAD="$(git rev-list --count origin/main..HEAD)"
DIRTY="$(git status --porcelain | wc -l | tr -d ' ')"

say "plugin (this repository)   local $PLUGIN_LOCAL   unpushed commits: $AHEAD   uncommitted files: $DIRTY"
say "npm automo-build           local $CLI_LOCAL   live $CLI_LIVE"
say "MCP registry               local $SERVER_LOCAL   live $SERVER_LIVE"

NEED_NPM=0; [ "$CLI_LOCAL" != "$CLI_LIVE" ] && NEED_NPM=1
NEED_REG=0; [ "$SERVER_LOCAL" != "$SERVER_LIVE" ] && NEED_REG=1
if [ "$CHECK" = 1 ]; then
  [ "$AHEAD" != 0 ] || [ "$DIRTY" != 0 ] && say "to do: commit and push this repository"
  [ "$NEED_NPM" = 1 ] && say "to do: publish automo-build $CLI_LOCAL to npm"
  [ "$NEED_REG" = 1 ] && say "to do: publish $SERVER_LOCAL to the MCP registry"
  [ "$AHEAD" = 0 ] && [ "$DIRTY" = 0 ] && [ "$NEED_NPM" = 0 ] && [ "$NEED_REG" = 0 ] && say "everything is published"
  exit 0
fi

# ── Guards ───────────────────────────────────────────────────────────────────────────────────────────
[ "$DIRTY" = 0 ] || fail "commit your changes first"
[ "$AHEAD" = 0 ] || fail "push this repository first: what is published must be what is on GitHub"
[ "$(git branch --show-current)" = main ] || fail "release from main"
if [ "$NEED_NPM" = 1 ] || [ "$NEED_REG" = 1 ]; then
  [ -f .env ] || fail "no .env here. Copy .env.example to .env and fill it in (RELEASING.md, one-time setup)"
  git check-ignore -q .env || fail ".env is not gitignored; refusing to read it"
  set -a; . ./.env; set +a
fi

# ── npm ──────────────────────────────────────────────────────────────────────────────────────────────
if [ "$NEED_NPM" = 1 ]; then
  [ -n "${NPM_TOKEN:-}" ] || fail "NPM_TOKEN is empty in .env"
  (cd npm-cli && npm test >/dev/null) || fail "the CLI's own check failed"
  RC="$(mktemp)"; trap 'rm -f "$RC"' EXIT
  # The token is named, not written: npm expands ${NPM_TOKEN} from the environment when it reads the file.
  printf '%s\n' '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > "$RC"
  (cd npm-cli && NPM_TOKEN="$NPM_TOKEN" npm publish --userconfig "$RC")
  say "published automo-build $CLI_LOCAL to npm"
else
  say "npm is up to date"
fi

# ── MCP registry ─────────────────────────────────────────────────────────────────────────────────────
if [ "$NEED_REG" = 1 ]; then
  [ -n "${MCP_PRIVATE_KEY:-}" ] || fail "MCP_PRIVATE_KEY is empty in .env"
  command -v mcp-publisher >/dev/null || fail "mcp-publisher is not installed (RELEASING.md, tools)"
  mcp-publisher validate
  MCP_PRIVATE_KEY="$MCP_PRIVATE_KEY" mcp-publisher login dns --domain "$DOMAIN"
  mcp-publisher publish
  say "published $SERVER_LOCAL to the MCP registry"
else
  say "the MCP registry is up to date"
fi

say "done. Run scripts/release.sh --check to confirm."
