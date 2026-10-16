# Automo Build MCP distribution

Everything under this directory is generated from the runtime by
`npm run mcp:plugins` (services/agent-runtime). Edit the doctrine in
`services/agent-runtime/src/mcp/instructions.ts` or the catalog under
`src/mcp/tools/`, regenerate, and commit; a test fails when the bundles drift.

- `server.json`: the official MCP Registry entry (`mcp-publisher publish` from this directory after `mcp-publisher login dns --domain automo.build`).
- `plugins/claude-code`: the Claude plugin (Claude Code and Cowork): remote MCP server, the operator skill, first-run setup, and `/automo-handoff`.
- `plugins/openai`: the ChatGPT and Codex plugin: the same server and skill.

The server publishes its own discovery at https://mcp.automo.build/.well-known/mcp-server-card.json.
