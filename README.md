# Automo Build MCP server

[Automo Build](https://automo.build) is an AI app builder. Describe software in plain language and get a real React, TypeScript and Supabase application, tested, reviewed and deployed to a public URL. This server lets your AI tool operate it as you: create projects, prompt the builder, ask the CTO, Doctor, Security and QA agents, and publish.

It is free to start: a trial, then a USD 0 Free plan with a monthly credit allowance, the built-in backend and web publishing.

## Connect

The server is remote, so there is nothing to install or run. It speaks Streamable HTTP at:

```
https://mcp.automo.build/mcp
```

Sign-in is OAuth in the browser on first use. There is no API key and no client registration; tokens are scoped and revocable.

| Client | How |
|---|---|
| Claude Code | `/plugin marketplace add Desygner/automo-build-mcp` then `/plugin install automo-build` |
| Claude.ai | Settings, Connectors, Add custom connector, `https://mcp.automo.build/mcp` |
| Cursor | Install the Automo Build plugin, or `npx automo-build connect cursor` |
| Codex | `npx automo-build connect codex` |
| Cline | Add the server below to `cline_mcp_settings.json` |
| Any MCP client | Add `https://mcp.automo.build/mcp` as a remote Streamable HTTP server |

```json
{
  "mcpServers": {
    "automo-build": {
      "type": "streamableHttp",
      "url": "https://mcp.automo.build/mcp"
    }
  }
}
```

Narrower catalogs live at `/mcp/core` (the core operator set) and `/mcp/observe` (read-only). Append `/builders` to route build instructions through builder subagents.

## Links

- Developer portal: https://automo.build/developers
- For agents: [AGENTS.md](AGENTS.md) and https://automo.build/llms.txt
- Agent registration: https://automo.build/auth.md
- OpenAPI: https://mcp.automo.build/openapi.json
- Server card: https://mcp.automo.build/.well-known/mcp-server-card.json
- Privacy policy: https://automo.build/privacy-policy
- Support: support@automo.ai

## What is in this repository

- `server.json`: the official MCP Registry entry.
- `plugins/claude-code`: the Claude plugin (Claude Code and Cowork), with the operator skill, first-run setup and `/automo-handoff`.
- `plugins/cursor`: the Cursor plugin, with the same server and skill.
- `plugins/openai`: the ChatGPT and Codex plugin.
- `npm-cli`: `npx automo-build connect`.

Everything here is generated from the Automo Build runtime; edits made directly in this repository are overwritten.
